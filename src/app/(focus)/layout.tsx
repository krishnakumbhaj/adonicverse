// Full-screen pages without the app shell: the reader and the episode editor.
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-pal-surface text-pal-text">{children}</div>;
}
