// Account pages: a plain dark page. On phones the form sits right on it; on bigger screens it
// sits on a slightly lighter card (see AuthCard). Pages center themselves inside.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-pal-surface text-pal-text md:bg-pal-base">
      <main className="flex min-h-dvh justify-center md:items-start md:py-8">{children}</main>
    </div>
  );
}
