import { forbidden, notFound, ok, parseId, route } from '@/lib/api';
import { isAdmin, requireUser } from '@/lib/auth';
import NotificationModel from '@/models/Notification';
import ReviewModel, { type IReview } from '@/models/Review';
import { syncStoryRating } from '@/server/aggregates';

/** The review's author or an admin can delete it. */
export const DELETE = route<{ reviewId: string }>(async (_request, { reviewId }) => {
  const user = await requireUser();
  const review = await ReviewModel.findById(parseId(reviewId, 'Review')).lean<IReview>();
  if (!review) throw notFound('Review');
  if (!review.author.equals(user.id) && !isAdmin(user)) throw forbidden();

  await ReviewModel.deleteOne({ _id: review._id });
  await NotificationModel.deleteMany({ type: 'new_review', story: review.story, actor: review.author });
  await syncStoryRating(review.story);
  return ok({ deleted: true });
});
