'use client';

import Link from 'next/link';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

interface CarouselProps {
  title: ReactNode;
  subtitle?: string;
  href?: string;
  children: ReactNode;
  /** Tailwind width classes for each slide. */
  itemClassName?: string;
}

/** Airbnb-style row: "Title ›" heading, round prev/next buttons, snap-scrolling cards. */
export default function Carousel({
  title,
  subtitle,
  href,
  children,
  itemClassName = 'w-[72%] sm:w-[calc((100%-24px)/2.15)] md:w-[calc((100%-48px)/3.15)] lg:w-[calc((100%-72px)/4.15)] xl:w-[calc((100%-120px)/6)]',
}: CarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    el?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el?.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [update]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const items = Array.isArray(children) ? children : [children];

  return (
    <section className="py-5">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div className="min-w-0">
          {href ? (
            <Link href={href} className="group inline-flex items-center gap-2 font-display text-[30px] leading-tight text-ink tracking-[-0.015em]">
              {title}
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
          ) : (
            <h2 className="text-[30px] leading-tight text-ink">{title}</h2>
          )}
          {subtitle && <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {(['prev', 'next'] as const).map((d) => {
            const disabled = d === 'prev' ? atStart : atEnd;
            return (
              <button
                key={d}
                onClick={() => page(d === 'prev' ? -1 : 1)}
                disabled={disabled}
                aria-label={d === 'prev' ? 'Previous' : 'Next'}
                className="w-8 h-8 rounded-full border border-[#E0E0E5] bg-paper flex items-center justify-center text-ink hover:shadow-md transition-shadow disabled:opacity-30 disabled:hover:shadow-none disabled:cursor-not-allowed"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d={d === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
                </svg>
              </button>
            );
          })}
        </div>
      </div>
      <div
        ref={track}
        className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth -mx-5 px-5 sm:mx-0 sm:px-0"
      >
        {items.map((child, i) => (
          <div key={i} className={`shrink-0 snap-start ${itemClassName}`}>{child}</div>
        ))}
      </div>
    </section>
  );
}
