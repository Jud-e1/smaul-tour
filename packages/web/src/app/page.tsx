'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ExperienceCard, { Experience } from '@/components/experiences/ExperienceCard';
import Carousel from '@/components/ui/Carousel';
import BrandLogo from '@/components/brand/BrandLogo';

// ── Photography: real places in Ghana, self-hosted (Wikimedia Commons, see /photos/CREDITS.md) ──
const IMG = {
  jamestown: '/photos/jamestown.jpg',
  jamestown2: '/photos/jamestown2.jpg',
  labadi: '/photos/labadi.jpg',
  waakye: '/photos/waakye.jpg',
  kakum: '/photos/kakum.jpg',
  blackstar: '/photos/blackstar.jpg',
  aburi: '/photos/aburi.jpg',
  nkrumah: '/photos/nkrumah.jpg',
  capecoast: '/photos/capecoast.jpg',
  elmina: '/photos/elmina.jpg',
  kente: '/photos/kente.jpg',
  kente2: '/photos/kente2.jpg',
  osu: '/photos/osu.jpg',
  drums: '/photos/drums.jpg',
  drumsNorth: '/photos/drumsNorth.jpg',
  mole: '/photos/mole.jpg',
  art: '/photos/art.jpg',
  jollof: '/photos/jollof.jpg',
  makola: '/photos/makola.jpg',
};

type Seed = [title: string, img: string, category: string, hours: number, price: number, rating: number, reviews: number, place: string];

function toExperience([title, img, category, hours, price, rating, reviews, place]: Seed, i: number): Experience {
  return {
    id: `curated-${i}-${title}`,
    title,
    description: '',
    price: { amount: price, currency: 'USD' },
    duration: hours,
    averageRating: rating,
    reviewCount: reviews,
    images: [{ url: img, thumbnailUrl: img }],
    status: 'active',
    location: { address: place },
    category: [category],
  };
}

const ORIGINALS: Seed[] = [
  ['Weave your own kente strip with a master weaver', IMG.kente, 'Culture', 4, 45, 4.98, 212, 'Bonwire weavers, via Accra'],
  ['Waakye & kelewele night crawl through Osu', IMG.waakye, 'Food & Drink', 3, 22, 4.97, 486, 'Osu, Accra'],
  ['Drum and dance with a Ga cultural troupe', IMG.drums, 'Culture', 2, 30, 4.95, 158, 'La, Accra'],
  ['Cook Ghana jollof in a home kitchen', IMG.jollof, 'Food & Drink', 3, 38, 4.96, 274, 'East Legon, Accra'],
  ['Jamestown street art & lighthouse walk', IMG.jamestown2, 'Art', 3, 28, 4.94, 391, 'Jamestown, Accra'],
  ['Inside Accra’s contemporary art studios', IMG.art, 'Art', 3, 35, 4.9, 97, 'Osu, Accra'],
];

const POPULAR: Seed[] = [
  ['Labadi Beach sunset, drumming & coconuts', IMG.labadi, 'Beaches', 2, 35, 4.91, 603, 'La, Accra'],
  ['Haggle like a local in Makola Market', IMG.makola, 'Culture', 2, 20, 4.88, 344, 'Central Accra'],
  ['Oxford Street after dark', IMG.osu, 'Food & Drink', 3, 25, 4.86, 219, 'Osu, Accra'],
  ['Independence story at Black Star Square', IMG.blackstar, 'Culture', 2, 18, 4.89, 412, 'Accra'],
  ['Nkrumah Memorial Park with a historian', IMG.nkrumah, 'Culture', 2, 15, 4.9, 188, 'Accra'],
  ['Jamestown heritage walk', IMG.jamestown, 'Culture', 3, 28, 4.94, 527, 'Jamestown, Accra'],
];

const DAY_TRIPS: Seed[] = [
  ['Cape Coast Castle & the slave route', IMG.capecoast, 'Culture', 10, 75, 4.97, 702, 'Cape Coast'],
  ['Elmina Castle & fishing harbour', IMG.elmina, 'Culture', 10, 70, 4.93, 318, 'Elmina'],
  ['Kakum canopy walkway at sunrise', IMG.kakum, 'Adventure', 9, 64, 4.89, 455, 'Central Region'],
  ['Mole National Park elephant safari', IMG.mole, 'Nature', 48, 240, 4.95, 126, 'West Gonja'],
  ['Aburi Botanical Gardens & mountain trails', IMG.aburi, 'Nature', 6, 40, 4.87, 231, 'Aburi'],
  ['Drumming village weekend in the north', IMG.drumsNorth, 'Culture', 48, 120, 4.92, 64, 'Northern Region'],
];

const CHIPS = [
  { label: 'Food & Drink', icon: '🍲' },
  { label: 'Culture', icon: '🥁' },
  { label: 'Nature', icon: '🌿' },
  { label: 'Beaches', icon: '🏖️' },
  { label: 'Adventure', icon: '🧗🏾' },
  { label: 'Art', icon: '🎨' },
  { label: 'Wellness', icon: '🧘🏾' },
];

const INSPIRATION: Record<string, [string, string][]> = {
  Popular: [['Jamestown', 'Heritage walks'], ['Osu', 'Street food'], ['Labadi', 'Beach evenings'], ['Makola', 'Markets'], ['Aburi', 'Gardens & hikes'], ['Cape Coast', 'Castles'], ['Kakum', 'Canopy walk'], ['Elmina', 'History'], ['Ada Foah', 'River & beach'], ['Kokrobite', 'Surf & reggae'], ['Akosombo', 'Lake Volta'], ['Mole', 'Safari']],
  Culture: [['Kente weaving', 'Bonwire'], ['Drumming', 'La'], ['Independence', 'Black Star Square'], ['Museums', 'National Museum'], ['Festivals', 'Homowo'], ['Chop bars', 'Local dining']],
  'Food & drink': [['Waakye', 'Osu'], ['Jollof', 'East Legon'], ['Kelewele', 'Night markets'], ['Fufu', 'Chop bars'], ['Cocoa', 'Farm tours'], ['Palm wine', 'Tapping']],
  Outdoors: [['Canopy walk', 'Kakum'], ['Waterfalls', 'Wli & Boti'], ['Safari', 'Mole'], ['Hiking', 'Aburi'], ['Kayaking', 'Volta'], ['Birding', 'Sakumono']],
  Beaches: [['Labadi', 'Accra'], ['Kokrobite', 'Surf'], ['Busua', 'Western Region'], ['Ada Foah', 'Estuary'], ['Anomabo', 'Quiet coast'], ['Bojo', 'Sandbar']],
};

// ── Live Accra weather (Open-Meteo) ─────────────────────────────────────────
type WeatherIcon = 'sun' | 'cloud' | 'rain' | 'storm';
interface WeatherCondition { codes: number[]; label: string; icon: WeatherIcon; emoji: string; suggestion: string; query: string }
const WEATHER_CONDITIONS: WeatherCondition[] = [
  { codes: [0, 1], label: 'Sunny', icon: 'sun', emoji: '☀️', suggestion: 'Perfect beach weather — Labadi is calling.', query: 'Beaches' },
  { codes: [2], label: 'Partly cloudy', icon: 'cloud', emoji: '⛅', suggestion: 'Soft light for the Jamestown heritage walk.', query: 'Culture' },
  { codes: [3, 45, 48], label: 'Cloudy', icon: 'cloud', emoji: '☁️', suggestion: 'Cool and overcast — ideal for the Aburi trails.', query: 'Nature' },
  { codes: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], label: 'Rainy', icon: 'rain', emoji: '🌧️', suggestion: 'Showers today — try a cooking class or art studio.', query: 'Food & Drink' },
  { codes: [95, 96, 99], label: 'Thunderstorms', icon: 'storm', emoji: '⛈️', suggestion: 'Storms expected — pick indoor experiences with flexible booking.', query: 'Art' },
];
interface OpenMeteoResponse { current?: { temperature_2m?: number; relative_humidity_2m?: number; weather_code?: number } }
interface Weather { temperature: number; humidity: number; condition: WeatherCondition }
const FALLBACK_WEATHER: Weather = { temperature: 28, humidity: 78, condition: WEATHER_CONDITIONS[0] };

function Check() {
  return (
    <svg className="w-5 h-5 shrink-0 text-leaf" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [weather, setWeather] = useState<Weather>(FALLBACK_WEATHER);
  const [heroQ, setHeroQ] = useState('');
  const [heroCat, setHeroCat] = useState('');
  const goSearch = () => {
    const params = new URLSearchParams();
    if (heroQ.trim()) params.set('q', heroQ.trim());
    if (heroCat) params.set('categories', heroCat);
    const qs = params.toString();
    router.push(qs ? `/experiences?${qs}` : '/experiences');
  };
  const [inspoTab, setInspoTab] = useState<keyof typeof INSPIRATION>('Popular');

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

  const searchHref = (title: string) => `/experiences?q=${encodeURIComponent(title.split(' ').slice(0, 2).join(' '))}`;

  return (
    <div className="bg-white">
      <div className="max-w-page mx-auto px-5 sm:px-10 xl:px-20">
        {/* ── Coastal hero: rounded photo + white search card ──────────── */}
        <section className="pt-4 md:pt-6">
          <div className="relative overflow-hidden rounded-[28px] min-h-[520px] md:min-h-[560px] flex items-end">
            <img src={IMG.labadi} alt="Labadi Beach at sunset, Accra" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#04282E]/80 via-[#04282E]/25 to-[#04282E]/10" />

            <Link
              href={`/experiences?categories=${encodeURIComponent(weather.condition.query)}`}
              className="absolute top-5 left-5 md:top-7 md:left-8 inline-flex items-center gap-2.5 rounded-full bg-white/90 backdrop-blur px-4 py-2 text-sm text-ink shadow-md hover:bg-white transition-colors"
              title={weather.condition.suggestion}
            >
              <span className="text-lg leading-none" aria-hidden>{weather.condition.emoji}</span>
              <span className="font-semibold">Accra today · {weather.temperature}°C</span>
              <span className="hidden sm:inline text-ink-muted">{weather.condition.label} · {weather.humidity}% humidity</span>
            </Link>

            <div className="relative w-full px-5 sm:px-8 md:px-12 pb-8 md:pb-12">
              <h1 className="text-white text-[40px] sm:text-[56px] md:text-[64px] leading-[1.02] font-bold tracking-[-0.035em] max-w-3xl">
                Unforgettable things to do in Accra
              </h1>
              <p className="mt-3 text-white/90 text-[17px] max-w-xl">{weather.condition.suggestion} Book verified local guides — pay only after it happens.</p>

              <form
                onSubmit={(e) => { e.preventDefault(); goSearch(); }}
                role="search"
                className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 bg-white rounded-3xl sm:rounded-full p-2 shadow-[0_14px_40px_rgba(0,0,0,0.25)] max-w-[760px]"
              >
                <label className="flex-1 px-4 sm:px-6 py-2 rounded-full hover:bg-fog transition-colors cursor-text">
                  <span className="block text-xs font-bold text-ink">Where</span>
                  <input
                    value={heroQ}
                    onChange={(e) => setHeroQ(e.target.value)}
                    placeholder="Search experiences, places or guides"
                    className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
                  />
                </label>
                <span className="hidden sm:block w-px h-8 bg-[#DCE4E5]" aria-hidden />
                <label className="sm:w-56 px-4 sm:px-6 py-2 rounded-full hover:bg-fog transition-colors cursor-pointer">
                  <span className="block text-xs font-bold text-ink">Category</span>
                  <select value={heroCat} onChange={(e) => setHeroCat(e.target.value)} className={`w-full bg-transparent text-sm outline-none cursor-pointer ${heroCat ? 'text-ink' : 'text-ink-muted'}`}>
                    <option value="">Any type</option>
                    {CHIPS.map((c) => <option key={c.label} value={c.label}>{c.label}</option>)}
                  </select>
                </label>
                <button type="submit" className="btn-accent !rounded-full h-12 sm:h-14 !px-8 text-[15px]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
                  Search
                </button>
              </form>
            </div>
          </div>

          {/* Category chips */}
          <div className="mt-6 flex gap-2.5 overflow-x-auto scrollbar-hide -mx-5 px-5 sm:mx-0 sm:px-0">
            {CHIPS.map((c) => (
              <Link
                key={c.label}
                href={`/experiences?categories=${encodeURIComponent(c.label)}`}
                className="shrink-0 inline-flex items-center gap-2 rounded-full border border-[#DCE4E5] px-4 py-2.5 text-sm font-medium text-ink hover:border-ink hover:bg-fog transition-colors"
              >
                <span aria-hidden>{c.icon}</span>{c.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Rows ──────────────────────────────────────────────────────── */}
        <div className="mt-4">
          <Carousel title="Nsoroma Originals" subtitle="Hosted by the people who know Accra best" href="/experiences">
            {ORIGINALS.map((s, i) => (
              <ExperienceCard key={s[0]} experience={toExperience(s, i)} href={searchHref(s[0])} badge="Original" />
            ))}
          </Carousel>

          <Carousel title="Popular in Accra this week" href="/experiences?sort=popularity">
            {POPULAR.map((s, i) => (
              <ExperienceCard key={s[0]} experience={toExperience(s, i + 10)} href={searchHref(s[0])} badge={i < 2 ? 'Popular' : ''} />
            ))}
          </Carousel>
        </div>

        {/* ── Vetted for quality ───────────────────────────────────────── */}
        <section className="my-12 md:my-16 grid md:grid-cols-[1fr_1.2fr] gap-10 md:gap-16 items-center rounded-3xl bg-fog px-6 py-12 sm:px-12 md:px-16 md:py-16">
          <div className="text-center md:text-left">
            <div className="mx-auto md:mx-0 relative w-24 h-24 rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(224,168,0,0.4),inset_0_-4px_10px_rgba(0,0,0,0.12)]" style={{ background: 'radial-gradient(circle at 35% 30%, #FFE08A 0%, #FFC93C 45%, #E0A800 100%)' }}>
              <span className="absolute inset-2 rounded-full border-2 border-white/35" />
              <BrandLogo variant="mark" decorative className="w-12 h-12 object-contain drop-shadow" />
            </div>
            <h2 className="mt-6 text-[32px] leading-[1.15] font-bold text-ink">Every experience is vetted for quality</h2>
            <p className="mt-3 text-ink-muted text-[17px] leading-relaxed">
              Guides are reviewed for expertise, local knowledge and authenticity before they ever host a guest.
            </p>
            <Link href="/experiences" className="btn-primary mt-7">Explore experiences</Link>
          </div>
          <ul className="space-y-6">
            {[
              ['Verified local guides', 'ID-checked and interviewed. Look for the “Verified guide” badge on every listing.'],
              ['Pay only when it happens', 'Your payment is held in escrow and released to the guide after your experience.'],
              ['Flexible when plans change', 'Clear cancellation policies on every booking, shown before you pay.'],
              ['Planned in seconds', 'Describe your trip in plain words and the AI planner builds a bookable itinerary.'],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-4">
                <Check />
                <div>
                  <p className="font-semibold text-ink">{t}</p>
                  <p className="text-sm text-ink-muted mt-0.5 leading-relaxed">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <Carousel title="Day trips beyond the city" subtitle="Castles, canopies and safaris — transport included" href="/experiences?categories=Adventure">
          {DAY_TRIPS.map((s, i) => (
            <ExperienceCard key={s[0]} experience={toExperience(s, i + 20)} href={searchHref(s[0])} badge={i === 0 ? 'Guest favorite' : ''} />
          ))}
        </Carousel>

        {/* ── AI planner ───────────────────────────────────────────────── */}
        <section className="my-12 md:my-16 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-50 text-sun-700 text-xs font-semibold px-3 py-1">✨ New · AI trip planner</span>
            <h2 className="mt-4 text-[32px] sm:text-[44px] leading-[1.08] font-bold text-ink tracking-[-0.03em]">
              Tell us the trip.<br />We’ll plan every day.
            </h2>
            <p className="mt-4 text-[17px] text-ink-muted leading-relaxed max-w-lg">
              Describe it like you’d tell a friend — dates, budget, what you love. Nsoroma turns it into a day-by-day plan of
              bookable local experiences you can tweak stop by stop.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/trip-planner" className="btn-accent">Plan my trip</Link>
              <Link href="/experiences" className="btn-outline">Browse instead</Link>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl overflow-hidden aspect-[4/3] relative">
              <img src={IMG.blackstar} alt="Black Star Gate, Accra" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-6 left-4 right-4 sm:left-auto sm:-left-8 sm:right-auto sm:w-[360px] sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto bg-white rounded-2xl shadow-[0_8px_28px_rgba(0,0,0,0.18)] p-4">
              <p className="text-xs font-semibold text-ink-muted">Your 3-day plan</p>
              <ul className="mt-3 space-y-2">
                {[
                  ['Day 1', 'Jamestown heritage walk', '$28', IMG.jamestown],
                  ['Day 2', 'Waakye & kelewele crawl', '$22', IMG.waakye],
                  ['Day 3', 'Labadi sunset session', '$35', IMG.labadi],
                ].map(([d, t, p, img]) => (
                  <li key={d} className="flex items-center gap-3">
                    <img src={img} alt="" className="w-11 h-11 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-ink-muted">{d}</p>
                      <p className="text-sm font-semibold text-ink truncate">{t}</p>
                    </div>
                    <span className="text-sm font-semibold">{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-[#EDF2F2] flex items-center justify-between text-sm">
                <span className="text-ink-muted">Total per guest</span>
                <span className="font-bold">$85</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Become a guide ───────────────────────────────────────────── */}
        <section className="mt-20 md:mt-16 relative overflow-hidden rounded-3xl min-h-[420px] flex items-end md:items-center">
          <img src={IMG.kente2} alt="Kente weaver at a loom" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
          <div className="relative p-8 sm:p-12 md:p-16 max-w-xl text-white">
            <p className="text-sm font-semibold text-white/80">Nsoroma for guides</p>
            <h2 className="mt-2 text-[32px] sm:text-[44px] leading-[1.05] font-bold tracking-[-0.03em]">Share your city. Get paid to host.</h2>
            <p className="mt-4 text-white/85 text-[17px] leading-relaxed">
              Kente weavers, chefs, drummers, historians — if you know Accra, travelers want to meet you.
            </p>
            <Link href="/register" className="mt-7 inline-flex items-center rounded-lg bg-white text-ink font-semibold px-6 py-3 hover:bg-fog transition-colors">
              Become a guide
            </Link>
          </div>
        </section>

        {/* ── Inspiration ──────────────────────────────────────────────── */}
        <section className="mt-16">
          <h2 className="text-[22px] font-semibold text-ink">Inspiration for your next trip</h2>
          <div className="mt-4 flex gap-6 overflow-x-auto scrollbar-hide border-b border-[#DCE4E5]">
            {(Object.keys(INSPIRATION) as (keyof typeof INSPIRATION)[]).map((t) => (
              <button
                key={t}
                onClick={() => setInspoTab(t)}
                className={`pb-3 -mb-px text-sm whitespace-nowrap border-b-2 transition-colors ${
                  inspoTab === t ? 'border-ink text-ink font-semibold' : 'border-transparent text-ink-muted hover:text-ink hover:border-[#DCE4E5]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-5">
            {INSPIRATION[inspoTab].map(([place, sub]) => (
              <li key={place}>
                <Link href={`/experiences?q=${encodeURIComponent(place)}`} className="block group">
                  <span className="block text-sm font-semibold text-ink group-hover:underline underline-offset-2">{place}</span>
                  <span className="block text-sm text-ink-muted">{sub}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
