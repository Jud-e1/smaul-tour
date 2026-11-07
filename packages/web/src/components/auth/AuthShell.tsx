'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';

/** Filled, borderless input styling shared by the auth forms. */
export const authInputClass =
  'w-full rounded-xl bg-white border border-black/10 px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-soft outline-none transition-all hover:border-black/25 focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10';

export const authLabelClass = 'block text-[13px] font-semibold text-ink mb-1.5';

interface AuthShellProps {
  /** Headline shown over the illustration. */
  headline: ReactNode;
  /** Small caption pinned to the bottom of the illustration panel. */
  caption: string;
  /** Illustration served from /public. */
  image: string;
  imageAlt: string;
  /** Link rendered in the top-right corner of the form panel. */
  topLink: { prompt: string; label: string; href: string };
  children: ReactNode;
}

/** Pointer-driven parallax offsets, in pixels, for the illustration layers. */
function useParallax(ref: React.RefObject<HTMLElement>) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      setOffset({
        x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
      });
    };
    const onLeave = () => setOffset({ x: 0, y: 0 });

    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerleave', onLeave);
    return () => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
    };
  }, [ref]);

  return offset;
}

export default function AuthShell({ headline, caption, image, imageAlt, topLink, children }: AuthShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { x, y } = useParallax(panelRef);

  return (
    <div className="relative lg:min-h-[calc(100vh-72px)] bg-canvas px-3 sm:px-6 pt-4 pb-8 sm:py-10 flex items-start lg:items-center justify-center">
      <div className="relative w-full max-w-6xl bg-white rounded-[28px] border border-black/[0.06] shadow-card overflow-hidden grid lg:grid-cols-[1.05fr_1fr]">
        {/* Photo panel — deep forest surface */}
        <div
          ref={panelRef}
          className="grain relative min-h-[180px] sm:min-h-[260px] lg:min-h-[680px] overflow-hidden bg-forest-900 m-2 rounded-[22px]"
        >
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out"
            style={{
              backgroundImage: `url('${image}')`,
              transform: `translate3d(${x * -10}px, ${y * -10}px, 0) scale(1.08)`,
            }}
            role="img"
            aria-label={imageAlt}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-950/95 via-forest-950/30 to-forest-950/10" />

          <div className="relative h-full flex flex-col justify-between p-6 sm:p-8 lg:p-10 text-white">
            <Link href="/" className="inline-flex items-center gap-2 w-fit rounded-full bg-white/95 backdrop-blur pl-1.5 pr-4 py-1.5 shadow-lg" aria-label="Nsoroma home">
              <BrandLogo variant="mark" decorative className="h-8 w-8 object-contain" />
              <span className="font-display text-lg font-extrabold tracking-[-0.04em] text-ink">Nsoroma</span>
            </Link>
            <div
              className="transition-transform duration-300 ease-out max-w-md"
              style={{ transform: `translate3d(${x * 5}px, ${y * 5}px, 0)` }}
            >
              <span className="inline-block h-1 w-10 rounded-full bg-sun mb-5" aria-hidden />
              <h2 className="font-display text-[28px] lg:text-[40px] font-bold leading-[1.05] tracking-[-0.03em]">{headline}</h2>
              <p className="mt-4 text-sm text-white/75 leading-relaxed">{caption}</p>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="px-5 py-6 sm:px-10 sm:py-10 lg:px-14 lg:py-12 flex flex-col">
          <p className="text-sm text-ink-muted text-right animate-rise-in">
            {topLink.prompt}{' '}
            <Link href={topLink.href} className="font-semibold text-ink underline underline-offset-4 decoration-black/20 hover:decoration-ink">
              {topLink.label}
            </Link>
          </p>
          <div className="mt-6 flex-1 flex flex-col justify-center w-full max-w-md mx-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
