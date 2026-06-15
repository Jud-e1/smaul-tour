'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import ReviewForm from '@/components/reviews/ReviewForm';

function ReviewPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId') || '';
  const experienceId = searchParams.get('experienceId') || '';

  if (!bookingId || !experienceId) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Missing booking or experience information.</p>
        <Link href="/dashboard/traveler" className="text-blue-600 hover:underline text-sm">
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <ReviewForm
      bookingId={bookingId}
      experienceId={experienceId}
      onSuccess={() => setTimeout(() => router.push('/dashboard/traveler'), 2000)}
    />
  );
}

export default function NewReviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-md p-8">
        <div className="mb-6">
          <Link
            href="/dashboard/traveler"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-4">Leave a Review</h1>
          <p className="text-sm text-gray-500 mt-1">
            Share your experience to help other travelers.
          </p>
        </div>
        <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded-lg" />}>
          <ReviewPageContent />
        </Suspense>
      </div>
    </div>
  );
}
