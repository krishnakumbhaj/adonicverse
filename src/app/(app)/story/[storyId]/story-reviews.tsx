'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useConfirm } from '@/components/app/confirm';
import { LoadMore } from '@/components/app/paged-grid';
import { Avatar } from '@/components/app/poster';
import { PillButton } from '@/components/app/primitives';
import { StarInput, Stars } from '@/components/app/stars';
import { useToast } from '@/components/app/toast';
import { api, errorMessage } from '@/lib/client/api';
import { compactNumber, timeAgo } from '@/lib/client/format';
import { useCurrentUser, usePagedList } from '@/lib/client/hooks';
import type { Review, Story, StoryViewer } from '@/lib/client/types';

/** Ratings summary, the signed-in reader's own review form, and everyone's reviews. */
export default function StoryReviews({
  story,
  viewer,
  onChanged,
}: {
  story: Story;
  viewer: StoryViewer | null;
  onChanged: () => void;
}) {
  const { user } = useCurrentUser();
  const list = usePagedList<Review>(`/api/stories/${story.id}/reviews`, 10);
  const [dialog, confirm] = useConfirm();
  const { toast } = useToast();
  const canReview = Boolean(viewer && !viewer.canManage && story.status === 'published');

  const refresh = () => {
    list.mutate();
    onChanged();
  };

  const remove = async (review: Review) => {
    const ok = await confirm({
      title: 'Delete your review?',
      text: 'Your rating and review will be removed from this story.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/reviews/${review.id}`, { method: 'DELETE' });
      toast('Review deleted');
      refresh();
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  return (
    <section className="mt-10 px-4 md:px-6">
      {dialog}
      <h2 className="mb-4 text-2xl font-bold tracking-tight">Ratings &amp; reviews</h2>
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <span className="text-5xl font-black tabular-nums">{story.rating.count ? story.rating.average.toFixed(1) : '–'}</span>
            <div>
              <Stars value={story.rating.average} className="h-5 w-5" />
              <p className="mt-1 text-sm text-pal-subdued">
                {story.rating.count ? `${compactNumber(story.rating.count)} rating${story.rating.count === 1 ? '' : 's'}` : 'No ratings yet'}
              </p>
            </div>
          </div>
          {canReview ? (
            <ReviewForm storyId={story.id} existing={viewer?.review ?? null} onSaved={refresh} />
          ) : (
            !user && (
              <p className="text-sm text-pal-subdued">
                <Link href={`/sign-in?callbackUrl=/story/${story.id}`} className="font-bold text-pal-text underline">
                  Log in
                </Link>{' '}
                to rate this story.
              </p>
            )
          )}
        </div>

        <div>
          {list.items.length === 0 && !list.isLoading && (
            <p className="text-pal-subdued">No reviews yet. Be the first to tell others what you think.</p>
          )}
          <ul className="divide-y divide-white/10">
            {list.items.map((review) => (
              <li key={review.id} className="py-4 first:pt-0">
                <div className="flex items-center gap-3">
                  {review.author ? (
                    <Link href={`/u/${review.author.username}`} className="flex min-w-0 items-center gap-2">
                      <Avatar name={review.author.displayName} image={review.author.avatar} seed={review.author.id} className="h-8 w-8 text-sm" />
                      <span className="truncate font-bold hover:underline">{review.author.displayName}</span>
                    </Link>
                  ) : (
                    <span className="font-bold text-pal-subdued">Deleted user</span>
                  )}
                  <Stars value={review.rating} className="h-3.5 w-3.5" />
                  <span className="text-xs text-pal-subdued">{timeAgo(review.updatedAt)}</span>
                  {review.author?.id === user?.id && (
                    <button type="button" onClick={() => remove(review)} className="ml-auto text-xs font-bold text-pal-subdued hover:text-pal-danger">
                      Delete
                    </button>
                  )}
                </div>
                {review.body && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{review.body}</p>}
              </li>
            ))}
          </ul>
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoad={list.loadMore} />
        </div>
      </div>
    </section>
  );
}

function ReviewForm({
  storyId,
  existing,
  onSaved,
}: {
  storyId: string;
  existing: { rating: number; body: string } | null;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rating) return toast('Pick a star rating first', 'error');
    setSaving(true);
    try {
      await api(`/api/stories/${storyId}/reviews`, { method: 'PUT', json: { rating, body } });
      toast(existing ? 'Review updated' : 'Thanks for your review!');
      onSaved();
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg bg-white/[.07] p-4">
      <p className="text-sm font-bold">{existing ? 'Your review' : 'Rate this story'}</p>
      <StarInput value={rating} onChange={setRating} />
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={5000}
        rows={3}
        placeholder="What did you think? (optional)"
        aria-label="Review"
        className="w-full resize-y rounded border border-pal-muted bg-pal-surface px-3 py-2 text-sm outline-none placeholder:text-pal-muted focus:border-pal-text"
      />
      <PillButton type="submit" size="sm" loading={saving}>
        {existing ? 'Update review' : 'Post review'}
      </PillButton>
    </form>
  );
}
