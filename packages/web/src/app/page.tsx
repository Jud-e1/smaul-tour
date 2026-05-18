'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const CATEGORIES = [
  { label: 'Food & Drink', emoji: '🍜' },
  { label: 'Culture',      emoji: '🏛️' },
  { label: 'Adventure',    emoji: '🧗' },
  { label: 'Nature',       emoji: '🌿' },
  { label: 'Art',          emoji: '🎨' },
  { label: 'Wellness',     emoji: '🧘' },
  { label: 'Sports',       emoji: '⚽' },
];

const STATS = [
  { value: '10,000+', label: 'Experiences' },
  { value: '500+',    label: 'Local Guides' },
  { value: '50+',     label: 'Cities' },
  { value: '4.9★',    label: 'Avg Rating' },
];

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'AI Trip Planner',
    desc: 'Describe your dream trip and get a personalized itinerary in seconds.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Secure Payments',
    desc: 'Funds held in escrow and released only after your experience is complete.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    title: 'Verified Guides',
    desc: 'Every guide is reviewed and verified so you can book with confidence.',
  },
];

export default function Home() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(search.trim() ? `/experiences?q=${encodeURIComponent(search.trim())}` : '/experiences');
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Hero — full bleed real photo */}
      <section className="relative h-[580px] sm:h-[640px] flex items-center justify-center overflow-hidden">
        {/* Real travel photo from Unsplash */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1600&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />

        <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            Find your next<br />local adventure
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Book unique experiences with local guides around the world.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-full shadow-2xl flex items-center overflow-hidden max-w-xl mx-auto"
          >
            <div className="flex-1 flex items-center px-5 py-4 gap-3 border-r border-gray-200">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Where do you want to go?"
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-[#FF385C] hover:bg-[#E31C5F] text-white font-semibold px-6 py-4 text-sm transition-colors"
            >
              Search
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-5 text-sm text-white/70">
            <span>✓ Free cancellation</span>
            <span>✓ No booking fees</span>
            <span>✓ Instant confirmation</span>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Category pills */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Explore by category</h2>
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              href={`/experiences?categories=${encodeURIComponent(cat.label)}`}
              className="flex items-center gap-2 border border-gray-200 rounded-full px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-900 hover:bg-gray-50 transition-colors"
            >
              <span className="text-base">{cat.emoji}</span>
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Trending experiences — real Unsplash photos as placeholders */}
      <section className="max-w-5xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Trending right now</h2>
          <Link href="/experiences" className="text-sm font-medium text-[#FF385C] hover:underline">Show all →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80', title: 'Street Food Tour', location: 'Bangkok, Thailand', price: '$35', rating: '4.97', reviews: 312 },
            { img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&q=80', title: 'Sunset Sailing', location: 'Santorini, Greece', price: '$89', rating: '4.95', reviews: 218 },
            { img: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80', title: 'Mountain Hike', location: 'Patagonia, Argentina', price: '$55', rating: '4.92', reviews: 176 },
            { img: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80', title: 'Cooking Class', location: 'Tokyo, Japan', price: '$65', rating: '4.98', reviews: 445 },
          ].map((item) => (
            <Link key={item.title} href="/experiences" className="group cursor-pointer">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 mb-3">
                <div
                  className="absolute inset-0 bg-cover bg-center card-img"
                  style={{ backgroundImage: `url('${item.img}')` }}
                />
                <button className="absolute top-3 right-3 p-1">
                  <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.title}</p>
                  <p className="text-gray-500 text-sm truncate">{item.location}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-900">{item.rating}</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-900">
                <span className="font-semibold price-underline">{item.price}</span>
                <span className="text-gray-500"> / person</span>
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* AI Trip Planner CTA */}      <section className="max-w-5xl mx-auto px-4 pb-10">
        <div className="relative bg-gradient-to-r from-[#FF385C] to-[#E31C5F] rounded-3xl overflow-hidden p-8 sm:p-12 text-white">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-white/70 text-sm font-medium uppercase tracking-wide mb-1">New feature</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">AI Trip Planner</h2>
              <p className="text-white/80 max-w-md">
                Tell us your dream trip in plain language — we'll build a full itinerary with local experiences in seconds.
              </p>
            </div>
            <Link
              href="/trip-planner"
              className="shrink-0 bg-white text-[#FF385C] font-semibold px-6 py-3 rounded-full hover:bg-gray-50 transition-colors text-sm"
            >
              Try it free →
            </Link>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">Why travelers choose us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col items-start gap-3">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-[#FF385C]">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Ready to explore?</h2>
        <p className="text-gray-500 mb-8">Join thousands of travelers discovering authentic local experiences.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/experiences"
            className="bg-[#FF385C] hover:bg-[#E31C5F] text-white font-semibold px-8 py-3.5 rounded-full transition-colors text-sm"
          >
            Browse Experiences
          </Link>
          <Link
            href="/register"
            className="border border-gray-300 text-gray-700 font-semibold px-8 py-3.5 rounded-full hover:border-gray-900 transition-colors text-sm"
          >
            Become a Guide
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© 2026 TourLocal. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/experiences" className="hover:text-gray-900 transition-colors">Experiences</Link>
            <Link href="/trip-planner" className="hover:text-gray-900 transition-colors">Trip Planner</Link>
            <Link href="/register" className="hover:text-gray-900 transition-colors">Become a Guide</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
