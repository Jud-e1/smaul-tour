'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { tripPlannerApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRouter, useSearchParams } from 'next/navigation';

interface ExperienceRec {
  experienceId: string;
  relevanceScore: number;
  suggestedDate?: string;
  reasoning: string;
  experience?: {
    title: string;
    price: { amount: number; currency: string };
    duration: number;
    location: { address: string };
  };
}

interface Itinerary {
  id: string;
  experiences: ExperienceRec[];
  totalCost: { amount: number; currency: string };
  parameters: {
    duration?: number;
    budget?: { min: number; max: number; currency: string };
    preferences: string[];
  };
  generatedAt: string;
}

function ItinerarySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-12 bg-forest-50 rounded-lg mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 p-4 border border-black/[0.07] rounded-lg">
              <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48" />
                <div className="h-3 bg-gray-100 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TripPlannerPage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState('');
  const [modification, setModification] = useState('');
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState('');

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load itinerary from query param (e.g. from dashboard "View" link)
  useEffect(() => {
    const itineraryId = searchParams.get('itinerary');
    if (!itineraryId || !user) return;
    setLoading(true);
    tripPlannerApi
      .getItinerary(itineraryId)
      .then(({ data }) => setItinerary(data))
      .catch(() => setError('Failed to load itinerary.'))
      .finally(() => setLoading(false));
  }, [searchParams, user]);

  const generate = async (text: string) => {
    if (!user) { router.push('/login'); return; }
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await tripPlannerApi.generate({ naturalLanguageInput: text });
      setItinerary(data);
    } catch {
      setError('Failed to generate itinerary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modify = async () => {
    if (!itinerary || !modification.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await tripPlannerApi.modify(itinerary.id, modification);
      setItinerary(data);
      setModification('');
    } catch {
      setError('Failed to modify itinerary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    if (!itinerary) return;
    try {
      const { data } = await tripPlannerApi.exportPdf(itinerary.id);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `itinerary-${itinerary.id}.pdf`;
      a.click();
    } catch {
      setError('Failed to export PDF.');
    }
  };

  const shareLink = async () => {
    if (!itinerary) return;
    try {
      const { data } = await tripPlannerApi.shareLink(itinerary.id);
      await navigator.clipboard.writeText(data.shareUrl);
      alert('Share link copied to clipboard!');
    } catch {
      setError('Failed to generate share link.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-forest-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <p className="eyebrow flex items-center gap-2"><span className="h-px w-6 bg-sun" aria-hidden />AI trip planner</p>
        <h1 className="mt-3 font-display text-4xl sm:text-[56px] leading-[1] font-bold text-ink mb-4">Say it like you&apos;d tell a friend.</h1>
        <p className="text-ink-muted text-lg mb-8 max-w-xl">Describe your ideal days in Accra and get a personalized, bookable itinerary in seconds.</p>

        {/* Natural language input */}
        <div className="bg-white rounded-card border border-black/[0.07] shadow-soft p-5 sm:p-7 mb-6">
          <label htmlFor="trip-input" className="block text-sm font-semibold text-ink mb-2">
            Tell us about your trip
          </label>
          <textarea
            id="trip-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 3 days in Accra, love street food and history, one relaxed beach evening, budget around $300…"
            rows={4}
            className="field resize-none text-[15px] leading-relaxed bg-canvas"
            aria-label="Trip description"
          />
          {error && <p className="text-red-500 text-sm mt-2" role="alert">{error}</p>}
          <button
            onClick={() => generate(input)}
            disabled={loading || !input.trim()}
            className="mt-4 btn-accent px-7 py-3.5 disabled:opacity-50 disabled:shadow-none"
            aria-busy={loading}
          >
            {loading && !itinerary ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </span>
            ) : 'Generate Itinerary'}
          </button>
        </div>

        {/* Loading skeleton while generating */}
        {loading && !itinerary && <ItinerarySkeleton />}

        {/* Itinerary result */}
        {itinerary && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="text-xl font-semibold text-ink">Your Itinerary</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportPdf}
                    className="text-sm border border-black/[0.12] px-3 py-1.5 rounded-lg hover:bg-canvas"
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={shareLink}
                    className="text-sm border border-black/[0.12] px-3 py-1.5 rounded-lg hover:bg-canvas"
                  >
                    Share Link
                  </button>
                </div>
              </div>

              {/* Total estimated cost */}
              <div className="bg-forest-50 rounded-lg p-3 mb-4 flex items-center justify-between">
                <span className="text-sm text-forest-700">Total estimated cost</span>
                <span className="font-bold text-forest-900">
                  {itinerary.totalCost.currency} {itinerary.totalCost.amount.toFixed(2)}
                </span>
              </div>

              {/* Experience list */}
              <div className="space-y-3">
                {itinerary.experiences.map((rec, i) => (
                  <div key={rec.experienceId} className="flex gap-4 p-4 border border-black/[0.07] rounded-lg">
                    <div className="w-8 h-8 bg-forest-100 text-forest-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Link
                            href={`/experiences/${rec.experienceId}`}
                            className="font-medium text-ink hover:text-forest-600"
                          >
                            {rec.experience?.title || `Experience ${i + 1}`}
                          </Link>
                          <div className="flex items-center gap-3 mt-0.5">
                            {rec.suggestedDate && (
                              <p className="text-xs text-ink-muted">
                                {new Date(rec.suggestedDate).toLocaleDateString()}
                              </p>
                            )}
                            {rec.experience?.duration && (
                              <p className="text-xs text-ink-muted">{rec.experience.duration}h</p>
                            )}
                            {/* Relevance score badge */}
                            <span
                              className="text-xs px-1.5 py-0.5 bg-forest-50 text-forest-700 rounded font-medium"
                              title="AI relevance score"
                            >
                              {Math.round(rec.relevanceScore * 100)}% match
                            </span>
                          </div>
                          {rec.experience?.location?.address && (
                            <p className="text-xs text-ink-soft mt-0.5">{rec.experience.location.address}</p>
                          )}
                          <p className="text-sm text-ink-muted mt-1">{rec.reasoning}</p>
                        </div>
                        {rec.experience?.price && (
                          <span className="text-sm font-medium text-ink shrink-0">
                            {rec.experience.price.currency} {rec.experience.price.amount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Follow-up modification input */}
            <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
              <h3 className="font-medium text-ink mb-1">Modify your itinerary</h3>
              <p className="text-sm text-ink-muted mb-3">
                Describe changes in natural language and we&apos;ll update your plan.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={modification}
                  onChange={(e) => setModification(e.target.value)}
                  placeholder="e.g. Replace the food tour with a hiking experience..."
                  className="flex-1 border border-black/[0.12] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10"
                  onKeyDown={(e) => e.key === 'Enter' && modify()}
                  aria-label="Itinerary modification request"
                />
                <button
                  onClick={modify}
                  disabled={loading || !modification.trim()}
                  className="bg-forest-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-700 disabled:opacity-50"
                  aria-busy={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Updating...
                    </span>
                  ) : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TripPlannerRoute() {
  return (
    <Suspense fallback={<ItinerarySkeleton />}>
      <TripPlannerPage />
    </Suspense>
  );
}
