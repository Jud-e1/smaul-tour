'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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
  { label: 'Culture',      emoji: '🥁' },
  { label: 'Adventure',    emoji: '🧗' },
  { label: 'Nature',       emoji: '🌿' },
  { label: 'Art',          emoji: '🎨' },
  { label: 'Wellness',     emoji: '🧘' },
  { label: 'Beaches',      emoji: '🏖️' },
];

const TRENDING = [
  {
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Jamestown%2C_Accra_%28P1100253%29.jpg/1280px-Jamestown%2C_Accra_%28P1100253%29.jpg',
    title: 'Jamestown Heritage Walk',
    location: 'Jamestown, Accra',
    price: '$28',
    rating: '4.94',
  },
  {
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Labadi_Beach_at_Sunset.jpg/1280px-Labadi_Beach_at_Sunset.jpg',
    title: 'Labadi Beach Sunset',
    location: 'La, Accra',
    price: '$35',
    rating: '4.91',
  },
  {
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Waakye_in_Accra%2C_Ghana.jpg/1280px-Waakye_in_Accra%2C_Ghana.jpg',
    title: 'Waakye Food Crawl',
    location: 'Osu, Accra',
    price: '$22',
    rating: '4.97',
  },
  {
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Canopy_walkway_at_Kakum_National_Park_2.jpg/1280px-Canopy_walkway_at_Kakum_National_Park_2.jpg',
    title: 'Kakum Canopy Walk',
    location: 'Central Region',
    price: '$64',
    rating: '4.89',
  },
];

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'AI Trip Planner',
    desc: 'Describe your dream trip and get a personalized Accra itinerary in seconds.',
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
    title: 'Verified Local Guides',
    desc: 'Every guide is reviewed and verified so you can book with confidence.',
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
  {
    codes: [0, 1],
    label: 'Sunny',
    icon: 'sun',
    suggestion: 'Perfect weather for a visit to Labadi Beach. Tap to add to itinerary.',
  },
  {
    codes: [2],
    label: 'Partly cloudy',
    icon: 'cloud',
    suggestion: 'Great light for the Jamestown heritage walk. Tap to add to itinerary.',
  },
  {
    codes: [3, 45, 48],
    label: 'Cloudy',
    icon: 'cloud',
    suggestion: 'Cool and overcast — ideal for the Aburi gardens trail. Tap to add to itinerary.',
  },
  {
    codes: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82],
    label: 'Rainy',
    icon: 'rain',
    suggestion: 'Showers over Accra — try an indoor museum or an Osu food tour instead.',
  },
  {
    codes: [95, 96, 99],
    label: 'Thunderstorms',
    icon: 'storm',
    suggestion: 'Storms expected today. We suggest indoor experiences and a flexible booking.',
  },
];

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
  };
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
  cloud: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 18h10a4 4 0 000-8 6 6 0 00-11.6 2A3.5 3.5 0 006 18h1z" />
  ),
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

export default function Home() {
  const [weather, setWeather] = useState<Weather>(FALLBACK_WEATHER);

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

  const humidityLabel = weather.humidity >= 70 ? 'Humid' : 'Mild';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E9F6E1] via-[#FCF7DC] to-[#FCEBE3]">

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-12 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-flex items-center gap-2 bg-accra-gold text-accra-green text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11 2l1.6 4.4L17 8l-4.4 1.6L11 14l-1.6-4.4L5 8l4.4-1.6L11 2zM18 13l.9 2.5L21.5 16l-2.6.9L18 19.5l-.9-2.6-2.6-.9 2.6-.9L18 13z" />
            </svg>
            AI-Powered Discovery
          </span>

          <h1 className="mt-6 text-5xl sm:text-6xl font-extrabold text-accra-green leading-[1.05] tracking-tight">
            Experience Accra<br />Like Never Before.
          </h1>

          <p className="mt-5 text-gray-600 leading-relaxed max-w-md">
            Curated itineraries, hidden gems, and real-time local insights powered by advanced AI.
            Your premium journey starts here.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/experiences"
              className="bg-accra-green hover:bg-accra-dark text-white font-semibold text-sm px-8 py-4 rounded-full shadow-lg shadow-accra-green/20 transition-colors"
            >
              Start Exploring
            </Link>
            <Link
              href="/trip-planner"
              className="flex items-center gap-3 bg-white hover:bg-gray-50 text-accra-green font-semibold text-sm px-7 py-4 rounded-full border border-gray-200 shadow-sm transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9l5 3-5 3V9z" />
              </svg>
              Plan With AI
            </Link>
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden bg-white p-2 shadow-2xl shadow-accra-green/10">
          <div
            className="rounded-2xl bg-cover bg-center aspect-[4/3]"
            style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
            role="img"
            aria-label="Black Star Gate, Accra"
          />
        </div>
      </section>

      {/* Bento grid */}
      <section className="max-w-6xl mx-auto px-6 pb-14 grid lg:grid-cols-3 gap-5">
        {/* Featured eco-stay */}
        <Link
          href="/experiences?categories=Nature"
          className="lg:col-span-2 group relative rounded-3xl overflow-hidden min-h-[380px] flex items-end"
        >
          <div
            className="absolute inset-0 bg-cover bg-center card-img"
            style={{ backgroundImage: `url('${ABURI_IMAGE}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="relative z-10 p-7 text-white">
            <span className="inline-block bg-white/20 backdrop-blur-sm border border-white/30 text-xs font-semibold px-3 py-1 rounded-full">
              Eco-Stays
            </span>
            <h2 className="mt-3 text-3xl font-bold">Aburi Botanical Escape</h2>
            <p className="mt-2 text-sm text-white/80 max-w-md leading-relaxed">
              Discover lush tranquility just outside the city. AI recommends the best trails based on your fitness level.
            </p>
          </div>
        </Link>

        {/* Live weather + AI suggestion */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 flex flex-col shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-4xl font-bold text-accra-green">{weather.temperature}°C</p>
              <p className="text-sm text-gray-500 mt-1">{weather.condition.label}, {humidityLabel}</p>
            </div>
            <svg
              className={weather.condition.icon === 'sun' ? 'w-9 h-9 text-accra-gold' : 'w-9 h-9 text-accra-leaf'}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
              aria-hidden
            >
              {WEATHER_ICON_PATHS[weather.condition.icon]}
            </svg>
          </div>

          <div className="mt-auto bg-accra-cream rounded-2xl p-4">
            <p className="text-xs font-bold text-accra-green">AI Suggestion</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              {weather.condition.suggestion}
            </p>
          </div>

          <Link
            href="/trip-planner"
            className="mt-4 text-center bg-white border border-gray-200 rounded-2xl py-3 text-sm font-semibold text-accra-green hover:bg-gray-50 transition-colors"
          >
            View Details
          </Link>
        </div>

        {/* Heritage walk */}
        <Link
          href="/experiences?categories=Culture"
          className="relative rounded-3xl overflow-hidden min-h-[230px] flex flex-col justify-between p-6 group"
        >
          <div className="absolute inset-0 bg-cover bg-center opacity-25 card-img" style={{ backgroundImage: `url('${HERITAGE_IMAGE}')` }} />
          <div className="absolute inset-0 bg-accra-cream/60" />
          <div className="relative z-10 w-11 h-11 rounded-full bg-accra-green text-white flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l9-6 9 6M5 10v9h14v-9M9 19v-5h6v5" />
            </svg>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-accra-green">Heritage Walk</h3>
            <p className="text-sm text-gray-600 mt-1">Immerse yourself in history with our curated walking tours.</p>
          </div>
        </Link>

        {/* Premium stays */}
        <Link
          href="/experiences?categories=Wellness"
          className="lg:col-span-2 relative rounded-3xl overflow-hidden min-h-[230px] flex flex-col justify-between p-6 group"
        >
          <div className="absolute inset-0 bg-cover bg-center opacity-25 card-img" style={{ backgroundImage: `url('${STAYS_IMAGE}')` }} />
          <div className="absolute inset-0 bg-accra-cream/60" />
          <div className="relative z-10 w-11 h-11 rounded-full bg-accra-gold text-accra-green flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6M3 18h18M3 18v2m18-2v2M7 10V8a2 2 0 012-2h2a2 2 0 012 2v2" />
            </svg>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-accra-green">Premium Stays</h3>
            <p className="text-sm text-gray-600 mt-1">Handpicked boutique hotels matched to your style by AI.</p>
          </div>
        </Link>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-bold text-accra-green mb-6">Explore by category</h2>
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              href={`/experiences?categories=${encodeURIComponent(cat.label)}`}
              className="flex items-center gap-2 bg-white/70 border border-white rounded-full px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-accra-green hover:text-accra-green transition-colors"
            >
              <span className="text-base">{cat.emoji}</span>
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="max-w-6xl mx-auto px-6 pb-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-accra-green">Trending right now</h2>
          <Link href="/experiences" className="text-sm font-semibold text-accra-leaf hover:underline">Show all →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TRENDING.map((item) => (
            <Link key={item.title} href="/experiences" className="group">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 mb-3">
                <div className="absolute inset-0 bg-cover bg-center card-img" style={{ backgroundImage: `url('${item.img}')` }} />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.title}</p>
                  <p className="text-gray-500 text-sm truncate">{item.location}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <svg className="w-3 h-3 text-accra-gold" fill="currentColor" viewBox="0 0 24 24">
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

      {/* AI planner CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-14">
        <div className="relative bg-gradient-to-r from-accra-green to-accra-leaf rounded-3xl overflow-hidden p-8 sm:p-12 text-white">
          <div className="absolute right-0 top-0 w-64 h-64 bg-accra-gold/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-accra-gold text-sm font-semibold uppercase tracking-widest mb-1">New feature</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">AI Trip Planner</h2>
              <p className="text-white/80 max-w-md">
                Tell us your dream trip in plain language — we&apos;ll build a full itinerary with local experiences in seconds.
              </p>
            </div>
            <Link
              href="/trip-planner"
              className="shrink-0 bg-accra-gold text-accra-green font-bold px-7 py-3.5 rounded-full hover:brightness-105 transition-all text-sm"
            >
              Try it free →
            </Link>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-white/50 border-y border-white">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h2 className="text-2xl font-bold text-accra-green mb-10 text-center">Why travelers choose us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col items-start gap-3">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-accra-leaf">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-accra-green">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA — keeps sign in / sign up entry points */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-accra-green mb-3">Ready to explore Accra?</h2>
        <p className="text-gray-600 mb-8">Create an account to save itineraries, or sign in to pick up where you left off.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/register"
            className="bg-accra-green hover:bg-accra-dark text-white font-semibold px-8 py-3.5 rounded-full transition-colors text-sm"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="bg-white border border-gray-200 text-accra-green font-semibold px-8 py-3.5 rounded-full hover:border-accra-green transition-colors text-sm"
          >
            Sign in
          </Link>
          <Link
            href="/experiences"
            className="border border-transparent text-gray-600 font-semibold px-8 py-3.5 rounded-full hover:text-accra-green transition-colors text-sm"
          >
            Browse experiences
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white bg-white/60">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© 2026 AccraAI. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/experiences" className="hover:text-accra-green transition-colors">Explore</Link>
            <Link href="/trip-planner" className="hover:text-accra-green transition-colors">Itinerary</Link>
            <Link href="/register" className="hover:text-accra-green transition-colors">Become a Guide</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
