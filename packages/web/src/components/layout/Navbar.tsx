'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu, UserRound, Compass, Heart, Sparkles, Luggage, X, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import NotificationCenter from '@/components/ui/NotificationCenter';
import BrandLogo from '@/components/brand/BrandLogo';

const NAV_LINKS = [
  { label: 'Experiences', href: '/experiences' },
  { label: 'Trip planner', href: '/trip-planner' },
  { label: 'Local guides', href: '/experiences?q=guide' },
  { label: 'Eco-stays', href: '/experiences?categories=Nature' },
];

const SEARCH_CATEGORIES = ['Food & Drink', 'Culture', 'Adventure', 'Nature', 'Art', 'Wellness', 'Beaches'];

/** Segmented search: Where · Category · (search). Used on /experiences. */
function BigSearch({ onSubmit }: { onSubmit: (q: string, cat: string) => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [focus, setFocus] = useState<'q' | 'cat' | null>(null);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(q, cat); }}
      role="search"
      className={`relative mx-auto flex items-center w-full max-w-[820px] h-16 rounded-full border border-hairline shadow-soft transition-colors ${focus ? 'bg-sand' : 'bg-paper'}`}
    >
      <label className={`flex-[1.4] h-full flex flex-col justify-center pl-8 pr-4 rounded-full cursor-text transition-colors ${focus === 'q' ? 'bg-paper shadow-md' : 'hover:bg-sand'}`}>
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
      <span className={`w-px h-8 bg-hairline ${focus ? 'opacity-0' : ''}`} aria-hidden />
      <label className={`flex-1 h-full flex flex-col justify-center pl-6 pr-24 rounded-full cursor-pointer transition-colors ${focus === 'cat' ? 'bg-paper shadow-md' : 'hover:bg-sand'}`}>
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
      <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-12 min-w-[48px] px-4 rounded-full bg-ink text-paper hover:bg-black flex items-center justify-center gap-2 text-[15px] font-semibold transition-colors" aria-label="Search">
        <Search className="w-4 h-4" strokeWidth={2.5} />
        {focus && <span>Search</span>}
      </button>
    </form>
  );
}

function Wordmark({ size = 'text-[26px]' }: { size?: string }) {
  return (
    <>
      <BrandLogo variant="mark" decorative className="h-8 w-8 object-contain" />
      <span className={`font-display ${size} leading-none tracking-[-0.02em] text-ink`}>Nsoroma</span>
    </>
  );
}

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
  // Signed-in app areas bring their own chrome (DashboardShell); keep only the mobile tab bar.
  const isApp = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

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
  const menuItem = 'flex w-full items-center gap-3 text-left px-4 py-2.5 text-sm text-ink rounded-xl hover:bg-sand transition-colors';

  const tabs = [
    { label: 'Explore', href: '/experiences', Icon: Compass, active: pathname === '/' || pathname.startsWith('/experiences') },
    { label: 'Wishlists', href: user ? `${dashboardHref}?tab=wishlist` : '/login', Icon: Heart, active: false },
    { label: 'Plan', href: '/trip-planner', Icon: Sparkles, active: pathname.startsWith('/trip-planner') || pathname.startsWith('/itineraries') },
    { label: 'Trips', href: user ? dashboardHref : '/login', Icon: Luggage, active: pathname.startsWith('/dashboard') || pathname.startsWith('/admin') },
    { label: user ? 'Profile' : 'Log in', href: user ? '/settings/notifications' : '/login', Icon: UserRound, active: pathname.startsWith('/settings') || pathname === '/login' },
  ];

  return (
    <>
      {/* ── Desktop / tablet header ───────────────────────────────────── */}
      {!isApp && (<>
      <header className={`hidden md:block sticky top-0 z-40 bg-canvas/90 backdrop-blur-xl border-b transition-colors ${scrolled ? 'border-hairline' : 'border-transparent'}`}>
        <div className="max-w-page mx-auto px-6 lg:px-10 xl:px-16">
          <div className="h-20 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Nsoroma home">
              <Wordmark />
            </Link>

            {showTabs ? (
              <nav className="flex items-center gap-1 lg:gap-2" aria-label="Main">
                {NAV_LINKS.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className={`px-4 py-2 rounded-full text-[15px] transition-colors ${active ? 'bg-ink text-paper' : 'text-stone-600 hover:text-ink hover:bg-sand'}`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            ) : !isAuth ? (
              <form
                onSubmit={(e) => { e.preventDefault(); go(compactQ, ''); }}
                className="flex items-center h-12 rounded-full border border-hairline bg-paper shadow-sm hover:shadow-md transition-shadow pl-5 pr-1.5 gap-3 w-full max-w-md"
                role="search"
              >
                <Search className="w-4 h-4 text-stone-600" />
                <input
                  value={compactQ}
                  onChange={(e) => setCompactQ(e.target.value)}
                  placeholder="Search experiences in Accra"
                  className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
                />
                <button type="submit" aria-label="Search" className="w-9 h-9 rounded-full bg-ink text-paper hover:bg-black flex items-center justify-center">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : <span />}

            <div className="flex items-center gap-1 shrink-0">
              <Link
                href={user?.role === 'guide' ? '/dashboard/guide' : '/register'}
                className="hidden lg:block text-sm font-semibold text-ink px-4 py-2.5 rounded-full hover:bg-sand transition-colors"
              >
                {user?.role === 'guide' ? 'Switch to hosting' : 'Become a guide'}
              </Link>

              {user && <NotificationCenter />}

              <div ref={userMenuRef} className="relative ml-1">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  aria-label="Open account menu"
                  aria-expanded={userMenuOpen}
                  className="flex items-center gap-2.5 pl-3.5 pr-1.5 py-1.5 rounded-full border border-hairline bg-paper hover:shadow-md transition-shadow"
                >
                  <Menu className="w-4 h-4 text-ink" />
                  <span className="w-8 h-8 rounded-full bg-ink text-paper text-sm font-semibold flex items-center justify-center overflow-hidden">
                    {user ? (
                      user.profile?.profilePhotoUrl
                        ? <img src={user.profile.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                        : initial
                    ) : <UserRound className="w-4 h-4" />}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-paper rounded-2xl shadow-float border border-hairline p-2 animate-fade-in z-50">
                    {user ? (
                      <>
                        <div className="px-4 py-2.5">
                          <p className="text-xs text-ink-muted">Signed in as</p>
                          <p className="text-sm font-semibold text-ink truncate">{user.email}</p>
                        </div>
                        <div className="my-1 border-t border-hairline" />
                        <Link href={dashboardHref} className={`${menuItem} font-semibold`}>Dashboard</Link>
                        {user.role !== 'guide' && user.role !== 'admin' && (
                          <>
                            <Link href="/dashboard/traveler?tab=bookings" className={`${menuItem} font-semibold`}>Trips</Link>
                            <Link href="/dashboard/traveler?tab=wishlist" className={`${menuItem} font-semibold`}>Wishlists</Link>
                          </>
                        )}
                        <Link href="/trip-planner" className={menuItem}>Trip planner</Link>
                        <Link href="/settings/notifications" className={menuItem}>Notifications & settings</Link>
                        <div className="my-1 border-t border-hairline" />
                        <button onClick={() => { logout(); setUserMenuOpen(false); router.push('/'); }} className={menuItem}>Log out</button>
                      </>
                    ) : (
                      <>
                        <Link href="/register" className={`${menuItem} font-semibold`}>Sign up</Link>
                        <Link href="/login" className={menuItem}>Log in</Link>
                        <div className="my-1 border-t border-hairline" />
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
        <header className="md:hidden sticky top-0 z-40 bg-canvas/95 backdrop-blur px-4 h-14 flex items-center border-b border-hairline">
          <Link href="/" className="flex items-center gap-2" aria-label="Nsoroma home"><Wordmark size="text-[22px]" /></Link>
        </header>
      ) : (
        <header className="md:hidden sticky top-0 z-40 bg-canvas/95 backdrop-blur px-4 pt-3 pb-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSheetOpen(true)}
              className="flex-1 flex items-center justify-center gap-2.5 rounded-full border border-hairline bg-paper shadow-sm px-4 py-3"
            >
              <Search className="w-[18px] h-[18px] text-ink" strokeWidth={2.4} />
              <span className="text-sm font-semibold text-ink">Start your search</span>
            </button>
            {user && <NotificationCenter />}
          </div>
        </header>
      )}

      {/* ── Mobile search sheet ───────────────────────────────────────── */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-canvas flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-4 pt-4">
            <button onClick={() => setSheetOpen(false)} aria-label="Close search" className="w-9 h-9 rounded-full border border-hairline bg-paper flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
            <span className="text-[15px] font-semibold">Experiences</span>
            <span className="w-9" />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); go(sheetQ, sheetCat); }} className="flex-1 flex flex-col px-3 pt-5 gap-3 overflow-y-auto">
            <div className="bg-paper rounded-[28px] shadow-card p-5 animate-scale-in">
              <h2 className="text-[32px] leading-tight">Where to?</h2>
              <label className="mt-4 flex items-center gap-3 rounded-2xl border border-stone-300 px-4 py-3.5 focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
                <Search className="w-4 h-4 text-ink" />
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
                  <button type="button" key={c} onClick={() => setSheetCat((cur) => (cur === c ? '' : c))} className={`pill-tab ${sheetCat === c ? 'pill-tab-active' : ''}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <Link href="/trip-planner" className="bg-paper rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between">
              <span className="text-sm text-ink-muted">Not sure where to start?</span>
              <span className="text-sm font-semibold inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" />Ask the AI planner</span>
            </Link>
            <div className="mt-auto sticky bottom-0 -mx-3 bg-paper border-t border-hairline px-6 py-4 flex items-center justify-between">
              <button type="button" onClick={() => { setSheetQ(''); setSheetCat(''); }} className="text-[15px] font-semibold underline underline-offset-4">Clear all</button>
              <button type="submit" className="btn-primary px-6"><Search className="w-4 h-4" /> Search</button>
            </div>
          </form>
        </div>
      )}

      </>)}

      {/* ── Mobile bottom tab bar ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bottom-nav-glass pb-[max(0.5rem,env(safe-area-inset-bottom))]" aria-label="Primary">
        <div className="grid grid-cols-5 pt-2">
          {tabs.map(({ label, href, Icon, active }) => (
            <Link key={label} href={href} className="flex flex-col items-center gap-1 py-1" aria-current={active ? 'page' : undefined}>
              <Icon className={`w-6 h-6 ${active ? 'text-ink' : 'text-stone-400'}`} strokeWidth={active ? 2.2 : 1.6} />
              <span className={`text-[10px] ${active ? 'text-ink font-bold' : 'text-stone-500 font-medium'}`}>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
