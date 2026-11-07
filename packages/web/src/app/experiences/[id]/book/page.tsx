'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { experiencesApi } from '@/lib/api';
import BookingForm, { AvailabilitySlot } from '@/components/booking/BookingForm';

interface ExperienceSummary {
  id: string;
  title: string;
  price: { amount: number; currency: string };
  duration: number;
  cancellationPolicy: string;
  availability: { slots: AvailabilitySlot[] };
  images?: { url: string; thumbnailUrl: string }[];
  averageRating?: number;
  reviewCount?: number;
  category?: string[];
  location?: { address: string };
}

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [experience, setExperience] = useState<ExperienceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (!id) return;
    experiencesApi.get(id)
      .then(({ data }: { data: ExperienceSummary }) => setExperience(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-[1120px] mx-auto px-6 sm:px-10 pt-10 grid lg:grid-cols-[1fr_440px] gap-16">
        <div className="space-y-4"><div className="h-9 w-64 rounded-full shimmer" /><div className="h-72 rounded-xl shimmer" /></div>
        <div className="hidden lg:block h-96 rounded-xl shimmer" />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-5xl mb-4" aria-hidden>🧭</p>
          <h1 className="text-2xl font-semibold">We can’t find that experience</h1>
          <Link href="/experiences" className="btn-primary mt-6">Browse experiences</Link>
        </div>
      </div>
    );
  }

  const slots = experience.availability?.slots || [];
  const policy = experience.cancellationPolicy || 'flexible';
  const POLICY: Record<string, string> = {
    flexible: 'Free cancellation up to 24 hours before the start time.',
    moderate: 'Free cancellation up to 7 days before the start time.',
    strict: 'Free cancellation up to 14 days before the start time.',
  };
  const img = experience.images?.[0];

  return (
    <div className="bg-white">
      <div className="max-w-[1120px] mx-auto px-6 sm:px-10 pt-8 md:pt-12 pb-10">
        <div className="flex items-center gap-3">
          {!booked && (
            <Link href={`/experiences/${id}`} className="w-9 h-9 -ml-2 rounded-full hover:bg-fog flex items-center justify-center" aria-label="Back to experience">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </Link>
          )}
          <h1 className="text-[28px] sm:text-[32px] font-semibold">{booked ? 'You’re all set' : 'Confirm and pay'}</h1>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1fr_440px] gap-10 lg:gap-20 items-start">
          {/* Left: steps */}
          <div className="min-w-0 order-2 lg:order-1">
            <section className="pb-8 border-b border-[#DCE4E5]">
              <h2 className="text-[22px] font-semibold mb-6">Your trip</h2>
              <BookingForm
                experienceId={experience.id}
                price={experience.price}
                slots={slots}
                onSuccess={() => {
                  setBooked(true);
                  // Redirect to dashboard after short delay
                  setTimeout(() => router.push('/dashboard/traveler'), 3000);
                }}
              />
            </section>
            {!booked && (
              <>
                <section className="py-8 border-b border-[#DCE4E5]">
                  <h2 className="text-[22px] font-semibold mb-2">Cancellation policy</h2>
                  <p className="text-ink"><span className="font-semibold capitalize">{policy}.</span> {POLICY[policy] ?? ''}</p>
                </section>
                <section className="py-8">
                  <h2 className="text-[22px] font-semibold mb-2">Ground rules</h2>
                  <p className="text-ink-muted">We ask every guest to remember a few simple things about what makes a great guest.</p>
                  <ul className="mt-3 list-disc pl-5 text-ink space-y-1">
                    <li>Arrive at the meeting point on time</li>
                    <li>Respect local customs and your host’s community</li>
                  </ul>
                </section>
              </>
            )}
          </div>

          {/* Right: summary card */}
          <aside className="order-1 lg:order-2 lg:sticky lg:top-28 rounded-xl border border-[#DCE4E5] p-6">
            <div className="flex gap-4 pb-6 border-b border-[#DCE4E5]">
              <div className="w-28 h-24 rounded-lg overflow-hidden bg-[#EDF2F2] shrink-0">
                {img && (
                  <img src={img.thumbnailUrl || img.url} alt={experience.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink-muted">{experience.category?.[0] ?? 'Experience'}{experience.location?.address ? ` · ${experience.location.address}` : ''}</p>
                <p className="mt-0.5 font-semibold leading-snug line-clamp-2">{experience.title}</p>
                {experience.averageRating ? (
                  <p className="mt-1 text-xs"><span className="font-semibold">★ {experience.averageRating.toFixed(2)}</span> <span className="text-ink-muted">({experience.reviewCount ?? 0})</span></p>
                ) : null}
              </div>
            </div>
            <div className="py-6 border-b border-[#DCE4E5] space-y-2 text-[15px]">
              <h3 className="text-[22px] font-semibold mb-3">Price details</h3>
              <div className="flex justify-between"><span>Price per guest</span><span>{experience.price.currency === 'USD' ? '$' : `${experience.price.currency} `}{experience.price.amount.toFixed(0)}</span></div>
              <div className="flex justify-between"><span>Duration</span><span>{experience.duration} hrs</span></div>
            </div>
            <p className="pt-5 flex items-start gap-2 text-sm text-ink-muted">
              <span aria-hidden>🛡️</span>
              Your payment is held in escrow and only released to the guide after your experience.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
