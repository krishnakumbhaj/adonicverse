import { notFound, ok, paged, pageWindow, parseId, readQuery, route } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import CommentModel, { type IComment } from '@/models/Comment';
import { paginationSchema } from '@/schemas/common';
import { requireReadableEpisode } from '@/server/access';
import { toComment, USER_SUMMARY_FIELDS, type CommentDoc } from '@/server/serializers';

/** Replies to a top-level comment, oldest first. */
export const GET = route<{ commentId: string }>(async (request, { commentId }) => {
  const comment = await CommentModel.findById(parseId(commentId, 'Comment')).lean<IComment>();
  if (!comment || comment.parent) throw notFound('Comment');
  const { story } = await requireReadableEpisode(comment.episode, await getSessionUser());

  const page = readQuery(request, paginationSchema);
  const { skip, limit } = pageWindow(page);
  const replies = await CommentModel.find({ parent: comment._id })
    .sort({ createdAt: 1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .populate('author', USER_SUMMARY_FIELDS)
    .lean<CommentDoc[]>();

  return ok(paged(replies.map((reply) => toComment(reply, story.author)), page));
});
