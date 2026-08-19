'use client';

import { useState, useEffect, useCallback } from 'react';
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

export default function ExperiencesPage() {
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
        <div className="flex items-start justify-between gap-4 mb-6 animate-rise-in">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 chip chip-inactive mb-4 !py-2">
              <svg className="w-4 h-4 text-accra-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Accra, Ghana
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Discover Your Next Experience
            </h1>
            <p className="text-gray-500 text-sm mt-2 max-w-lg">
              Curated local adventures, hidden gems, and authentic culture — all in one place.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/settings/notifications"
              className="w-11 h-11 rounded-full bg-white border border-sea-100 flex items-center justify-center text-gray-500 hover:text-accra-green hover:border-sea-200 transition-colors shadow-sm"
              title="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </Link>
            {user ? (
              <Link
                href="/dashboard/traveler"
                className="w-11 h-11 rounded-full bg-accra-green text-white flex items-center justify-center text-sm font-bold shadow-md hover:bg-accra-dark transition-colors"
              >
                {user.email?.[0]?.toUpperCase() ?? 'U'}
              </Link>
            ) : (
              <Link
                href="/login"
                className="w-11 h-11 rounded-full bg-white border border-sea-100 flex items-center justify-center text-accra-green hover:bg-beige transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
            )}
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 search-pill flex items-center gap-2 px-4 py-1">
            <svg className="w-5 h-5 text-sea-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search experiences..."
              className="flex-1 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
            />
            <button
              onClick={() => setDrawerOpen(true)}
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                hasActiveFilters ? 'bg-accra-green text-white' : 'bg-beige text-gray-600 hover:bg-sea-100'
              }`}
              aria-label="Open filters"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
            </button>
          </div>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="shrink-0 search-pill px-4 py-3 text-sm text-gray-700 outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-8">
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

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-3xl shimmer h-80" />
            ))}
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-20 premium-card">
            <svg className="w-14 h-14 mx-auto mb-4 text-sea-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-semibold text-gray-800">No experiences found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search terms</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-4 text-sm text-accra-green font-semibold hover:underline">Clear all filters</button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                Nearby Experiences
                <span className="ml-2 text-sm font-normal text-gray-400">({total} found)</span>
              </h2>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-accra-green font-semibold hover:underline">
                  Clear {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              <div className="flex justify-center items-center gap-1 mt-12">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2.5 border border-sea-100 rounded-full text-sm disabled:opacity-40 hover:bg-white disabled:cursor-not-allowed bg-white/80"
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {paginationRange.map((item, idx) =>
                  item === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm text-gray-400">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={`px-4 py-2.5 border rounded-full text-sm min-w-[40px] transition-colors ${
                        page === item
                          ? 'bg-accra-green border-accra-green text-white font-semibold shadow-md'
                          : 'border-sea-100 hover:bg-white text-gray-700 bg-white/80'
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
                  className="px-4 py-2.5 border border-sea-100 rounded-full text-sm disabled:opacity-40 hover:bg-white disabled:cursor-not-allowed bg-white/80"
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
            <div className="flex items-center justify-between px-6 py-5 border-b border-sea-50">
              <h2 className="font-bold text-gray-900">Filters</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-full hover:bg-beige transition-colors">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Category</h3>
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="accent-accra-green w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-700">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <hr className="border-sea-50" />

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Price Range</h3>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min $" value={priceMin} min={0}
                    onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                    className="w-full border border-sea-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-200"
                  />
                  <input type="number" placeholder="Max $" value={priceMax} min={0}
                    onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                    className="w-full border border-sea-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-200"
                  />
                </div>
              </div>

              <hr className="border-sea-50" />

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Duration (hours)</h3>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={durationMin} min={0}
                    onChange={(e) => { setDurationMin(e.target.value); setPage(1); }}
                    className="w-full border border-sea-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-200"
                  />
                  <input type="number" placeholder="Max" value={durationMax} min={0}
                    onChange={(e) => { setDurationMax(e.target.value); setPage(1); }}
                    className="w-full border border-sea-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-200"
                  />
                </div>
              </div>

              <hr className="border-sea-50" />

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Minimum Rating</h3>
                <select value={minRating}
                  onChange={(e) => { setMinRating(e.target.value); setPage(1); }}
                  className="w-full border border-sea-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-200 bg-white"
                >
                  <option value="">Any rating</option>
                  <option value="4.5">4.5+ stars</option>
                  <option value="4">4.0+ stars</option>
                  <option value="3.5">3.5+ stars</option>
                  <option value="3">3.0+ stars</option>
                </select>
              </div>

              <hr className="border-sea-50" />

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Location Radius (km)</h3>
                <input type="number" placeholder="e.g. 10" value={locationRadius} min={1}
                  onChange={(e) => { setLocationRadius(e.target.value); setPage(1); }}
                  className="w-full border border-sea-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-200"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-sea-50 px-6 py-4 flex gap-3">
              <button
                onClick={() => { clearFilters(); setDrawerOpen(false); }}
                className="flex-1 border border-sea-100 rounded-xl py-3 text-sm font-semibold text-gray-700 hover:bg-beige transition-colors"
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
