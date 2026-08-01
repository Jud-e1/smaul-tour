'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import NotificationCenter from '@/components/ui/NotificationCenter';

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

  if (pathname?.startsWith('/dashboard')) return null;

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-black/5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20 gap-4">

          {/* Logo */}
          <Link href="/" className="shrink-0 text-2xl font-extrabold tracking-tight text-accra-green">
            AccraAI
          </Link>

          {/* Center nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href.split('?')[0];
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active ? 'text-accra-green' : 'text-gray-600 hover:text-accra-green hover:bg-black/5'
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute left-4 right-4 -bottom-0.5 h-0.5 rounded-full bg-accra-gold" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 border border-gray-200 bg-white rounded-full pl-4 pr-1 py-1">
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => !search && setSearchOpen(false)}
                  placeholder="Search experiences..."
                  className="w-44 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                />
                <button type="submit" className="w-8 h-8 bg-accra-green rounded-full flex items-center justify-center hover:bg-accra-dark transition-colors">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search experiences"
                className="hidden md:flex w-10 h-10 items-center justify-center rounded-full text-gray-600 hover:text-accra-green hover:bg-black/5 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            <Link
              href="/trip-planner"
              className="hidden sm:block text-sm font-semibold text-white bg-accra-green hover:bg-accra-dark px-5 py-2.5 rounded-full transition-colors"
            >
              Plan Trip
            </Link>

            {user ? (
              <>
                <NotificationCenter />
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-accra-green text-white text-sm font-semibold hover:bg-accra-dark transition-colors"
                  >
                    {user.email?.[0]?.toUpperCase() ?? 'U'}
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 animate-fade-in">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                      </div>
                      <Link
                        href={dashboardHref}
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/settings/notifications"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Settings
                      </Link>
                      <div className="border-t border-gray-100 mt-1">
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); }}
                          className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  href="/login"
                  className="text-sm font-medium text-accra-green hover:bg-black/5 px-3 py-2 rounded-full transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-accra-green bg-accra-gold hover:brightness-105 px-4 py-2 rounded-full transition-all"
                >
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-accra-green"
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
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 animate-fade-in">
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search experiences..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm outline-none"
            />
            <button type="submit" className="bg-accra-green text-white px-4 py-2 rounded-full text-sm font-medium">
              Go
            </button>
          </form>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm font-medium text-gray-700"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href={dashboardHref} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700">Dashboard</Link>
              <button onClick={() => { logout(); setMenuOpen(false); }} className="block w-full text-left py-2 text-sm font-medium text-gray-500">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700">Sign in</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-semibold text-accra-green">Sign up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
