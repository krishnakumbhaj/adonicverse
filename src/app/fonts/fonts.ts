import {
  Atkinson_Hyperlegible,
  DM_Sans,
  Figtree,
  Hind,
  Inter,
  Literata,
  Lora,
  Manrope,
  Merriweather,
  Mukta,
  Newsreader,
  Noto_Sans_Devanagari,
  Outfit,
  Plus_Jakarta_Sans,
  Poppins,
  Source_Serif_4,
  Space_Grotesk,
  Tiro_Devanagari_Hindi,
} from 'next/font/google';

// Font candidates for /fonts. `preload: false` keeps the page light: a font file is only
// downloaded when something on screen actually uses it.

const figtree = Figtree({ subsets: ['latin'], display: 'swap', preload: false });
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', preload: false });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap', preload: false });
const outfit = Outfit({ subsets: ['latin'], display: 'swap', preload: false });
const manrope = Manrope({ subsets: ['latin'], display: 'swap', preload: false });
const poppins = Poppins({
  subsets: ['latin', 'devanagari'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  preload: false,
});
const inter = Inter({ subsets: ['latin'], display: 'swap', preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap', preload: false });

const literata = Literata({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', preload: false });
const lora = Lora({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', preload: false });
const merriweather = Merriweather({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', preload: false });
const sourceSerif = Source_Serif_4({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', preload: false });
const newsreader = Newsreader({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', preload: false });
const atkinson = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'], display: 'swap', preload: false });

const mukta = Mukta({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  preload: false,
});
const hind = Hind({ subsets: ['devanagari', 'latin'], weight: ['400', '500', '600', '700'], display: 'swap', preload: false });
const notoDevanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], display: 'swap', preload: false });
const tiro = Tiro_Devanagari_Hindi({ subsets: ['devanagari', 'latin'], weight: '400', display: 'swap', preload: false });

export type FontOption = {
  id: string;
  name: string;
  /** CSS font-family from next/font. Empty for "same as interface". */
  family: string;
  category: string;
  description: string;
  /** Has its own Devanagari letters (otherwise Hindi text uses the Hindi font). */
  hindi: boolean;
};

export const SAME_AS_INTERFACE = 'same-as-interface';

/** The fonts chosen for the app; they are loaded globally in src/app/layout.tsx. */
export const APP_FONT_IDS = { ui: 'plus-jakarta-sans', reading: 'newsreader', hindi: 'noto-sans-devanagari' };

/** Headings, buttons, menus, cards: everything except story text. */
export const INTERFACE_FONTS: FontOption[] = [
  {
    id: 'figtree',
    name: 'Figtree',
    family: figtree.style.fontFamily,
    category: 'Geometric sans',
    hindi: false,
    description:
      "Clean and friendly, with round geometric letters. The closest free match to Spotify's own font (Spotify Mix, formerly Circular).",
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    family: dmSans.style.fontFamily,
    category: 'Geometric sans',
    hindi: false,
    description: 'Also close to Circular, a little more compact. Very tidy in dense lists such as episode tables.',
  },
  {
    id: 'plus-jakarta-sans',
    name: 'Plus Jakarta Sans',
    family: jakarta.style.fontFamily,
    category: 'Modern sans',
    hindi: false,
    description: 'Modern and premium, popular with new startups. A bit more personality in the letters.',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    family: outfit.style.fontFamily,
    category: 'Geometric sans',
    hindi: false,
    description: 'Round, playful geometric shapes. Feels young and casual.',
  },
  {
    id: 'manrope',
    name: 'Manrope',
    family: manrope.style.fontFamily,
    category: 'Modern sans',
    hindi: false,
    description: 'Semi-condensed with excellent numbers. Feels tech-forward and sharp.',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    family: poppins.style.fontFamily,
    category: 'Geometric sans',
    hindi: true,
    description:
      'Very popular, wide geometric sans that includes its own Hindi letters, so English and Hindi match exactly.',
  },
  {
    id: 'inter',
    name: 'Inter',
    family: inter.style.fontFamily,
    category: 'Neutral sans',
    hindi: false,
    description: 'The neutral screen-UI workhorse. Extremely readable, with less personality.',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    family: spaceGrotesk.style.fontFamily,
    category: 'Grotesque',
    hindi: false,
    description: 'What the project uses today. Quirky and techy; less suited to a calm reading app.',
  },
];

/** Story and episode text. */
export const READING_FONTS: FontOption[] = [
  {
    id: 'literata',
    name: 'Literata',
    family: literata.style.fontFamily,
    category: 'Book serif',
    hindi: false,
    description: 'Designed for Google Play Books for long reading on screens. Warm, calm and very legible.',
  },
  {
    id: 'lora',
    name: 'Lora',
    family: lora.style.fontFamily,
    category: 'Book serif',
    hindi: false,
    description: 'Calligraphic, literary and emotional. Lovely for romance and drama.',
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    family: merriweather.style.fontFamily,
    category: 'Newspaper serif',
    hindi: false,
    description: 'Sturdy and wide, made to stay readable at small sizes on phones.',
  },
  {
    id: 'source-serif',
    name: 'Source Serif 4',
    family: sourceSerif.style.fontFamily,
    category: 'Editorial serif',
    hindi: false,
    description: 'Elegant, modern editorial serif. Feels like a quality magazine.',
  },
  {
    id: 'newsreader',
    name: 'Newsreader',
    family: newsreader.style.fontFamily,
    category: 'Editorial serif',
    hindi: false,
    description: 'Refined serif made for long-form reading, slightly more delicate.',
  },
  {
    id: 'atkinson',
    name: 'Atkinson Hyperlegible',
    family: atkinson.style.fontFamily,
    category: 'Accessible sans',
    hindi: false,
    description: 'Made by the Braille Institute so every letter is easy to tell apart. Best for readers with low vision.',
  },
  {
    id: SAME_AS_INTERFACE,
    name: 'Same as interface',
    family: '',
    category: 'Sans',
    hindi: false,
    description: 'Stories in the interface font, like most social apps. Consistent, but less bookish.',
  },
];

/** Devanagari letters, used wherever Hindi text appears (fonts without Hindi fall back to it). */
export const HINDI_FONTS: FontOption[] = [
  {
    id: 'mukta',
    name: 'Mukta',
    family: mukta.style.fontFamily,
    category: 'Modern Devanagari',
    hindi: true,
    description: 'Modern and clean, with matching English letters. Pairs naturally with geometric fonts.',
  },
  {
    id: 'hind',
    name: 'Hind',
    family: hind.style.fontFamily,
    category: 'Simple Devanagari',
    hindi: true,
    description: 'Simple and very readable, by the Indian Type Foundry. Great for small interface text.',
  },
  {
    id: 'noto-sans-devanagari',
    name: 'Noto Sans Devanagari',
    family: notoDevanagari.style.fontFamily,
    category: 'Neutral Devanagari',
    hindi: true,
    description: "Google's neutral Devanagari. Covers every character; the safest choice.",
  },
  {
    id: 'tiro',
    name: 'Tiro Devanagari Hindi',
    family: tiro.style.fontFamily,
    category: 'Book Devanagari',
    hindi: true,
    description: 'Traditional, printed-book feel. Pairs with serif reading fonts for a novel-like look.',
  },
  {
    id: 'poppins-hindi',
    name: 'Poppins Hindi',
    family: poppins.style.fontFamily,
    category: 'Geometric Devanagari',
    hindi: true,
    description: "Poppins's own Hindi letters. Best if Poppins is also the interface font.",
  },
];
