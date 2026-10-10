import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import logoMark from '@/assets/brand/logo.png';
import logoName from '@/assets/brand/logo-name.png';
import { cx } from './primitives';

/** The adonic mark on its own. Size it by height, e.g. "h-7". */
export function LogoMark({ className = 'h-7' }: { className?: string }) {
  return <Image src={logoMark} alt="" priority className={cx('w-auto shrink-0', className)} />;
}

/** The "adonic" wordmark (white, for the dark theme). Size it by height. */
export function LogoName({ className = 'h-5' }: { className?: string }) {
  return <Image src={logoName} alt={siteConfig.name} priority className={cx('w-auto shrink-0', className)} />;
}

/** Mark + wordmark linking home, top left like Spotify's logo. The wordmark shows on wide screens. */
export function Logo() {
  return (
    <Link href="/" aria-label={`${siteConfig.name} home`} className="flex items-center gap-2.5">
      <LogoMark className="h-7" />
      <span className="hidden lg:block">
        <LogoName className="h-[22px]" />
      </span>
    </Link>
  );
}
