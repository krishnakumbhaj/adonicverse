import { Types } from 'mongoose';
import { ok, parseId, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import EpisodeModel from '@/models/Episode';
import EpisodeLikeModel from '@/models/EpisodeLike';
import StoryModel from '@/models/Story';
import { requirePublicEpisode } from '@/server/access';
import { addOnce, removeOnce } from '@/server/toggles';

type Params = { episodeId: string };

async function likeCount(episodeId: Types.ObjectId) {
  const episode = await EpisodeModel.findById(episodeId).select('stats.likes').lean();
  return episode?.stats.likes ?? 0;
}

export const POST = route<Params>(async (_request, { episodeId }) => {
  const user = await requireUser();
  const { episode, story } = await requirePublicEpisode(episodeId, user);

  await addOnce(
    EpisodeLikeModel,
    { user: new Types.ObjectId(user.id), episode: episode._id, story: story._id },
    async (session) => {
      const like = { $inc: { 'stats.likes': 1 } };
      await EpisodeModel.updateOne({ _id: episode._id }, like, { session });
      await StoryModel.updateOne({ _id: story._id }, like, { session });
    },
  );
  return ok({ liked: true, likes: await likeCount(episode._id) });
});

/** Removes the like, even if the episode has since been unpublished. */
export const DELETE = route<Params>(async (_request, { episodeId }) => {
  const user = await requireUser();
  const id = parseId(episodeId, 'Episode');

  await removeOnce(EpisodeLikeModel, { user: new Types.ObjectId(user.id), episode: id }, async (session, like) => {
    const unlike = { $inc: { 'stats.likes': -1 } };
    await EpisodeModel.updateOne({ _id: id }, unlike, { session });
    await StoryModel.updateOne({ _id: like.story }, unlike, { session });
  });
  return ok({ liked: false, likes: await likeCount(id) });
});
