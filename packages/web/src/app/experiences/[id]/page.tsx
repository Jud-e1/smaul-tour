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
import Carousel from '@/components/ui/Carousel';
import { useToast } from '@/components/ui/Toast';

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

const POLICY_COPY: Record<string, string> = {
  flexible: 'Cancel at least 24 hours before the start time for a full refund.',
  moderate: 'Cancel at least 7 days before the start time for a full refund.',
  strict: 'Cancel at least 14 days before the start time for a full refund.',
};

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
    <div className="max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-fog flex items-center justify-center" aria-label="Previous month">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="font-semibold text-ink">{monthName}</span>
        <button onClick={nextMonth} className="w-8 h-8 rounded-full hover:bg-fog flex items-center justify-center" aria-label="Next month">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-ink-muted mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 text-center text-sm">
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const daySlots = slotsByDate[dateStr] || [];
          const hasAvailable = daySlots.some((s) => s.status === 'available' && s.booked < s.capacity);
          const hasBooked = daySlots.some((s) => s.status === 'booked' || s.booked >= s.capacity);
          const isPast = new Date(dateStr) < new Date(today.toDateString());
          let cls = 'w-10 h-10 mx-auto flex items-center justify-center rounded-full ';
          if (isPast) cls += 'text-[#A9B8BA] line-through';
          else if (hasAvailable) cls += 'font-semibold text-ink ring-1 ring-ink';
          else if (hasBooked) cls += 'text-[#A9B8BA] line-through';
          else cls += 'text-[#A9B8BA]';
          return (
            <div key={dateStr} className="py-0.5">
              <div className={cls}>{day}</div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-5 mt-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full ring-1 ring-ink inline-block" />Open dates</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#EDF2F2] inline-block" />Unavailable</span>
      </div>
    </div>
  );
}

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 20 32" className={`w-5 h-8 ${flip ? '-scale-x-100' : ''}`} fill="currentColor" aria-hidden>
      <path d="M15.4 28.8c-3 .6-6.6-1.5-7.5-4.6 3 .1 6 1.9 7.5 4.6zM9.8 23.7c-2.6-1.3-4.3-4.6-3.6-7.6 2.4 1.6 3.9 4.6 3.6 7.6zM6.4 16.4C4.3 14.4 3.7 10.8 5 8.1c1.8 2.3 2.4 5.6 1.4 8.3zM5.4 8.1C4.1 5.7 4.6 2.2 6.6.3c1 2.7.6 6-1.2 7.8zM16.5 31.4c-4.7-.8-8.8-4.6-10.3-9.3C4.6 17.4 4.2 12 5.6 7.4l.9.3c-1.3 4.4-1 9.6.6 14.1 1.5 4.4 5.3 7.9 9.6 8.6l-.2 1z" />
    </svg>
  );
}

export default function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [recommendations, setRecommendations] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

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

  useEffect(() => {
    if (!showAllPhotos) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showAllPhotos]);

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

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) await navigator.share({ title: experience?.title, url });
      else { await navigator.clipboard.writeText(url); toast('Link copied', 'success'); }
    } catch { /* cancelled */ }
  };

  if (loading) {
    return (
      <div className="max-w-[1120px] mx-auto px-5 sm:px-10 pt-6">
        <div className="h-8 w-2/3 rounded-full shimmer" />
        <div className="mt-6 grid grid-cols-4 grid-rows-2 gap-2 h-[300px] md:h-[440px] rounded-xl overflow-hidden">
          <div className="col-span-4 md:col-span-2 row-span-2 shimmer" />
          {[0, 1, 2, 3].map((i) => <div key={i} className="hidden md:block shimmer" />)}
        </div>
        <div className="mt-10 grid lg:grid-cols-[1fr_380px] gap-16">
          <div className="space-y-3"><div className="h-6 w-1/2 rounded-full shimmer" /><div className="h-4 w-1/3 rounded-full shimmer" /><div className="h-28 rounded-xl shimmer" /></div>
          <div className="hidden lg:block h-80 rounded-xl shimmer" />
        </div>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4" aria-hidden>🧭</p>
          <h1 className="text-2xl font-semibold">We can’t find that experience</h1>
          <p className="text-ink-muted mt-2">It may have been removed or the link is incorrect.</p>
          <Link href="/experiences" className="btn-primary mt-6">Browse experiences</Link>
        </div>
      </div>
    );
  }

  const slots = experience.availability?.slots || [];
  const hasMoreReviews = reviews.length < reviewTotal;
  const images = experience.images || [];
  const guideName = `${experience.guide?.profile?.firstName ?? ''} ${experience.guide?.profile?.lastName ?? ''}`.trim();
  const isFavorite = experience.averageRating >= 4.8 && reviewTotal >= 3;
  const policy = experience.cancellationPolicy || 'flexible';
  const priceLabel = `${experience.price.currency === 'USD' ? '$' : `${experience.price.currency} `}${experience.price.amount.toFixed(0)}`;
  const description = experience.description || '';
  const longAbout = description.length > 420;

  const highlights = [
    { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', title: `${experience.duration} hour${experience.duration === 1 ? '' : 's'}`, desc: 'Take your time — the pace is set by the group.' },
    { icon: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z', title: experience.location.address, desc: 'Exact meeting point is shared after booking.' },
    { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', title: `${policy.charAt(0).toUpperCase()}${policy.slice(1)} cancellation`, desc: POLICY_COPY[policy] ?? 'See the cancellation policy below.' },
  ];

  const IconBtn = ({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) => (
    <button onClick={onClick} className="inline-flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-lg text-sm font-semibold underline underline-offset-2 hover:bg-fog" aria-label={label}>
      {children}
    </button>
  );

  return (
    <div className="bg-white">
      {/* ── Mobile photo hero ───────────────────────────────────────────── */}
      <div className="md:hidden relative aspect-[4/3] bg-[#EDF2F2]">
        {images[activeImage] && (
          <Image src={images[activeImage].url} alt={experience.title} fill priority sizes="100vw" className="object-cover" />
        )}
        <div className="absolute top-4 inset-x-4 flex justify-between">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center" aria-label="Back">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex gap-2">
            <button onClick={share} className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center" aria-label="Share">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" /></svg>
            </button>
            <button onClick={toggleWishlist} className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center" aria-label={wishlisted ? 'Remove from wishlist' : 'Save'}>
              <svg viewBox="0 0 32 32" className={`w-4 h-4 ${wishlisted ? 'text-sun' : 'text-transparent'}`} fill="currentColor" stroke={wishlisted ? 'currentColor' : '#0B2E33'} strokeWidth={2.5} aria-hidden>
                <path d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z" />
              </svg>
            </button>
          </div>
        </div>
        {images.length > 1 && (
          <>
            <button onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)} className="absolute inset-y-0 left-0 w-1/3" aria-label="Previous photo" />
            <button onClick={() => setActiveImage((i) => (i + 1) % images.length)} className="absolute inset-y-0 right-0 w-1/3" aria-label="Next photo" />
            <span className="absolute bottom-4 right-4 rounded-md bg-black/60 text-white text-xs font-semibold px-2.5 py-1">
              {activeImage + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      <div className="max-w-[1120px] mx-auto px-6 sm:px-10">
        {/* ── Title row (desktop) ───────────────────────────────────────── */}
        <div className="hidden md:flex items-end justify-between gap-6 pt-6">
          <h1 className="text-[26px] font-semibold text-ink leading-tight">{experience.title}</h1>
          <div className="flex items-center gap-4 shrink-0">
            <IconBtn onClick={share} label="Share">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" /></svg>
              Share
            </IconBtn>
            <IconBtn onClick={toggleWishlist} label={wishlisted ? 'Remove from wishlist' : 'Save'}>
              <svg viewBox="0 0 32 32" className={`w-4 h-4 ${wishlisted ? 'text-sun' : 'text-transparent'}`} fill="currentColor" stroke={wishlisted ? 'currentColor' : '#0B2E33'} strokeWidth={3} aria-hidden>
                <path d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z" />
              </svg>
              {wishlisted ? 'Saved' : 'Save'}
            </IconBtn>
          </div>
        </div>

        {/* ── Photo grid (desktop) ──────────────────────────────────────── */}
        <div className="hidden md:grid relative mt-6 grid-cols-4 grid-rows-2 gap-2 h-[440px] lg:h-[480px] rounded-xl overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => {
            const im = images[i];
            return (
              <button
                key={i}
                onClick={() => { setActiveImage(i); setShowAllPhotos(true); }}
                className={`relative bg-[#EDF2F2] overflow-hidden group ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
                aria-label={`Open photo ${i + 1}`}
                disabled={!im}
              >
                {im && (
                  <Image src={im.url} alt={i === 0 ? experience.title : ''} fill priority={i === 0} sizes={i === 0 ? '50vw' : '25vw'} className="object-cover transition-[filter] duration-200 group-hover:brightness-90" />
                )}
              </button>
            );
          })}
          {images.length > 0 && (
            <button
              onClick={() => setShowAllPhotos(true)}
              className="absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-lg bg-white border border-ink px-4 py-1.5 text-sm font-semibold hover:bg-fog"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M3 11.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm5 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm5 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-10-5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm5 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm5 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-10-5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm5 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm5 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" /></svg>
              Show all photos
            </button>
          )}
        </div>

        {/* ── Content + booking ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_372px] gap-12 lg:gap-24 pt-6 md:pt-10">
          <div className="min-w-0">
            <h1 className="md:hidden text-[26px] font-semibold leading-tight">{experience.title}</h1>
            <h2 className="hidden md:block text-[22px] font-semibold text-ink">Experience in {experience.location.address}</h2>
            <p className="mt-1 text-ink">
              {experience.duration} hr{experience.duration === 1 ? '' : 's'} · Up to 8 guests · {experience.category?.join(' · ')}
            </p>
            {!isFavorite && experience.averageRating > 0 && (
              <p className="mt-1 font-semibold flex items-center gap-1">
                <svg viewBox="0 0 32 32" className="w-3.5 h-3.5" fill="currentColor" aria-hidden><path d="M15.1 1.58l-4.13 8.88-9.86 1.27a1 1 0 0 0-.54 1.74l7.3 6.57-1.97 9.85a1 1 0 0 0 1.48 1.06l8.62-5 8.63 5a1 1 0 0 0 1.48-1.06l-1.97-9.85 7.3-6.57a1 1 0 0 0-.55-1.73l-9.86-1.28-4.12-8.88a1 1 0 0 0-1.82 0z" /></svg>
                {experience.averageRating.toFixed(2)} · <a href="#reviews" className="underline underline-offset-2">{reviewTotal} reviews</a>
              </p>
            )}

            {isFavorite && (
              <a href="#reviews" className="mt-8 flex items-center gap-4 sm:gap-6 rounded-xl border border-[#DCE4E5] px-5 sm:px-6 py-5 hover:shadow-md transition-shadow">
                <span className="flex items-center text-ink shrink-0">
                  <Laurel />
                  <span className="text-center leading-[1.1] font-semibold text-[17px] px-0.5">Guest<br />favorite</span>
                  <Laurel flip />
                </span>
                <span className="hidden sm:block flex-1 text-[15px] font-semibold leading-snug">
                  One of the most loved experiences on Nsoroma, according to guests
                </span>
                <span className="ml-auto flex items-center divide-x divide-[#DCE4E5]">
                  <span className="px-4 text-center">
                    <span className="block text-[22px] font-semibold leading-none">{experience.averageRating.toFixed(2)}</span>
                    <span className="block text-[10px] tracking-[0.15em] mt-1" aria-hidden>★★★★★</span>
                  </span>
                  <span className="pl-4 text-center">
                    <span className="block text-[22px] font-semibold leading-none">{reviewTotal}</span>
                    <span className="block text-xs font-semibold underline mt-1">Reviews</span>
                  </span>
                </span>
              </a>
            )}

            {/* Host */}
            {experience.guide && (
              <div className="flex items-center gap-4 py-8 border-b border-[#DCE4E5]">
                <div className="relative w-12 h-12 shrink-0">
                  <div className="w-12 h-12 rounded-full bg-ink text-white overflow-hidden flex items-center justify-center text-lg font-semibold">
                    {experience.guide.profile?.profilePhotoUrl
                      ? <Image src={experience.guide.profile.profilePhotoUrl} alt={guideName} width={48} height={48} className="object-cover" />
                      : experience.guide.profile?.firstName?.[0]}
                  </div>
                  {experience.guide.verified && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-leaf ring-2 ring-white flex items-center justify-center" title="Verified guide">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3.5} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">Hosted by {guideName || 'a local guide'}</p>
                  <p className="text-sm text-ink-muted">{experience.guide.verified ? 'Verified guide · ' : ''}Local expert in Accra</p>
                </div>
              </div>
            )}

            {/* Highlights */}
            <ul className="py-8 space-y-6 border-b border-[#DCE4E5]">
              {highlights.map((h) => (
                <li key={h.title} className="flex gap-6">
                  <svg className="w-6 h-6 shrink-0 text-ink mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d={h.icon} /></svg>
                  <div>
                    <p className="font-semibold text-ink">{h.title}</p>
                    <p className="text-sm text-ink-muted">{h.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* About */}
            <section className="py-8 border-b border-[#DCE4E5]">
              <h2 className="text-[22px] font-semibold mb-4">What you’ll do</h2>
              <p className={`text-ink leading-[1.6] whitespace-pre-line ${longAbout && !aboutOpen ? 'line-clamp-6' : ''}`}>{description}</p>
              {longAbout && (
                <button onClick={() => setAboutOpen((o) => !o)} className="mt-4 inline-flex items-center gap-1 font-semibold underline underline-offset-2">
                  {aboutOpen ? 'Show less' : 'Show more'}
                  <svg className={`w-3 h-3 transition-transform ${aboutOpen ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={3.5} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              )}
            </section>

            {/* Availability */}
            {slots.length > 0 && (
              <section className="py-8 border-b border-[#DCE4E5]">
                <h2 className="text-[22px] font-semibold">Upcoming availability</h2>
                <p className="text-sm text-ink-muted mt-1 mb-6">Pick a date and time in the booking panel.</p>
                <AvailabilityCalendar slots={slots} />
              </section>
            )}

            {/* Reviews */}
            <section id="reviews" className="py-10 border-b border-[#DCE4E5] scroll-mt-24">
              <h2 className="text-[22px] font-semibold flex items-center gap-2">
                <svg viewBox="0 0 32 32" className="w-5 h-5" fill="currentColor" aria-hidden><path d="M15.1 1.58l-4.13 8.88-9.86 1.27a1 1 0 0 0-.54 1.74l7.3 6.57-1.97 9.85a1 1 0 0 0 1.48 1.06l8.62-5 8.63 5a1 1 0 0 0 1.48-1.06l-1.97-9.85 7.3-6.57a1 1 0 0 0-.55-1.73l-9.86-1.28-4.12-8.88a1 1 0 0 0-1.82 0z" /></svg>
                {experience.averageRating > 0 ? `${experience.averageRating.toFixed(2)} · ` : ''}{reviewTotal} review{reviewTotal !== 1 ? 's' : ''}
              </h2>
              {reviews.length === 0 ? (
                <p className="mt-4 text-ink-muted">No reviews yet — book now and be the first to share your experience.</p>
              ) : (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-10">
                  {reviews.map((review) => {
                    const name = review.traveler?.profile ? `${review.traveler.profile.firstName} ${review.traveler.profile.lastName}` : 'Traveler';
                    return (
                      <article key={review.id}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#0B2E33] text-white flex items-center justify-center font-semibold shrink-0">
                            {review.traveler?.profile?.firstName?.[0] ?? '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-ink">{name}</p>
                            <p className="text-sm text-ink-muted">
                              {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3"><StarRating value={review.rating} readonly size="sm" /></div>
                        {review.comment && <p className="mt-2 text-ink leading-[1.55]">{review.comment}</p>}
                      </article>
                    );
                  })}
                </div>
              )}
              {hasMoreReviews && (
                <button onClick={loadMoreReviews} className="mt-10 btn-ghost">
                  Show more reviews
                </button>
              )}
            </section>

            {/* Location */}
            <section className="py-10 border-b border-[#DCE4E5]">
              <h2 className="text-[22px] font-semibold mb-2">Where you’ll be</h2>
              <p className="text-ink mb-6">{experience.location.address}</p>
              {experience.location.latitude && experience.location.longitude ? (
                <div className="rounded-xl overflow-hidden h-[340px] border border-[#DCE4E5]">
                  <iframe
                    title="Location"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${experience.location.longitude - 0.01},${experience.location.latitude - 0.01},${experience.location.longitude + 0.01},${experience.location.latitude + 0.01}&layer=mapnik&marker=${experience.location.latitude},${experience.location.longitude}`}
                    width="100%" height="100%" style={{ border: 0 }} loading="lazy"
                  />
                </div>
              ) : (
                <div className="rounded-xl bg-fog h-56 flex flex-col items-center justify-center text-ink-muted">
                  <span className="text-3xl mb-2" aria-hidden>📍</span>
                  <p className="text-sm">Exact meeting point shared after booking</p>
                </div>
              )}
            </section>

            {/* Meet your host */}
            {experience.guide && (
              <section className="py-10 border-b border-[#DCE4E5]">
                <h2 className="text-[22px] font-semibold mb-6">Meet your host</h2>
                <div className="grid sm:grid-cols-[280px_1fr] gap-8 items-start">
                  <div className="rounded-3xl shadow-[0_6px_20px_rgba(0,0,0,0.2)] p-6 text-center">
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="w-24 h-24 rounded-full bg-ink text-white text-3xl font-semibold flex items-center justify-center overflow-hidden">
                        {experience.guide.profile?.profilePhotoUrl
                          ? <Image src={experience.guide.profile.profilePhotoUrl} alt={guideName} width={96} height={96} className="object-cover" />
                          : experience.guide.profile?.firstName?.[0]}
                      </div>
                      {experience.guide.verified && (
                        <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-leaf ring-4 ring-white flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={3.5} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-[26px] font-bold leading-tight">{experience.guide.profile?.firstName}</p>
                    <p className="text-sm font-semibold">{experience.guide.verified ? 'Verified guide' : 'Local guide'}</p>
                  </div>
                  <div>
                    {experience.guide.profile?.bio && <p className="text-ink leading-[1.6]">{experience.guide.profile.bio}</p>}
                    <ul className="mt-5 space-y-2 text-sm text-ink">
                      <li>Response rate: 100%</li>
                      <li>Responds within an hour</li>
                    </ul>
                    <p className="mt-6 flex items-start gap-2 text-xs text-ink-muted max-w-sm">
                      <span aria-hidden>🛡️</span>
                      To protect your payment, always pay and communicate through Nsoroma.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Things to know */}
            <section className="py-10">
              <h2 className="text-[22px] font-semibold mb-6">Things to know</h2>
              <div className="grid sm:grid-cols-3 gap-8 text-sm">
                <div>
                  <p className="font-semibold mb-2">Cancellation policy</p>
                  <p className="text-ink-muted">{POLICY_COPY[policy] ?? policy}</p>
                </div>
                <div>
                  <p className="font-semibold mb-2">Guest requirements</p>
                  <p className="text-ink-muted">Up to 8 guests. Comfortable shoes and water recommended.</p>
                </div>
                <div>
                  <p className="font-semibold mb-2">Payments</p>
                  <p className="text-ink-muted">Held in escrow and released to your guide after the experience.</p>
                </div>
              </div>
            </section>
          </div>

          {/* ── Sticky booking card ───────────────────────────────────────── */}
          <aside id="book" className="scroll-mt-24">
            <div className="lg:sticky lg:top-28 rounded-xl border border-[#DCE4E5] shadow-[0_6px_16px_rgba(0,0,0,0.12)] p-6">
              <div className="flex items-baseline justify-between gap-3 mb-6">
                <p>
                  <span className="text-[22px] font-semibold">{priceLabel}</span>
                  <span className="text-ink"> / guest</span>
                </p>
                {experience.averageRating > 0 && (
                  <a href="#reviews" className="text-sm"><span className="font-semibold">★ {experience.averageRating.toFixed(2)}</span> · <span className="underline text-ink-muted">{reviewTotal} reviews</span></a>
                )}
              </div>
              <BookingForm experienceId={experience.id} price={experience.price} slots={slots} />
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-ink-muted">
              <span aria-hidden>🛡️</span> Every booking is protected by escrow
            </p>
          </aside>
        </div>
      </div>

      {/* Similar experiences */}
      {recommendations.length > 0 && (
        <div className="max-w-[1120px] mx-auto px-6 sm:px-10 border-t border-[#DCE4E5] mt-4 pt-8">
          <Carousel title="You might also like" itemClassName="w-[72%] sm:w-[calc((100%-24px)/2)] lg:w-[calc((100%-72px)/4)]">
            {recommendations.slice(0, 8).map((rec) => <ExperienceCard key={rec.id} experience={rec} />)}
          </Carousel>
        </div>
      )}

      {/* Mobile reserve bar */}
      <div className="lg:hidden fixed bottom-[64px] md:bottom-0 inset-x-0 z-40 bg-white border-t border-[#EDF2F2] px-6 py-3 flex items-center justify-between">
        <div>
          <p className="text-[15px]"><span className="font-semibold">{priceLabel}</span> / guest</p>
          {experience.averageRating > 0 && <p className="text-xs text-ink-muted">★ {experience.averageRating.toFixed(2)} · {reviewTotal} reviews</p>}
        </div>
        <a href="#book" className="btn-accent !px-8">Reserve</a>
      </div>

      {/* All photos */}
      {showAllPhotos && (
        <div className="fixed inset-0 bg-white z-[80] overflow-y-auto animate-fade-in" role="dialog" aria-modal="true" aria-label="All photos">
          <div className="sticky top-0 bg-white/95 backdrop-blur z-10 flex items-center justify-between px-4 sm:px-8 h-16">
            <button onClick={() => setShowAllPhotos(false)} className="w-9 h-9 rounded-full hover:bg-fog flex items-center justify-center" aria-label="Close photos">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex items-center gap-4">
              <IconBtn onClick={share} label="Share">Share</IconBtn>
              <IconBtn onClick={toggleWishlist} label="Save">{wishlisted ? 'Saved' : 'Save'}</IconBtn>
            </div>
          </div>
          <div className="max-w-3xl mx-auto px-4 pb-16 grid grid-cols-2 gap-2">
            {images.map((img, i) => (
              <div key={i} className={`relative overflow-hidden bg-[#EDF2F2] ${i % 3 === 0 ? 'col-span-2 aspect-[3/2]' : 'aspect-square'}`}>
                <Image src={img.url} alt={`Photo ${i + 1}`} fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
