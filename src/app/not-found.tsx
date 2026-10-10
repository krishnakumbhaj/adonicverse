import { LogoMark, LogoName } from '@/components/app/logo';
import { PillLink } from '@/components/app/primitives';

// Spotify's 404: logo, a short message, and a white "Home" button.
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-pal-surface px-6 text-center text-pal-text">
      <div className="flex items-center gap-3">
        <LogoMark className="h-12" />
        <LogoName className="h-9" />
      </div>
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Page not found</h1>
        <p className="mt-3 text-pal-subdued">We can&apos;t seem to find the page you are looking for.</p>
      </div>
      <PillLink href="/" variant="white" size="lg">
        Home
      </PillLink>
    </main>
  );
}
