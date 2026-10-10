'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, SendHorizontal } from 'lucide-react';
import { useConfirm } from '@/components/app/confirm';
import { MoreMenu } from '@/components/app/menu';
import { LoadMore } from '@/components/app/paged-grid';
import { Avatar } from '@/components/app/poster';
import { Badge, Chip, ChipRow, PillButton } from '@/components/app/primitives';
import { useToast } from '@/components/app/toast';
import { api, errorMessage } from '@/lib/client/api';
import { timeAgo } from '@/lib/client/format';
import { useCurrentUser, usePagedList } from '@/lib/client/hooks';
import type { Comment } from '@/lib/client/types';

type Sort = 'newest' | 'oldest';

export default function Comments({ episodeId, total, canModerate }: { episodeId: string; total: number; canModerate: boolean }) {
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const [sort, setSort] = useState<Sort>('newest');
  const [count, setCount] = useState(total);
  const list = usePagedList<Comment>(`/api/episodes/${episodeId}/comments?sort=${sort}`, 20);

  return (
    <section id="comments" className="mt-16 scroll-mt-20 font-sans">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">
          Comments <span className="text-pal-subdued">{count}</span>
        </h2>
        <ChipRow>
          {(['newest', 'oldest'] as const).map((value) => (
            <Chip key={value} selected={sort === value} onClick={() => setSort(value)}>
              {value === 'newest' ? 'Newest' : 'Oldest'}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {user ? (
        <Composer
          episodeId={episodeId}
          placeholder="Add a comment…"
          onPosted={() => {
            setCount((value) => value + 1);
            list.mutate();
          }}
        />
      ) : (
        <p className="rounded-lg bg-white/[.07] px-4 py-3 text-sm text-pal-subdued">
          <Link href={`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`} className="font-bold text-pal-text underline">
            Log in
          </Link>{' '}
          to join the conversation.
        </p>
      )}

      <ul className="mt-6 space-y-6">
        {list.items.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            episodeId={episodeId}
            canModerate={canModerate}
            onCountChange={(delta) => setCount((value) => value + delta)}
            onRemoved={() => list.mutate()}
          />
        ))}
      </ul>
      {!list.isLoading && list.items.length === 0 && <p className="mt-6 text-pal-subdued">No comments yet. Start the conversation.</p>}
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoad={list.loadMore} />
    </section>
  );
}

function Composer({
  episodeId,
  parentId,
  placeholder,
  autoFocus,
  onPosted,
  onCancel,
}: {
  episodeId: string;
  parentId?: string;
  placeholder: string;
  autoFocus?: boolean;
  onPosted: (comment: Comment) => void;
  onCancel?: () => void;
}) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [body, setBody] = useState('');
  const [focused, setFocused] = useState(Boolean(autoFocus));
  const [posting, setPosting] = useState(false);

  const post = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const { comment } = await api<{ comment: Comment }>(`/api/episodes/${episodeId}/comments`, {
        method: 'POST',
        json: { body, parentId },
      });
      setBody('');
      setFocused(false);
      onPosted(comment);
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setPosting(false);
    }
  };

  if (!user) return null;
  return (
    <div className="flex gap-3">
      <Avatar
        name={user.name ?? user.username}
        image={user.image ? { url: user.image, width: 0, height: 0 } : null}
        seed={user.id}
        className="h-9 w-9 text-sm"
      />
      <div className="min-w-0 flex-1">
        <AutoGrowTextarea
          value={body}
          onChange={setBody}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
        />
        {(focused || body) && (
          <div className="mt-2 flex justify-end gap-2">
            <PillButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setBody('');
                setFocused(false);
                onCancel?.();
              }}
            >
              Cancel
            </PillButton>
            <PillButton size="sm" icon={<SendHorizontal />} loading={posting} disabled={!body.trim()} onClick={post}>
              {parentId ? 'Reply' : 'Comment'}
            </PillButton>
          </div>
        )}
      </div>
    </div>
  );
}

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  autoFocus,
  onFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  onFocus?: () => void;
}) {
  return (
    <textarea
      value={value}
      rows={1}
      maxLength={2000}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label={placeholder}
      onFocus={onFocus}
      onChange={(event) => {
        onChange(event.target.value);
        event.target.style.height = 'auto';
        event.target.style.height = `${event.target.scrollHeight}px`;
      }}
      className="block w-full resize-none border-b border-pal-muted bg-transparent pb-1.5 text-[15px] outline-none placeholder:text-pal-subdued focus:border-pal-text"
    />
  );
}

function CommentItem({
  comment,
  episodeId,
  canModerate,
  isReply,
  onCountChange,
  onRemoved,
}: {
  comment: Comment;
  episodeId: string;
  canModerate: boolean;
  isReply?: boolean;
  onCountChange: (delta: number) => void;
  onRemoved: () => void;
}) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [dialog, confirm] = useConfirm();
  const [body, setBody] = useState(comment.body);
  const [editedAt, setEditedAt] = useState(comment.editedAt);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(comment.replyCount);
  const [repliesVersion, setRepliesVersion] = useState(0);

  const isMine = Boolean(user && comment.author?.id === user.id);

  const saveEdit = async () => {
    try {
      const { comment: updated } = await api<{ comment: Comment }>(`/api/comments/${comment.id}`, {
        method: 'PATCH',
        json: { body: draft },
      });
      setBody(updated.body);
      setEditedAt(updated.editedAt);
      setEditing(false);
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Delete comment?',
      text: replyCount ? 'Its replies will be deleted too.' : 'This can’t be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/comments/${comment.id}`, { method: 'DELETE' });
      onCountChange(-(1 + replyCount));
      onRemoved();
      toast('Comment deleted');
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const menu = [
    ...(isMine ? [{ label: 'Edit', onSelect: () => setEditing(true) }] : []),
    ...(isMine || canModerate ? [{ label: 'Delete', onSelect: remove, danger: true }] : []),
  ];

  return (
    <li className="flex gap-3">
      {dialog}
      {comment.author ? (
        <Link href={`/u/${comment.author.username}`} className="shrink-0">
          <Avatar name={comment.author.displayName} image={comment.author.avatar} seed={comment.author.id} className={isReply ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'} />
        </Link>
      ) : (
        <span className={isReply ? 'h-7 w-7 shrink-0 rounded-full bg-pal-elevated' : 'h-9 w-9 shrink-0 rounded-full bg-pal-elevated'} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {comment.author ? (
            <Link href={`/u/${comment.author.username}`} className="font-bold hover:underline">
              {comment.author.displayName}
            </Link>
          ) : (
            <span className="font-bold text-pal-subdued">Deleted user</span>
          )}
          {comment.byStoryAuthor && <Badge tone="primary">Author</Badge>}
          <span className="text-xs text-pal-subdued">
            {timeAgo(comment.createdAt)}
            {editedAt && ' (edited)'}
          </span>
          {menu.length > 0 && (
            <span className="ml-auto">
              <MoreMenu items={menu} size="sm" align="right" label="Comment options" />
            </span>
          )}
        </div>

        {editing ? (
          <div className="mt-2">
            <AutoGrowTextarea value={draft} onChange={setDraft} placeholder="Edit your comment" autoFocus />
            <div className="mt-2 flex justify-end gap-2">
              <PillButton variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </PillButton>
              <PillButton size="sm" icon={<Check />} disabled={!draft.trim()} onClick={saveEdit}>
                Save
              </PillButton>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{body}</p>
        )}

        {!isReply && user && !editing && (
          <button type="button" onClick={() => setReplying(true)} className="mt-1 text-xs font-bold text-pal-subdued hover:text-pal-text">
            Reply
          </button>
        )}
        {replying && (
          <div className="mt-3">
            <Composer
              episodeId={episodeId}
              parentId={comment.id}
              placeholder="Add a reply…"
              autoFocus
              onCancel={() => setReplying(false)}
              onPosted={() => {
                setReplying(false);
                setReplyCount((value) => value + 1);
                setShowReplies(true);
                setRepliesVersion((value) => value + 1);
                onCountChange(1);
              }}
            />
          </div>
        )}

        {!isReply && replyCount > 0 && (
          <button
            type="button"
            onClick={() => setShowReplies(!showReplies)}
            className="mt-2 flex items-center gap-1 text-sm font-bold text-pal-accent"
          >
            {showReplies ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
        {showReplies && (
          <Replies
            key={repliesVersion}
            commentId={comment.id}
            episodeId={episodeId}
            canModerate={canModerate}
            onCountChange={(delta) => {
              setReplyCount((value) => value + delta);
              onCountChange(delta);
            }}
          />
        )}
      </div>
    </li>
  );
}

function Replies({
  commentId,
  episodeId,
  canModerate,
  onCountChange,
}: {
  commentId: string;
  episodeId: string;
  canModerate: boolean;
  onCountChange: (delta: number) => void;
}) {
  const list = usePagedList<Comment>(`/api/comments/${commentId}/replies`, 20);
  return (
    <>
      <ul className="mt-4 space-y-4">
        {list.items.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            episodeId={episodeId}
            canModerate={canModerate}
            isReply
            onCountChange={onCountChange}
            onRemoved={() => list.mutate()}
          />
        ))}
      </ul>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoad={list.loadMore} />
    </>
  );
}
