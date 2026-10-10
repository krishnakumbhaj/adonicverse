'use client';

import { useState } from 'react';
import { FileText, Layers, X } from 'lucide-react';
import { CONTENT_RATINGS, GENRES, LANGUAGES, LIMITS, STORY_PROGRESS, type ContentRating, type StoryProgress } from '@/config/content';
import { SelectField, TextAreaField, TextField, FieldError } from '@/components/app/fields';
import { Chip, cx } from '@/components/app/primitives';
import type { Channel } from '@/lib/client/types';

export type StoryFormValues = {
  channelId: string;
  type: 'single' | 'series';
  title: string;
  synopsis: string;
  genres: string[];
  tags: string[];
  language: string;
  contentRating: ContentRating;
  progress: StoryProgress;
};

type Errors = Record<string, string[] | undefined> | undefined;

const RATING_INFO: Record<ContentRating, { label: string; text: string }> = {
  general: { label: 'Everyone', text: 'Suitable for all readers' },
  teen: { label: 'Teen', text: 'Some mature themes, 13+' },
  mature: { label: 'Mature', text: 'Adult content, 18+. Hidden from browsing unless readers opt in.' },
};

/** The story details form, shared by "New story" and the Details tab of the story manager. */
export function StoryFields({
  values,
  onChange,
  errors,
  mode,
  channels = [],
}: {
  values: StoryFormValues;
  onChange: (values: StoryFormValues) => void;
  errors: Errors;
  mode: 'create' | 'edit';
  channels?: Channel[];
}) {
  const set = <K extends keyof StoryFormValues>(key: K, value: StoryFormValues[K]) => onChange({ ...values, [key]: value });
  const error = (name: string) => errors?.[name]?.[0];

  const toggleGenre = (slug: string) =>
    set(
      'genres',
      values.genres.includes(slug)
        ? values.genres.filter((genre) => genre !== slug)
        : values.genres.length < LIMITS.genresPerStory
          ? [...values.genres, slug]
          : values.genres,
    );

  return (
    <div className="space-y-7">
      {mode === 'create' && channels.length > 1 && (
        <SelectField label="Channel" name="channelId" value={values.channelId} onChange={(event) => set('channelId', event.target.value)}>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name} (@{channel.handle})
            </option>
          ))}
        </SelectField>
      )}

      {mode === 'create' && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">What are you writing?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { type: 'series' as const, Icon: Layers, title: 'Series', text: 'Seasons and episodes, published one by one.' },
              { type: 'single' as const, Icon: FileText, title: 'Short story', text: 'One complete piece, read in a single sitting.' },
            ].map(({ type, Icon, title, text }) => (
              <button
                key={type}
                type="button"
                aria-pressed={values.type === type}
                onClick={() => set('type', type)}
                className={cx(
                  'flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors',
                  values.type === type ? 'border-pal-primary bg-white/[.07]' : 'border-pal-highlight hover:border-pal-muted',
                )}
              >
                <Icon className={cx('mt-0.5 h-6 w-6 shrink-0', values.type === type ? 'text-pal-accent' : 'text-pal-subdued')} />
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="block text-sm text-pal-subdued">{text}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <TextField label="Title" name="title" value={values.title} maxLength={150} onChange={(event) => set('title', event.target.value)} error={error('title')} />
      <TextAreaField
        label="Synopsis"
        name="synopsis"
        value={values.synopsis}
        maxLength={2000}
        rows={5}
        onChange={(event) => set('synopsis', event.target.value)}
        hint={`What's it about? Hook your readers. Markdown works: **bold**, *italic*, - lists. ${values.synopsis.length}/2000`}
        error={error('synopsis')}
      />

      <fieldset>
        <legend className="mb-2 flex w-full items-center justify-between text-sm font-bold">
          Genres <span className="font-normal text-pal-subdued">{values.genres.length}/{LIMITS.genresPerStory}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <Chip key={genre.slug} selected={values.genres.includes(genre.slug)} onClick={() => toggleGenre(genre.slug)}>
              {genre.name}
            </Chip>
          ))}
        </div>
        <FieldError message={error('genres')} />
      </fieldset>

      <TagInput tags={values.tags} onChange={(tags) => set('tags', tags)} error={error('tags')} />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Language" name="language" value={values.language} onChange={(event) => set('language', event.target.value)} error={error('language')}>
          {!LANGUAGES.some((language) => language.code === values.language) && <option value={values.language}>{values.language}</option>}
          {LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </SelectField>
        {mode === 'edit' && values.type === 'series' && (
          <SelectField label="Status" name="progress" value={values.progress} onChange={(event) => set('progress', event.target.value as StoryProgress)}>
            {STORY_PROGRESS.map((progress) => (
              <option key={progress} value={progress}>
                {progress === 'hiatus' ? 'On hiatus' : progress[0].toUpperCase() + progress.slice(1)}
              </option>
            ))}
          </SelectField>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Who is it for?</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {CONTENT_RATINGS.map((rating) => (
            <button
              key={rating}
              type="button"
              aria-pressed={values.contentRating === rating}
              onClick={() => set('contentRating', rating)}
              className={cx(
                'rounded-lg border-2 p-3 text-left transition-colors',
                values.contentRating === rating ? 'border-pal-primary bg-white/[.07]' : 'border-pal-highlight hover:border-pal-muted',
              )}
            >
              <span className="block font-bold">{RATING_INFO[rating].label}</span>
              <span className="block text-xs text-pal-subdued">{RATING_INFO[rating].text}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** Type a tag and press Enter or comma. The server normalizes them (e.g. "Slow Burn" → slow-burn). */
function TagInput({ tags, onChange, error }: { tags: string[]; onChange: (tags: string[]) => void; error?: string }) {
  const [text, setText] = useState('');

  const add = () => {
    const tag = text.trim().replace(/^#/, '');
    if (tag && !tags.includes(tag) && tags.length < LIMITS.tagsPerStory) onChange([...tags, tag]);
    setText('');
  };

  return (
    <div>
      <TextField
        label={`Tags (${tags.length}/${LIMITS.tagsPerStory})`}
        name="tags"
        value={text}
        placeholder="e.g. slow burn, magic, found family"
        onChange={(event) => setText(event.target.value.replace(',', ''))}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add();
          } else if (event.key === 'Backspace' && !text && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={add}
        hint="Press Enter after each tag. Tags help readers find your story."
        error={error}
      />
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-white/[.1] py-1 pl-3 pr-1 text-sm">
              #{tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(tags.filter((item) => item !== tag))}
                className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
