import type { Metadata, Viewport } from 'next';
import { Newsreader, Noto_Sans_Devanagari, Plus_Jakarta_Sans } from 'next/font/google';
import { PwaSetup } from '@/components/app/pwa';
import { siteConfig } from '@/config/site';
import Providers from './providers';
import './globals.css';

// Fonts chosen on /fonts. Interface text uses Plus Jakarta Sans, story text uses Newsreader,
// and Hindi (Devanagari) text uses Noto Sans Devanagari. See `font-sans` / `font-reading` in tailwind.config.ts.
const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const reading = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-reading',
  display: 'swap',
  preload: false, // only reading pages need it
});
const hindi = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-hindi',
  display: 'swap',
  preload: false, // downloaded only when Hindi text is on screen
});

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${reading.variable} ${hindi.variable}`}>
      {/*
        Installing the app (PWA). Next streams page metadata into <body> on dynamic pages, but
        browsers only read these from <head>, so they're written here. The manifest itself is
        src/app/manifest.ts; the Apple tags make Safari's "Add to Home Screen" open full screen.
      */}
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content={siteConfig.name} />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <PwaSetup />
        </Providers>
      </body>
    </html>
  );
}
