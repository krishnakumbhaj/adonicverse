import { ok, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { discardImages, readImageUpload, replaceImage } from '@/lib/images';
import StoryModel from '@/models/Story';
import { requireManagedStory } from '@/server/access';
import { toImage } from '@/server/serializers';

type Params = { storyId: string };

/**
 * Upload the story poster as multipart/form-data with the image in `file`.
 * A tall 2:3 image (for example 1000×1500) looks best on story cards.
 */
export const PUT = route<Params>(async (request, { storyId }) => {
  const story = await requireManagedStory(storyId, await requireUser());
  const file = await readImageUpload(request);
  const poster = await replaceImage({
    file,
    folder: 'posters',
    previous: story.poster,
    persist: (image) => StoryModel.updateOne({ _id: story._id }, { $set: { poster: image } }),
  });
  return ok({ poster: toImage(poster) });
});

export const DELETE = route<Params>(async (_request, { storyId }) => {
  const story = await requireManagedStory(storyId, await requireUser());
  await StoryModel.updateOne({ _id: story._id }, { $set: { poster: null } });
  await discardImages([story.poster]);
  return ok({ poster: null });
});
