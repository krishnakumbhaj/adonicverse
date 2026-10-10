'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { AppPreview, ComponentShowcase } from '@/components/design/app-preview';
import DesignNav from '@/components/design/design-nav';
import {
  APP_PALETTE_ID,
  PALETTES,
  contrastGrade,
  contrastRatio,
  paletteCss,
  paletteVariables,
  type Palette,
  type PaletteColors,
} from './palettes';

const STORAGE_KEY = 'palette-preview';
const APP_PALETTE_INDEX = PALETTES.findIndex((p) => p.id === APP_PALETTE_ID);

export default function PaletteExplorer() {
  const [index, setIndex] = useState(APP_PALETTE_INDEX);
  const palette = PALETTES[index];

  // Reopen the palette viewed last time. Storage can be unavailable, so this is best effort.
  useEffect(() => {
    try {
      const saved = PALETTES.findIndex((p) => p.id === localStorage.getItem(STORAGE_KEY));
      if (saved >= 0) setIndex(saved);
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, palette.id);
    } catch {
      // storage unavailable
    }
    // Keep the page edges (overscroll) in the palette's color too.
    document.body.style.backgroundColor = palette.colors.base;
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [palette]);

  const step = useCallback((delta: number) => {
    setIndex((current) => (current + delta + PALETTES.length) % PALETTES.length);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  return (
    <div
      style={paletteVariables(palette.colors)}
      className="min-h-screen bg-pal-base text-pal-text transition-colors duration-300"
    >
      <Header palette={palette} index={index} onStep={step} />
      <main className="mx-auto max-w-7xl space-y-14 px-4 pb-20 pt-8 sm:px-6">
        <div className="space-y-10">
          <PalettePicker index={index} onSelect={setIndex} />
          <Intro palette={palette} />
        </div>
        <Swatches colors={palette.colors} />
        <ContrastChecks colors={palette.colors} />
        <section>
          <SectionTitle title="Live preview" hint="How the story app would look in this palette. Try hovering and clicking." />
          <AppPreview />
        </section>
        <section>
          <SectionTitle title="Components" hint="Buttons, chips, inputs and states." />
          <ComponentShowcase />
        </section>
      </main>
    </div>
  );
}

/** Slim sticky bar: which palette is showing, and quick previous/next while scrolling. */
function Header({ palette, index, onStep }: { palette: Palette; index: number; onStep: (delta: number) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-pal-border bg-pal-base">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: palette.colors.primary }} />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-pal-accent">Dark theme palettes</p>
            <h1 className="truncate font-bold">{palette.name}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DesignNav />
          <RoundButton label="Previous palette (←)" onClick={() => onStep(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </RoundButton>
          <span className="w-12 text-center text-sm tabular-nums text-pal-subdued">
            {index + 1} / {PALETTES.length}
          </span>
          <RoundButton label="Next palette (→)" onClick={() => onStep(1)}>
            <ChevronRight className="h-5 w-5" />
          </RoundButton>
          <span className="hidden sm:block">
            <CopyButton text={paletteCss(palette)} label="Copy CSS" />
          </span>
        </div>
      </div>
    </header>
  );
}

const PICKER_GROUPS = [
  { title: 'Purple, made for you', group: 'purple' },
  { title: 'More colors', group: 'color' },
  { title: 'How other companies do it', group: 'reference' },
] as const;

function PalettePicker({ index, onSelect }: { index: number; onSelect: (index: number) => void }) {
  return (
    <nav aria-label="Palettes" className="grid gap-5 rounded-xl bg-pal-surface p-5 lg:grid-cols-3">
      {PICKER_GROUPS.map(({ title, group }) => (
        <div key={group}>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-pal-subdued">{title}</p>
          <div className="flex flex-wrap gap-2">
            {PALETTES.filter((item) => item.group === group).map((item) => {
              const itemIndex = PALETTES.indexOf(item);
              const selected = itemIndex === index;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(itemIndex)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-2 pr-3.5 text-sm font-semibold transition-colors ${
                    selected ? 'bg-pal-text text-pal-base' : 'bg-pal-elevated text-pal-text hover:bg-pal-highlight'
                  }`}
                >
                  {/* Mini preview: the palette's background with its accent on top. */}
                  <span
                    className="grid h-5 w-5 place-items-center rounded-full ring-1 ring-white/15"
                    style={{ backgroundColor: item.colors.surface }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.colors.primary }} />
                  </span>
                  {item.name}
                  {item.id === APP_PALETTE_ID && <span className="text-[10px] font-bold uppercase opacity-70">In use</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Intro({ palette }: { palette: Palette }) {
  const layers: (keyof PaletteColors)[] = ['base', 'surface', 'elevated', 'highlight', 'subdued', 'text', 'primary', 'accent'];

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {palette.id === APP_PALETTE_ID && (
            <span className="rounded-full bg-pal-primary px-2.5 py-0.5 text-xs font-bold text-pal-on-primary">
              In use in the app
            </span>
          )}
          <span className="text-sm font-semibold text-pal-subdued">
            {palette.group === 'reference'
              ? `Inspired by ${palette.name}`
              : palette.group === 'purple'
                ? 'Purple option'
                : 'Color option'}
          </span>
        </div>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">{palette.name}</h2>
        <p className="mt-4 max-w-2xl text-lg text-pal-text">{palette.tagline}</p>
        <p className="mt-2 max-w-2xl text-pal-subdued">{palette.approach}</p>
      </div>
      <div aria-label="Palette at a glance" className="flex h-28 overflow-hidden rounded-xl ring-1 ring-pal-border">
        {layers.map((key) => (
          <div key={key} className="flex-1" style={{ backgroundColor: palette.colors[key] }} title={`${key}: ${palette.colors[key]}`} />
        ))}
      </div>
    </section>
  );
}

const SWATCH_GROUPS: { title: string; items: { key: keyof PaletteColors; label: string; use: string }[] }[] = [
  {
    title: 'Backgrounds',
    items: [
      { key: 'base', label: 'Base', use: 'App frame, behind panels' },
      { key: 'surface', label: 'Surface', use: 'Main panels' },
      { key: 'elevated', label: 'Elevated', use: 'Cards, menus, inputs' },
      { key: 'highlight', label: 'Highlight', use: 'Hover, selected rows' },
      { key: 'border', label: 'Border', use: 'Dividers, outlines' },
    ],
  },
  {
    title: 'Text',
    items: [
      { key: 'text', label: 'Text', use: 'Titles and reading text' },
      { key: 'subdued', label: 'Subdued', use: 'Metadata, descriptions' },
      { key: 'muted', label: 'Muted', use: 'Timestamps, hints' },
    ],
  },
  {
    title: 'Brand',
    items: [
      { key: 'primary', label: 'Primary', use: 'Buttons, progress, active' },
      { key: 'primaryHover', label: 'Primary hover', use: 'Pressed and hover state' },
      { key: 'onPrimary', label: 'On primary', use: 'Text on primary buttons' },
      { key: 'accent', label: 'Accent', use: 'Links, icons, likes on dark' },
      { key: 'hero', label: 'Hero', use: 'Story header gradient' },
      { key: 'rating', label: 'Rating', use: 'Stars' },
    ],
  },
  {
    title: 'Status',
    items: [
      { key: 'success', label: 'Success', use: 'Saved, published' },
      { key: 'warning', label: 'Warning', use: 'Drafts, attention' },
      { key: 'danger', label: 'Danger', use: 'Errors, delete' },
    ],
  },
];

function Swatches({ colors }: { colors: PaletteColors }) {
  const { copied, copy } = useCopy();

  return (
    <section>
      <SectionTitle title="Swatches" hint="Click a color to copy its hex code." />
      <div className="grid gap-4 lg:grid-cols-2">
        {SWATCH_GROUPS.map((group) => (
          <div key={group.title} className="rounded-xl bg-pal-surface p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-pal-subdued">{group.title}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {group.items.map(({ key, label, use }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => copy(key, colors[key])}
                  aria-label={`Copy ${label} ${colors[key]}`}
                  className="group rounded-lg p-2 text-left transition-colors hover:bg-pal-elevated"
                >
                  <span
                    className="mb-2 flex h-16 items-center justify-center rounded-md ring-1 ring-inset ring-white/10"
                    style={{ backgroundColor: colors[key] }}
                  >
                    {copied === key && <Check className="h-5 w-5 mix-blend-difference text-white" />}
                  </span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block font-mono text-xs uppercase text-pal-subdued">{colors[key]}</span>
                  <span className="mt-0.5 block text-xs text-pal-muted">{use}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const CHECKS: { label: string; fg: keyof PaletteColors; bg: keyof PaletteColors }[] = [
  { label: 'Reading text', fg: 'text', bg: 'surface' },
  { label: 'Secondary text', fg: 'subdued', bg: 'surface' },
  { label: 'Accent on panels', fg: 'accent', bg: 'surface' },
  { label: 'Accent on cards', fg: 'accent', bg: 'elevated' },
  { label: 'Button text', fg: 'onPrimary', bg: 'primary' },
];

function ContrastChecks({ colors }: { colors: PaletteColors }) {
  return (
    <section>
      <SectionTitle
        title="Readability"
        hint="WCAG contrast. 4.5:1 (AA) is the minimum for normal text, and 7:1 (AAA) is ideal for long reading."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CHECKS.map(({ label, fg, bg }) => {
          const ratio = contrastRatio(colors[fg], colors[bg]);
          const grade = contrastGrade(ratio);
          const gradeColor =
            grade === 'AAA' || grade === 'AA' ? 'text-pal-success' : grade === 'Fails' ? 'text-pal-danger' : 'text-pal-warning';
          return (
            <div key={label} className="rounded-xl bg-pal-surface p-4">
              <div
                className="mb-3 flex h-16 items-center justify-center rounded-lg text-2xl font-bold"
                style={{ backgroundColor: colors[bg], color: colors[fg] }}
              >
                Aa
              </div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold tabular-nums">{ratio.toFixed(2)}:1</span>
                <span className={`text-xs font-bold ${gradeColor}`}>{grade}</span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-pal-subdued">{hint}</p>
    </div>
  );
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full bg-pal-elevated text-pal-text transition-colors hover:bg-pal-highlight"
    >
      {children}
    </button>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy('all', text)}
      className="flex items-center gap-2 rounded-full border border-pal-muted px-4 py-2 text-sm font-bold transition-colors hover:border-pal-text"
    >
      {copied ? <Check className="h-4 w-4 text-pal-accent" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, text: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(key);
        setTimeout(() => setCopied((current) => (current === key ? null : current)), 1200);
      })
      .catch(() => {
        // clipboard blocked; nothing to do
      });
  };
  return { copied, copy };
}
