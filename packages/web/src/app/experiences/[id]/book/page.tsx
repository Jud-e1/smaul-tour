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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-3">Experience not found.</p>
          <Link href="/experiences" className="text-blue-600 hover:underline text-sm">
            Browse experiences
          </Link>
        </div>
      </div>
    );
  }

  const slots = experience.availability?.slots || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {!booked && (
          <Link
            href={`/experiences/${id}`}
            className="text-blue-600 hover:underline text-sm mb-6 inline-block"
          >
            ← Back to experience
          </Link>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Experience header */}
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900">{experience.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span>{experience.duration}h</span>
              <span className="text-gray-300">·</span>
              <span className="capitalize">{experience.cancellationPolicy} cancellation</span>
            </div>
          </div>

          {/* Booking form */}
          <div className="p-6">
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
          </div>
        </div>

        {/* Cancellation policy info */}
        {!booked && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-800">
            <strong className="font-medium">Cancellation policy: </strong>
            <span className="capitalize">{experience.cancellationPolicy}</span>
            {experience.cancellationPolicy === 'flexible' && ' — Full refund up to 24 hours before.'}
            {experience.cancellationPolicy === 'moderate' && ' — Full refund up to 7 days before.'}
            {experience.cancellationPolicy === 'strict' && ' — Full refund up to 14 days before.'}
          </div>
        )}
      </div>
    </div>
  );
}
