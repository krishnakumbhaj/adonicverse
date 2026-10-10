'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, FileText, Plus } from 'lucide-react';
import { useConfirm } from '@/components/app/confirm';
import { MoreMenu, type MenuItem } from '@/components/app/menu';
import { Poster } from '@/components/app/poster';
import { Badge, Chip, ChipRow, EmptyState, PillButton, PillLink, Spinner } from '@/components/app/primitives';
import { useToast } from '@/components/app/toast';
import { CROP_PRESETS } from '@/components/studio/image-cropper';
import { ImageUploadButton } from '@/components/studio/image-upload-button';
import { StoryFields, type StoryFormValues } from '@/components/studio/story-fields';
import { api, ApiClientError, errorMessage } from '@/lib/client/api';
import { compactNumber, plural, storyKind } from '@/lib/client/format';
import { useApi, useRevalidate } from '@/lib/client/hooks';
import type { Episode, SeasonWithEpisodes, Story, StoryResponse, TableOfContents } from '@/lib/client/types';

type Confirm = ReturnType<typeof useConfirm>[1];

export default function StudioStoryView({ storyId }: { storyId: string }) {
  const story = useApi<StoryResponse>(`/api/stories/${storyId}`);
  const toc = useApi<TableOfContents>(`/api/stories/${storyId}/episodes`);

  if (story.error) return <EmptyState title="Story not found" action={<PillLink href="/studio" variant="white">Back to Studio</PillLink>} />;
  if (!story.data || !toc.data) return <Spinner />;
  if (!story.data.viewer?.canManage) {
    return <EmptyState title="Not your story" text="Only its author can manage it." action={<PillLink href={`/story/${storyId}`} variant="white">View story</PillLink>} />;
  }
  return (
    <Manager
      story={story.data.story}
      toc={toc.data}
      refresh={() => {
        story.mutate();
        toc.mutate();
      }}
    />
  );
}

function Manager({ story, toc, refresh }: { story: Story; toc: TableOfContents; refresh: () => void }) {
  const router = useRouter();
  const revalidate = useRevalidate();
  const { toast } = useToast();
  const [dialog, confirm] = useConfirm();
  const [tab, setTab] = useState<'episodes' | 'details'>('episodes');
  const [busy, setBusy] = useState(false);
  const published = story.status === 'published';
  const backHref = story.channel ? `/studio/channel/${story.channel.handle}` : '/studio';

  const setPublished = async (publish: boolean) => {
    setBusy(true);
    try {
      await api(`/api/stories/${story.id}/publish`, { method: publish ? 'POST' : 'DELETE' });
      toast(publish ? 'Published! Readers can find it now.' : 'Moved back to drafts');
      refresh();
      revalidate('/api/stories', '/api/channels', '/api/me');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removePoster = async () => {
    try {
      await api(`/api/stories/${story.id}/poster`, { method: 'DELETE' });
      refresh();
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const deleteStory = async () => {
    const ok = await confirm({
      title: `Delete "${story.title}"?`,
      text: 'Every episode, comment, review and the poster will be deleted for good. This can’t be undone.',
      confirmLabel: 'Delete story',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/stories/${story.id}`, { method: 'DELETE' });
      toast('Story deleted');
      revalidate('/api/stories', '/api/channels', '/api/me');
      router.push(backHref);
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  return (
    <div className="px-4 pb-16 pt-4 md:px-6 md:pt-6">
      {dialog}
      <Link href={backHref} className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-pal-subdued hover:text-pal-text">
        <ChevronLeft className="h-4 w-4" /> {story.channel?.name ?? 'Studio'}
      </Link>

      <div className="flex flex-col gap-6 md:flex-row md:items-end">
        <div className="shrink-0">
          <Poster story={story} sizes="176px" className="aspect-[2/3] w-32 rounded-md shadow-[0_8px_24px_rgba(0,0,0,.5)] md:w-44" />
          <div className="mt-3 flex flex-wrap gap-2">
            <ImageUploadButton
              path={`/api/stories/${story.id}/poster`}
              field="poster"
              label={story.poster ? 'Change poster' : 'Add poster'}
              variant="outline"
              crop={CROP_PRESETS.poster}
              onUploaded={refresh}
            />
            {story.poster && (
              <PillButton variant="ghost" size="sm" onClick={removePoster}>
                Remove
              </PillButton>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{storyKind(story.type)}</span>
            {published ? <Badge tone="primary">Published</Badge> : <Badge tone="warning">Draft</Badge>}
          </div>
          <h1 className="mt-1 break-words text-3xl font-black tracking-tight md:text-5xl">{story.title}</h1>
          <p className="mt-2 text-sm text-pal-subdued">
            {[
              story.type === 'series' ? plural(story.stats.episodes, 'published episode') : null,
              plural(story.stats.words, 'word'),
              `${compactNumber(story.stats.views)} reads`,
              plural(story.stats.saves, 'save'),
              story.rating.count ? `★ ${story.rating.average.toFixed(1)}` : null,
            ]
              .filter(Boolean)
              .join(' • ')}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {published ? (
              <PillButton variant="outline" loading={busy} onClick={() => setPublished(false)}>
                Unpublish
              </PillButton>
            ) : (
              <PillButton loading={busy} onClick={() => setPublished(true)}>
                Publish story
              </PillButton>
            )}
            <PillLink href={`/story/${story.id}`} variant="outline">
              {published ? 'View story' : 'Preview'}
            </PillLink>
            <MoreMenu items={[{ label: 'Delete story', onSelect: deleteStory, danger: true }]} label="Story options" />
          </div>
          {!published && (
            <p className="mt-3 text-sm text-pal-subdued">
              {story.type === 'series'
                ? 'Publish at least one episode, then publish the series.'
                : 'Write the story text, then publish.'}
            </p>
          )}
        </div>
      </div>

      <ChipRow className="mb-6 mt-10">
        <Chip selected={tab === 'episodes'} onClick={() => setTab('episodes')}>
          {story.type === 'series' ? 'Seasons & episodes' : 'Story text'}
        </Chip>
        <Chip selected={tab === 'details'} onClick={() => setTab('details')}>
          Details
        </Chip>
      </ChipRow>

      {tab === 'details' ? (
        <DetailsForm story={story} onSaved={refresh} />
      ) : story.type === 'single' ? (
        <SingleText episode={toc.episodes[0]} />
      ) : (
        <SeasonsManager story={story} seasons={toc.seasons} refresh={refresh} confirm={confirm} />
      )}
    </div>
  );
}

function SingleText({ episode }: { episode?: Episode }) {
  if (!episode) return null;
  return (
    <div className="flex max-w-2xl flex-wrap items-center gap-4 rounded-lg bg-white/[.07] p-5">
      <FileText className="h-8 w-8 text-pal-accent" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">Story text</p>
        <p className="text-sm text-pal-subdued">
          {episode.wordCount ? `${plural(episode.wordCount, 'word')} · ${episode.readingMinutes} min read` : 'Not written yet'}
        </p>
      </div>
      <PillLink href={`/studio/episode/${episode.id}`}>{episode.wordCount ? 'Edit text' : 'Start writing'}</PillLink>
    </div>
  );
}

function SeasonsManager({
  story,
  seasons,
  refresh,
  confirm,
}: {
  story: Story;
  seasons: SeasonWithEpisodes[];
  refresh: () => void;
  confirm: Confirm;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const run = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await action();
      if (success) toast(success);
      refresh();
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const moveSeason = (index: number, delta: number) => {
    const order = seasons.map((season) => season.id);
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    run(() => api(`/api/stories/${story.id}/seasons/order`, { method: 'PUT', json: { order } }));
  };

  const addEpisode = async (season: SeasonWithEpisodes) => {
    try {
      const { episode } = await api<{ episode: Episode }>(`/api/stories/${story.id}/episodes`, {
        method: 'POST',
        json: { seasonId: season.id, title: `Episode ${season.episodes.length + 1}` },
      });
      router.push(`/studio/episode/${episode.id}`);
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      {seasons.map((season, index) => (
        <SeasonCard
          key={season.id}
          season={season}
          index={index}
          seasons={seasons}
          run={run}
          confirm={confirm}
          onMove={(delta) => moveSeason(index, delta)}
          onAddEpisode={() => addEpisode(season)}
        />
      ))}
      <PillButton
        variant="outline"
        onClick={() => run(() => api(`/api/stories/${story.id}/seasons`, { method: 'POST', json: {} }), 'Season added')}
      >
        <Plus className="h-4 w-4" /> Add season
      </PillButton>
    </div>
  );
}

const seasonLabel = (season: SeasonWithEpisodes, index: number) => season.title || `Season ${index + 1}`;

function SeasonCard({
  season,
  index,
  seasons,
  run,
  confirm,
  onMove,
  onAddEpisode,
}: {
  season: SeasonWithEpisodes;
  index: number;
  seasons: SeasonWithEpisodes[];
  run: (action: () => Promise<unknown>, success?: string) => Promise<void>;
  confirm: Confirm;
  onMove: (delta: number) => void;
  onAddEpisode: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(season.title);

  const rename = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(() => api(`/api/seasons/${season.id}`, { method: 'PATCH', json: { title } }));
    setRenaming(false);
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${seasonLabel(season, index)}?`,
      text: `Its ${plural(season.episodes.length, 'episode')} and their comments will be deleted for good.`,
      confirmLabel: 'Delete season',
      danger: true,
    });
    if (ok) run(() => api(`/api/seasons/${season.id}`, { method: 'DELETE' }), 'Season deleted');
  };

  const moveEpisode = (position: number, delta: number) => {
    const order = season.episodes.map((episode) => episode.id);
    [order[position], order[position + delta]] = [order[position + delta], order[position]];
    run(() => api(`/api/seasons/${season.id}/episodes/order`, { method: 'PUT', json: { order } }));
  };

  const menu: MenuItem[] = [
    { label: 'Rename', onSelect: () => setRenaming(true) },
    ...(index > 0 ? [{ label: 'Move up', onSelect: () => onMove(-1) }] : []),
    ...(index < seasons.length - 1 ? [{ label: 'Move down', onSelect: () => onMove(1) }] : []),
    { label: 'Delete season', onSelect: remove, danger: true },
  ];

  return (
    <section className="rounded-lg bg-white/[.05]">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        {renaming ? (
          <form onSubmit={rename} className="flex flex-1 items-center gap-2">
            <input
              autoFocus
              value={title}
              maxLength={100}
              placeholder={`Season ${index + 1}`}
              aria-label="Season title"
              onChange={(event) => setTitle(event.target.value)}
              className="min-w-0 flex-1 rounded border border-pal-muted bg-pal-surface px-3 py-1.5 outline-none focus:border-pal-text"
            />
            <PillButton type="submit" size="sm">
              Save
            </PillButton>
            <PillButton variant="ghost" size="sm" onClick={() => setRenaming(false)}>
              Cancel
            </PillButton>
          </form>
        ) : (
          <>
            <h3 className="min-w-0 flex-1 truncate text-lg font-bold">{seasonLabel(season, index)}</h3>
            <span className="text-sm text-pal-subdued">{plural(season.episodes.length, 'episode')}</span>
            <MoreMenu items={menu} size="sm" align="right" label="Season options" />
          </>
        )}
      </header>

      <ol>
        {season.episodes.map((episode, position) => (
          <EpisodeRow
            key={episode.id}
            episode={episode}
            position={position}
            count={season.episodes.length}
            otherSeasons={seasons.map((other, otherIndex) => ({ id: other.id, label: seasonLabel(other, otherIndex) })).filter((other) => other.id !== season.id)}
            run={run}
            confirm={confirm}
            onMove={(delta) => moveEpisode(position, delta)}
          />
        ))}
      </ol>
      <button
        type="button"
        onClick={onAddEpisode}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold text-pal-subdued transition-colors hover:bg-white/[.04] hover:text-pal-text"
      >
        <Plus className="h-4 w-4" /> New episode
      </button>
    </section>
  );
}

function EpisodeRow({
  episode,
  position,
  count,
  otherSeasons,
  run,
  confirm,
  onMove,
}: {
  episode: Episode;
  position: number;
  count: number;
  otherSeasons: { id: string; label: string }[];
  run: (action: () => Promise<unknown>, success?: string) => Promise<void>;
  confirm: Confirm;
  onMove: (delta: number) => void;
}) {
  const published = episode.status === 'published';

  const remove = async () => {
    const ok = await confirm({
      title: `Delete "${episode.title}"?`,
      text: 'The episode, its comments and likes will be deleted for good.',
      confirmLabel: 'Delete episode',
      danger: true,
    });
    if (ok) run(() => api(`/api/episodes/${episode.id}`, { method: 'DELETE' }), 'Episode deleted');
  };

  const menu: MenuItem[] = [
    { label: 'Edit', href: `/studio/episode/${episode.id}` },
    { label: 'Preview', href: `/read/${episode.id}` },
    ...(position > 0 ? [{ label: 'Move up', onSelect: () => onMove(-1) }] : []),
    ...(position < count - 1 ? [{ label: 'Move down', onSelect: () => onMove(1) }] : []),
    ...otherSeasons.map((season) => ({
      label: `Move to ${season.label}`,
      onSelect: () => run(() => api(`/api/episodes/${episode.id}`, { method: 'PATCH', json: { seasonId: season.id } }), `Moved to ${season.label}`),
    })),
    { label: 'Delete episode', onSelect: remove, danger: true },
  ];

  return (
    <li className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/5 px-4 py-2.5 last:border-b-0 sm:grid-cols-[24px_minmax(0,1fr)_auto_auto]">
      <span className="text-right text-sm text-pal-subdued tabular-nums">{position + 1}</span>
      <Link href={`/studio/episode/${episode.id}`} className="min-w-0">
        <span className="block truncate font-medium hover:underline">{episode.title}</span>
        <span className="block text-xs text-pal-subdued">
          {episode.wordCount ? plural(episode.wordCount, 'word') : 'Empty'} · {compactNumber(episode.stats.views)} reads ·{' '}
          {compactNumber(episode.stats.comments)} comments
        </span>
      </Link>
      <span className="hidden sm:block">{published ? <Badge tone="primary">Published</Badge> : <Badge tone="warning">Draft</Badge>}</span>
      <div className="flex items-center gap-1">
        <PillButton
          variant={published ? 'ghost' : 'outline'}
          size="sm"
          onClick={() =>
            run(
              () => api(`/api/episodes/${episode.id}/publish`, { method: published ? 'DELETE' : 'POST' }),
              published ? 'Episode unpublished' : 'Episode published',
            )
          }
        >
          {published ? 'Unpublish' : 'Publish'}
        </PillButton>
        <MoreMenu items={menu} size="sm" align="right" label="Episode options" />
      </div>
    </li>
  );
}

function DetailsForm({ story, onSaved }: { story: Story; onSaved: () => void }) {
  const { toast } = useToast();
  const [values, setValues] = useState<StoryFormValues>({
    channelId: '',
    type: story.type,
    title: story.title,
    synopsis: story.synopsis,
    genres: story.genres,
    tags: story.tags,
    language: story.language,
    contentRating: story.contentRating,
    progress: story.progress,
  });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors(undefined);
    try {
      const { title, synopsis, genres, tags, language, contentRating, progress } = values;
      await api(`/api/stories/${story.id}`, {
        method: 'PATCH',
        json: { title, synopsis, genres, tags, language, contentRating, ...(story.type === 'series' && { progress }) },
      });
      toast('Details saved');
      onSaved();
    } catch (error) {
      if (error instanceof ApiClientError) setErrors(error.fields);
      toast(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <StoryFields values={values} onChange={setValues} errors={errors} mode="edit" />
      <PillButton type="submit" size="lg" loading={saving} className="mt-8">
        Save details
      </PillButton>
    </form>
  );
}
