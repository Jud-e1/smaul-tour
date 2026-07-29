'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

  // Filters
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Explore Experiences</h1>
          <p className="text-gray-500 text-sm mt-1">Discover unique local experiences around the world</p>
        </div>

        {/* Category pills bar */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedCategories.includes(cat)
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search + filter/sort bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search experiences..."
              className="w-full border border-gray-200 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C] bg-gray-50"
            />
          </div>

          {/* Filter button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all ${
              hasActiveFilters
                ? 'bg-gray-900 border-gray-900 text-white'
                : 'border-gray-200 text-gray-700 hover:border-gray-400'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-white text-gray-900 rounded-full text-xs font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="shrink-0 border border-gray-200 rounded-full px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF385C] bg-gray-50"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-100 h-72 animate-pulse" />
            ))}
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">No experiences found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-sm text-[#FF385C] hover:underline">Clear all filters</button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {total} experience{total !== 1 ? 's' : ''} found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {experiences.map((exp) => (
                <ExperienceCard
                  key={exp.id}
                  experience={exp}
                  onWishlist={toggleWishlist}
                  wishlisted={wishlist.has(exp.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-200 rounded-full text-sm disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
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
                      className={`px-3 py-2 border rounded-full text-sm min-w-[36px] transition-colors ${
                        page === item
                          ? 'bg-[#FF385C] border-[#FF385C] text-white font-medium'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
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
                  className="px-3 py-2 border border-gray-200 rounded-full text-sm disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
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
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-80 bg-white z-50 shadow-2xl overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Filters</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-5 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Category</h3>
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="accent-[#FF385C] w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-700">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Price range */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Price Range</h3>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min $" value={priceMin} min={0}
                    onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                  />
                  <input type="number" placeholder="Max $" value={priceMax} min={0}
                    onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Duration */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Duration (hours)</h3>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={durationMin} min={0}
                    onChange={(e) => { setDurationMin(e.target.value); setPage(1); }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                  />
                  <input type="number" placeholder="Max" value={durationMax} min={0}
                    onChange={(e) => { setDurationMax(e.target.value); setPage(1); }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Min rating */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Minimum Rating</h3>
                <select value={minRating}
                  onChange={(e) => { setMinRating(e.target.value); setPage(1); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C] bg-white"
                >
                  <option value="">Any rating</option>
                  <option value="4.5">4.5+ ⭐</option>
                  <option value="4">4.0+ ⭐</option>
                  <option value="3.5">3.5+ ⭐</option>
                  <option value="3">3.0+ ⭐</option>
                </select>
              </div>

              <hr className="border-gray-100" />

              {/* Location radius */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Location Radius (km)</h3>
                <input type="number" placeholder="e.g. 10" value={locationRadius} min={1}
                  onChange={(e) => { setLocationRadius(e.target.value); setPage(1); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
              <button
                onClick={() => { clearFilters(); setDrawerOpen(false); }}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 bg-[#FF385C] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#E31C5F] transition-colors"
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
