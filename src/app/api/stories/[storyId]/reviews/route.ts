import { Types } from 'mongoose';
import { badRequest, forbidden, ok, paged, pageWindow, readJson, readQuery, route } from '@/lib/api';
import { getSessionUser, requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import ReviewModel from '@/models/Review';
import StoryModel from '@/models/Story';
import { paginationSchema } from '@/schemas/common';
import { reviewSchema } from '@/schemas/engagement';
import { requireReadableStory } from '@/server/access';
import { syncStoryRating } from '@/server/aggregates';
import { notifyUser } from '@/server/notifications';
import { toReview, USER_SUMMARY_FIELDS, type ReviewDoc } from '@/server/serializers';

type Params = { storyId: string };

export const GET = route<Params>(async (request, { storyId }) => {
  const story = await requireReadableStory(storyId, await getSessionUser());
  const page = readQuery(request, paginationSchema);
  const { skip, limit } = pageWindow(page);

  const reviews = await ReviewModel.find({ story: story._id })
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', USER_SUMMARY_FIELDS)
    .lean<ReviewDoc[]>();

  return ok({ ...paged(reviews.map(toReview), page), rating: story.rating });
});

/** Creates or replaces the signed-in user's rating (1–5) and review of the story. */
export const PUT = route<Params>(async (request, { storyId }) => {
  const user = await requireUser();
  const story = await requireReadableStory(storyId, user);
  if (story.status !== 'published') throw badRequest('Only published stories can be reviewed.');
  if (story.author.equals(user.id)) throw forbidden("You can't review your own story.");

  await enforceRateLimit(`review:${user.id}`, 20, 60 * 60);
  const input = await readJson(request, reviewSchema);

  const author = new Types.ObjectId(user.id);
  const existed = await ReviewModel.exists({ story: story._id, author });
  await ReviewModel.updateOne({ story: story._id, author }, { $set: input }, { upsert: true });
  await syncStoryRating(story._id);
  if (!existed) notifyUser(story.author, { type: 'new_review', actor: author, story: story._id });

  const [review, updated] = await Promise.all([
    ReviewModel.findOne({ story: story._id, author }).populate('author', USER_SUMMARY_FIELDS).lean<ReviewDoc>(),
    StoryModel.findById(story._id).select('rating').lean(),
  ]);
  return ok({ review: review && toReview(review), rating: updated?.rating }, existed ? 200 : 201);
});
