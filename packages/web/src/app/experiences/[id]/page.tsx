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
          <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-medium text-ink text-sm">{monthName}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-gray-100" aria-label="Next month">
          <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-ink-soft mb-1">
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
          else if (hasAvailable) cls += 'bg-forest-100 text-forest-700 font-semibold';
          else if (hasBooked) cls += 'text-gray-300 line-through';
          else cls += 'text-ink-soft';
          return (
            <div key={dateStr} className="flex items-center justify-center py-0.5">
              <div className={cls}>{day}</div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-forest-100 inline-block" />Available</span>
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
        <div className="h-64 sm:h-80 lg:h-[480px] bg-gray-200 animate-pulse" />
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
          <p className="text-ink-muted mb-3">Experience not found.</p>
          <Link href="/experiences" className="btn-primary">Browse experiences</Link>
        </div>
      </div>
    );
  }

  const slots = experience.availability?.slots || [];
  const hasMoreReviews = reviews.length < reviewTotal;
  const images = experience.images || [];
  const heroImg = images[activeImage]?.url || images[0]?.url;

  return (
    <div className="min-h-screen bg-canvas">

      {/* Framed photo hero */}
      <div className="relative max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-2 sm:pt-6">
        {/* Main hero image */}
        <div className="relative h-72 sm:h-96 lg:h-[520px] bg-[#E4E5DF] overflow-hidden rounded-[24px]">
          {heroImg ? (
            <Image src={heroImg} alt={experience.title} fill className="object-cover" priority />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-forest-100 to-beige-200 flex items-center justify-center">
              <svg className="w-20 h-20 text-forest-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

          {/* Back button */}
          <Link
            href="/experiences"
            className="absolute top-4 left-4 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-soft hover:scale-105 transition-transform"
            aria-label="Back"
          >
            <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Wishlist + share */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={toggleWishlist}
              className="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-soft hover:scale-105 transition-transform"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Save'}
            >
              <svg className={`w-4 h-4 ${wishlisted ? 'text-[#F26B1D] fill-[#F26B1D]' : 'text-ink'}`}
                fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-4 right-4 flex gap-1.5 justify-center overflow-x-auto">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">

          {/* Left: main info */}
          <div className="lg:col-span-2 space-y-8">

            {/* Title + meta */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {experience.category?.map((cat) => (
                  <span key={cat} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-forest-700 bg-forest-50 px-3 py-1 rounded-full">{cat}</span>
                ))}
              </div>
              <h1 className="font-display text-3xl sm:text-[44px] font-bold text-ink leading-[1.05] mb-4 break-words">{experience.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
                {experience.averageRating > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-ink">
                    <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {experience.averageRating.toFixed(2)}
                    <span className="font-normal text-ink-muted">({reviewTotal} reviews)</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {experience.duration} hours
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {experience.location.address}
                </span>
              </div>
            </div>

            <hr className="border-black/[0.07]" />

            {/* Guide */}
            {experience.guide && (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-forest-100 overflow-hidden shrink-0 ring-4 ring-white">
                  {experience.guide.profile?.profilePhotoUrl ? (
                    <Image src={experience.guide.profile.profilePhotoUrl} alt="Guide" width={56} height={56} className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-forest-700 text-xl font-bold bg-forest-100">
                      {experience.guide.profile?.firstName?.[0]}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-ink-muted mb-0.5">Hosted by</p>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">
                      {experience.guide.profile?.firstName} {experience.guide.profile?.lastName}
                    </span>
                    {experience.guide.verified && (
                      <span className="flex items-center gap-1 text-xs text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full font-semibold">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  {experience.guide.profile?.bio && (
                    <p className="text-sm text-ink-muted mt-0.5 line-clamp-2">{experience.guide.profile.bio}</p>
                  )}
                </div>
              </div>
            )}

            <hr className="border-black/[0.07]" />

            {/* Description */}
            <div>
              <h2 className="font-display text-2xl font-bold text-ink mb-3">About this experience</h2>
              <p className="text-ink/80 text-[17px] leading-relaxed whitespace-pre-line">{experience.description}</p>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: '🕐', label: 'Duration', value: `${experience.duration} hours` },
                { icon: '📍', label: 'Location', value: experience.location.address },
                { icon: '🔄', label: 'Cancellation', value: experience.cancellationPolicy || 'Flexible' },
              ].map((h) => (
                <div key={h.label} className="bg-white border border-black/[0.07] rounded-2xl p-4">
                  <p className="w-10 h-10 rounded-xl bg-beige flex items-center justify-center text-lg mb-3">{h.icon}</p>
                  <p className="text-xs text-ink-soft font-medium uppercase tracking-wide">{h.label}</p>
                  <p className="text-sm font-semibold text-ink mt-0.5 capitalize">{h.value}</p>
                </div>
              ))}
            </div>

            <hr className="border-black/[0.07]" />

            {/* Reviews */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-6 h-6 text-gold" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <h2 className="font-display text-2xl font-bold text-ink">
                  {experience.averageRating > 0 ? `${experience.averageRating.toFixed(2)} · ` : ''}{reviewTotal} review{reviewTotal !== 1 ? 's' : ''}
                </h2>
              </div>
              {reviews.length === 0 ? (
                <p className="text-ink-soft text-sm">No reviews yet — be the first!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-white border border-black/[0.07] rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-forest-100 flex items-center justify-center text-sm font-bold text-forest-700 shrink-0">
                          {review.traveler?.profile?.firstName?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {review.traveler?.profile ? `${review.traveler.profile.firstName} ${review.traveler.profile.lastName}` : 'Traveler'}
                          </p>
                          <p className="text-xs text-ink-soft">{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <StarRating value={review.rating} readonly size="sm" />
                      {review.comment && <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
              {hasMoreReviews && (
                <button
                  onClick={loadMoreReviews}
                  className="mt-6 btn-ghost"
                >
                  Show more reviews
                </button>
              )}
            </div>

            <hr className="border-black/[0.07]" />

            {/* Location */}
            <div>
              <h2 className="font-display text-2xl font-bold text-ink mb-4">Where you'll be</h2>
              {experience.location.latitude && experience.location.longitude ? (
                <div className="rounded-[20px] overflow-hidden h-72 border border-black/[0.07]">
                  <iframe
                    title="Location"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${experience.location.longitude - 0.01},${experience.location.latitude - 0.01},${experience.location.longitude + 0.01},${experience.location.latitude + 0.01}&layer=mapnik&marker=${experience.location.latitude},${experience.location.longitude}`}
                    width="100%" height="100%" style={{ border: 0 }} loading="lazy"
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-canvas h-48 flex items-center justify-center border border-black/[0.07]">
                  <div className="text-center text-ink-soft">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm">{experience.location.address}</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-ink-muted mt-3">{experience.location.address}</p>
            </div>

            {/* Similar experiences */}
            {recommendations.length > 0 && (
              <div>
                <h2 className="font-display text-2xl font-bold text-ink mb-5">You might also like</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                  {recommendations.slice(0, 4).map((rec) => (
                    <ExperienceCard key={rec.id} experience={rec} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: sticky booking card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-card border border-black/[0.07] shadow-card p-6 space-y-5">
              {/* Price */}
              <div>
                <span className="font-display text-3xl font-bold text-ink">
                  {experience.price.currency} {experience.price.amount.toFixed(0)}
                </span>
                <span className="text-ink-muted text-sm"> / person</span>
              </div>

              {/* Rating summary */}
              {experience.averageRating > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="font-semibold text-ink">{experience.averageRating.toFixed(2)}</span>
                  <span className="text-ink-soft">·</span>
                  <span className="text-ink-muted underline cursor-pointer">{reviewTotal} reviews</span>
                </div>
              )}

              <hr className="border-black/[0.07]" />

              <BookingForm experienceId={experience.id} price={experience.price} slots={slots} />

              {/* Availability calendar */}
              {slots.length > 0 && (
                <div className="border-t border-black/[0.07] pt-4">
                  <p className="text-sm font-semibold text-ink/80 mb-3">Availability</p>
                  <AvailabilityCalendar slots={slots} />
                </div>
              )}

              <p className="text-xs text-center text-ink-soft flex items-center justify-center gap-1.5"><svg className="w-3.5 h-3.5 text-forest-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>Held in escrow — you won&apos;t be charged yet</p>
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
