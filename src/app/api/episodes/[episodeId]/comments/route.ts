import { Types } from 'mongoose';
import { notFound, ok, paged, pageWindow, readJson, readQuery, route } from '@/lib/api';
import { getSessionUser, requireUser } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';
import CommentModel, { type IComment } from '@/models/Comment';
import EpisodeModel from '@/models/Episode';
import StoryModel from '@/models/Story';
import { commentsQuery, createCommentSchema } from '@/schemas/engagement';
import { requirePublicEpisode, requireReadableEpisode } from '@/server/access';
import { notifyUser } from '@/server/notifications';
import { toComment, USER_SUMMARY_FIELDS, type CommentDoc } from '@/server/serializers';

type Params = { episodeId: string };

/** Top-level comments. Load replies with `GET /api/comments/:id/replies`. */
export const GET = route<Params>(async (request, { episodeId }) => {
  const { episode, story } = await requireReadableEpisode(episodeId, await getSessionUser());
  const query = readQuery(request, commentsQuery);
  const { skip, limit } = pageWindow(query);
  const direction = query.sort === 'newest' ? -1 : 1;

  const comments = await CommentModel.find({ episode: episode._id, parent: null })
    .sort({ createdAt: direction, _id: direction })
    .skip(skip)
    .limit(limit)
    .populate('author', USER_SUMMARY_FIELDS)
    .lean<CommentDoc[]>();

  return ok({
    ...paged(comments.map((comment) => toComment(comment, story.author)), query),
    total: episode.stats.comments,
  });
});

/** Posts a comment, or a reply when `parentId` is given. */
export const POST = route<Params>(async (request, { episodeId }) => {
  const user = await requireUser();
  const { episode, story } = await requirePublicEpisode(episodeId, user);
  await enforceRateLimit(`comment:${user.id}`, 10, 60);
  const input = await readJson(request, createCommentSchema);

  const parent = input.parentId
    ? await CommentModel.findOne({ _id: input.parentId, episode: episode._id }).lean<IComment>()
    : null;
  if (input.parentId && !parent) throw notFound('Comment');
  const threadId = parent ? (parent.parent ?? parent._id) : null;

  const author = new Types.ObjectId(user.id);
  const commentId = await withTransaction(async (session) => {
    const [comment] = await CommentModel.create(
      [{ episode: episode._id, story: story._id, author, parent: threadId, body: input.body }],
      { session },
    );
    if (threadId) await CommentModel.updateOne({ _id: threadId }, { $inc: { replyCount: 1 } }, { session });
    const added = { $inc: { 'stats.comments': 1 } };
    await EpisodeModel.updateOne({ _id: episode._id }, added, { session });
    await StoryModel.updateOne({ _id: story._id }, added, { session });
    return comment._id;
  });

  const about = { actor: author, story: story._id, episode: episode._id, comment: commentId };
  if (parent) notifyUser(parent.author, { type: 'comment_reply', ...about });
  else notifyUser(story.author, { type: 'new_comment', ...about });

  const comment = await CommentModel.findById(commentId).populate('author', USER_SUMMARY_FIELDS).lean<CommentDoc>();
  if (!comment) throw notFound('Comment');
  return ok({ comment: toComment(comment, story.author) }, 201);
});
