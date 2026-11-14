'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, ShieldCheck, Star } from 'lucide-react';
import World3D from '@/components/three/World3D';

/** Soft paper field with an ink focus ring. */
export const authInputClass =
  'w-full rounded-2xl bg-paper border border-[#D2D2D7] px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-soft outline-none transition-shadow focus:border-ink focus:shadow-[0_0_0_1px_#1D1D1F]';

export const authLabelClass = 'block text-sm font-semibold text-ink mb-1.5';

interface AuthShellProps {
  /** Large line shown on the 3D stage. */
  headline?: ReactNode;
  /** Small mono caption on the stage. */
  caption: string;
  /** Still image used when WebGL is unavailable. */
  image?: string;
  imageAlt?: string;
  /** Link shown at the top of the form column, e.g. "New here? Create an account". */
  topLink: { prompt: string; label: string; href: string };
  /** Kept for API compatibility; the form supplies its own heading. */
  title?: string;
  children: ReactNode;
}

/**
 * Split auth layout: the form on a paper column, and a sand "stage" holding the
 * 3D star with orbiting postcards from Ghana.
 */
export default function AuthShell(props: AuthShellProps) {
  const { topLink, children, caption, headline } = props;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-canvas p-2 sm:p-3 grid lg:grid-cols-[minmax(0,560px)_1fr] gap-3">
      {/* Form column */}
      <div className="bg-paper rounded-[32px] border border-hairline flex flex-col px-6 sm:px-12 py-8 sm:py-10 animate-rise-in">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:opacity-70">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <p className="text-sm text-ink-muted text-right">
            {topLink.prompt}{' '}
            <Link href={topLink.href} className="font-semibold text-ink underline underline-offset-4">{topLink.label}</Link>
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-center py-10 w-full max-w-[420px] mx-auto">{children}</div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5" />Verified hosts</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />Escrow-protected payments</span>
          <span className="inline-flex items-center gap-1.5"><Star className="w-3.5 h-3.5" />4.9 guest rating</span>
        </div>
      </div>

      {/* 3D stage */}
      <div className="relative hidden lg:block rounded-[32px] stage-mesh overflow-hidden lg:sticky lg:top-[92px] lg:h-[calc(100vh-104px)] min-h-[560px] self-start">
        <World3D variant="star" className="absolute inset-0" fallback={props.image || '/photos/capecoast.jpg'} />
        <div className="absolute top-8 left-10 right-10 flex items-center justify-between">
          <span className="mono text-[11px] uppercase tracking-[0.1em] text-stone-600">05.6037° N · 0.1870° W</span>
          <span className="mono text-[11px] uppercase tracking-[0.1em] text-stone-600">{caption}</span>
        </div>
        <div className="absolute bottom-10 left-10 right-10 max-w-lg">
          <p className="font-display text-[44px] xl:text-[56px] font-semibold leading-[0.95] tracking-[-0.035em] text-ink">
            {headline ?? 'Follow the star to the real Ghana.'}
          </p>
        </div>
      </div>
    </div>
  );
}
