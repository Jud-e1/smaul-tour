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

export default function ExperienceCard({ experience, onWishlist, wishlisted, variant = 'grid' }: ExperienceCardProps) {
  const primaryImage = experience.images?.[0];
  const isUnavailable = experience.status !== 'active' || experience.hasAvailability === false;
  const [imgIdx, setImgIdx] = useState(0);
  const images = experience.images?.length ? experience.images : [];
  const currentImg = images[imgIdx] ?? primaryImage;

  const aspectClass = variant === 'compact' ? 'aspect-[4/3]' : 'aspect-[4/5] sm:aspect-[3/4]';

  return (
    <div className="group">
      <Link href={`/experiences/${experience.id}`} className="block">
        <div className={`relative ${aspectClass} rounded-3xl overflow-hidden bg-beige-200 mb-3 premium-card`}>
          {currentImg ? (
            <Image
              src={currentImg.thumbnailUrl || currentImg.url}
              alt={experience.title}
              fill
              className="object-cover card-img transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sea-100 to-sea-200 text-sea-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          <div className="absolute inset-0 card-overlay-gradient pointer-events-none" />

          {isUnavailable && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white/95 text-gray-800 text-xs font-semibold px-4 py-2 rounded-full shadow-lg">
                Currently Unavailable
              </span>
            </div>
          )}

          {experience.guide?.verified && (
            <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-accra-green flex items-center justify-center shadow-md">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
            {experience.price.currency} {experience.price.amount.toFixed(0)}
            <span className="font-normal opacity-80"> / person</span>
          </div>

          {onWishlist && (
            <button
              onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); onWishlist(experience.id); }}
              className="absolute top-12 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md transition-transform hover:scale-110"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <svg
                className={`w-4 h-4 transition-colors ${wishlisted ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
                fill={wishlisted ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          )}

          {images.length > 1 && (
            <>
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {images.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.preventDefault(); setImgIdx(i); }}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`}
                  />
                ))}
              </div>
              <button
                onClick={(e) => { e.preventDefault(); setImgIdx((p) => (p - 1 + images.length) % images.length); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 z-10"
              >
                <svg className="w-3.5 h-3.5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setImgIdx((p) => (p + 1) % images.length); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 z-10"
              >
                <svg className="w-3.5 h-3.5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            {experience.averageRating > 0 && (
              <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-semibold mb-2">
                <svg className="w-3 h-3 text-amber-300 fill-amber-300" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {experience.averageRating.toFixed(1)}
              </span>
            )}
            <p className="font-bold text-sm leading-snug line-clamp-2">{experience.title}</p>
            <p className="text-xs text-white/75 mt-1 flex items-center gap-1 truncate">
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {experience.location.address}
            </p>
          </div>
        </div>
      </Link>

      {variant === 'compact' && (
        <div className="px-1">
          <p className="text-xs text-gray-400">{experience.duration}h · {experience.category[0]}</p>
        </div>
      )}
    </div>
  );
}
