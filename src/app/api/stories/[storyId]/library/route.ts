import { Types } from 'mongoose';
import { ok, parseId, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import LibraryItemModel from '@/models/LibraryItem';
import StoryModel from '@/models/Story';
import { requireReadableStory } from '@/server/access';
import { addOnce, removeOnce } from '@/server/toggles';

type Params = { storyId: string };

async function saveCount(storyId: Types.ObjectId) {
  const story = await StoryModel.findById(storyId).select('stats.saves').lean();
  return story?.stats.saves ?? 0;
}

/** Saves the story to the signed-in user's library. */
export const POST = route<Params>(async (_request, { storyId }) => {
  const user = await requireUser();
  const story = await requireReadableStory(storyId, user);

  await addOnce(LibraryItemModel, { user: new Types.ObjectId(user.id), story: story._id }, (session) =>
    StoryModel.updateOne({ _id: story._id }, { $inc: { 'stats.saves': 1 } }, { session }),
  );
  return ok({ inLibrary: true, saves: await saveCount(story._id) });
});

/** Removes the story from the library, even if it has since been unpublished. */
export const DELETE = route<Params>(async (_request, { storyId }) => {
  const user = await requireUser();
  const id = parseId(storyId, 'Story');

  await removeOnce(LibraryItemModel, { user: new Types.ObjectId(user.id), story: id }, (session) =>
    StoryModel.updateOne({ _id: id }, { $inc: { 'stats.saves': -1 } }, { session }),
  );
  return ok({ inLibrary: false, saves: await saveCount(id) });
});
