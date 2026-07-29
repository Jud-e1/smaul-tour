'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/** Filled, borderless input styling shared by the auth forms. */
export const authInputClass =
  'w-full rounded-xl bg-[#F1F6F1] border border-transparent px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:bg-white focus:border-accra-leaf focus:ring-4 focus:ring-accra-leaf/15';

export const authLabelClass = 'block text-xs font-bold text-accra-green mb-1.5';

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
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-br from-[#EAF7EC] via-white to-[#F4FBF1] px-4 py-10 flex items-center justify-center">
      {/* Drifting background blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-accra-leaf/15 blur-3xl animate-drift" />
      <div
        className="pointer-events-none absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-accra-green/10 blur-3xl animate-drift"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="pointer-events-none absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-accra-gold/10 blur-3xl animate-drift"
        style={{ animationDelay: '-12s' }}
      />

      <div className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl shadow-accra-green/10 overflow-hidden grid lg:grid-cols-2">
        {/* Illustration panel */}
        <div
          ref={panelRef}
          className="relative min-h-[240px] lg:min-h-[660px] overflow-hidden bg-gradient-to-br from-accra-green via-accra-leaf to-[#8CC63F] animate-pan-gradient"
        >
          <div
            className="absolute inset-0 bg-cover bg-center animate-float-y transition-transform duration-300 ease-out"
            style={{
              backgroundImage: `url('${image}')`,
              transform: `translate3d(${x * -12}px, ${y * -12}px, 0) scale(1.06)`,
            }}
            role="img"
            aria-label={imageAlt}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-accra-dark/80 via-accra-dark/10 to-accra-dark/30" />

          <div className="relative h-full flex flex-col justify-between p-7 lg:p-9 text-white">
            <Link href="/" className="text-lg font-extrabold tracking-tight drop-shadow-sm w-fit">
              AccraAI
            </Link>
            <div
              className="transition-transform duration-300 ease-out"
              style={{ transform: `translate3d(${x * 6}px, ${y * 6}px, 0)` }}
            >
              <h2 className="text-2xl lg:text-3xl font-bold leading-snug drop-shadow-sm">{headline}</h2>
              <p className="mt-3 text-xs font-medium text-white/80">{caption}</p>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="p-7 sm:p-10 lg:p-12 flex flex-col">
          <p className="text-xs text-gray-500 text-right animate-rise-in">
            {topLink.prompt}{' '}
            <Link href={topLink.href} className="font-semibold text-accra-leaf hover:underline">
              {topLink.label} ↗
            </Link>
          </p>
          <div className="mt-6 flex-1 flex flex-col justify-center">{children}</div>
        </div>
      </div>
    </div>
  );
}
