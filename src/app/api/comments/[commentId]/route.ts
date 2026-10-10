import { forbidden, notFound, ok, parseId, readJson, route } from '@/lib/api';
import { isAdmin, requireUser } from '@/lib/auth';
import CommentModel, { type IComment } from '@/models/Comment';
import StoryModel from '@/models/Story';
import { updateCommentSchema } from '@/schemas/engagement';
import { canManageStory } from '@/server/access';
import { deleteComment } from '@/server/cascade';
import { toComment, USER_SUMMARY_FIELDS, type CommentDoc } from '@/server/serializers';

type Params = { commentId: string };

async function findComment(commentId: string) {
  const comment = await CommentModel.findById(parseId(commentId, 'Comment')).lean<IComment>();
  if (!comment) throw notFound('Comment');
  const story = await StoryModel.findById(comment.story).select('author').lean();
  if (!story) throw notFound('Comment');
  return { comment, story };
}

/** Only the comment's author can edit it. */
export const PATCH = route<Params>(async (request, { commentId }) => {
  const user = await requireUser();
  const { comment, story } = await findComment(commentId);
  if (!comment.author.equals(user.id)) throw forbidden('You can only edit your own comments.');
  const { body } = await readJson(request, updateCommentSchema);

  const updated = await CommentModel.findByIdAndUpdate(comment._id, { $set: { body, editedAt: new Date() } }, { new: true })
    .populate('author', USER_SUMMARY_FIELDS)
    .lean<CommentDoc>();
  if (!updated) throw notFound('Comment');
  return ok({ comment: toComment(updated, story.author) });
});

/** The comment's author, the story's author (moderation), or an admin can delete it. */
export const DELETE = route<Params>(async (_request, { commentId }) => {
  const user = await requireUser();
  const { comment, story } = await findComment(commentId);
  if (!comment.author.equals(user.id) && !canManageStory(story, user) && !isAdmin(user)) throw forbidden();

  await deleteComment(comment);
  return ok({ deleted: true });
});
