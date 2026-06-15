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
}

export default function ExperienceCard({
  experience,
  onWishlist,
  wishlisted,
}: ExperienceCardProps) {
  const primaryImage = experience.images?.[0];
  const isUnavailable = experience.status !== 'active' || experience.hasAvailability === false;
  const [imgIdx, setImgIdx] = useState(0);
  const images = experience.images?.length ? experience.images : [];
  const currentImg = images[imgIdx] ?? primaryImage;

  return (
    <div className="group cursor-pointer">
      {/* Image container */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 mb-3">
        {currentImg ? (
          <Image
            src={currentImg.thumbnailUrl || currentImg.url}
            alt={experience.title}
            fill
            className="object-cover card-img"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Unavailable overlay */}
        {isUnavailable && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-2xl">
            <span className="bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow">
              Currently Unavailable
            </span>
          </div>
        )}

        {/* Wishlist heart */}
        {onWishlist && (
          <button
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              onWishlist(experience.id);
            }}
            className="absolute top-3 right-3 p-1 transition-transform hover:scale-110"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg
              className={`w-6 h-6 drop-shadow-md transition-colors ${wishlisted ? 'text-[#FF385C]' : 'text-white'}`}
              fill={wishlisted ? 'currentColor' : 'none'}
              stroke={wishlisted ? 'none' : 'white'}
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        )}

        {/* Image dots if multiple */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {images.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.preventDefault();
                  setImgIdx(i);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        )}

        {/* Prev/Next arrows on hover */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                setImgIdx((p) => (p - 1 + images.length) % images.length);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
            >
              <svg
                className="w-3 h-3 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                setImgIdx((p) => (p + 1) % images.length);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
            >
              <svg
                className="w-3 h-3 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Card info */}
      <Link href={`/experiences/${experience.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Title is primary */}
            <p className="font-semibold text-gray-900 truncate text-sm leading-snug">
              {experience.title}
            </p>
            {/* Location + verified badge secondary */}
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-gray-500 text-sm truncate">{experience.location.address}</p>
              {experience.guide?.verified && (
                <svg
                  className="w-3 h-3 text-[#FF385C] shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="text-gray-400 text-xs mt-0.5">
              {experience.duration}h · {experience.category[0]}
            </p>
          </div>
          {/* Rating top-right */}
          {experience.averageRating > 0 && (
            <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-xs font-semibold text-gray-900">
                {experience.averageRating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Price */}
        <p className="mt-1.5 text-sm text-gray-900">
          <span className="font-semibold price-underline">
            {experience.price.currency} {experience.price.amount.toFixed(0)}
          </span>
          <span className="text-gray-500 font-normal"> / person</span>
        </p>
      </Link>
    </div>
  );
}
