// Dark-theme palettes to compare on /palettes. Each one is a full token set, so the chosen
// palette can become the site theme as-is. Contrast ratios were checked against WCAG.

export type PaletteColors = {
  /** App frame behind the panels (Spotify's black edge). */
  base: string;
  /** Main panels. */
  surface: string;
  /** Cards, menus, inputs. */
  elevated: string;
  /** Hover and selected rows. */
  highlight: string;
  border: string;
  text: string;
  /** Metadata and secondary text. */
  subdued: string;
  /** Timestamps and hints. */
  muted: string;
  /** Filled buttons, progress bars, active states. */
  primary: string;
  primaryHover: string;
  /** Text and icons on top of `primary`. */
  onPrimary: string;
  /** Links, icons and highlights drawn directly on the dark background. */
  accent: string;
  /** Top color of the gradient behind story headers. */
  hero: string;
  /** Rating stars. */
  rating: string;
  success: string;
  warning: string;
  danger: string;
};

export type Palette = {
  id: string;
  name: string;
  group: 'purple' | 'color' | 'reference';
  tagline: string;
  /** How the palette builds its dark theme. */
  approach: string;
  colors: PaletteColors;
};

/** The palette chosen for the app. Its values are also the defaults in src/app/globals.css. */
export const APP_PALETTE_ID = 'neon-orchid';

const status = { success: '#4ade80', warning: '#fbbf24', danger: '#f87171' };

/** Spotify's exact neutral layers, shared by the palettes built on them. */
const spotifyNeutrals = {
  base: '#000000',
  surface: '#121212',
  elevated: '#1f1f1f',
  highlight: '#2a2a2a',
  border: '#292929',
  text: '#ffffff',
  subdued: '#b3b3b3',
  muted: '#7a7a7a',
};

export const PALETTES: Palette[] = [
  {
    id: 'midnight-violet',
    name: 'Midnight Violet',
    group: 'purple',
    tagline: "Spotify's exact blacks with a bright violet where the green would be.",
    approach:
      'Pure black frame, near-black panels, and one bright accent used sparingly. Like Spotify, filled buttons use black text on the violet.',
    colors: {
      ...spotifyNeutrals,
      ...status,
      primary: '#a970ff',
      primaryHover: '#bb8cff',
      onPrimary: '#000000',
      accent: '#a970ff',
      hero: '#4a2a7a',
      rating: '#fbbf24',
    },
  },
  {
    id: 'amethyst-night',
    name: 'Amethyst Night',
    group: 'purple',
    tagline: 'Purple-tinted blacks, deep violet buttons and soft lavender highlights.',
    approach:
      'The dark layers themselves carry a little purple, so the whole app feels moody and atmospheric. Buttons use a deep violet with white text, and links and icons use a lighter lavender that stays readable.',
    colors: {
      ...status,
      base: '#0c0a10',
      surface: '#141119',
      elevated: '#1d1924',
      highlight: '#29233a',
      border: '#2a2436',
      text: '#f5f3ff',
      subdued: '#b9b0c9',
      muted: '#7f7692',
      primary: '#7c3aed',
      primaryHover: '#8b5cf6',
      onPrimary: '#ffffff',
      accent: '#b79cff',
      hero: '#3b1d72',
      rating: '#fbbf24',
    },
  },
  {
    id: 'royal-velvet',
    name: 'Royal Velvet',
    group: 'purple',
    tagline: 'Plum-black, regal violet and gold: the luxury option.',
    approach:
      'Almost-black backgrounds with a faint plum warmth, a rich royal violet for actions, and gold reserved for ratings and special moments. It feels like a premium book app.',
    colors: {
      ...status,
      base: '#09080b',
      surface: '#131217',
      elevated: '#1c1a22',
      highlight: '#26232e',
      border: '#2a2733',
      text: '#faf7ff',
      subdued: '#b8b3c2',
      muted: '#7a7585',
      primary: '#6d28d9',
      primaryHover: '#7c3aed',
      onPrimary: '#ffffff',
      accent: '#c4a1ff',
      hero: '#2e1065',
      rating: '#e8c26b',
    },
  },
  {
    id: 'neon-orchid',
    name: 'Neon Orchid',
    group: 'purple',
    tagline: "Spotify's blacks with a pink-leaning electric purple. Younger and louder.",
    approach:
      'Same neutral layers as Spotify, with a warmer, more electric orchid as the accent. It reads more playful and youthful than violet.',
    colors: {
      ...spotifyNeutrals,
      ...status,
      primary: '#d16bff',
      primaryHover: '#dd8bff',
      onPrimary: '#000000',
      accent: '#d16bff',
      hero: '#5f2777',
      rating: '#fbbf24',
    },
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    group: 'color',
    tagline: "Spotify's blacks with a bright sunflower yellow. Energetic and very easy to spot.",
    approach:
      'Yellow is the brightest color on black, so a little goes a long way: use it for the main button, progress and active states only. Buttons take black text.',
    colors: {
      ...spotifyNeutrals,
      ...status,
      primary: '#ffd60a',
      primaryHover: '#ffe14d',
      onPrimary: '#000000',
      accent: '#ffd60a',
      hero: '#5c4d06',
      rating: '#ffd60a',
    },
  },
  {
    id: 'honey-noir',
    name: 'Honey Noir',
    group: 'color',
    tagline: 'Warm coffee-black with a honey gold. Cosy and classy, made for reading at night.',
    approach:
      'The darks carry a little brown and the text is a warm off-white, like old paper, which suits long reading. The honey gold is softer than pure yellow, so it feels premium rather than loud.',
    colors: {
      ...status,
      base: '#0c0a07',
      surface: '#15120e',
      elevated: '#1f1b15',
      highlight: '#2a251d',
      border: '#2e281f',
      text: '#fbf7ef',
      subdued: '#c4b9a6',
      muted: '#8a7f6d',
      primary: '#f5b83d',
      primaryHover: '#ffc85c',
      onPrimary: '#1a1306',
      accent: '#f5b83d',
      hero: '#5c4012',
      rating: '#f5b83d',
    },
  },
  {
    id: 'ocean-teal',
    name: 'Ocean Teal',
    group: 'color',
    tagline: 'Deep sea-blue blacks with a glowing teal. Calm and fresh.',
    approach:
      'The darks lean slightly blue-green, so the whole app feels cool and calm, and the teal glows against them. Buttons take very dark teal text instead of pure black.',
    colors: {
      ...status,
      base: '#05090b',
      surface: '#0d1417',
      elevated: '#152024',
      highlight: '#1d2b30',
      border: '#22323a',
      text: '#f0fbfb',
      subdued: '#a7bcc0',
      muted: '#6f878c',
      primary: '#2dd4bf',
      primaryHover: '#5eead4',
      onPrimary: '#04201c',
      accent: '#2dd4bf',
      hero: '#0f4a46',
      rating: '#fbbf24',
    },
  },
  {
    id: 'electric-blue',
    name: 'Electric Blue',
    group: 'color',
    tagline: "Spotify's blacks with a bright, trustworthy blue.",
    approach:
      'Blue is the safest, most familiar accent: it reads as calm and reliable. This shade is light enough for black button text and for links on the dark background.',
    colors: {
      ...spotifyNeutrals,
      ...status,
      primary: '#4d94ff',
      primaryHover: '#6ea8ff',
      onPrimary: '#000000',
      accent: '#4d94ff',
      hero: '#173a73',
      rating: '#fbbf24',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    group: 'color',
    tagline: "Spotify's blacks with a hot rose pink. Romantic and bold.",
    approach:
      'A strong pink accent gives the app an emotional, romance-and-drama feel. It stays bright enough for black button text.',
    colors: {
      ...spotifyNeutrals,
      ...status,
      primary: '#ff5c93',
      primaryHover: '#ff7aa8',
      onPrimary: '#000000',
      accent: '#ff5c93',
      hero: '#6b1f3d',
      rating: '#fbbf24',
    },
  },
  {
    id: 'sunset-coral',
    name: 'Sunset Coral',
    group: 'color',
    tagline: "Spotify's blacks with a warm sunset coral. Friendly and inviting.",
    approach:
      'Coral sits between orange and pink, so it feels warm and friendly without the urgency of red. Buttons take black text.',
    colors: {
      ...spotifyNeutrals,
      ...status,
      primary: '#ff7a59',
      primaryHover: '#ff9478',
      onPrimary: '#000000',
      accent: '#ff7a59',
      hero: '#6b2c1c',
      rating: '#fbbf24',
    },
  },
  {
    id: 'spotify',
    name: 'Spotify',
    group: 'reference',
    tagline: 'The original: black, #121212 panels, and the famous green.',
    approach:
      'Neutral grays with no color tint, layered in small steps (#000 → #121212 → #1f1f1f → #2a2a2a). The only color is the green, kept for the play button, progress, and active states.',
    colors: {
      ...spotifyNeutrals,
      ...status,
      primary: '#1ed760',
      primaryHover: '#3be477',
      onPrimary: '#000000',
      accent: '#1ed760',
      hero: '#1d5434',
      rating: '#fbbf24',
    },
  },
  {
    id: 'twitch',
    name: 'Twitch',
    group: 'reference',
    tagline: 'Cool blue-black with the iconic saturated purple.',
    approach:
      "Its grays lean slightly blue (#0e0e10, #18181b). The brand purple fills buttons with white text, but it's too dark to read as text on black, so links use a lighter purple.",
    colors: {
      ...status,
      base: '#0e0e10',
      surface: '#18181b',
      elevated: '#1f1f23',
      highlight: '#26262c',
      border: '#2f2f35',
      text: '#efeff1',
      subdued: '#adadb8',
      muted: '#767680',
      primary: '#9146ff',
      primaryHover: '#772ce8',
      onPrimary: '#ffffff',
      accent: '#bf94ff',
      hero: '#3a1d6e',
      rating: '#fbbf24',
    },
  },
  {
    id: 'claude',
    name: 'Claude',
    group: 'reference',
    tagline: 'Warm, paper-like darks with a clay orange.',
    approach:
      'Instead of cold gray, the darks are slightly brown (#1f1e1d, #262624, #30302e) and the text is off-white, so it feels like reading paper at night. One terracotta accent.',
    colors: {
      ...status,
      base: '#1f1e1d',
      surface: '#262624',
      elevated: '#30302e',
      highlight: '#3a3936',
      border: '#3d3c39',
      text: '#faf9f5',
      subdued: '#c2c0b6',
      muted: '#9c9a92',
      primary: '#d97757',
      primaryHover: '#e08a6d',
      onPrimary: '#1f1e1d',
      accent: '#e8957a',
      hero: '#5a2f22',
      rating: '#f0b45c',
    },
  },
  {
    id: 'discord',
    name: 'Discord',
    group: 'reference',
    tagline: 'Lighter blue-grays with blurple.',
    approach:
      'Much lighter darks than the others (#1e1f22 → #2b2d31 → #313338), so it feels softer and less contrasty. Blurple fills buttons; a lighter blurple is used for text.',
    colors: {
      ...status,
      base: '#1e1f22',
      surface: '#2b2d31',
      elevated: '#313338',
      highlight: '#383a40',
      border: '#3f4147',
      text: '#f2f3f5',
      subdued: '#b5bac1',
      muted: '#949ba4',
      primary: '#5865f2',
      primaryHover: '#4752c4',
      onPrimary: '#ffffff',
      accent: '#949cf7',
      hero: '#2b3380',
      rating: '#fbbf24',
    },
  },
  {
    id: 'netflix',
    name: 'Netflix',
    group: 'reference',
    tagline: 'Cinema black with a bold red.',
    approach:
      'Black and #141414 with flat neutral cards. Red fills buttons and badges; a brighter red is used where it sits on black as text.',
    colors: {
      ...status,
      base: '#000000',
      surface: '#141414',
      elevated: '#1f1f1f',
      highlight: '#2f2f2f',
      border: '#2f2f2f',
      text: '#ffffff',
      subdued: '#b3b3b3',
      muted: '#808080',
      primary: '#e50914',
      primaryHover: '#f6121d',
      onPrimary: '#ffffff',
      accent: '#ff4d55',
      hero: '#5c0a0e',
      rating: '#fbbf24',
    },
  },
  {
    id: 'imdb',
    name: 'IMDb',
    group: 'reference',
    tagline: 'Black and the famous movie-star yellow.',
    approach:
      'Plain black and charcoal with no tint, and yellow used for the logo, ratings and the main action. Because ratings matter so much on IMDb, the yellow star is the hero of the design.',
    colors: {
      ...status,
      base: '#000000',
      surface: '#121212',
      elevated: '#1f1f1f',
      highlight: '#2c2c2c',
      border: '#2c2c2c',
      text: '#ffffff',
      subdued: '#b3b3b3',
      muted: '#7a7a7a',
      primary: '#f5c518',
      primaryHover: '#ffd43b',
      onPrimary: '#000000',
      accent: '#f5c518',
      hero: '#4d3f07',
      rating: '#f5c518',
    },
  },
  {
    id: 'binance',
    name: 'Binance',
    group: 'reference',
    tagline: 'Cool blue-gray darks with a warm gold.',
    approach:
      'The cold, slightly blue darks (#0b0e11, #181a20) make the warm gold pop by contrast. Buttons use a dark navy text on the gold rather than pure black.',
    colors: {
      ...status,
      base: '#0b0e11',
      surface: '#181a20',
      elevated: '#1e2329',
      highlight: '#2b3139',
      border: '#2b3139',
      text: '#eaecef',
      subdued: '#b7bdc6',
      muted: '#848e9c',
      primary: '#fcd535',
      primaryHover: '#f0b90b',
      onPrimary: '#202630',
      accent: '#f0b90b',
      hero: '#4a3c0a',
      rating: '#f0b90b',
    },
  },
];

/** CSS variables that the `pal-*` Tailwind colors read. */
export function paletteVariables(colors: PaletteColors) {
  return Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [`--p-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value]),
  ) as React.CSSProperties;
}

export function paletteCss(palette: Palette) {
  const lines = Object.entries(paletteVariables(palette.colors)).map(([name, value]) => `  ${name}: ${value};`);
  return `/* ${palette.name} */\n:root {\n${lines.join('\n')}\n}\n`;
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, from 1 (none) to 21 (black on white). */
export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** WCAG level for normal-size text. */
export function contrastGrade(ratio: number) {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'Large text only';
  return 'Fails';
}
