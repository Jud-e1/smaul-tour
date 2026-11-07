'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLandingMotion } from '@/components/landing/useLandingMotion';
import BrandLogo from '@/components/brand/BrandLogo';

// Real Accra / Ghana photography — the hero should only ever show places Nsoroma sells.
const LANDING_BACKGROUNDS = [
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Labadi_Beach_at_Sunset.jpg/1920px-Labadi_Beach_at_Sunset.jpg',
    label: 'Labadi Beach at sunset',
  },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Black_Star_Gate_located_in_Accra.jpg/1920px-Black_Star_Gate_located_in_Accra.jpg',
    label: 'Black Star Gate, Accra',
  },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Jamestown%2C_Accra_%28P1100253%29.jpg/1920px-Jamestown%2C_Accra_%28P1100253%29.jpg',
    label: 'Jamestown, Accra',
  },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Canopy_walkway_at_Kakum_National_Park_2.jpg/1920px-Canopy_walkway_at_Kakum_National_Park_2.jpg',
    label: 'Kakum canopy walkway',
  },
];

const HERO_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Black_Star_Gate_located_in_Accra.jpg/1280px-Black_Star_Gate_located_in_Accra.jpg';
const ABURI_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Araucaria_columnaris%2C_Aburi_%28P1090843%29.jpg/1280px-Araucaria_columnaris%2C_Aburi_%28P1090843%29.jpg';
const HERITAGE_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Kwame_Nkrumah_Monument_at_the_Kwame_Nkrumah_Mausoleum_and_Memorial_Park%2C_Accra_01.jpg/1280px-Kwame_Nkrumah_Monument_at_the_Kwame_Nkrumah_Mausoleum_and_Memorial_Park%2C_Accra_01.jpg';
const STAYS_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/M%C3%B6venpick_Ambassador_Hotel_Accra.jpg/1280px-M%C3%B6venpick_Ambassador_Hotel_Accra.jpg';

const CATEGORIES = [
  { label: 'Food & Drink', emoji: '🍲' },
  { label: 'Culture', emoji: '🥁' },
  { label: 'Adventure', emoji: '🧗' },
  { label: 'Nature', emoji: '🌿' },
  { label: 'Art', emoji: '🎨' },
  { label: 'Wellness', emoji: '🧘' },
  { label: 'Beaches', emoji: '🏖️' },
];

const TRENDING = [
  {
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Jamestown%2C_Accra_%28P1100253%29.jpg/1280px-Jamestown%2C_Accra_%28P1100253%29.jpg',
    title: 'Jamestown Heritage Walk',
    location: 'Jamestown, Accra',
    meta: 'Culture · 3h',
    price: '$28',
    rating: '4.94',
  },
  {
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Labadi_Beach_at_Sunset.jpg/1280px-Labadi_Beach_at_Sunset.jpg',
    title: 'Labadi Beach Sunset',
    location: 'La, Accra',
    meta: 'Beaches · 2h',
    price: '$35',
    rating: '4.91',
  },
  {
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Waakye_in_Accra%2C_Ghana.jpg/1280px-Waakye_in_Accra%2C_Ghana.jpg',
    title: 'Waakye Food Crawl',
    location: 'Osu, Accra',
    meta: 'Food & Drink · 3h',
    price: '$22',
    rating: '4.97',
  },
  {
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Canopy_walkway_at_Kakum_National_Park_2.jpg/1280px-Canopy_walkway_at_Kakum_National_Park_2.jpg',
    title: 'Kakum Canopy Walk',
    location: 'Central Region',
    meta: 'Nature · Full day',
    price: '$64',
    rating: '4.89',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Tell us how you travel',
    desc: 'Describe your dream days in plain words. The AI planner turns them into a day-by-day Accra itinerary.',
  },
  {
    n: '02',
    title: 'Book verified locals',
    desc: 'Every guide is reviewed and verified. Pick a time, see the full price up front, no surprises.',
  },
  {
    n: '03',
    title: 'Pay only when it happens',
    desc: 'Funds sit in escrow and are released to your guide only after the experience is complete.',
  },
];

type WeatherIcon = 'sun' | 'cloud' | 'rain' | 'storm';

interface WeatherCondition {
  codes: number[];
  label: string;
  icon: WeatherIcon;
  suggestion: string;
}

const WEATHER_CONDITIONS: WeatherCondition[] = [
  { codes: [0, 1], label: 'Sunny', icon: 'sun', suggestion: 'Perfect weather for a visit to Labadi Beach.' },
  { codes: [2], label: 'Partly cloudy', icon: 'cloud', suggestion: 'Great light for the Jamestown heritage walk.' },
  { codes: [3, 45, 48], label: 'Cloudy', icon: 'cloud', suggestion: 'Cool and overcast — ideal for the Aburi gardens trail.' },
  {
    codes: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82],
    label: 'Rainy',
    icon: 'rain',
    suggestion: 'Showers over Accra — try an indoor museum or an Osu food tour.',
  },
  { codes: [95, 96, 99], label: 'Thunderstorms', icon: 'storm', suggestion: 'Storms expected — go for indoor experiences and flexible booking.' },
];

interface OpenMeteoResponse {
  current?: { temperature_2m?: number; relative_humidity_2m?: number; weather_code?: number };
}

interface Weather {
  temperature: number;
  humidity: number;
  condition: WeatherCondition;
}

const FALLBACK_WEATHER: Weather = { temperature: 28, humidity: 78, condition: WEATHER_CONDITIONS[0] };

const WEATHER_ICON_PATHS: Record<WeatherIcon, JSX.Element> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path strokeLinecap="round" d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.5 1.5m11.2 11.2l1.5 1.5M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5" />
    </>
  ),
  cloud: <path strokeLinecap="round" strokeLinejoin="round" d="M7 18h10a4 4 0 000-8 6 6 0 00-11.6 2A3.5 3.5 0 006 18h1z" />,
  rain: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 15h10a4 4 0 000-8 6 6 0 00-11.6 2A3.5 3.5 0 006 15h1z" />
      <path strokeLinecap="round" d="M8 18l-1 3m5-3l-1 3m5-3l-1 3" />
    </>
  ),
  storm: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 15h10a4 4 0 000-8 6 6 0 00-11.6 2A3.5 3.5 0 006 15h1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 17l-3 3h3l-1 3" />
    </>
  ),
};

function Arrow({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" />
    </svg>
  );
}

function Star() {
  return (
    <svg className="w-3.5 h-3.5 text-gold" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function Home() {
  const pageRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [weather, setWeather] = useState<Weather>(FALLBACK_WEATHER);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  useLandingMotion(pageRef);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=5.6037&longitude=-0.187&current=temperature_2m,relative_humidity_2m,weather_code',
      { signal: controller.signal },
    )
      .then((res) => res.json() as Promise<OpenMeteoResponse>)
      .then(({ current }) => {
        if (typeof current?.temperature_2m !== 'number') return;
        setWeather({
          temperature: Math.round(current.temperature_2m),
          humidity: Math.round(current.relative_humidity_2m ?? FALLBACK_WEATHER.humidity),
          condition:
            WEATHER_CONDITIONS.find((entry) => entry.codes.includes(current.weather_code ?? -1)) ??
            FALLBACK_WEATHER.condition,
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const humidityLabel = weather.humidity >= 70 ? 'humid' : 'mild';

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category) params.set('categories', category);
    const qs = params.toString();
    router.push(qs ? `/experiences?${qs}` : '/experiences');
  };

  return (
    <div ref={pageRef} className="bg-canvas">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-2 sm:px-3 pt-2 sm:pt-3">
        <div className="grain relative overflow-hidden rounded-[28px] bg-forest-950 min-h-[640px] sm:min-h-[720px] lg:min-h-[calc(100vh-96px)] flex">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {LANDING_BACKGROUNDS.map((photo) => (
              <div
                key={photo.src}
                className="landing-bg-slide absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${photo.src}')` }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-forest-950/85 via-forest-950/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950/85 via-transparent to-forest-950/25" />
          </div>

          <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10 lg:px-14 py-10 sm:py-14 flex flex-col">
            <div className="flex items-center gap-3 text-white/80 text-[11px] font-semibold uppercase tracking-[0.16em]">
              <span className="h-px w-8 bg-sun" aria-hidden />
              Accra, Ghana · 5.60° N
            </div>

            <div className="mt-auto pt-24 max-w-3xl">
              <h1 className="font-display text-white text-[44px] leading-[0.98] sm:text-7xl lg:text-[88px] font-bold">
                Experience Accra the way locals do.
              </h1>
              <p className="mt-6 text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">
                Food crawls in Osu, sunsets at Labadi, canopy walks in Kakum — hosted by verified local
                guides and planned in seconds with AI.
              </p>

              {/* Search pill */}
              <form
                onSubmit={onSearch}
                className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 bg-white rounded-3xl sm:rounded-full p-2 shadow-float max-w-2xl"
                role="search"
              >
                <label className="flex-1 px-4 sm:px-6 py-2 rounded-full hover:bg-canvas transition-colors cursor-text">
                  <span className="block text-[11px] font-semibold text-ink tracking-[0.04em]">What</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Food tours, beaches, history…"
                    className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft outline-none"
                  />
                </label>
                <span className="hidden sm:block w-px h-8 bg-black/10" aria-hidden />
                <label className="sm:w-48 px-4 sm:px-6 py-2 rounded-full hover:bg-canvas transition-colors cursor-pointer">
                  <span className="block text-[11px] font-semibold text-ink tracking-[0.04em]">Category</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-transparent text-sm text-ink outline-none -ml-0.5 cursor-pointer"
                  >
                    <option value="">Anything</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.label} value={c.label}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-sun hover:bg-sun-600 text-white font-semibold text-sm h-12 sm:h-14 px-6 rounded-full transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </button>
              </form>
            </div>

            {/* Bottom rail: trust + live weather */}
            <div className="mt-10 sm:mt-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/80">
                {['Verified local guides', 'Escrow-protected payments', 'Free AI trip planner'].map((t) => (
                  <span key={t} className="inline-flex items-center gap-2">
                    <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {t}
                  </span>
                ))}
              </div>

              <Link
                href="/trip-planner"
                className="group flex items-center gap-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md px-4 py-3 text-white max-w-sm transition-colors"
              >
                <svg className="w-9 h-9 shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden>
                  {WEATHER_ICON_PATHS[weather.condition.icon]}
                </svg>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {weather.temperature}°C · {weather.condition.label}, {humidityLabel}
                  </p>
                  <p className="text-xs text-white/70 truncate">{weather.condition.suggestion}</p>
                </div>
                <Arrow className="w-4 h-4 shrink-0 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              href={`/experiences?categories=${encodeURIComponent(cat.label)}`}
              className="shrink-0 flex items-center gap-2.5 bg-white border border-black/[0.07] rounded-full pl-1.5 pr-5 py-1.5 text-sm font-semibold text-ink hover:border-black/30 transition-colors"
            >
              <span className="w-9 h-9 rounded-full bg-beige flex items-center justify-center text-base" aria-hidden>
                {cat.emoji}
              </span>
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Trending ─────────────────────────────────────────────────────── */}
      <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="eyebrow">Trending this week</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-ink">Loved by travelers right now</h2>
          </div>
          <Link
            href="/experiences"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-ink border border-black/10 hover:border-black/30 rounded-full px-5 py-2.5 transition-colors"
          >
            Show all <Arrow />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {TRENDING.map((item) => (
            <Link key={item.title} href="/experiences" className="group block">
              <div className="relative aspect-square rounded-card overflow-hidden bg-[#E4E5DF]">
                <div className="absolute inset-0 bg-cover bg-center card-img" style={{ backgroundImage: `url('${item.img}')` }} />
                <span className="absolute top-3 left-3 bg-white text-ink text-[11px] font-semibold tracking-[0.02em] px-2.5 py-1 rounded-md shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
                  Traveler favorite
                </span>
              </div>
              <div className="pt-3 px-0.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink text-[15px] truncate">{item.title}</p>
                  <span className="flex items-center gap-1 shrink-0 text-sm font-medium text-ink">
                    <Star /> {item.rating}
                  </span>
                </div>
                <p className="text-ink-muted text-sm truncate">{item.location}</p>
                <p className="text-ink-muted text-sm truncate">{item.meta}</p>
                <p className="mt-1.5 text-[15px] text-ink">
                  <span className="font-semibold">{item.price}</span>
                  <span className="text-ink-muted"> / person</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Collections bento ────────────────────────────────────────────── */}
      <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28">
        <div className="max-w-2xl mb-8">
          <p className="eyebrow">Collections</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-ink">Three sides of the Gold Coast</h2>
        </div>
        <div className="grid lg:grid-cols-12 gap-4 sm:gap-5">
          <Link
            href="/experiences?categories=Nature"
            className="group lg:col-span-7 lg:row-span-2 relative rounded-[24px] overflow-hidden min-h-[420px] lg:min-h-[600px] flex items-end"
          >
            <div className="absolute inset-0 bg-cover bg-center card-img" style={{ backgroundImage: `url('${ABURI_IMAGE}')` }} />
            <div className="absolute inset-0 card-overlay-gradient" />
            <div className="relative z-10 p-7 sm:p-9 text-white w-full flex items-end justify-between gap-6">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Eco-stays · Aburi</span>
                <h3 className="mt-3 font-display text-3xl sm:text-[44px] leading-none font-bold">Botanical escape</h3>
                <p className="mt-3 text-sm text-white/80 max-w-md leading-relaxed">
                  Lush, cool and an hour from the city. The planner picks trails that match your pace.
                </p>
              </div>
              <span className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-white text-ink items-center justify-center group-hover:bg-sun group-hover:text-white transition-colors">
                <Arrow className="w-5 h-5" />
              </span>
            </div>
          </Link>

          {[
            { href: '/experiences?categories=Culture', img: HERITAGE_IMAGE, tag: 'Heritage', title: 'History on foot', desc: 'Curated walks through Accra’s independence story.' },
            { href: '/experiences?categories=Wellness', img: STAYS_IMAGE, tag: 'Stays & wellness', title: 'Slow luxury', desc: 'Boutique hotels and spa days matched to your style.' },
          ].map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="group lg:col-span-5 relative rounded-[24px] overflow-hidden min-h-[260px] lg:min-h-0 flex items-end"
            >
              <div className="absolute inset-0 bg-cover bg-center card-img" style={{ backgroundImage: `url('${c.img}')` }} />
              <div className="absolute inset-0 card-overlay-gradient" />
              <div className="relative z-10 p-6 sm:p-7 text-white">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{c.tag}</span>
                <h3 className="mt-2 font-display text-2xl sm:text-3xl font-bold">{c.title}</h3>
                <p className="mt-1.5 text-sm text-white/80">{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── AI planner band ──────────────────────────────────────────────── */}
      <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28">
        <div className="featured-hero-card grain relative overflow-hidden px-6 py-10 sm:p-14 lg:p-16 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="relative text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">AI trip planner</p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold leading-[1.02]">
              Say it like you’d tell a friend.
            </h2>
            <p className="mt-5 text-white/75 max-w-md leading-relaxed">
              Describe the trip you want in plain language. Nsoroma builds a full itinerary with bookable local
              experiences — then lets you tweak every stop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/trip-planner" className="btn-accent px-7 py-3.5">
                Plan my trip <Arrow />
              </Link>
              <Link href="/experiences" className="btn-glass px-7 py-3.5">
                Browse experiences
              </Link>
            </div>
          </div>

          {/* Product-style preview of the planner */}
          <div className="relative">
            <div className="rounded-[20px] bg-white p-4 sm:p-5 shadow-float">
              <div className="rounded-2xl bg-canvas border border-black/5 p-4">
                <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.12em]">You</p>
                <p className="mt-1.5 text-[15px] text-ink leading-relaxed">
                  “3 days in Accra, love street food and history, one relaxed beach evening, mid budget.”
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { d: 'Day 1', t: 'Jamestown heritage walk', s: 'Lighthouse · Ussher Fort', p: '$28' },
                  { d: 'Day 2', t: 'Waakye & kelewele crawl', s: 'Osu · 6 tasting stops', p: '$22' },
                  { d: 'Day 3', t: 'Labadi sunset session', s: 'Drumming · fresh coconut', p: '$35' },
                ].map((row) => (
                  <div key={row.d} className="flex items-center gap-3 rounded-2xl border border-black/[0.06] p-3">
                    <span className="w-12 shrink-0 text-center rounded-xl bg-forest-50 text-forest-700 text-[11px] font-bold py-2">
                      {row.d}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink truncate">{row.t}</p>
                      <p className="text-xs text-ink-muted truncate">{row.s}</p>
                    </div>
                    <span className="text-sm font-semibold text-ink">{row.p}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-forest-700 text-white px-4 py-3">
                <span className="text-sm text-white/80">Estimated total</span>
                <span className="font-display text-xl font-bold">$85 / person</span>
              </div>
            </div>
            <div
              className="absolute -top-8 -right-3 sm:-right-6 hidden sm:block rounded-2xl overflow-hidden w-28 aspect-[4/5] ring-4 ring-forest-900 bg-cover bg-center shadow-float rotate-3"
              style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
              role="img"
              aria-label="Black Star Gate, Accra"
            />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <p className="eyebrow">Why Nsoroma</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-ink">Book with the confidence of a local.</h2>
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t-2 border-ink pt-5">
                <span className="font-display text-sm font-bold text-sun">{s.n}</span>
                <h3 className="mt-3 font-display text-xl font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="rounded-[24px] bg-white border border-black/[0.06] px-6 py-12 sm:p-16 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl sm:text-[44px] leading-[1.02] font-bold text-ink">Ready when you are, Accra is too.</h2>
            <p className="mt-4 text-ink-muted">Create an account to save itineraries and wishlists, or sign in to pick up where you left off.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-7 py-3.5">Create free account</Link>
            <Link href="/login" className="btn-ghost px-7 py-3.5">Sign in</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="px-2 sm:px-3 pb-2 sm:pb-3">
        <div className="grain relative overflow-hidden rounded-[28px] bg-forest-950 text-white">
          <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 pt-14 pb-8">
            <div className="grid md:grid-cols-12 gap-10">
              <div className="md:col-span-5">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center">
                    <BrandLogo variant="mark" decorative className="w-9 h-9 object-contain" />
                  </span>
                  <span className="font-display text-2xl font-extrabold tracking-[-0.04em]">Nsoroma</span>
                </div>
                <p className="mt-5 text-sm text-white/60 max-w-xs leading-relaxed">
                  Explore · Experience · Belong. Local experiences across Accra and the Gold Coast, hosted by people who live there.
                </p>
              </div>
              {[
                { h: 'Explore', links: [['All experiences', '/experiences'], ['Food & Drink', '/experiences?categories=Food%20%26%20Drink'], ['Culture', '/experiences?categories=Culture'], ['Eco-stays', '/experiences?categories=Nature']] },
                { h: 'Plan', links: [['AI trip planner', '/trip-planner'], ['My dashboard', '/dashboard/traveler'], ['Notifications', '/settings/notifications']] },
                { h: 'Host', links: [['Become a guide', '/register'], ['Guide dashboard', '/dashboard/guide'], ['Sign in', '/login']] },
              ].map((col) => (
                <div key={col.h} className="md:col-span-2 lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{col.h}</p>
                  <ul className="mt-4 space-y-2.5">
                    {col.links.map(([label, href]) => (
                      <li key={label}>
                        <Link href={href} className="text-sm text-white/80 hover:text-white transition-colors">{label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p
              className="mt-14 font-display font-extrabold tracking-[-0.06em] leading-[0.8] text-white/[0.06] text-[22vw] lg:text-[240px] select-none"
              aria-hidden
            >
              Nsoroma
            </p>
            <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/50">
              <p>© 2026 Nsoroma. All rights reserved.</p>
              <p>Made in Accra 🇬🇭</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
