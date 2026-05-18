'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { experiencesApi, userApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import StarRating from '@/components/ui/StarRating';
import BookingForm from '@/components/booking/BookingForm';
import ExperienceCard, { Experience } from '@/components/experiences/ExperienceCard';

interface Review {
  id: string;
  rating: number;
  comment: string;
  travelerId: string;
  createdAt: string;
  traveler?: { profile?: { firstName: string; lastName: string } };
}

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  status: 'available' | 'booked' | 'blocked';
}

interface ExperienceDetail extends Experience {
  guide: {
    id: string;
    verified: boolean;
    profile: { firstName: string; lastName: string; bio?: string; profilePhotoUrl?: string };
  };
  location: { address: string; latitude?: number; longitude?: number };
  availability: { slots: AvailabilitySlot[] };
  cancellationPolicy: string;
}

const REVIEWS_PER_PAGE = 5;

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function AvailabilityCalendar({ slots }: { slots: AvailabilitySlot[] }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const slotsByDate = slots.reduce<Record<string, AvailabilitySlot[]>>((acc, slot) => {
    const d = slot.date.slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(slot);
    return acc;
  }, {});

  const days = buildCalendarDays(viewYear, viewMonth);
  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-gray-100" aria-label="Previous month">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-medium text-gray-800 text-sm">{monthName}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-gray-100" aria-label="Next month">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const daySlots = slotsByDate[dateStr] || [];
          const hasAvailable = daySlots.some(s => s.status === 'available' && s.booked < s.capacity);
          const hasBooked = daySlots.some(s => s.status === 'booked' || s.booked >= s.capacity);
          const isPast = new Date(dateStr) < new Date(today.toDateString());
          let cls = 'w-8 h-8 mx-auto flex items-center justify-center rounded-full ';
          if (isPast) cls += 'text-gray-300';
          else if (hasAvailable) cls += 'bg-emerald-100 text-emerald-700 font-semibold';
          else if (hasBooked) cls += 'text-gray-300 line-through';
          else cls += 'text-gray-400';
          return (
            <div key={dateStr} className="flex items-center justify-center py-0.5">
              <div className={cls}>{day}</div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-100 inline-block" />Available</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-100 inline-block" />Unavailable</span>
      </div>
    </div>
  );
}

export default function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [recommendations, setRecommendations] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      experiencesApi.get(id),
      experiencesApi.getReviews(id, { page: 1, pageSize: REVIEWS_PER_PAGE }),
      experiencesApi.getRecommendations(id),
    ]).then(([expRes, reviewsRes, recsRes]) => {
      setExperience(expRes.data);
      setReviews(reviewsRes.data?.reviews || []);
      setReviewTotal(reviewsRes.data?.total || 0);
      setRecommendations(recsRes.data?.experiences || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const loadMoreReviews = async () => {
    if (!id) return;
    const nextPage = reviewPage + 1;
    try {
      const { data } = await experiencesApi.getReviews(id, { page: nextPage, pageSize: REVIEWS_PER_PAGE });
      setReviews((prev) => [...prev, ...(data?.reviews || [])]);
      setReviewPage(nextPage);
    } catch { /* ignore */ }
  };

  const toggleWishlist = async () => {
    if (!user) { router.push('/login'); return; }
    if (wishlisted) await userApi.removeFromWishlist(user.id, id).catch(() => {});
    else await userApi.addToWishlist(user.id, id).catch(() => {});
    setWishlisted(!wishlisted);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Skeleton hero */}
        <div className="h-[480px] bg-gray-200 animate-pulse" />
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-2/3" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
            <div className="h-24 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-3">Experience not found.</p>
          <Link href="/experiences" className="text-[#FF385C] hover:underline text-sm font-medium">Browse experiences</Link>
        </div>
      </div>
    );
  }

  const slots = experience.availability?.slots || [];
  const hasMoreReviews = reviews.length < reviewTotal;
  const images = experience.images || [];
  const heroImg = images[activeImage]?.url || images[0]?.url;

  return (
    <div className="min-h-screen bg-white">

      {/* Full-bleed photo hero with grid overlay */}
      <div className="relative">
        {/* Main hero image */}
        <div className="relative h-[480px] bg-gray-100 overflow-hidden">
          {heroImg ? (
            <Image src={heroImg} alt={experience.title} fill className="object-cover" priority />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

          {/* Back button */}
          <Link
            href="/experiences"
            className="absolute top-4 left-4 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow"
            aria-label="Back"
          >
            <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Wishlist + share */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={toggleWishlist}
              className="bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Save'}
            >
              <svg className={`w-4 h-4 ${wishlisted ? 'text-[#FF385C] fill-[#FF385C]' : 'text-gray-800'}`}
                fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.slice(0, 6).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-12 h-8 rounded-lg overflow-hidden border-2 transition-all ${i === activeImage ? 'border-white scale-110' : 'border-white/50 opacity-70'}`}
                >
                  <Image src={img.thumbnailUrl || img.url} alt="" width={48} height={32} className="object-cover w-full h-full" />
                </button>
              ))}
              {images.length > 6 && (
                <button
                  onClick={() => setShowAllPhotos(true)}
                  className="w-12 h-8 rounded-lg bg-black/60 border-2 border-white/50 text-white text-xs font-semibold flex items-center justify-center"
                >
                  +{images.length - 6}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Left: main info */}
          <div className="lg:col-span-2 space-y-8">

            {/* Title + meta */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {experience.category?.map((cat) => (
                  <span key={cat} className="text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{cat}</span>
                ))}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-3">{experience.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                {experience.averageRating > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-gray-900">
                    <svg className="w-4 h-4 text-[#FF385C]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {experience.averageRating.toFixed(2)}
                    <span className="font-normal text-gray-500">({reviewTotal} reviews)</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {experience.duration} hours
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {experience.location.address}
                </span>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Guide */}
            {experience.guide && (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden shrink-0 ring-2 ring-gray-100">
                  {experience.guide.profile?.profilePhotoUrl ? (
                    <Image src={experience.guide.profile.profilePhotoUrl} alt="Guide" width={56} height={56} className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl font-bold bg-gradient-to-br from-gray-200 to-gray-300">
                      {experience.guide.profile?.firstName?.[0]}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Hosted by</p>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {experience.guide.profile?.firstName} {experience.guide.profile?.lastName}
                    </span>
                    {experience.guide.verified && (
                      <span className="flex items-center gap-1 text-xs text-[#FF385C] bg-rose-50 px-2 py-0.5 rounded-full font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  {experience.guide.profile?.bio && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{experience.guide.profile.bio}</p>
                  )}
                </div>
              </div>
            )}

            <hr className="border-gray-100" />

            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">About this experience</h2>
              <p className="text-gray-600 leading-relaxed">{experience.description}</p>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: '🕐', label: 'Duration', value: `${experience.duration} hours` },
                { icon: '📍', label: 'Location', value: experience.location.address },
                { icon: '🔄', label: 'Cancellation', value: experience.cancellationPolicy || 'Flexible' },
              ].map((h) => (
                <div key={h.label} className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xl mb-1">{h.icon}</p>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{h.label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 capitalize">{h.value}</p>
                </div>
              ))}
            </div>

            <hr className="border-gray-100" />

            {/* Reviews */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-5 h-5 text-[#FF385C]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-900">
                  {experience.averageRating > 0 ? `${experience.averageRating.toFixed(2)} · ` : ''}{reviewTotal} review{reviewTotal !== 1 ? 's' : ''}
                </h2>
              </div>
              {reviews.length === 0 ? (
                <p className="text-gray-400 text-sm">No reviews yet — be the first!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {reviews.map((review) => (
                    <div key={review.id}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                          {review.traveler?.profile?.firstName?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {review.traveler?.profile ? `${review.traveler.profile.firstName} ${review.traveler.profile.lastName}` : 'Traveler'}
                          </p>
                          <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <StarRating value={review.rating} readonly size="sm" />
                      {review.comment && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
              {hasMoreReviews && (
                <button
                  onClick={loadMoreReviews}
                  className="mt-6 border border-gray-300 rounded-xl px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Show more reviews
                </button>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Location */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Where you'll be</h2>
              {experience.location.latitude && experience.location.longitude ? (
                <div className="rounded-2xl overflow-hidden h-64 border border-gray-100">
                  <iframe
                    title="Location"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${experience.location.longitude - 0.01},${experience.location.latitude - 0.01},${experience.location.longitude + 0.01},${experience.location.latitude + 0.01}&layer=mapnik&marker=${experience.location.latitude},${experience.location.longitude}`}
                    width="100%" height="100%" style={{ border: 0 }} loading="lazy"
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-gray-50 h-48 flex items-center justify-center border border-gray-100">
                  <div className="text-center text-gray-400">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm">{experience.location.address}</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-3">{experience.location.address}</p>
            </div>

            {/* Similar experiences */}
            {recommendations.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-5">You might also like</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendations.slice(0, 4).map((rec) => (
                    <ExperienceCard key={rec.id} experience={rec} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: sticky booking card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 shadow-xl p-6 space-y-5">
              {/* Price */}
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  {experience.price.currency} {experience.price.amount.toFixed(0)}
                </span>
                <span className="text-gray-500 text-sm"> / person</span>
              </div>

              {/* Rating summary */}
              {experience.averageRating > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <svg className="w-4 h-4 text-[#FF385C]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="font-semibold text-gray-900">{experience.averageRating.toFixed(2)}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500 underline cursor-pointer">{reviewTotal} reviews</span>
                </div>
              )}

              <hr className="border-gray-100" />

              <BookingForm experienceId={experience.id} price={experience.price} slots={slots} />

              {/* Availability calendar */}
              {slots.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Availability</p>
                  <AvailabilityCalendar slots={slots} />
                </div>
              )}

              <p className="text-xs text-center text-gray-400">You won't be charged yet</p>
            </div>
          </div>
        </div>
      </div>

      {/* All photos modal */}
      {showAllPhotos && (
        <>
          <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-8">
              <button
                onClick={() => setShowAllPhotos(false)}
                className="mb-6 flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden">
                    <Image src={img.url} alt={`Photo ${i + 1}`} fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
