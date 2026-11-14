'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { experiencesApi } from '@/lib/api';
import ExperienceCard, { Experience } from '@/components/experiences/ExperienceCard';
import { useAuthStore } from '@/store/auth';
import { userApi } from '@/lib/api';
import { Compass, Flower2, Landmark, LayoutGrid, Mountain, Palette, Sparkles, Trees, Trophy, UtensilsCrossed, Waves, type LucideIcon } from 'lucide-react';

const CATEGORIES: { label: string; Icon: LucideIcon }[] = [
  { label: 'Food & Drink', Icon: UtensilsCrossed },
  { label: 'Culture', Icon: Landmark },
  { label: 'Adventure', Icon: Mountain },
  { label: 'Nature', Icon: Trees },
  { label: 'Art', Icon: Palette },
  { label: 'Sports', Icon: Trophy },
  { label: 'Wellness', Icon: Flower2 },
  { label: 'Beaches', Icon: Waves },
];
const SORT_OPTIONS = [
  { value: 'rating', label: 'Top rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popularity', label: 'Most popular' },
];
const PAGE_SIZE = 12;
const MAX_PAGE_BUTTONS = 7;

function getPaginationRange(current: number, total: number): (number | '...')[] {
  if (total <= MAX_PAGE_BUTTONS) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | '...')[] = [1];
  const left = Math.max(2, current - 2);
  const right = Math.min(total - 1, current + 2);
  if (left > 2) pages.push('...');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

function ExperiencesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('categories')?.split(',').filter(Boolean) || [],
  );
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [durationMax, setDurationMax] = useState('');
  const [minRating, setMinRating] = useState('');
  const [locationRadius, setLocationRadius] = useState('');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'rating');

  // Keep state in sync when the header search changes the URL while we're already here.
  const qParam = searchParams.get('q') || '';
  const catParam = searchParams.get('categories') || '';
  const sortParam = searchParams.get('sort') || '';
  useEffect(() => {
    setSearch(qParam);
    setSelectedCategories(catParam.split(',').filter(Boolean));
    if (sortParam) setSortBy(sortParam);
    setPage(1);
  }, [qParam, catParam, sortParam]);

  const fetchExperiences = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize: PAGE_SIZE };
      if (sortBy === 'price_asc') { params.sortBy = 'price'; params.sortOrder = 'asc'; }
      else if (sortBy === 'price_desc') { params.sortBy = 'price'; params.sortOrder = 'desc'; }
      else if (sortBy === 'popularity') { params.sortBy = 'popularity'; params.sortOrder = 'desc'; }
      else { params.sortBy = 'rating'; params.sortOrder = 'desc'; }
      if (search) params.text = search;
      if (selectedCategories.length) params.categories = selectedCategories.join(',');
      if (priceMin) params.priceMin = Number(priceMin);
      if (priceMax) params.priceMax = Number(priceMax);
      if (durationMin) params.durationMin = Number(durationMin);
      if (durationMax) params.durationMax = Number(durationMax);
      if (minRating) params.minRating = Number(minRating);
      if (locationRadius) params.radiusKm = Number(locationRadius);
      const { data } = await experiencesApi.list(params);
      setExperiences(data.experiences || []);
      setTotal(data.total || 0);
    } catch {
      setExperiences([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategories, priceMin, priceMax, durationMin, durationMax, minRating, locationRadius, sortBy]);

  useEffect(() => { fetchExperiences(); }, [fetchExperiences]);

  const toggleWishlist = async (id: string) => {
    if (!user) { router.push('/login'); return; }
    const next = new Set(wishlist);
    if (next.has(id)) {
      next.delete(id);
      await userApi.removeFromWishlist(user.id, id).catch(() => {});
    } else {
      next.add(id);
      await userApi.addToWishlist(user.id, id).catch(() => {});
    }
    setWishlist(next);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceMin(''); setPriceMax('');
    setDurationMin(''); setDurationMax('');
    setMinRating(''); setLocationRadius('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginationRange = getPaginationRange(page, totalPages);
  const hasActiveFilters = selectedCategories.length > 0 || priceMin || priceMax ||
    durationMin || durationMax || minRating || locationRadius;
  const activeFilterCount = [
    selectedCategories.length > 0, priceMin || priceMax,
    durationMin || durationMax, minRating, locationRadius,
  ].filter(Boolean).length;

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [drawerOpen]);

  const numberField = 'w-full rounded-xl border border-[#D2D2D7] px-4 pt-6 pb-2 text-[15px] text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink peer';

  return (
    <div className="bg-canvas">
      {/* ── Category bar + Filters (Airbnb) ─────────────────────────────── */}
      <div className="sticky top-[70px] md:top-20 z-30 bg-canvas/95 backdrop-blur border-b border-hairline">
        <div className="max-w-page mx-auto px-5 sm:px-10 xl:px-20 flex items-center gap-6">
          <div className="flex-1 min-w-0 flex gap-8 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => { setSelectedCategories([]); setPage(1); }}
              className={`group shrink-0 flex flex-col items-center gap-1.5 pt-4 pb-3 border-b-2 transition-colors ${
                selectedCategories.length === 0 ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink hover:border-[#E0E0E5]'
              }`}
            >
              <LayoutGrid className={`w-6 h-6 ${selectedCategories.length === 0 ? '' : 'opacity-70 group-hover:opacity-100'}`} strokeWidth={1.6} aria-hidden />
              <span className="text-xs font-semibold whitespace-nowrap">All</span>
            </button>
            {CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat.label);
              return (
                <button
                  key={cat.label}
                  onClick={() => toggleCategory(cat.label)}
                  aria-pressed={active}
                  className={`group shrink-0 flex flex-col items-center gap-1.5 pt-4 pb-3 border-b-2 transition-colors ${
                    active ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink hover:border-[#E0E0E5]'
                  }`}
                >
                  <cat.Icon className={`w-6 h-6 ${active ? '' : 'opacity-70 group-hover:opacity-100'}`} strokeWidth={1.6} aria-hidden />
                  <span className="text-xs font-semibold whitespace-nowrap">{cat.label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className={`shrink-0 hidden sm:flex items-center gap-2 h-12 px-4 rounded-xl border text-xs font-semibold transition-colors ${
              hasActiveFilters ? 'border-ink border-2 bg-fog' : 'border-[#E0E0E5] hover:border-ink'
            }`}
            aria-label="Open filters"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
              <circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-ink text-white text-[10px] flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-page mx-auto px-5 sm:px-10 xl:px-20 pt-6 pb-10">
        {/* Results header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-[34px] leading-tight text-ink">
              {loading ? 'Searching…' : total > 0 ? `${total} experience${total === 1 ? '' : 's'} in Accra` : 'Experiences in Accra'}
            </h1>
            {(search || selectedCategories.length > 0) && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {search && (
                  <button
                    onClick={() => { setSearch(''); setPage(1); router.replace('/experiences'); }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-fog border border-[#E0E0E5] px-3 py-1 text-sm hover:border-ink"
                  >
                    “{search}” <span aria-hidden>×</span>
                  </button>
                )}
                {selectedCategories.map((c) => (
                  <button key={c} onClick={() => toggleCategory(c)} className="inline-flex items-center gap-1.5 rounded-full bg-fog border border-[#E0E0E5] px-3 py-1 text-sm hover:border-ink">
                    {c} <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="sm:hidden flex items-center gap-2 h-10 px-4 rounded-full border border-[#E0E0E5] text-sm font-semibold"
            >
              Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
            </button>
            <label className="flex items-center gap-2 h-10 pl-4 pr-3 rounded-full border border-[#E0E0E5] hover:border-ink text-sm cursor-pointer">
              <span className="text-ink-muted">Sort</span>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="bg-transparent font-semibold text-ink outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}>
                <div className="rounded-2xl shimmer aspect-[20/19]" />
                <div className="mt-3 h-4 w-4/5 rounded-full shimmer" />
                <div className="mt-2 h-3.5 w-1/2 rounded-full shimmer" />
                <div className="mt-2 h-3.5 w-1/3 rounded-full shimmer" />
              </div>
            ))}
          </div>
        ) : experiences.length === 0 ? (
          <div className="max-w-xl mx-auto text-center py-16 sm:py-24">
            <div className="icon-tile w-16 h-16 mx-auto mb-6"><Compass className="w-7 h-7" strokeWidth={1.5} aria-hidden /></div>
            <h2 className="text-[34px] leading-tight font-semibold text-ink">No exact matches</h2>
            <p className="text-ink-muted mt-2">
              Try changing or removing some of your filters, or searching a different part of Accra.
            </p>
            <div className="mt-8 flex justify-center gap-3 flex-wrap">
              {hasActiveFilters || search ? (
                <button onClick={() => { clearFilters(); setSearch(''); router.replace('/experiences'); }} className="btn-ghost">
                  Remove all filters
                </button>
              ) : null}
              <Link href="/trip-planner" className="btn-primary">Ask the AI planner</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
              {experiences.map((exp) => (
                <ExperienceCard
                  key={exp.id}
                  experience={exp}
                  onWishlist={toggleWishlist}
                  wishlisted={wishlist.has(exp.id)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="flex justify-center items-center gap-2 mt-14" aria-label="Pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-fog disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Previous page"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3.5} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                {paginationRange.map((item, idx) =>
                  item === '...' ? (
                    <span key={`ellipsis-${idx}`} className="w-8 text-center text-sm text-ink-muted">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={`w-8 h-8 rounded-full text-sm transition-colors ${
                        page === item ? 'bg-ink text-white font-semibold' : 'text-ink hover:bg-fog'
                      }`}
                      aria-label={`Page ${item}`}
                      aria-current={page === item ? 'page' : undefined}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-fog disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Next page"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3.5} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </nav>
            )}
          </>
        )}

        {/* AI planner nudge */}
        <Link
          href="/trip-planner"
          className="mt-16 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl bg-fog px-6 py-6 hover:bg-[#E2E2E8] transition-colors"
        >
          <span className="icon-tile w-12 h-12 bg-paper"><Sparkles className="w-5 h-5" aria-hidden /></span>
          <div className="flex-1">
            <p className="font-semibold text-ink">Not sure what to book?</p>
            <p className="text-sm text-ink-muted">Describe your trip and the AI planner will build a day-by-day itinerary.</p>
          </div>
          <span className="btn-primary !py-2.5 text-sm">Plan my trip</span>
        </Link>
      </div>

      {/* ── Filters modal (Airbnb) ──────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <button className="absolute inset-0 bg-black/50 cursor-default" onClick={() => setDrawerOpen(false)} aria-label="Close filters" />
          <div role="dialog" aria-modal="true" aria-labelledby="filters-title" className="relative w-full sm:max-w-[680px] max-h-[92vh] sm:max-h-[86vh] bg-paper rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-sheet sm:animate-scale-in">
            <div className="relative flex items-center justify-center h-16 border-b border-[#EBEBF0] shrink-0">
              <button onClick={() => setDrawerOpen(false)} className="absolute left-5 w-8 h-8 rounded-full hover:bg-fog flex items-center justify-center" aria-label="Close">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
              <h2 id="filters-title" className="text-base font-semibold">Filters</h2>
            </div>

            <div className="overflow-y-auto px-6 divide-y divide-[#EBEBF0]">
              <section className="py-8">
                <h3 className="text-[22px] font-semibold">Type of experience</h3>
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CATEGORIES.map((cat) => {
                    const active = selectedCategories.includes(cat.label);
                    return (
                      <button
                        key={cat.label}
                        onClick={() => toggleCategory(cat.label)}
                        aria-pressed={active}
                        className={`text-left rounded-xl border p-4 transition-all ${active ? 'border-ink border-2 bg-fog p-[15px]' : 'border-[#E0E0E5] hover:border-ink'}`}
                      >
                        <span className="icon-tile w-10 h-10"><cat.Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden /></span>
                        <span className="mt-3 block text-sm font-semibold">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="py-8">
                <h3 className="text-[22px] font-semibold">Price range</h3>
                <p className="text-sm text-ink-muted mt-1">Per guest, in USD</p>
                <div className="mt-5 flex items-center gap-4">
                  <label className="relative flex-1">
                    <span className="absolute left-4 top-2 text-xs text-ink-muted">Minimum</span>
                    <input type="number" inputMode="numeric" min={0} value={priceMin} placeholder="$0"
                      onChange={(e) => { setPriceMin(e.target.value); setPage(1); }} className={numberField} />
                  </label>
                  <span className="w-4 h-px bg-[#D2D2D7]" aria-hidden />
                  <label className="relative flex-1">
                    <span className="absolute left-4 top-2 text-xs text-ink-muted">Maximum</span>
                    <input type="number" inputMode="numeric" min={0} value={priceMax} placeholder="Any"
                      onChange={(e) => { setPriceMax(e.target.value); setPage(1); }} className={numberField} />
                  </label>
                </div>
              </section>

              <section className="py-8">
                <h3 className="text-[22px] font-semibold">Duration</h3>
                <p className="text-sm text-ink-muted mt-1">In hours</p>
                <div className="mt-5 flex items-center gap-4">
                  <label className="relative flex-1">
                    <span className="absolute left-4 top-2 text-xs text-ink-muted">At least</span>
                    <input type="number" min={0} value={durationMin} placeholder="Any"
                      onChange={(e) => { setDurationMin(e.target.value); setPage(1); }} className={numberField} />
                  </label>
                  <span className="w-4 h-px bg-[#D2D2D7]" aria-hidden />
                  <label className="relative flex-1">
                    <span className="absolute left-4 top-2 text-xs text-ink-muted">At most</span>
                    <input type="number" min={0} value={durationMax} placeholder="Any"
                      onChange={(e) => { setDurationMax(e.target.value); setPage(1); }} className={numberField} />
                  </label>
                </div>
              </section>

              <section className="py-8">
                <h3 className="text-[22px] font-semibold">Guest rating</h3>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[['', 'Any'], ['3', '3.0+'], ['3.5', '3.5+'], ['4', '4.0+'], ['4.5', '4.5+']].map(([v, l]) => (
                    <button
                      key={l}
                      onClick={() => { setMinRating(v); setPage(1); }}
                      className={`pill-tab ${minRating === v ? 'pill-tab-active' : ''}`}
                    >
                      {v && '★ '}{l}
                    </button>
                  ))}
                </div>
              </section>

              <section className="py-8">
                <h3 className="text-[22px] font-semibold">Distance</h3>
                <p className="text-sm text-ink-muted mt-1">How far from central Accra</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[['', 'Any distance'], ['5', '5 km'], ['10', '10 km'], ['25', '25 km'], ['50', '50 km']].map(([v, l]) => (
                    <button key={l} onClick={() => { setLocationRadius(v); setPage(1); }} className={`pill-tab ${locationRadius === v ? 'pill-tab-active' : ''}`}>
                      {l}
                    </button>
                  ))}
                  <label className="relative w-32">
                    <input type="number" min={1} value={locationRadius} placeholder="Custom km"
                      onChange={(e) => { setLocationRadius(e.target.value); setPage(1); }}
                      className="w-full h-full rounded-full border border-[#E0E0E5] px-4 py-2 text-sm outline-none focus:border-ink" />
                  </label>
                </div>
              </section>
            </div>

            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-[#EBEBF0]">
              <button onClick={() => { clearFilters(); }} className="text-[15px] font-semibold underline underline-offset-2 disabled:text-ink-soft" disabled={!hasActiveFilters}>
                Clear all
              </button>
              <button onClick={() => setDrawerOpen(false)} className="btn-primary">
                {loading ? 'Updating…' : `Show ${total || ''} result${total === 1 ? '' : 's'}`.replace('  ', ' ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExperiencesRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-sm text-ink-muted">Loading experiences…</p>
        </div>
      }
    >
      <ExperiencesPage />
    </Suspense>
  );
}
