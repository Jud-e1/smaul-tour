'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import NotificationCenter from '@/components/ui/NotificationCenter';
import BrandLogo from '@/components/brand/BrandLogo';

const NAV_LINKS = [
  { label: 'Explore', href: '/experiences' },
  { label: 'Itinerary', href: '/trip-planner' },
  { label: 'Local Guides', href: '/experiences?q=guide' },
  { label: 'Eco-Stays', href: '/experiences?categories=Nature' },
];

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);

  const dashboardHref =
    user?.role === 'guide' ? '/dashboard/guide' :
    user?.role === 'admin' ? '/admin' :
    '/dashboard/traveler';

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(search.trim() ? `/experiences?q=${encodeURIComponent(search.trim())}` : '/experiences');
    setSearch('');
    setSearchOpen(false);
    setMenuOpen(false);
  };

  const isDashboard = pathname?.startsWith('/dashboard');

  return (
    <>
      {!isDashboard && (
        <nav className="bg-white/90 backdrop-blur-xl border-b border-black/[0.06] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-[72px] gap-2 sm:gap-4">

          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center gap-2 min-w-0" aria-label="Nsoroma home">
            <BrandLogo variant="mark" decorative className="h-9 w-9 sm:h-10 sm:w-10 object-contain shrink-0" />
            <span className="font-display text-xl sm:text-[26px] font-extrabold tracking-[-0.04em] text-ink truncate">Nsoroma</span>
          </Link>

          {/* Center nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = !link.href.includes('?') && pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    active ? 'text-ink' : 'text-ink-muted hover:text-ink hover:bg-black/[0.04]'
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 h-1 w-1 rounded-full bg-sun" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 search-pill pl-4 pr-1 py-1">
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => !search && setSearchOpen(false)}
                  placeholder="Search experiences..."
                  className="w-52 text-sm text-ink placeholder:text-ink-soft outline-none bg-transparent"
                />
                <button type="submit" className="w-8 h-8 bg-sun rounded-full flex items-center justify-center hover:bg-sun-600 transition-colors" aria-label="Search">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search experiences"
                className="hidden md:flex w-10 h-10 items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-black/[0.04] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            <Link
              href="/trip-planner"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-forest-700 hover:bg-forest-800 px-5 py-2.5 rounded-full transition-colors"
            >
              Plan Trip
            </Link>

            {user ? (
              <>
                <NotificationCenter />
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-forest-100 text-forest-800 text-sm font-bold ring-2 ring-white hover:ring-forest-200 transition"
                  >
                    {user.email?.[0]?.toUpperCase() ?? 'U'}
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-float border border-black/5 p-1.5 animate-fade-in">
                      <div className="px-3 py-2.5 mb-1 border-b border-black/5">
                        <p className="text-xs text-ink-muted">Signed in as</p>
                        <p className="text-sm font-semibold text-ink truncate">{user.email}</p>
                      </div>
                      <Link
                        href={dashboardHref}
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-3 py-2.5 text-sm font-medium text-ink rounded-xl hover:bg-canvas"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/settings/notifications"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-3 py-2.5 text-sm font-medium text-ink rounded-xl hover:bg-canvas"
                      >
                        Settings
                      </Link>
                      <div className="border-t border-black/5 mt-1 pt-1">
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); }}
                          className="block w-full text-left px-3 py-2.5 text-sm font-medium text-ink-muted rounded-xl hover:bg-canvas"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-1">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-ink hover:bg-black/[0.04] px-4 py-2.5 rounded-full transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-ink bg-white border border-black/10 hover:border-black/30 px-4 py-2.5 rounded-full transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full border border-black/10 text-ink hover:bg-black/[0.04]"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-black/5 bg-white px-4 py-4 space-y-1 animate-fade-in">
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search experiences..."
              className="flex-1 search-pill px-4 py-2.5 text-sm outline-none"
            />
            <button type="submit" className="bg-sun text-white px-5 py-2.5 rounded-full text-sm font-semibold">
              Go
            </button>
          </form>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block px-2 py-2.5 text-[15px] font-semibold text-ink rounded-xl hover:bg-canvas"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href={dashboardHref} onClick={() => setMenuOpen(false)} className="block px-2 py-2.5 text-[15px] font-semibold text-ink rounded-xl hover:bg-canvas">Dashboard</Link>
              <button onClick={() => { logout(); setMenuOpen(false); }} className="block w-full text-left py-2 text-sm font-medium text-ink-muted">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-2 py-2.5 text-[15px] font-semibold text-ink rounded-xl hover:bg-canvas">Sign in</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-semibold text-accra-green">Sign up</Link>
            </>
          )}
        </div>
      )}
    </nav>
    )}

    {/* Modern Bottom Navigation (Mobile) */}
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bottom-nav-glass px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-end justify-between rounded-t-3xl">
      <Link href={dashboardHref} className="flex flex-col items-center gap-1 group">
        <svg className={`w-6 h-6 ${pathname === dashboardHref ? 'text-forest-700' : 'text-ink-soft group-hover:text-ink'}`} fill={pathname === dashboardHref ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className={`text-[10px] font-semibold ${pathname === dashboardHref ? 'text-forest-700' : 'text-ink-soft group-hover:text-ink'}`}>Home</span>
      </Link>
      
      <Link href="/experiences" className="flex flex-col items-center gap-1 group">
        <svg className={`w-6 h-6 ${pathname === '/experiences' ? 'text-forest-700' : 'text-ink-soft group-hover:text-ink'}`} fill={pathname === '/experiences' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className={`text-[10px] font-semibold ${pathname === '/experiences' ? 'text-forest-700' : 'text-ink-soft group-hover:text-ink'}`}>Explore</span>
      </Link>

      <div className="relative -top-6">
        <Link href="/trip-planner" className="w-14 h-14 rounded-full fab-button flex items-center justify-center text-white hover:scale-105 transition-transform ring-4 ring-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </div>

      <button onClick={() => { if (!user) router.push('/login'); else router.push(`${dashboardHref}?tab=wishlist`); }} className="flex flex-col items-center gap-1 group">
        <svg className="w-6 h-6 text-ink-soft group-hover:text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span className="text-[10px] font-semibold text-ink-soft group-hover:text-ink">Wishlist</span>
      </button>

      <Link href="/settings/notifications" className="flex flex-col items-center gap-1 group">
        <svg className={`w-6 h-6 ${pathname?.startsWith('/settings') ? 'text-forest-700' : 'text-ink-soft group-hover:text-ink'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className={`text-[10px] font-semibold ${pathname?.startsWith('/settings') ? 'text-forest-700' : 'text-ink-soft group-hover:text-ink'}`}>Settings</span>
      </Link>
    </div>
  </>
  );
}
