import type { ClientSession, Types } from 'mongoose';
import EpisodeModel from '@/models/Episode';
import ReviewModel from '@/models/Review';
import StoryModel from '@/models/Story';

// Story fields derived from other collections. They are recomputed from the source rows
// instead of being incremented, so they can't drift. (Views, likes, comments and saves are
// high-volume counters and are incremented where they change.)

type EpisodeSummary = {
  episodes: number;
  words: number;
  seasons: (Types.ObjectId | null)[];
  latest: { _id: Types.ObjectId; title: string; publishedAt: Date };
};

/** Recomputes episode count, word count, season count and latest episode. Returns the episode count. */
export async function syncStoryEpisodes(storyId: Types.ObjectId, session?: ClientSession) {
  const [summary] = await EpisodeModel.aggregate<EpisodeSummary>([
    { $match: { story: storyId, status: 'published' } },
    { $sort: { publishedAt: -1, _id: -1 } },
    {
      $group: {
        _id: null,
        episodes: { $sum: 1 },
        words: { $sum: '$wordCount' },
        seasons: { $addToSet: '$season' },
        latest: { $first: { _id: '$_id', title: '$title', publishedAt: '$publishedAt' } },
      },
    },
  ]).session(session ?? null);

  await StoryModel.updateOne(
    { _id: storyId },
    {
      $set: {
        'stats.episodes': summary?.episodes ?? 0,
        'stats.words': summary?.words ?? 0,
        'stats.seasons': summary?.seasons.filter(Boolean).length ?? 0,
        latestEpisode: summary?.latest ?? null,
        lastPublishedAt: summary?.latest.publishedAt ?? null,
      },
    },
    { session },
  );
  return summary?.episodes ?? 0;
}

export async function syncStoryRating(storyId: Types.ObjectId) {
  const [summary] = await ReviewModel.aggregate<{ count: number; average: number }>([
    { $match: { story: storyId } },
    { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$rating' } } },
  ]);
  await StoryModel.updateOne(
    { _id: storyId },
    {
      $set: {
        'rating.count': summary?.count ?? 0,
        'rating.average': summary ? Math.round(summary.average * 100) / 100 : 0,
      },
    },
  );
}
