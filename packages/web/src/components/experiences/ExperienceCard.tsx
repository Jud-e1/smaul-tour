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
}

const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';

/** Photo-led listing card: image in a rounded frame, details set underneath on the canvas. */
export default function ExperienceCard({ experience, onWishlist, wishlisted, variant = 'grid' }: ExperienceCardProps) {
  const primaryImage = experience.images?.[0];
  const isUnavailable = experience.status !== 'active' || experience.hasAvailability === false;
  const [imgIdx, setImgIdx] = useState(0);
  const images = experience.images?.length ? experience.images : [];
  const currentImg = images[imgIdx] ?? primaryImage;

  const aspectClass = variant === 'compact' ? 'aspect-[4/3]' : 'aspect-square';

  const guideName = experience.guide?.profile
    ? `${experience.guide.profile.firstName} ${experience.guide.profile.lastName}`.trim()
    : null;
  const hours = `${experience.duration}h`;

  return (
    <div className="group">
      <Link href={`/experiences/${experience.id}`} className="block rounded-card">
        <div className={`relative ${aspectClass} rounded-card overflow-hidden bg-[#E4E5DF]`}>
          {currentImg ? (
            <Image
              src={currentImg.thumbnailUrl || currentImg.url}
              alt={experience.title}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover card-img"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-forest-100 to-beige-200 text-forest-400">
              <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent pointer-events-none" />

          {isUnavailable && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
              <span className="bg-white text-ink text-xs font-semibold px-4 py-2 rounded-full">Unavailable</span>
            </div>
          )}

          {experience.guide?.verified && (
            <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 bg-white text-ink text-[11px] font-semibold tracking-[0.02em] px-2.5 py-1 rounded-md shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
              <svg className="w-3 h-3 text-forest-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified guide
            </span>
          )}

          {onWishlist && (
            <button
              onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); onWishlist(experience.id); }}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center z-10 transition-transform hover:scale-110 active:scale-95"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <svg
                className={`w-6 h-6 drop-shadow ${wishlisted ? 'text-sun' : 'text-black/40'}`}
                fill="currentColor"
                stroke="white"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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
                    className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
                  />
                ))}
              </div>
              <button
                aria-label="Previous photo"
                onClick={(e) => { e.preventDefault(); setImgIdx((p) => (p - 1 + images.length) % images.length); }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/95 rounded-full shadow-soft flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 z-10"
              >
                <svg className="w-3.5 h-3.5 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                aria-label="Next photo"
                onClick={(e) => { e.preventDefault(); setImgIdx((p) => (p + 1) % images.length); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/95 rounded-full shadow-soft flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 z-10"
              >
                <svg className="w-3.5 h-3.5 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
        </div>

        <div className="pt-3 px-0.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-sans text-[15px] font-semibold text-ink leading-snug line-clamp-1 tracking-[-0.01em]">
              {experience.title}
            </h3>
            {experience.averageRating > 0 && (
              <span className="flex items-center gap-1 shrink-0 text-sm text-ink">
                <svg className="w-3.5 h-3.5 text-gold" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path d={STAR_PATH} />
                </svg>
                <span className="font-medium">{experience.averageRating.toFixed(2)}</span>
                {experience.reviewCount > 0 && <span className="text-ink-muted">({experience.reviewCount})</span>}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-ink-muted truncate">{experience.location.address}</p>
          <p className="text-sm text-ink-muted truncate">
            {guideName ? `Hosted by ${guideName}` : experience.category?.[0] ?? 'Local experience'}
            {experience.duration > 0 && <> · {hours}</>}
          </p>
          <p className="mt-1.5 text-[15px] text-ink">
            <span className="font-semibold">
              {experience.price.currency} {experience.price.amount.toFixed(0)}
            </span>
            <span className="text-ink-muted"> / person</span>
          </p>
        </div>
      </Link>
    </div>
  );
}
