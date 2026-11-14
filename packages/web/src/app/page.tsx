'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, CalendarCheck, Cloud, CloudLightning, CloudRain, CloudSun, Flower2,
  Landmark, Mountain, Palette, Search, ShieldCheck, Sparkles, Star, Sun, Trees, UtensilsCrossed, Waves,
  type LucideIcon,
} from 'lucide-react';
import ExperienceCard, { Experience } from '@/components/experiences/ExperienceCard';
import Carousel from '@/components/ui/Carousel';
import World3D from '@/components/three/World3D';

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

const CHIPS: { label: string; Icon: LucideIcon; img: string }[] = [
  { label: 'Food & Drink', Icon: UtensilsCrossed, img: IMG.jollof },
  { label: 'Culture', Icon: Landmark, img: IMG.drums },
  { label: 'Nature', Icon: Trees, img: IMG.aburi },
  { label: 'Beaches', Icon: Waves, img: IMG.labadi },
  { label: 'Adventure', Icon: Mountain, img: IMG.kakum },
  { label: 'Art', Icon: Palette, img: IMG.art },
  { label: 'Wellness', Icon: Flower2, img: IMG.osu },
];

const PLACES = ['Jamestown', 'Osu', 'Labadi', 'Makola', 'Cape Coast', 'Kakum', 'Elmina', 'Aburi', 'Mole', 'Ada Foah', 'Kokrobite', 'Akosombo'];

const INSPIRATION: Record<string, [string, string][]> = {
  Popular: [['Jamestown', 'Heritage walks'], ['Osu', 'Street food'], ['Labadi', 'Beach evenings'], ['Makola', 'Markets'], ['Aburi', 'Gardens & hikes'], ['Cape Coast', 'Castles'], ['Kakum', 'Canopy walk'], ['Elmina', 'History'], ['Ada Foah', 'River & beach'], ['Kokrobite', 'Surf & reggae'], ['Akosombo', 'Lake Volta'], ['Mole', 'Safari']],
  Culture: [['Kente weaving', 'Bonwire'], ['Drumming', 'La'], ['Independence', 'Black Star Square'], ['Museums', 'National Museum'], ['Festivals', 'Homowo'], ['Chop bars', 'Local dining']],
  'Food & drink': [['Waakye', 'Osu'], ['Jollof', 'East Legon'], ['Kelewele', 'Night markets'], ['Fufu', 'Chop bars'], ['Cocoa', 'Farm tours'], ['Palm wine', 'Tapping']],
  Outdoors: [['Canopy walk', 'Kakum'], ['Waterfalls', 'Wli & Boti'], ['Safari', 'Mole'], ['Hiking', 'Aburi'], ['Kayaking', 'Volta'], ['Birding', 'Sakumono']],
  Beaches: [['Labadi', 'Accra'], ['Kokrobite', 'Surf'], ['Busua', 'Western Region'], ['Ada Foah', 'Estuary'], ['Anomabo', 'Quiet coast'], ['Bojo', 'Sandbar']],
};

// ── Live Accra weather (Open-Meteo) ─────────────────────────────────────────
interface WeatherCondition { codes: number[]; label: string; Icon: LucideIcon; suggestion: string; query: string }
const WEATHER_CONDITIONS: WeatherCondition[] = [
  { codes: [0, 1], label: 'Sunny', Icon: Sun, suggestion: 'Perfect beach weather — Labadi is calling.', query: 'Beaches' },
  { codes: [2], label: 'Partly cloudy', Icon: CloudSun, suggestion: 'Soft light for the Jamestown heritage walk.', query: 'Culture' },
  { codes: [3, 45, 48], label: 'Cloudy', Icon: Cloud, suggestion: 'Cool and overcast — ideal for the Aburi trails.', query: 'Nature' },
  { codes: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], label: 'Rainy', Icon: CloudRain, suggestion: 'Showers today — try a cooking class or art studio.', query: 'Food & Drink' },
  { codes: [95, 96, 99], label: 'Thunderstorms', Icon: CloudLightning, suggestion: 'Storms expected — pick indoor experiences with flexible booking.', query: 'Art' },
];
interface OpenMeteoResponse { current?: { temperature_2m?: number; relative_humidity_2m?: number; weather_code?: number } }
interface Weather { temperature: number; humidity: number; condition: WeatherCondition }
const FALLBACK_WEATHER: Weather = { temperature: 28, humidity: 78, condition: WEATHER_CONDITIONS[0] };

const STEPS: { n: string; Icon: LucideIcon; title: string; body: string }[] = [
  { n: '01', Icon: Search, title: 'Find your thing', body: 'Browse hand-picked experiences or describe your trip to the AI planner.' },
  { n: '02', Icon: BadgeCheck, title: 'Book a verified host', body: 'Every guide is ID-checked and interviewed. Prices are shown in full, up front.' },
  { n: '03', Icon: ShieldCheck, title: 'Pay after it happens', body: 'Your payment sits in escrow and is released to the host after the experience.' },
];

export default function Home() {
  const router = useRouter();
  const [weather, setWeather] = useState<Weather>(FALLBACK_WEATHER);
  const [heroQ, setHeroQ] = useState('');
  const [heroCat, setHeroCat] = useState('');
  const [inspoTab, setInspoTab] = useState<keyof typeof INSPIRATION>('Popular');

  const goSearch = () => {
    const params = new URLSearchParams();
    if (heroQ.trim()) params.set('q', heroQ.trim());
    if (heroCat) params.set('categories', heroCat);
    const qs = params.toString();
    router.push(qs ? `/experiences?${qs}` : '/experiences');
  };

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
  const WeatherIcon = weather.condition.Icon;

  return (
    <div className="bg-canvas overflow-x-clip">
      {/* ── Opening stage: the 3D world ─────────────────────────────────── */}
      <section className="relative lg:min-h-[calc(100vh-80px)] flex flex-col">
        <div className="hero-mesh hidden lg:block" aria-hidden />
        {/* Phones: content first, then the island as its own block. Desktop: island fills the stage. */}
        <div className="order-last relative h-[440px] sm:h-[520px] lg:order-none lg:absolute lg:inset-0 lg:left-[36%] lg:h-auto">
          <World3D variant="island" className="w-full h-full" />
        </div>
        {/* soft floor fade so the text column reads cleanly */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full lg:w-[55%] bg-gradient-to-r from-canvas via-canvas/80 to-transparent hidden lg:block" />

        <div className="relative z-10 max-w-page mx-auto w-full px-5 sm:px-10 xl:px-16 pt-10 lg:pt-20 lg:flex-1 flex flex-col pointer-events-none">
          <div className="max-w-[620px] pointer-events-auto">
            <p className="eyebrow">05.6037° N · 0.1870° W — Accra, Ghana</p>
            <h1 className="mt-5 text-[52px] sm:text-[76px] xl:text-[92px] leading-[0.92] text-ink">
              Follow the star to the real Ghana.
            </h1>
            <p className="mt-6 text-lg text-stone-600 max-w-md leading-relaxed">
              <span className="font-semibold text-ink">Nsoroma</span> means <em>star</em> in Akan. Ours points you to
              small-group experiences with verified local hosts — kente weavers, home cooks, drummers and historians.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); goSearch(); }}
              role="search"
              className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 bg-paper rounded-[28px] sm:rounded-full p-2 border border-hairline shadow-card max-w-[600px]"
            >
              <label className="flex-1 px-4 sm:px-6 py-2 rounded-full hover:bg-sand transition-colors cursor-text">
                <span className="block text-xs font-semibold text-ink">Where</span>
                <input
                  value={heroQ}
                  onChange={(e) => setHeroQ(e.target.value)}
                  placeholder="Experiences, places or guides"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
                />
              </label>
              <span className="hidden sm:block w-px h-8 bg-hairline" aria-hidden />
              <label className="sm:w-44 px-4 sm:px-6 py-2 rounded-full hover:bg-sand transition-colors cursor-pointer">
                <span className="block text-xs font-semibold text-ink">Category</span>
                <select value={heroCat} onChange={(e) => setHeroCat(e.target.value)} className={`w-full bg-transparent text-sm outline-none cursor-pointer ${heroCat ? 'text-ink' : 'text-ink-muted'}`}>
                  <option value="">Any type</option>
                  {CHIPS.map((c) => <option key={c.label} value={c.label}>{c.label}</option>)}
                </select>
              </label>
              <button type="submit" className="btn-primary h-12 sm:h-14 !px-7">
                <Search className="w-4 h-4" strokeWidth={2.5} /> Search
              </button>
            </form>

            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-stone-600">
              <span className="inline-flex items-center gap-2"><Star className="w-4 h-4 fill-ink text-ink" /><b className="text-ink font-semibold">4.9</b> guest rating</span>
              <span className="inline-flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-ink" />Verified hosts</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-ink" />Escrow-protected</span>
            </div>
          </div>

          {/* destination marking + live weather, pinned to the stage floor */}
          <div className="mt-auto pb-8 hidden lg:flex items-end justify-between pointer-events-auto">
            <Link
              href={`/experiences?categories=${encodeURIComponent(weather.condition.query)}`}
              className="flex items-center gap-3 rounded-2xl bg-paper/90 backdrop-blur px-4 py-3 border border-hairline shadow-soft hover:bg-paper transition-colors max-w-sm"
            >
              <span className="icon-tile w-10 h-10 shrink-0"><WeatherIcon className="w-5 h-5" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Accra today · {weather.temperature}°C · {weather.condition.label}</span>
                <span className="block text-xs text-ink-muted truncate">{weather.condition.suggestion}</span>
              </span>
            </Link>
            <p className="mono text-[11px] text-stone-500 uppercase tracking-[0.08em]">Drag to look around ↺ · Postcards from the Gold Coast</p>
          </div>
        </div>
      </section>

      {/* ── Destinations ticker ─────────────────────────────────────────── */}
      <div className="border-y border-hairline bg-paper/60 overflow-hidden">
        <div className="flex w-max animate-[ticker_40s_linear_infinite] py-4">
          {[...PLACES, ...PLACES].map((p, i) => (
            <span key={i} className="mono text-[12px] uppercase tracking-[0.12em] text-stone-600 px-6 inline-flex items-center gap-6">
              {p}<span className="text-stone-300">✦</span>
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-page mx-auto px-5 sm:px-10 xl:px-16">
        {/* ── Categories: photo tiles ──────────────────────────────────── */}
        <section className="mt-20">
          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <p className="eyebrow">Ch. 01 — Choose your mood</p>
              <h2 className="mt-3 text-[40px] sm:text-[52px] leading-[1]">What are you into?</h2>
            </div>
            <Link href="/experiences" className="hidden sm:inline-flex btn-outline">All experiences <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-5 px-5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 lg:grid-cols-7">
            {CHIPS.map(({ label, Icon, img }) => (
              <Link
                key={label}
                href={`/experiences?categories=${encodeURIComponent(label)}`}
                className="group shrink-0 w-40 sm:w-auto relative aspect-[3/4] rounded-[24px] overflow-hidden"
              >
                <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover card-img" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#000000]/75 via-[#000000]/10 to-transparent" />
                <span className="absolute top-3 left-3 w-9 h-9 rounded-full bg-paper/90 backdrop-blur flex items-center justify-center text-ink"><Icon className="w-4 h-4" /></span>
                <span className="absolute bottom-3 left-4 right-4 text-paper font-display font-semibold text-lg leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Rows ─────────────────────────────────────────────────────── */}
        <div className="mt-16">
          <Carousel title="Nsoroma Originals" subtitle="Hosted by the people who know Accra best" href="/experiences">
            {ORIGINALS.map((s, i) => (
              <ExperienceCard key={s[0]} experience={toExperience(s, i)} href={searchHref(s[0])} badge="Original" />
            ))}
          </Carousel>
          <Carousel title="Popular this week" href="/experiences?sort=popularity">
            {POPULAR.map((s, i) => (
              <ExperienceCard key={s[0]} experience={toExperience(s, i + 10)} href={searchHref(s[0])} badge={i < 2 ? 'Popular' : ''} />
            ))}
          </Carousel>
        </div>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="mt-24">
          <p className="eyebrow">Ch. 02 — How it works</p>
          <h2 className="mt-3 text-[40px] sm:text-[52px] leading-[1] max-w-2xl">Three steps to a day you’ll talk about for years.</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {STEPS.map(({ n, Icon, title, body }) => (
              <div key={n} className="relative rounded-[28px] bg-paper border border-hairline p-7 overflow-hidden">
                <span className="mono text-[11px] text-stone-500">{n}</span>
                <span className="mt-6 flex w-14 h-14 rounded-2xl bg-sand items-center justify-center shadow-[inset_0_-6px_12px_rgba(91,67,52,0.12),0_8px_18px_-8px_rgba(91,67,52,0.35)]">
                  <Icon className="w-6 h-6" strokeWidth={1.75} />
                </span>
                <h3 className="mt-6 font-display text-2xl font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-2 text-ink-muted leading-relaxed">{body}</p>
                <span className="absolute -right-3 -top-8 font-display font-bold text-[120px] leading-none text-[#F1EFFF] select-none pointer-events-none" aria-hidden>{n}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Illuminated exhibit: the AI planner ─────────────────────────── */}
      <section className="mt-24 mx-3 sm:mx-6 rounded-[40px] bg-[#000000] text-paper relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'linear-gradient(#FFFFFF 1px, transparent 1px), linear-gradient(90deg, #FFFFFF 1px, transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(ellipse at 70% 60%, black 20%, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at 70% 60%, black 20%, transparent 70%)' }} aria-hidden />
        <div className="relative max-w-page mx-auto px-6 sm:px-12 xl:px-16 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <p className="mono text-[11px] uppercase tracking-[0.1em] text-[#D2D2D7] inline-flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" />Ch. 03 — AI trip planner</p>
            <h2 className="mt-4 text-[44px] sm:text-[64px] leading-[0.95] text-paper">Tell us the trip. We’ll plan every day.</h2>
            <p className="mt-6 text-lg text-[#A1A1A6] leading-relaxed max-w-lg">
              Describe it like you’d tell a friend — dates, budget, what you love. Nsoroma turns it into a day-by-day plan of
              bookable experiences you can tweak stop by stop.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/trip-planner" className="btn bg-paper text-ink hover:bg-sand">Plan my trip <ArrowRight className="w-4 h-4" /></Link>
              <Link href="/experiences" className="btn border border-[#3A3A3C] text-paper hover:bg-white/5">Browse instead</Link>
            </div>
          </div>

          {/* exhibit: pedestal + plan card */}
          <div className="relative flex justify-center">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[85%] h-16 rounded-[50%] bg-[#FFFFFF]/10 border border-[#FFFFFF]/25 blur-[0.5px]" aria-hidden />
            <div className="relative w-full max-w-[420px] mb-8 rounded-[28px] bg-paper text-ink p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] rotate-[-2deg]">
              <div className="flex items-center justify-between">
                <p className="mono text-[11px] uppercase tracking-[0.08em] text-stone-500">Your 3-day plan</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-1 text-xs font-semibold"><Sparkles className="w-3 h-3" />AI</span>
              </div>
              <p className="mt-3 text-sm text-ink-muted italic">“3 days in Accra, street food and history, one beach evening, around $100.”</p>
              <ul className="mt-5 space-y-3">
                {[
                  ['Day 1', 'Jamestown heritage walk', '$28', IMG.jamestown],
                  ['Day 2', 'Waakye & kelewele crawl', '$22', IMG.waakye],
                  ['Day 3', 'Labadi sunset session', '$35', IMG.labadi],
                ].map(([d, t, p, img]) => (
                  <li key={d} className="flex items-center gap-3 rounded-2xl bg-canvas p-2.5">
                    <img src={img} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="mono text-[10px] uppercase text-stone-500">{d}</p>
                      <p className="text-sm font-semibold truncate">{t}</p>
                    </div>
                    <span className="text-sm font-semibold pr-1">{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-hairline flex items-center justify-between">
                <span className="text-sm text-ink-muted">Total per guest</span>
                <span className="font-display text-2xl font-bold">$85</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-page mx-auto px-5 sm:px-10 xl:px-16">
        <div className="mt-20">
          <Carousel title="Day trips beyond the city" subtitle="Castles, canopies and safaris — transport included" href="/experiences?categories=Adventure">
            {DAY_TRIPS.map((s, i) => (
              <ExperienceCard key={s[0]} experience={toExperience(s, i + 20)} href={searchHref(s[0])} badge={i === 0 ? 'Guest favorite' : ''} />
            ))}
          </Carousel>
        </div>

        {/* ── Promise grid ─────────────────────────────────────────────── */}
        <section className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {([
            [BadgeCheck, 'Verified local guides', 'ID-checked and interviewed before they ever host.'],
            [ShieldCheck, 'Escrow-protected', 'Released to the host only after your experience.'],
            [CalendarCheck, 'Flexible policies', 'Clear cancellation terms, shown before you pay.'],
            [Sparkles, 'Planned in seconds', 'An AI planner that books real local experiences.'],
          ] as [LucideIcon, string, string][]).map(([Icon, t, d]) => (
            <div key={t} className="rounded-[24px] border border-hairline bg-paper p-6 flex gap-4">
              <span className="icon-tile w-11 h-11 shrink-0"><Icon className="w-5 h-5" strokeWidth={1.75} /></span>
              <div>
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-sm text-ink-muted leading-relaxed">{d}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* ── Closing scene ─────────────────────────────────────────────────── */}
      <section className="mt-24 max-w-page mx-auto px-5 sm:px-10 xl:px-16">
        <div className="relative rounded-[40px] stage-mesh overflow-hidden grid lg:grid-cols-[1.1fr_1fr] min-h-[520px]">
          <div className="relative z-10 p-8 sm:p-14 lg:p-16 flex flex-col justify-center">
            <p className="eyebrow">Ch. 04 — Your turn</p>
            <h2 className="mt-4 text-[48px] sm:text-[80px] leading-[0.9]">Your star is waiting.</h2>
            <p className="mt-6 text-lg text-stone-600 max-w-md leading-relaxed">
              Save experiences, build itineraries and book in a few taps. Or share your own city as a host.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">Create free account <ArrowRight className="w-4 h-4" /></Link>
              <Link href="/register" className="btn-outline">Become a guide</Link>
            </div>
          </div>
          <div className="relative min-h-[320px]">
            <World3D variant="star" className="absolute inset-0" fallback={IMG.blackstar} />
          </div>
        </div>
      </section>

      {/* ── Inspiration ──────────────────────────────────────────────────── */}
      <section className="mt-20 max-w-page mx-auto px-5 sm:px-10 xl:px-16">
        <h2 className="text-[32px]">Inspiration for your next trip</h2>
        <div className="mt-5 flex gap-2 overflow-x-auto scrollbar-hide">
          {(Object.keys(INSPIRATION) as (keyof typeof INSPIRATION)[]).map((t) => (
            <button key={t} onClick={() => setInspoTab(t)} className={`pill-tab ${inspoTab === t ? 'pill-tab-active' : ''}`}>{t}</button>
          ))}
        </div>
        <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-6">
          {INSPIRATION[inspoTab].map(([place, sub]) => (
            <li key={place}>
              <Link href={`/experiences?q=${encodeURIComponent(place)}`} className="group flex items-center justify-between gap-2 border-b border-hairline pb-3">
                <span>
                  <span className="block font-display text-lg font-semibold tracking-[-0.02em] text-ink">{place}</span>
                  <span className="block text-sm text-ink-muted">{sub}</span>
                </span>
                <ArrowUpRight className="w-4 h-4 text-stone-400 group-hover:text-ink transition-colors" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
