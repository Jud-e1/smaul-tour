'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import NotificationCenter from '@/components/ui/NotificationCenter';
import BrandLogo from '@/components/brand/BrandLogo';

const NAV_LINKS = [
  { label: 'Experiences', href: '/experiences', icon: '🧭' },
  { label: 'Trip planner', href: '/trip-planner', icon: '✨' },
  { label: 'Local guides', href: '/experiences?q=guide', icon: '🥁' },
  { label: 'Eco-stays', href: '/experiences?categories=Nature', icon: '🌿' },
];

const SEARCH_CATEGORIES = ['Food & Drink', 'Culture', 'Adventure', 'Nature', 'Art', 'Wellness', 'Beaches'];

function SearchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
    </svg>
  );
}

/** Airbnb-style segmented search: Where · Category · (search). */
function BigSearch({ onSubmit }: { onSubmit: (q: string, cat: string) => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [focus, setFocus] = useState<'q' | 'cat' | null>(null);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(q, cat); }}
      role="search"
      className={`relative mx-auto flex items-center w-full max-w-[850px] h-[66px] rounded-full border border-[#DCE4E5] shadow-[0_3px_12px_rgba(0,0,0,0.08)] transition-colors ${focus ? 'bg-[#EDF2F2]' : 'bg-white'}`}
    >
      <label
        className={`flex-[1.4] h-full flex flex-col justify-center pl-8 pr-4 rounded-full cursor-text transition-colors ${
          focus === 'q' ? 'bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)]' : 'hover:bg-[#EDF2F2]'
        }`}
      >
        <span className="text-xs font-semibold text-ink">Where</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus('q')}
          onBlur={() => setFocus(null)}
          placeholder="Search experiences in Accra"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
        />
      </label>
      <span className={`w-px h-8 bg-[#DCE4E5] ${focus ? 'opacity-0' : ''}`} aria-hidden />
      <label
        className={`flex-1 h-full flex flex-col justify-center pl-6 pr-24 rounded-full cursor-pointer transition-colors ${
          focus === 'cat' ? 'bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)]' : 'hover:bg-[#EDF2F2]'
        }`}
      >
        <span className="text-xs font-semibold text-ink">Category</span>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          onFocus={() => setFocus('cat')}
          onBlur={() => setFocus(null)}
          className={`w-full bg-transparent text-sm outline-none cursor-pointer appearance-none ${cat ? 'text-ink' : 'text-ink-muted'}`}
        >
          <option value="">Any type of experience</option>
          {SEARCH_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-12 min-w-[48px] px-4 rounded-full text-white flex items-center justify-center gap-2 text-[15px] font-semibold btn-accent !py-0"
        aria-label="Search"
      >
        <SearchIcon />
        {focus && <span>Search</span>}
      </button>
    </form>
  );
}

const TAB_ICONS = {
  explore: 'M21 21l-5.2-5.2M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z',
  heart: 'M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.7 3.9 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.7 1.1-1.6 2.7-2.7 4.7-2.7 3.4 0 5.7 3.2 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3z',
  plan: 'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z',
  trips: 'M4 8h16v11a1 1 0 01-1 1H5a1 1 0 01-1-1V8zm5-4h6v4H9V4z',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7.5 8.5a7.5 7.5 0 0115 0',
};

export default function Navbar() {
  const { user, logout, fetchMe } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetQ, setSheetQ] = useState('');
  const [sheetCat, setSheetCat] = useState('');
  const [compactQ, setCompactQ] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const dashboardHref =
    user?.role === 'guide' ? '/dashboard/guide' :
    user?.role === 'admin' ? '/admin' :
    '/dashboard/traveler';

  const isHome = pathname === '/';
  const isBrowse = pathname === '/experiences';
  const isAuth = ['/login', '/register', '/reset-password', '/verify-email'].includes(pathname);
  const showBigSearch = isBrowse && !scrolled;
  const showTabs = isHome || showBigSearch;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    // Hysteresis: collapse past 120px, expand only back at the very top (avoids jitter as the header shrinks).
    const onScroll = () => setScrolled((was) => (was ? window.scrollY > 4 : window.scrollY > 120));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setUserMenuOpen(false); setSheetOpen(false); }, [pathname]);

  // Restore the signed-in user after a full page load (the token lives in localStorage).
  useEffect(() => {
    if (!useAuthStore.getState().user) void fetchMe();
  }, [fetchMe]);

  const go = (q: string, cat: string) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (cat) params.set('categories', cat);
    const qs = params.toString();
    router.push(qs ? `/experiences?${qs}` : '/experiences');
    setSheetOpen(false);
  };

  const isActive = (href: string) => !href.includes('?') && pathname === href;
  const initial = (user?.profile?.firstName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase();
  const menuItem = 'block w-full text-left px-4 py-3 text-sm text-ink hover:bg-fog transition-colors';

  const tabs = [
    { label: 'Explore', href: '/experiences', icon: TAB_ICONS.explore, active: pathname === '/' || pathname.startsWith('/experiences') },
    { label: 'Wishlists', href: user ? `${dashboardHref}?tab=wishlist` : '/login', icon: TAB_ICONS.heart, active: false },
    { label: 'Plan', href: '/trip-planner', icon: TAB_ICONS.plan, active: pathname.startsWith('/trip-planner') || pathname.startsWith('/itineraries') },
    { label: 'Trips', href: user ? dashboardHref : '/login', icon: TAB_ICONS.trips, active: pathname.startsWith('/dashboard') || pathname.startsWith('/admin') },
    { label: user ? 'Profile' : 'Log in', href: user ? '/settings/notifications' : '/login', icon: TAB_ICONS.profile, active: pathname.startsWith('/settings') || pathname === '/login' },
  ];

  return (
    <>
      {/* ── Desktop / tablet header ───────────────────────────────────── */}
      <header
        className={`hidden md:block sticky top-0 z-40 bg-white border-b border-[#EDF2F2] transition-shadow ${
          scrolled ? 'shadow-[0_1px_12px_rgba(0,0,0,0.06)]' : ''
        }`}
      >
        <div className="max-w-page mx-auto px-6 lg:px-10 xl:px-20">
          <div className="h-20 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-1.5 shrink-0" aria-label="Nsoroma home">
              <BrandLogo variant="mark" decorative className="h-9 w-9 object-contain" />
              <span className="hidden lg:inline text-[22px] font-extrabold tracking-[-0.035em] text-ink">Nsoroma</span>
            </Link>

            {showTabs ? (
              <nav className="flex items-center gap-1 lg:gap-4" aria-label="Main">
                {NAV_LINKS.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className={`group relative flex items-center px-2 lg:px-3 py-3 text-[15px] font-medium transition-colors ${
                        active ? 'text-ink font-semibold' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <span>{link.label}</span>
                      <span className={`absolute left-2 right-2 -bottom-[12px] h-[3px] rounded-full ${active ? 'bg-sun' : 'bg-transparent group-hover:bg-[#DCE4E5]'}`} />
                    </Link>
                  );
                })}
              </nav>
            ) : !isAuth ? (
              <form
                onSubmit={(e) => { e.preventDefault(); go(compactQ, ''); }}
                className="flex items-center h-12 rounded-full border border-[#DCE4E5] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-shadow pl-5 pr-2 gap-3 w-full max-w-md"
                role="search"
              >
                <span className="text-lg" aria-hidden>🧭</span>
                <input
                  value={compactQ}
                  onChange={(e) => setCompactQ(e.target.value)}
                  placeholder="Search experiences"
                  className="flex-1 min-w-0 bg-transparent text-sm font-medium text-ink placeholder:text-ink outline-none"
                />
                <button type="submit" aria-label="Search" className="w-8 h-8 rounded-full btn-accent !p-0 flex items-center justify-center">
                  <SearchIcon className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : <span />}

            <div className="flex items-center gap-1 shrink-0">
              <Link
                href={user?.role === 'guide' ? '/dashboard/guide' : '/register'}
                className="hidden lg:block text-sm font-semibold text-ink px-4 py-3 rounded-full hover:bg-fog transition-colors"
              >
                {user?.role === 'guide' ? 'Switch to hosting' : 'Become a guide'}
              </Link>

              {user && <NotificationCenter />}

              <div ref={userMenuRef} className="relative ml-1">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  aria-label="Open account menu"
                  aria-expanded={userMenuOpen}
                  className="flex items-center gap-3 pl-3.5 pr-1.5 py-1.5 rounded-full border border-[#DCE4E5] bg-white hover:shadow-[0_2px_4px_rgba(0,0,0,0.18)] transition-shadow"
                >
                  <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                  {user ? (
                    <span className="w-8 h-8 rounded-full bg-ink text-white text-sm font-semibold flex items-center justify-center overflow-hidden">
                      {user.profile?.profilePhotoUrl
                        ? <img src={user.profile.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                        : initial}
                    </span>
                  ) : (
                    <svg className="w-8 h-8 text-[#5E7377]" viewBox="0 0 32 32" fill="currentColor" aria-hidden>
                      <path d="M16 .7C7.56.7.7 7.56.7 16S7.56 31.3 16 31.3 31.3 24.44 31.3 16 24.44.7 16 .7zm0 28c-4.02 0-7.6-1.88-9.93-4.81a12.43 12.43 0 0 1 6.45-4.4A6.5 6.5 0 0 1 9.5 14a6.5 6.5 0 0 1 13 0 6.51 6.51 0 0 1-3.02 5.5 12.42 12.42 0 0 1 6.45 4.4A12.67 12.67 0 0 1 16 28.7z" />
                    </svg>
                  )}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-[0_2px_16px_rgba(0,0,0,0.12)] border border-[#EDF2F2] py-2 animate-fade-in z-50">
                    {user ? (
                      <>
                        <div className="px-4 py-2.5">
                          <p className="text-xs text-ink-muted">Signed in as</p>
                          <p className="text-sm font-semibold text-ink truncate">{user.email}</p>
                        </div>
                        <div className="my-1 border-t border-[#EDF2F2]" />
                        <Link href={dashboardHref} className={`${menuItem} font-semibold`}>Dashboard</Link>
                        {user.role !== 'guide' && user.role !== 'admin' && (
                          <>
                            <Link href="/dashboard/traveler?tab=bookings" className={`${menuItem} font-semibold`}>Trips</Link>
                            <Link href="/dashboard/traveler?tab=wishlist" className={`${menuItem} font-semibold`}>Wishlists</Link>
                          </>
                        )}
                        <Link href="/trip-planner" className={menuItem}>Trip planner</Link>
                        <Link href="/settings/notifications" className={menuItem}>Notifications & settings</Link>
                        <div className="my-1 border-t border-[#EDF2F2]" />
                        <button onClick={() => { logout(); setUserMenuOpen(false); router.push('/'); }} className={menuItem}>
                          Log out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href="/register" className={`${menuItem} font-semibold`}>Sign up</Link>
                        <Link href="/login" className={menuItem}>Log in</Link>
                        <div className="my-1 border-t border-[#EDF2F2]" />
                        <Link href="/trip-planner" className={menuItem}>AI trip planner</Link>
                        <Link href="/register" className={menuItem}>Become a guide</Link>
                        <Link href="/experiences" className={menuItem}>Browse experiences</Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {showBigSearch && (
            <div className="pb-6 pt-1 animate-fade-in">
              <BigSearch onSubmit={go} />
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile header ─────────────────────────────────────────────── */}
      {isAuth ? (
        <header className="md:hidden sticky top-0 z-40 bg-white px-4 h-14 flex items-center border-b border-[#EDF2F2]">
          <Link href="/" className="flex items-center gap-1.5" aria-label="Nsoroma home">
            <BrandLogo variant="mark" decorative className="h-8 w-8 object-contain" />
            <span className="text-lg font-extrabold tracking-[-0.035em] text-ink">Nsoroma</span>
          </Link>
        </header>
      ) : (
        <header className="md:hidden sticky top-0 z-40 bg-white px-4 pt-3 pb-3 border-b border-[#EDF2F2]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSheetOpen(true)}
              className="flex-1 flex items-center justify-center gap-3 rounded-full border border-[#DCE4E5] shadow-[0_3px_10px_rgba(0,0,0,0.1)] px-4 py-3"
            >
              <SearchIcon className="w-[18px] h-[18px] text-ink" />
              <span className="text-sm font-semibold text-ink">Start your search</span>
            </button>
            {user && <NotificationCenter />}
          </div>
        </header>
      )}

      {/* ── Mobile search sheet ───────────────────────────────────────── */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-[#F4F7F7] flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-4 pt-4">
            <button onClick={() => setSheetOpen(false)} aria-label="Close search" className="w-9 h-9 rounded-full border border-[#DCE4E5] bg-white flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <span className="text-[15px] font-semibold">Experiences</span>
            <span className="w-9" />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); go(sheetQ, sheetCat); }} className="flex-1 flex flex-col px-3 pt-5 gap-3 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] p-5 animate-scale-in">
              <h2 className="text-[26px] font-bold">Where to?</h2>
              <label className="mt-4 flex items-center gap-3 rounded-xl border border-[#A9B8BA] px-4 py-3.5 focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
                <SearchIcon className="w-4 h-4 text-ink" />
                <input
                  autoFocus
                  value={sheetQ}
                  onChange={(e) => setSheetQ(e.target.value)}
                  placeholder="Search experiences"
                  className="flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-ink-muted"
                />
              </label>
              <p className="mt-5 text-sm font-semibold">Type of experience</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SEARCH_CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setSheetCat((cur) => (cur === c ? '' : c))}
                    className={`pill-tab ${sheetCat === c ? 'pill-tab-active' : ''}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <Link href="/trip-planner" className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] px-5 py-4 flex items-center justify-between">
              <span className="text-sm text-ink-muted">Not sure where to start?</span>
              <span className="text-sm font-semibold">Ask the AI planner ✨</span>
            </Link>
            <div className="mt-auto sticky bottom-0 -mx-3 bg-white border-t border-[#EDF2F2] px-6 py-4 flex items-center justify-between">
              <button type="button" onClick={() => { setSheetQ(''); setSheetCat(''); }} className="text-[15px] font-semibold underline">Clear all</button>
              <button type="submit" className="btn-accent px-6">
                <SearchIcon /> Search
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Mobile bottom tab bar ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bottom-nav-glass pb-[max(0.5rem,env(safe-area-inset-bottom))]" aria-label="Primary">
        <div className="grid grid-cols-5 pt-2">
          {tabs.map((t) => (
            <Link key={t.label} href={t.href} className="flex flex-col items-center gap-1 py-1" aria-current={t.active ? 'page' : undefined}>
              <svg className={`w-6 h-6 ${t.active ? 'text-sun' : 'text-[#5E7377]'}`} fill="none" stroke="currentColor" strokeWidth={t.active ? 2.2 : 1.7} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              <span className={`text-[10px] ${t.active ? 'text-ink font-semibold' : 'text-[#5E7377] font-medium'}`}>{t.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
