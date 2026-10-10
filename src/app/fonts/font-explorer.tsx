'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Heart } from 'lucide-react';
import { AppPreview } from '@/components/design/app-preview';
import DesignNav from '@/components/design/design-nav';
import {
  APP_FONT_IDS,
  HINDI_FONTS,
  INTERFACE_FONTS,
  READING_FONTS,
  SAME_AS_INTERFACE,
  type FontOption,
} from './fonts';

const STORAGE_KEY = 'font-preview';

type Choice = typeof APP_FONT_IDS;

const SIZES = [
  { id: 's', label: 'S', px: 16 },
  { id: 'm', label: 'M', px: 18 },
  { id: 'l', label: 'L', px: 20 },
  { id: 'xl', label: 'XL', px: 22 },
];

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
];

const STORY = {
  en: {
    label: 'Season 1 · Episode 2',
    title: 'Silver Stairs',
    paragraphs: [
      'The stairs began where the poetry shelves ended. Mira had walked past that corner a thousand times on her night shifts, but tonight the last bookcase stood a few inches away from the wall, and through the gap came a cold, silver light.',
      'She told herself it was the streetlamp. Streetlamps do not hum, though, and they do not smell of rain on old paper.',
      '“Hello?” she whispered. The light flickered, as if it had been waiting for someone to ask. Then, one by one, the steps unfolded upward, each made of pages pressed so tightly together that they shone like metal.',
      'Mira looked back at the empty library, at her cold cup of chai on the returns desk, and climbed.',
    ],
  },
  hi: {
    label: 'सीज़न 1 · एपिसोड 2',
    title: 'चाँदी की सीढ़ियाँ',
    paragraphs: [
      'सीढ़ियाँ वहाँ से शुरू होती थीं जहाँ कविताओं की अलमारी ख़त्म होती थी। मीरा अपनी रात की ड्यूटी में उस कोने से हज़ार बार गुज़री थी, लेकिन आज आख़िरी अलमारी दीवार से कुछ इंच दूर खड़ी थी, और उस दरार से ठंडी, चाँदी-सी रोशनी आ रही थी।',
      'उसने ख़ुद को समझाया कि यह सड़क की बत्ती है। लेकिन सड़क की बत्तियाँ गुनगुनाती नहीं, और उनसे पुराने काग़ज़ पर गिरी बारिश की ख़ुशबू नहीं आती।',
      '“कोई है?” उसने धीरे से पूछा। रोशनी टिमटिमाई, जैसे किसी के पूछने का इंतज़ार कर रही हो। फिर एक-एक करके सीढ़ियाँ ऊपर की ओर खुलने लगीं, हर सीढ़ी काग़ज़ के पन्नों से बनी, जो इतनी कसकर दबे थे कि धातु की तरह चमक रहे थे।',
      'मीरा ने ख़ाली लाइब्रेरी की ओर, काउंटर पर रखी अपनी ठंडी चाय की ओर एक बार मुड़कर देखा, और ऊपर चढ़ने लगी।',
    ],
  },
};

const pick = (options: FontOption[], id: string) => options.find((option) => option.id === id) ?? options[0];

export default function FontExplorer() {
  const [choice, setChoice] = useState<Choice>(APP_FONT_IDS);

  // Reopen the last combination. Storage can be unavailable, so this is best effort.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Choice> | null;
      if (saved) setChoice((current) => ({ ...current, ...saved }));
    } catch {
      // storage unavailable or invalid
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    } catch {
      // storage unavailable
    }
  }, [choice]);

  const ui = pick(INTERFACE_FONTS, choice.ui);
  const reading = pick(READING_FONTS, choice.reading);
  const hindi = pick(HINDI_FONTS, choice.hindi);

  // Fonts without Hindi letters fall back to the Hindi font for Devanagari text.
  const uiFamily = `${ui.family}, ${hindi.family}`;
  const readingFamily = `${reading.id === SAME_AS_INTERFACE ? ui.family : reading.family}, ${hindi.family}`;

  const groups = [
    {
      key: 'ui' as const,
      title: 'Interface font',
      hint: 'Headings, buttons, menus and cards',
      options: INTERFACE_FONTS,
      sample: 'Aa',
    },
    { key: 'reading' as const, title: 'Reading font', hint: 'Story and episode text', options: READING_FONTS, sample: 'Aa' },
    { key: 'hindi' as const, title: 'Hindi font', hint: 'Devanagari text everywhere', options: HINDI_FONTS, sample: 'कहानी' },
  ];

  return (
    <div className="min-h-screen bg-pal-base text-pal-text" style={{ fontFamily: uiFamily }}>
      <header className="sticky top-0 z-30 border-b border-pal-border bg-pal-base">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-pal-accent">Fonts</p>
            <h1 className="truncate font-bold">
              {ui.name} <span className="text-pal-subdued">+</span> {reading.name}{' '}
              <span className="text-pal-subdued">+</span> {hindi.name}
            </h1>
          </div>
          <DesignNav />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-14 px-4 pb-20 pt-8 sm:px-6">
        <section className="grid gap-5 rounded-xl bg-pal-surface p-5 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="text-xs font-bold uppercase tracking-wider text-pal-subdued">{group.title}</p>
              <p className="mb-3 text-xs text-pal-muted">{group.hint}</p>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const selected = choice[group.key] === option.id;
                  const family = option.id === SAME_AS_INTERFACE ? ui.family : option.family;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setChoice((current) => ({ ...current, [group.key]: option.id }))}
                      style={{ fontFamily: family }}
                      className={`flex items-baseline gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[15px] transition-colors ${
                        selected ? 'bg-pal-text text-pal-base' : 'bg-pal-elevated text-pal-text hover:bg-pal-highlight'
                      }`}
                    >
                      <span className="font-bold">{group.key === 'hindi' ? group.sample : option.name}</span>
                      {group.key === 'hindi' && <span className="text-xs">{option.name}</span>}
                      {option.id === APP_FONT_IDS[group.key] && (
                        <span className="text-[10px] font-bold uppercase opacity-70">In use</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <FontCard role="Interface" font={ui} family={uiFamily} hindiName={hindi.name} />
          <FontCard
            role="Reading"
            font={
              reading.id === SAME_AS_INTERFACE
                ? { ...ui, name: `${ui.name} (same as interface)`, description: reading.description }
                : reading
            }
            family={readingFamily}
            hindiName={hindi.name}
          />
          <FontCard role="Hindi" font={hindi} family={hindi.family} hindiName={hindi.name} />
        </section>

        <TypeScale />
        <Reader uiFamily={uiFamily} readingFamily={readingFamily} />

        <section>
          <SectionTitle title="In the app" hint="The interface font across the Spotify-style story app." />
          <AppPreview />
        </section>
      </main>
    </div>
  );
}

function FontCard({ role, font, family, hindiName }: { role: string; font: FontOption; family: string; hindiName: string }) {
  return (
    <div className="flex flex-col rounded-xl bg-pal-surface p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-pal-accent">{role}</p>
      <p className="mt-2 text-3xl font-bold" style={{ fontFamily: family }}>
        {font.name}
      </p>
      <p className="text-sm text-pal-subdued">{font.category}</p>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-pal-subdued">{font.description}</p>
      <p className="mt-4 text-2xl" style={{ fontFamily: family }}>
        Aa Gg Rr 0123 <span className="text-pal-accent">कहानी</span>
      </p>
      <p className="mt-1 text-xs text-pal-muted">
        {role === 'Hindi' ? 'Used for all Devanagari text' : font.hindi ? 'Has its own Hindi letters' : `Hindi text uses ${hindiName}`}
      </p>
    </div>
  );
}

function TypeScale() {
  const rows = [
    { label: 'Display', spec: '56 · Extrabold', className: 'text-4xl sm:text-[56px] font-extrabold tracking-tight leading-none', text: 'Stories that stay with you.' },
    { label: 'Heading', spec: '32 · Bold', className: 'text-[32px] font-bold tracking-tight leading-tight', text: 'The Moon Archive' },
    { label: 'Title', spec: '20 · Semibold', className: 'text-xl font-semibold', text: 'Season 1 · 18 episodes' },
    {
      label: 'Body',
      spec: '16 · Regular',
      className: 'text-base',
      text: 'A night librarian finds a door between two shelves that opens onto the moon, and a library that has been waiting for her.',
    },
    { label: 'Small', spec: '14 · Subdued', className: 'text-sm text-pal-subdued', text: 'Alice Tales • 12.4K reads • 6 min read' },
    { label: 'Label', spec: '12 · Bold caps', className: 'text-xs font-bold uppercase tracking-wider', text: 'New episode · Ongoing · Mature' },
    { label: 'Hindi', spec: '16 · Regular', className: 'text-base', text: 'नए एपिसोड · आपकी लाइब्रेरी · पढ़ना जारी रखें · 4.6 ★' },
    { label: 'Numbers', spec: '16 · Medium', className: 'text-base font-medium tabular-nums', text: '0123456789 · 1,234,567 reads · ₹49 · 12:45' },
  ];

  return (
    <section>
      <SectionTitle title="Type scale" hint="The interface font at the sizes and weights the app will use." />
      <div className="divide-y divide-pal-border rounded-xl bg-pal-surface">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-2 px-5 py-4 sm:grid-cols-[140px_1fr] sm:items-baseline">
            <div>
              <p className="text-sm font-semibold">{row.label}</p>
              <p className="text-xs text-pal-muted">{row.spec}</p>
            </div>
            <p className={row.className}>{row.text}</p>
          </div>
        ))}
        <div className="grid gap-2 px-5 py-5 sm:grid-cols-[140px_1fr] sm:items-center">
          <div>
            <p className="text-sm font-semibold">Weights</p>
            <p className="text-xs text-pal-muted">400 → 800</p>
          </div>
          <div className="flex flex-wrap gap-6">
            {[400, 500, 600, 700, 800].map((weight) => (
              <div key={weight} className="text-center">
                <p className="text-4xl" style={{ fontWeight: weight }}>
                  Aa
                </p>
                <p className="text-xs text-pal-muted">{weight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Reader({ uiFamily, readingFamily }: { uiFamily: string; readingFamily: string }) {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [sizeId, setSizeId] = useState('m');
  const size = SIZES.find((option) => option.id === sizeId) ?? SIZES[1];
  const story = STORY[language];

  return (
    <section>
      <SectionTitle
        title="Reading"
        hint="Story text in the reading font. Long reading needs a calm font, a comfortable size and generous line spacing."
      />
      <div className="overflow-hidden rounded-xl bg-pal-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pal-border px-5 py-3">
          <Segmented options={LANGUAGES} value={language} onChange={(id) => setLanguage(id as 'en' | 'hi')} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-pal-subdued">Text size</span>
            <Segmented options={SIZES} value={sizeId} onChange={setSizeId} />
          </div>
        </div>

        <article
          className="mx-auto max-w-[68ch] px-5 py-10 sm:py-14"
          style={{ fontFamily: readingFamily, fontSize: size.px, lineHeight: language === 'hi' ? 1.9 : 1.8 }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-pal-accent" style={{ fontFamily: uiFamily }}>
            {story.label}
          </p>
          <h3 className="mt-3 font-bold leading-tight" style={{ fontSize: '2em' }}>
            {story.title}
          </h3>
          <p className="mt-2 text-sm text-pal-subdued" style={{ fontFamily: uiFamily }}>
            The Moon Archive · Alice Tales · 8 min read
          </p>
          {/* Slightly softened white: less glare during long reading on black. */}
          <div className="mt-8 space-y-[1em]" style={{ color: 'color-mix(in srgb, var(--p-text) 88%, var(--p-surface))' }}>
            {story.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-10 flex items-center justify-between border-t border-pal-border pt-6" style={{ fontFamily: uiFamily }}>
            <button type="button" className="flex items-center gap-2 text-sm font-semibold text-pal-accent">
              <Heart className="h-5 w-5" fill="currentColor" /> 1.2K
            </button>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-pal-primary px-5 py-2.5 text-sm font-bold text-pal-on-primary transition hover:bg-pal-primary-hover"
            >
              Next episode <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex rounded-full bg-pal-elevated p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
            value === option.id ? 'bg-pal-text text-pal-base' : 'text-pal-subdued hover:text-pal-text'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
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
