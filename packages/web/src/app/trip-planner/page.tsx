'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import World3D from '@/components/three/World3D';
import { tripPlannerApi } from '@/lib/api';
import { useAuthStore, hasStoredSession } from '@/store/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Sparkles } from 'lucide-react';

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
      <div className="bg-paper rounded-2xl border border-[#E1D8CA] p-6">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-12 bg-forest-50 rounded-lg mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 p-4 border border-[#E1D8CA] rounded-lg">
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
    if (!authLoading && !user && !hasStoredSession()) {
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

  const EXAMPLES = [
    '3 days in Accra, street food and history, one beach evening, around $300',
    'A relaxed weekend with art studios, markets and great coffee',
    'Day trip from Accra to Cape Coast castles with a local historian',
    'Nature and adventure: canopy walks, waterfalls and hikes for 4 days',
  ];
  const money = (amount: number, currency: string) => `${currency === 'USD' ? '$' : `${currency} `}${amount.toFixed(amount % 1 ? 2 : 0)}`;
  const Spinner = () => (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  return (
    <div className="bg-canvas">
      <div className="max-w-[1120px] mx-auto px-6 sm:px-10 pt-8 md:pt-14 pb-10">
        <div className="grid lg:grid-cols-[1fr_400px] gap-10 lg:gap-16 items-start">
          {/* ── Prompt ─────────────────────────────────────────────────── */}
          <div>
            <span className="eyebrow inline-flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" />AI trip planner</span>
            <h1 className="mt-4 text-[34px] sm:text-[48px] leading-[1.05] font-bold tracking-[-0.03em] text-ink">
              Tell us the trip.<br />We’ll plan every day.
            </h1>
            <p className="mt-4 text-[17px] text-ink-muted max-w-xl leading-relaxed">
              Describe your ideal days in Accra — pace, budget, what you love — and get a bookable, day-by-day itinerary in seconds.
            </p>

            <div className="mt-8 rounded-2xl border border-[#E1D8CA] shadow-[0_6px_16px_rgba(0,0,0,0.08)] focus-within:shadow-[0_6px_20px_rgba(0,0,0,0.14)] focus-within:border-ink transition-shadow">
              <label htmlFor="trip-input" className="block px-5 pt-4 text-xs font-semibold text-ink">Tell us about your trip</label>
              <textarea
                id="trip-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. 3 days in Accra, love street food and history, one relaxed beach evening, budget around $300…"
                rows={4}
                className="w-full px-5 pt-1 pb-3 bg-transparent resize-none text-[16px] leading-relaxed outline-none placeholder:text-ink-muted"
                aria-label="Trip description"
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && input.trim()) generate(input); }}
              />
              <div className="flex items-center justify-between gap-3 border-t border-[#EAE1D3] px-4 py-3">
                <span className="hidden sm:block text-xs text-ink-muted">Ctrl + Enter to generate</span>
                <button
                  onClick={() => generate(input)}
                  disabled={loading || !input.trim()}
                  className="btn-accent ml-auto !py-2.5"
                  aria-busy={loading}
                >
                  {loading && !itinerary ? <><Spinner /> Planning…</> : 'Generate itinerary'}
                </button>
              </div>
            </div>
            {error && <p className="mt-3 flex items-center gap-1.5 text-sm text-[#B3261E]" role="alert"><AlertCircle className="w-4 h-4" />{error}</p>}

            <p className="mt-6 text-sm font-semibold">Try one of these</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setInput(ex)} className="text-left rounded-full border border-[#E1D8CA] px-4 py-2 text-sm hover:border-ink transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* ── How it works ─────────────────────────────────────────── */}
          <aside className="rounded-[32px] bg-sand paper-grain overflow-hidden">
            <div className="relative h-[230px]">
              <World3D variant="star" className="absolute inset-0" fallback="/photos/blackstar.jpg" />
              <span className="absolute top-5 left-6 mono text-[11px] uppercase tracking-[0.1em] text-stone-600">How it works</span>
            </div>
            <ol className="px-6 sm:px-8 pb-8 space-y-5">
              {[
                ['Describe it', 'Dates, budget, interests — in your own words.'],
                ['Get a plan', 'We match verified local experiences to each day.'],
                ['Tweak & book', 'Ask for changes, export a PDF or share the link.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="w-9 h-9 rounded-full bg-ink text-paper mono text-xs flex items-center justify-center shrink-0">0{i + 1}</span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-ink-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        {/* Loading skeleton while generating */}
        {loading && !itinerary && <div className="mt-12"><ItinerarySkeleton /></div>}

        {/* ── Itinerary result ─────────────────────────────────────────── */}
        {itinerary && (
          <section className="mt-14 grid lg:grid-cols-[1fr_400px] gap-10 lg:gap-16 items-start animate-fade-in">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#E1D8CA]">
                <div>
                  <p className="text-sm text-ink-muted">Your itinerary</p>
                  <h2 className="text-[34px] leading-tight font-semibold">{itinerary.experiences.length} stops across Accra</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={exportPdf} className="btn-outline !py-2 !px-4 text-sm">Export PDF</button>
                  <button onClick={shareLink} className="btn-outline !py-2 !px-4 text-sm">Share link</button>
                </div>
              </div>

              <ol className="relative mt-8 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-[#E1D8CA]">
                {itinerary.experiences.map((rec, i) => (
                  <li key={rec.experienceId} className="relative flex gap-5">
                    <span className="relative z-10 w-10 h-10 rounded-full bg-ink text-white text-sm font-semibold flex items-center justify-center shrink-0 ring-4 ring-paper">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0 rounded-2xl border border-[#E1D8CA] p-5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.1)] transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink-muted">
                            {rec.suggestedDate ? new Date(rec.suggestedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : `Stop ${i + 1}`}
                            {rec.experience?.duration ? ` · ${rec.experience.duration} hrs` : ''}
                          </p>
                          <Link href={`/experiences/${rec.experienceId}`} className="mt-1 block text-lg font-semibold leading-snug hover:underline">
                            {rec.experience?.title || `Experience ${i + 1}`}
                          </Link>
                          {rec.experience?.location?.address && <p className="text-sm text-ink-muted">{rec.experience.location.address}</p>}
                        </div>
                        {rec.experience?.price && (
                          <span className="text-[15px] font-semibold shrink-0">{money(rec.experience.price.amount, rec.experience.price.currency)}</span>
                        )}
                      </div>
                      <p className="mt-3 text-[15px] text-ink leading-relaxed">{rec.reasoning}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-50 text-leaf-700 text-xs font-semibold px-2.5 py-1" title="AI relevance score">
                          {Math.round(rec.relevanceScore * 100)}% match
                        </span>
                        <Link href={`/experiences/${rec.experienceId}`} className="text-sm font-semibold underline underline-offset-2">View &amp; book</Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="lg:sticky lg:top-28 space-y-6">
              <div className="rounded-2xl border border-[#E1D8CA] shadow-[0_6px_16px_rgba(0,0,0,0.12)] p-6">
                <p className="text-sm text-ink-muted">Total estimated cost</p>
                <p className="mt-1 text-[32px] font-semibold leading-none">{money(itinerary.totalCost.amount, itinerary.totalCost.currency)}</p>
                <p className="mt-1 text-sm text-ink-muted">per guest · {itinerary.experiences.length} experiences</p>
                {itinerary.parameters?.preferences?.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {itinerary.parameters.preferences.map((p) => (
                      <span key={p} className="rounded-full bg-fog px-3 py-1 text-xs font-semibold capitalize">{p}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#E1D8CA] p-6">
                <h3 className="font-semibold">Change something?</h3>
                <p className="text-sm text-ink-muted mt-1 mb-4">Describe it in plain words and we’ll update the plan.</p>
                <input
                  type="text"
                  value={modification}
                  onChange={(e) => setModification(e.target.value)}
                  placeholder="e.g. Swap the food tour for a hike"
                  className="w-full rounded-lg border border-[#C9BCA9] px-3.5 py-3 text-[15px] outline-none focus:border-ink focus:shadow-[0_0_0_1px_#1C1B1A]"
                  onKeyDown={(e) => e.key === 'Enter' && modify()}
                  aria-label="Itinerary modification request"
                />
                <button onClick={modify} disabled={loading || !modification.trim()} className="btn-primary w-full mt-3" aria-busy={loading}>
                  {loading ? <><Spinner /> Updating…</> : 'Update plan'}
                </button>
              </div>
            </aside>
          </section>
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
