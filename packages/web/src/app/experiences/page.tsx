'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { experiencesApi } from '@/lib/api';
import ExperienceCard, { Experience } from '@/components/experiences/ExperienceCard';
import { useAuthStore } from '@/store/auth';
import { userApi } from '@/lib/api';

const CATEGORIES = ['Food & Drink', 'Culture', 'Adventure', 'Nature', 'Art', 'Sports', 'Wellness'];
const SORT_OPTIONS = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popularity', label: 'Most Popular' },
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
  const [sortBy, setSortBy] = useState('rating');

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

  return (
    <div className="min-h-screen page-bg-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header — Findora-inspired */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pt-4 sm:pt-8 mb-8 animate-rise-in">
          <div className="flex-1 min-w-0">
            <p className="eyebrow flex items-center gap-2">
              <span className="h-px w-6 bg-sun" aria-hidden />
              Accra, Ghana · Explore
            </p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl lg:text-[56px] leading-[1] font-bold text-ink">
              Find your next experience
            </h1>
            <p className="text-ink-muted mt-3 max-w-lg">
              Food crawls, heritage walks, beach days and more — hosted by verified locals.
            </p>
          </div>
          <Link
            href="/trip-planner"
            className="group shrink-0 flex items-center gap-3 rounded-2xl bg-white border border-black/[0.07] hover:border-black/20 pl-3 pr-4 py-3 transition-colors"
          >
            <span className="w-10 h-10 rounded-xl bg-forest-700 text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">Not sure where to start?</span>
              <span className="block text-xs text-ink-muted">Let the AI planner build your days →</span>
            </span>
          </Link>
        </div>

        {/* Search + filter bar */}
        <div className="sticky top-[72px] z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 bg-canvas/90 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 search-pill p-2 rounded-3xl sm:rounded-full">
          <div className="flex-1 flex items-center gap-2 px-1 sm:px-3 min-w-0">
            <svg className="w-5 h-5 text-ink-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search experiences..."
              className="flex-1 min-w-0 py-2 text-sm text-ink placeholder:text-ink-soft outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 sm:border-l sm:border-black/[0.07] sm:pl-3">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="min-w-0 flex-1 sm:flex-none text-xs text-ink/80 outline-none bg-transparent font-medium cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              onClick={() => setDrawerOpen(true)}
              className={`h-10 px-4 rounded-full flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                hasActiveFilters ? 'bg-ink text-white' : 'bg-sun text-white hover:bg-sun-600'
              }`}
              aria-label="Open filters"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
            </button>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-3 pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`chip shrink-0 ${selectedCategories.includes(cat) ? 'chip-active' : 'chip-inactive'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        </div>

        <div className="mt-6" />

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="rounded-card shimmer aspect-square" />
                <div className="mt-3 h-4 w-3/4 rounded-full shimmer" />
                <div className="mt-2 h-3 w-1/2 rounded-full shimmer" />
              </div>
            ))}
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-20 px-6 rounded-card bg-white border border-black/[0.07]">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-forest-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <p className="font-display text-2xl font-bold text-ink">No experiences match yet</p>
            <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">Try a different search or fewer filters — or let the AI planner suggest something.</p>
            <div className="mt-6 flex justify-center gap-3 flex-wrap">
              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn-ghost">Clear all filters</button>
              )}
              <Link href="/trip-planner" className="btn-primary">Ask the AI planner</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-ink">
                Nearby Experiences
                <span className="ml-2 text-sm font-normal text-ink-soft">({total} found)</span>
              </h2>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-accra-green font-semibold hover:underline">
                  Clear {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
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
              <div className="flex justify-center items-center gap-1 mt-12 overflow-x-auto pb-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2.5 border border-black/[0.07] rounded-full text-sm disabled:opacity-40 hover:bg-white disabled:cursor-not-allowed bg-white/80"
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {paginationRange.map((item, idx) =>
                  item === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm text-ink-soft">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={`px-4 py-2.5 border rounded-full text-sm min-w-[40px] transition-colors ${
                        page === item
                          ? 'bg-accra-green border-accra-green text-white font-semibold shadow-md'
                          : 'border-black/[0.07] hover:bg-white text-ink/80 bg-white/80'
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
                  className="px-4 py-2.5 border border-black/[0.07] rounded-full text-sm disabled:opacity-40 hover:bg-white disabled:cursor-not-allowed bg-white/80"
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white z-50 shadow-2xl overflow-y-auto animate-slide-in-right rounded-l-3xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.07]">
              <h2 className="font-bold text-ink">Filters</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-full hover:bg-beige transition-colors">
                <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              <div>
                <h3 className="font-semibold text-ink mb-3 text-sm">Category</h3>
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="accent-accra-green w-4 h-4 rounded"
                      />
                      <span className="text-sm text-ink/80">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <hr className="border-black/[0.07]" />

              <div>
                <h3 className="font-semibold text-ink mb-3 text-sm">Price Range</h3>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min $" value={priceMin} min={0}
                    onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                    className="w-full border border-black/[0.07] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10"
                  />
                  <input type="number" placeholder="Max $" value={priceMax} min={0}
                    onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                    className="w-full border border-black/[0.07] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10"
                  />
                </div>
              </div>

              <hr className="border-black/[0.07]" />

              <div>
                <h3 className="font-semibold text-ink mb-3 text-sm">Duration (hours)</h3>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={durationMin} min={0}
                    onChange={(e) => { setDurationMin(e.target.value); setPage(1); }}
                    className="w-full border border-black/[0.07] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10"
                  />
                  <input type="number" placeholder="Max" value={durationMax} min={0}
                    onChange={(e) => { setDurationMax(e.target.value); setPage(1); }}
                    className="w-full border border-black/[0.07] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10"
                  />
                </div>
              </div>

              <hr className="border-black/[0.07]" />

              <div>
                <h3 className="font-semibold text-ink mb-3 text-sm">Minimum Rating</h3>
                <select value={minRating}
                  onChange={(e) => { setMinRating(e.target.value); setPage(1); }}
                  className="w-full border border-black/[0.07] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10 bg-white"
                >
                  <option value="">Any rating</option>
                  <option value="4.5">4.5+ stars</option>
                  <option value="4">4.0+ stars</option>
                  <option value="3.5">3.5+ stars</option>
                  <option value="3">3.0+ stars</option>
                </select>
              </div>

              <hr className="border-black/[0.07]" />

              <div>
                <h3 className="font-semibold text-ink mb-3 text-sm">Location Radius (km)</h3>
                <input type="number" placeholder="e.g. 10" value={locationRadius} min={1}
                  onChange={(e) => { setLocationRadius(e.target.value); setPage(1); }}
                  className="w-full border border-black/[0.07] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-black/[0.07] px-6 py-4 flex gap-3">
              <button
                onClick={() => { clearFilters(); setDrawerOpen(false); }}
                className="flex-1 border border-black/[0.07] rounded-xl py-3 text-sm font-semibold text-ink/80 hover:bg-beige transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 bg-accra-green text-white rounded-xl py-3 text-sm font-semibold hover:bg-accra-dark transition-colors shadow-md"
              >
                Show results
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ExperiencesRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-beige">
          <p className="text-sm text-ink-muted">Loading experiences…</p>
        </div>
      }
    >
      <ExperiencesPage />
    </Suspense>
  );
}
