'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export interface Experience {
  id: string;
  title: string;
  description: string;
  price: { amount: number; currency: string };
  duration: number;
  averageRating: number;
  reviewCount: number;
  images: { id?: string; url: string; thumbnailUrl: string }[];
  primaryImageId?: string;
  status: 'active' | 'inactive' | 'pending_approval';
  location: { address: string };
  guide?: { profile?: { firstName: string; lastName: string }; verified?: boolean };
  category: string[];
  hasAvailability?: boolean;
}

interface ExperienceCardProps {
  experience: Experience;
  onWishlist?: (id: string) => void;
  wishlisted?: boolean;
  variant?: 'grid' | 'compact';
  /** Override the link target (used for curated cards on the home page). */
  href?: string;
  /** Small pill over the photo, e.g. "Original" or "Popular". */
  badge?: string;
}

const STAR =
  'M15.1 1.58l-4.13 8.88-9.86 1.27a1 1 0 0 0-.54 1.74l7.3 6.57-1.97 9.85a1 1 0 0 0 1.48 1.06l8.62-5 8.63 5a1 1 0 0 0 1.48-1.06l-1.97-9.85 7.3-6.57a1 1 0 0 0-.55-1.73l-9.86-1.28-4.12-8.88a1 1 0 0 0-1.82 0z';

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-ink">
      <svg viewBox="0 0 32 32" className="w-3 h-3" fill="currentColor" aria-hidden><path d={STAR} /></svg>
      <span>{value.toFixed(2)}</span>
      {count ? <span className="text-ink-muted">({count})</span> : null}
    </span>
  );
}

/** Airbnb-style card: photo in a rounded frame, quiet metadata underneath. */
export default function ExperienceCard({
  experience,
  onWishlist,
  wishlisted,
  variant = 'grid',
  href,
  badge,
}: ExperienceCardProps) {
  const isUnavailable = experience.status !== 'active' || experience.hasAvailability === false;
  const [imgIdx, setImgIdx] = useState(0);
  const images = experience.images?.length ? experience.images : [];
  const currentImg = images[imgIdx] ?? images[0];

  const aspectClass = variant === 'compact' ? 'aspect-[4/3]' : 'aspect-[20/19]';
  const guideName = experience.guide?.profile
    ? `${experience.guide.profile.firstName} ${experience.guide.profile.lastName}`.trim()
    : null;
  // badge === '' explicitly suppresses the automatic pill.
  const pill = badge !== undefined ? badge : experience.guide?.verified ? 'Verified guide' : experience.averageRating >= 4.8 ? 'Guest favorite' : undefined;
  const link = href ?? `/experiences/${experience.id}`;

  return (
    <div className="group min-w-0">
      <Link href={link} className="block rounded-2xl">
        <div className={`relative ${aspectClass} rounded-2xl overflow-hidden bg-[#EBEBEB]`}>
          {currentImg ? (
            <Image
              src={currentImg.thumbnailUrl || currentImg.url}
              alt={experience.title}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 90vw"
              className="object-cover card-img"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden>🧭</div>
          )}

          {isUnavailable && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20">
              <span className="badge">Currently unavailable</span>
            </div>
          )}

          {pill && !isUnavailable && <span className="badge absolute top-3 left-3 z-10">{pill}</span>}

          {onWishlist && (
            <button
              onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); onWishlist(experience.id); }}
              className="absolute top-3 right-3 z-10 p-1 transition-transform hover:scale-110 active:scale-90"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={wishlisted}
            >
              <svg viewBox="0 0 32 32" className={`w-6 h-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] ${wishlisted ? 'text-sun' : 'text-black/50'}`} fill="currentColor" stroke="white" strokeWidth={2} aria-hidden>
                <path d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z" />
              </svg>
            </button>
          )}

          {images.length > 1 && (
            <>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {images.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Show photo ${i + 1}`}
                    onClick={(e) => { e.preventDefault(); setImgIdx(i); }}
                    className={`w-1.5 h-1.5 rounded-full transition-opacity ${i === imgIdx ? 'bg-white' : 'bg-white/60'}`}
                  />
                ))}
              </div>
              <button
                aria-label="Previous photo"
                onClick={(e) => { e.preventDefault(); setImgIdx((p) => (p - 1 + images.length) % images.length); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-105 z-10"
              >
                <svg className="w-3 h-3 text-ink" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                aria-label="Next photo"
                onClick={(e) => { e.preventDefault(); setImgIdx((p) => (p + 1) % images.length); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-105 z-10"
              >
                <svg className="w-3 h-3 text-ink" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
        </div>

        <div className="pt-3 text-[15px] leading-[1.35]">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-ink line-clamp-2 tracking-[-0.01em]">{experience.title}</h3>
            {experience.averageRating > 0 && <span className="shrink-0"><Stars value={experience.averageRating} /></span>}
          </div>
          <p className="mt-0.5 text-sm text-ink-muted truncate">
            {guideName ? `Hosted by ${guideName}` : experience.category?.[0] ?? 'Local experience'}
            {experience.duration > 0 && ` · ${experience.duration} hr${experience.duration === 1 ? '' : 's'}`}
          </p>
          <p className="text-sm text-ink-muted truncate">{experience.location.address}</p>
          <p className="mt-1 text-sm text-ink">
            From <span className="font-semibold">{experience.price.currency === 'USD' ? '$' : `${experience.price.currency} `}{experience.price.amount.toFixed(0)}</span>
            <span className="text-ink-muted"> / guest</span>
          </p>
        </div>
      </Link>
    </div>
  );
}
