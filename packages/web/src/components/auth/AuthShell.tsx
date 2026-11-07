'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';

/** Airbnb-style field: grey outline, black focus ring. */
export const authInputClass =
  'w-full rounded-lg bg-white border border-[#A9B8BA] px-3.5 py-3.5 text-[15px] text-ink placeholder:text-ink-muted outline-none transition-shadow focus:border-ink focus:shadow-[0_0_0_1px_#0B2E33]';

export const authLabelClass = 'block text-sm font-semibold text-ink mb-1.5';

interface AuthShellProps {
  /** Kept for API compatibility with existing pages. */
  headline?: ReactNode;
  /** Quiet tagline shown under the card. */
  caption: string;
  /** Kept for API compatibility with existing pages. */
  image?: string;
  imageAlt?: string;
  /** Link rendered under the card, e.g. "New here? Create account". */
  topLink: { prompt: string; label: string; href: string };
  /** Title in the card's header bar. */
  title?: string;
  children: ReactNode;
}

const STRIP = ['/photos/labadi.jpg', '/photos/kente.jpg', '/photos/waakye.jpg', '/photos/capecoast.jpg', '/photos/drums.jpg'];

/** Airbnb's "Log in or sign up" card: centred, header bar with close, content below. */
export default function AuthShell(props: AuthShellProps) {
  const { topLink, children, caption } = props;
  const title = props.title ?? (topLink.href === '/register' ? 'Log in' : 'Sign up');

  return (
    <div className="min-h-[calc(100vh-80px)] bg-white md:bg-fog flex flex-col items-center justify-start md:justify-center md:px-6 md:py-12">
      <div className="w-full md:max-w-[568px] bg-white md:rounded-xl md:shadow-[0_8px_28px_rgba(0,0,0,0.14)] overflow-hidden animate-scale-in">
        <header className="relative h-16 flex items-center justify-center border-b border-[#EDF2F2] px-6">
          <Link href="/" className="absolute left-5 w-8 h-8 rounded-full hover:bg-fog flex items-center justify-center" aria-label="Back to home">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold text-ink">{title}</h1>
        </header>

        <div className="px-6 sm:px-8 pt-6 pb-8">{children}</div>

        {/* A quiet strip of the places you'll book */}
        <div className="hidden md:flex h-16 border-t border-[#EDF2F2]" aria-hidden>
          {STRIP.map((src) => (
            <img key={src} src={src} alt="" className="flex-1 min-w-0 object-cover" />
          ))}
        </div>
      </div>

      <div className="w-full md:max-w-[568px] px-6 md:px-0 py-6 md:py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 text-ink-muted">
          <BrandLogo variant="mark" decorative className="w-5 h-5 object-contain" />
          {caption}
        </span>
        <span className="text-ink-muted">
          {topLink.prompt}{' '}
          <Link href={topLink.href} className="font-semibold text-ink underline underline-offset-2">{topLink.label}</Link>
        </span>
      </div>
    </div>
  );
}
