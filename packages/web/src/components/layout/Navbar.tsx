'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import NotificationCenter from '@/components/ui/NotificationCenter';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);

  const dashboardHref =
    user?.role === 'guide'
      ? '/dashboard/guide'
      : user?.role === 'admin'
        ? '/admin'
        : '/dashboard/traveler';

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
    router.push(
      search.trim() ? `/experiences?q=${encodeURIComponent(search.trim())}` : '/experiences'
    );
    setSearch('');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <svg className="w-8 h-8 text-[#FF385C]" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 1C10.477 1 6 5.477 6 11c0 7.5 10 20 10 20s10-12.5 10-20c0-5.523-4.477-10-10-10zm0 13.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
            </svg>
            <span className="font-bold text-[#FF385C] text-xl tracking-tight hidden sm:inline">
              tourlocal
            </span>
          </Link>

          {/* Center search pill — desktop */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex items-center border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-shadow px-4 py-2 gap-3 flex-1 max-w-md"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search experiences..."
              className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
            />
            <button
              type="submit"
              className="w-8 h-8 bg-[#FF385C] rounded-full flex items-center justify-center shrink-0 hover:bg-[#E31C5F] transition-colors"
            >
              <svg
                className="w-3.5 h-3.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </form>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/trip-planner"
              className="hidden md:block text-sm font-medium text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-full transition-colors"
            >
              Trip Planner
            </Link>

            {user ? (
              <>
                <NotificationCenter />
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 border border-gray-300 rounded-full px-3 py-2 hover:shadow-md transition-shadow"
                  >
                    <svg
                      className="w-4 h-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                    <div className="w-7 h-7 bg-gray-800 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {user.email?.[0]?.toUpperCase() ?? 'U'}
                    </div>
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
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
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
                  className="text-sm font-medium text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-full transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-white bg-[#FF385C] hover:bg-[#E31C5F] px-4 py-2 rounded-full transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 animate-fade-in">
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search experiences..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              className="bg-[#FF385C] text-white px-4 py-2 rounded-full text-sm font-medium"
            >
              Go
            </button>
          </form>
          <Link
            href="/experiences"
            onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm font-medium text-gray-700"
          >
            Experiences
          </Link>
          <Link
            href="/trip-planner"
            onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm font-medium text-gray-700"
          >
            Trip Planner
          </Link>
          {user ? (
            <>
              <Link
                href={dashboardHref}
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm font-medium text-gray-700"
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="block w-full text-left py-2 text-sm font-medium text-gray-500"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm font-medium text-gray-700"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-[#FF385C]"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
