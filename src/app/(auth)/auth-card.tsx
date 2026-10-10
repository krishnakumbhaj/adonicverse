import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { LogoMark } from '@/components/app/logo';

/** The logo mark above every account page, linking home. */
export function AuthLogo() {
  return (
    <Link href="/" aria-label={`${siteConfig.name} home`} className="mx-auto block w-fit transition-transform hover:scale-105">
      <LogoMark className="h-10" />
    </Link>
  );
}

/** Spotify's login card: logo, big title, a narrow form column and an optional footer. On phones it has no card. */
export function AuthCard({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="w-full max-w-[734px] px-8 pb-12 pt-10 md:rounded-lg md:bg-pal-surface md:px-20 md:pb-14 md:pt-12">
      <AuthLogo />
      <h1 className="mx-auto mt-6 max-w-[420px] text-balance text-center text-[2rem] font-bold leading-tight tracking-tight md:text-[2.5rem]">
        {title}
      </h1>
      <div className="mx-auto mt-10 max-w-[324px]">{children}</div>
      {footer && (
        <>
          <hr className="mx-auto my-8 max-w-[324px] border-pal-highlight md:max-w-[480px]" />
          <div className="text-center text-pal-subdued">{footer}</div>
        </>
      )}
    </div>
  );
}

/** Only allow redirects back into this site. */
export function safeCallbackUrl(value: string | string[] | undefined) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
