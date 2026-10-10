'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PAGES = [
  { href: '/palettes', label: 'Colors' },
  { href: '/fonts', label: 'Fonts' },
];

/** Switches between the design pages (/palettes and /fonts). */
export default function DesignNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Design pages" className="flex rounded-full bg-pal-elevated p-1 text-sm font-semibold">
      {PAGES.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-3 py-1 transition-colors ${
              active ? 'bg-pal-text text-pal-base' : 'text-pal-subdued hover:text-pal-text'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
