'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  ChevronLeft,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react';
import { Badge, cx, EmptyState, PillButton, PillLink, Spinner } from '@/components/app/primitives';
import { useToast } from '@/components/app/toast';
import { MarkdownShortcuts } from '@/components/studio/markdown-shortcuts';
import { api, errorMessage } from '@/lib/client/api';
import { plural } from '@/lib/client/format';
import { useApi, useRevalidate } from '@/lib/client/hooks';
import type { Episode, ReadingResponse } from '@/lib/client/types';

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';

export default function EpisodeEditor({ episodeId }: { episodeId: string }) {
  const { data, error, mutate } = useApi<ReadingResponse>(`/api/episodes/${episodeId}`, { revalidateOnMount: true });

  if (error) return <EmptyState title="Episode not found" action={<PillLink href="/studio" variant="white">Back to Studio</PillLink>} />;
  if (!data) return <Spinner className="min-h-dvh items-center" />;
  if (!data.viewer?.canManage) {
    return <EmptyState title="Not your episode" text="Only its author can edit it." action={<PillLink href="/" variant="white">Home</PillLink>} />;
  }
  return <Writer key={episodeId} data={data} refresh={() => mutate()} />;
}

function Writer({ data, refresh }: { data: ReadingResponse; refresh: () => void }) {
  const { story } = data;
  const isSingle = story.type === 'single';
  const { toast } = useToast();
  const revalidate = useRevalidate();
  const [episode, setEpisode] = useState(data.episode);
  const [title, setTitle] = useState(data.episode.title);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [publishing, setPublishing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const editorRef = useRef<Editor | null>(null);
  const titleRef = useRef(title);
  titleRef.current = title;

  const save = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    clearTimeout(timer.current);
    setSaveState('saving');
    try {
      const { episode: saved } = await api<{ episode: Episode & { content: string } }>(`/api/episodes/${episode.id}`, {
        method: 'PATCH',
        json: { content: editor.getHTML(), ...(!isSingle && { title: titleRef.current.trim() || 'Untitled episode' }) },
      });
      setEpisode((current) => ({ ...current, ...saved }));
      setSaveState('saved');
      return true;
    } catch (error) {
      setSaveState('error');
      toast(errorMessage(error), 'error');
      return false;
    }
  }, [episode.id, isSingle, toast]);

  const scheduleSave = useCallback(() => {
    setSaveState('unsaved');
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 1500);
  }, [save]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true },
      }),
      MarkdownShortcuts,
    ],
    content: data.episode.content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'story-content min-h-[55vh] outline-none',
        'aria-label': 'Story text',
      },
    },
    onUpdate: scheduleSave,
  });
  editorRef.current = editor;

  // Ctrl/Cmd+S saves now; warn before leaving with unsaved changes.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        save();
      }
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (saveState !== 'saved') event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [save, saveState]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const words = useEditorState({
    editor,
    selector: ({ editor: current }) => (current ? current.getText().split(/\s+/).filter(Boolean).length : 0),
  }) ?? 0;

  const togglePublish = async () => {
    if (saveState !== 'saved' && !(await save())) return;
    setPublishing(true);
    try {
      if (isSingle) {
        const publish = story.status !== 'published';
        await api(`/api/stories/${story.id}/publish`, { method: publish ? 'POST' : 'DELETE' });
        toast(publish ? 'Story published!' : 'Story moved back to drafts');
        refresh();
        revalidate(`/api/stories/${story.id}`);
        return;
      }
      const publish = episode.status !== 'published';
      const { episode: updated } = await api<{ episode: Episode }>(`/api/episodes/${episode.id}/publish`, {
        method: publish ? 'POST' : 'DELETE',
      });
      setEpisode((current) => ({ ...current, ...updated }));
      toast(publish ? (story.status === 'published' ? 'Episode published!' : 'Episode ready. Publish the series to make it public.') : 'Episode moved back to drafts');
      revalidate(`/api/stories/${story.id}`);
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setPublishing(false);
    }
  };

  const published = isSingle ? story.status === 'published' : episode.status === 'published';
  const status = { saved: 'Saved', unsaved: 'Unsaved changes', saving: 'Saving…', error: "Couldn't save" }[saveState];

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-pal-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-2 md:px-4">
          <Link
            href={`/studio/story/${story.id}`}
            aria-label="Back to story"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{story.title}</p>
            <p className={cx('text-xs', saveState === 'error' ? 'text-pal-danger' : 'text-pal-subdued')}>{status}</p>
          </div>
          {published ? <Badge tone="primary">Published</Badge> : <Badge tone="warning">Draft</Badge>}
          <PillLink href={`/read/${episode.id}`} variant="ghost" size="sm" className="hidden sm:inline-flex">
            Preview
          </PillLink>
          <PillButton size="sm" variant={published ? 'outline' : 'primary'} loading={publishing} onClick={togglePublish}>
            {published ? 'Unpublish' : 'Publish'}
          </PillButton>
        </div>
        <Toolbar editor={editor} />
      </header>

      <main className="mx-auto max-w-[720px] px-5 pb-32 pt-10">
        {isSingle ? (
          <h1 className="font-reading text-4xl font-semibold leading-tight">{story.title}</h1>
        ) : (
          <input
            value={title}
            maxLength={150}
            placeholder="Episode title"
            aria-label="Episode title"
            onChange={(event) => {
              setTitle(event.target.value);
              scheduleSave();
            }}
            className="w-full bg-transparent font-reading text-4xl font-semibold leading-tight outline-none placeholder:text-pal-muted"
          />
        )}
        <div className="mt-8 text-[19px] leading-[1.8]">
          <EditorContent editor={editor} />
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-pal-surface">
        <p className="mx-auto max-w-5xl px-4 py-2 text-right text-xs text-pal-subdued">
          {plural(words, 'word')} · {Math.max(1, Math.ceil(words / 200))} min read
        </p>
      </footer>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive('bold'),
            italic: current.isActive('italic'),
            underline: current.isActive('underline'),
            strike: current.isActive('strike'),
            h2: current.isActive('heading', { level: 2 }),
            h3: current.isActive('heading', { level: 3 }),
            quote: current.isActive('blockquote'),
            bullet: current.isActive('bulletList'),
            ordered: current.isActive('orderedList'),
            canUndo: current.can().undo(),
            canRedo: current.can().redo(),
          }
        : null,
  });
  if (!editor || !state) return <div className="h-11" />;

  const chain = () => editor.chain().focus();
  const buttons = [
    { label: 'Bold', Icon: Bold, active: state.bold, run: () => chain().toggleBold().run() },
    { label: 'Italic', Icon: Italic, active: state.italic, run: () => chain().toggleItalic().run() },
    { label: 'Underline', Icon: Underline, active: state.underline, run: () => chain().toggleUnderline().run() },
    { label: 'Strikethrough', Icon: Strikethrough, active: state.strike, run: () => chain().toggleStrike().run() },
    null,
    { label: 'Heading', Icon: Heading2, active: state.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
    { label: 'Subheading', Icon: Heading3, active: state.h3, run: () => chain().toggleHeading({ level: 3 }).run() },
    { label: 'Quote', Icon: Quote, active: state.quote, run: () => chain().toggleBlockquote().run() },
    { label: 'Bulleted list', Icon: List, active: state.bullet, run: () => chain().toggleBulletList().run() },
    { label: 'Numbered list', Icon: ListOrdered, active: state.ordered, run: () => chain().toggleOrderedList().run() },
    { label: 'Scene break', Icon: Minus, active: false, run: () => chain().setHorizontalRule().run() },
    null,
    { label: 'Undo', Icon: Undo2, active: false, disabled: !state.canUndo, run: () => chain().undo().run() },
    { label: 'Redo', Icon: Redo2, active: false, disabled: !state.canRedo, run: () => chain().redo().run() },
  ];

  return (
    <div role="toolbar" aria-label="Formatting" className="scrollbar-none mx-auto flex h-11 max-w-5xl items-center gap-0.5 overflow-x-auto px-2 md:px-4">
      {buttons.map((button, index) =>
        button ? (
          <button
            key={button.label}
            type="button"
            title={button.label}
            aria-label={button.label}
            aria-pressed={button.active}
            disabled={button.disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={button.run}
            className={cx(
              'grid h-8 w-8 shrink-0 place-items-center rounded transition-colors disabled:opacity-30',
              button.active ? 'bg-pal-text text-pal-base' : 'text-pal-subdued hover:bg-white/10 hover:text-pal-text',
            )}
          >
            <button.Icon className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <span key={`divider-${index}`} className="mx-1 h-5 w-px shrink-0 bg-white/15" />
        ),
      )}
    </div>
  );
}
