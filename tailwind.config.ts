import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

// shadcn/ui setup: colors come from the CSS variables in src/app/globals.css.
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      // Variables come from next/font in src/app/layout.tsx. Hindi falls back to the Devanagari font.
      fontFamily: {
        sans: ['var(--font-sans)', 'var(--font-hindi)', 'system-ui', 'sans-serif'],
        reading: ['var(--font-reading)', 'var(--font-hindi)', 'Georgia', 'serif'],
      },
      keyframes: {
        // Equalizer bars next to the episode being read.
        bar: { '0%, 100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
      },
      animation: {
        bar: 'bar 0.9s ease-in-out infinite',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Dark-theme palette tokens, set as CSS variables by the palette on /palettes.
        pal: {
          base: 'var(--p-base)',
          surface: 'var(--p-surface)',
          elevated: 'var(--p-elevated)',
          highlight: 'var(--p-highlight)',
          border: 'var(--p-border)',
          text: 'var(--p-text)',
          subdued: 'var(--p-subdued)',
          muted: 'var(--p-muted)',
          primary: 'var(--p-primary)',
          'primary-hover': 'var(--p-primary-hover)',
          'on-primary': 'var(--p-on-primary)',
          accent: 'var(--p-accent)',
          rating: 'var(--p-rating)',
          success: 'var(--p-success)',
          warning: 'var(--p-warning)',
          danger: 'var(--p-danger)',
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
