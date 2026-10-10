import { CONTENT_RATINGS, GENRES, LIMITS, STORY_PROGRESS, STORY_TYPES } from '@/config/content';
import { ok } from '@/lib/api';

/** Genres and the other fixed choices that story and channel forms need. */
export function GET() {
  return ok({
    genres: GENRES,
    storyTypes: STORY_TYPES,
    contentRatings: CONTENT_RATINGS,
    progress: STORY_PROGRESS,
    limits: {
      genresPerStory: LIMITS.genresPerStory,
      tagsPerStory: LIMITS.tagsPerStory,
      channelsPerUser: LIMITS.channelsPerUser,
      imageBytes: LIMITS.imageBytes,
    },
  });
}
