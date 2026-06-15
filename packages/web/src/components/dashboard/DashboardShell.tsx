'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconBell, IconHome, IconLogout, IconCompass, IconMenu, type Icon } from './icons';
import { accentMap, type Accent } from './primitives';

export interface TabItem {
  key: string;
  label: string;
  icon: Icon;
}

export interface StatItem {
  label: string;
  value: string | number;
  icon: Icon;
  tone: 'rose' | 'emerald' | 'sky' | 'violet' | 'amber' | 'teal';
}

const STAT_TONES: Record<StatItem['tone'], { text: string; chip: string }> = {
  rose: { text: 'text-[#FF385C]', chip: 'bg-rose-50' },
  emerald: { text: 'text-emerald-600', chip: 'bg-emerald-50' },
  sky: { text: 'text-sky-600', chip: 'bg-sky-50' },
  violet: { text: 'text-violet-600', chip: 'bg-violet-50' },
  amber: { text: 'text-amber-600', chip: 'bg-amber-50' },
  teal: { text: 'text-teal-600', chip: 'bg-teal-50' },
};

interface ShellProps {
  accent: Accent;
  roleLabel: string;
  firstName: string;
  avatarInitial: string;
  photoUrl?: string;
  subline?: React.ReactNode;
  tabs: TabItem[];
  activeTab: string;
  onTab: (key: string) => void;
  stats: StatItem[];
  onSignOut: () => void;
  children: React.ReactNode;
}

export default function DashboardShell({
  accent,
  roleLabel,
  firstName,
  avatarInitial,
  photoUrl,
  subline,
  tabs,
  activeTab,
  onTab,
  stats,
  onSignOut,
  children,
}: ShellProps) {
  const a = accentMap[accent];
  const [mobileNav, setMobileNav] = useState(false);

  const navButton = (t: TabItem, mobile = false) => {
    const active = activeTab === t.key;
    const Ico = t.icon;
    return (
      <button
        key={t.key}
        onClick={() => {
          onTab(t.key);
          setMobileNav(false);
        }}
        className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
          active
            ? `bg-gradient-to-r ${a.grad} text-white ${a.glow}`
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        } ${mobile ? 'w-full' : ''}`}
      >
        <Ico className={`h-[18px] w-[18px] ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'}`} />
        <span>{t.label}</span>
      </button>
    );
  };

  const avatar = (
    <div
      className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${a.grad} text-base font-bold text-white ${a.glow}`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={firstName} className="h-full w-full object-cover" />
      ) : (
        avatarInitial
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 text-gray-900">
      {/* Soft brand-tinted background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -left-32 -top-40 h-[36rem] w-[36rem] rounded-full bg-gradient-to-br ${a.grad} opacity-[0.07] blur-[120px] animate-float-slow`}
        />
        <div className="absolute -right-40 top-20 h-[34rem] w-[34rem] rounded-full bg-gradient-to-br from-sky-300 to-violet-300 opacity-[0.08] blur-[120px] animate-float-slower" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-amber-200 to-rose-200 opacity-[0.08] blur-[120px] animate-float-slow" />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.04) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1440px] gap-6 px-4 py-5 lg:px-8 lg:py-7">
        {/* Sidebar — desktop */}
        <aside className="sticky top-7 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 flex-col rounded-3xl border border-gray-200 bg-white p-4 shadow-sm lg:flex">
          <Link href="/" className="mb-6 flex items-center gap-2 px-2 pt-1">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${a.grad} ${a.glow}`}>
              <IconCompass className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight text-gray-900">tourlocal</span>
          </Link>

          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Menu</p>
          <nav className="flex flex-1 flex-col gap-1">{tabs.map((t) => navButton(t))}</nav>

          <div className="mt-3 flex flex-col gap-1 border-t border-gray-200 pt-3">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900"
            >
              <IconHome className="h-[18px] w-[18px] text-gray-400" />
              Home
            </Link>
            <Link
              href="/notifications"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900"
            >
              <IconBell className="h-[18px] w-[18px] text-gray-400" />
              Notifications
            </Link>
            <button
              onClick={onSignOut}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-rose-50 hover:text-[#FF385C]"
            >
              <IconLogout className="h-[18px] w-[18px]" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          {/* Topbar */}
          <header className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <button
                onClick={() => setMobileNav((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm lg:hidden"
                aria-label="Toggle menu"
              >
                <IconMenu className="h-5 w-5" />
              </button>
              {avatar}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{roleLabel}</p>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                  Hey, {firstName} <span className="inline-block">👋</span>
                </h1>
                {subline}
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/notifications"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-100 hover:text-gray-900"
                title="Notifications"
              >
                <IconBell className="h-5 w-5" />
              </Link>
              <button
                onClick={onSignOut}
                className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-100 hover:text-gray-900 lg:flex"
              >
                <IconLogout className="h-[18px] w-[18px]" />
                Sign out
              </button>
            </div>
          </header>

          {/* Mobile nav drawer */}
          {mobileNav && (
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm lg:hidden animate-fade-up">
              {tabs.map((t) => navButton(t, true))}
            </div>
          )}

          {/* Mobile tab pills */}
          <div className="dash-scroll -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              const Ico = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => onTab(t.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                    active
                      ? `bg-gradient-to-r ${a.grad} text-white ${a.glow}`
                      : 'border border-gray-200 bg-white text-gray-600 shadow-sm'
                  }`}
                >
                  <Ico className="h-[16px] w-[16px]" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* KPI stats */}
          <div className="mb-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {stats.map((s, i) => {
              const tone = STAT_TONES[s.tone];
              const Ico = s.icon;
              return (
                <div
                  key={s.label}
                  className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300 animate-fade-up`}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tone.chip} ${tone.text}`}>
                    <Ico className="h-[18px] w-[18px]" />
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-gray-900">{s.value}</div>
                  <div className="mt-0.5 text-xs font-medium text-gray-500">{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Content — opacity-only entrance (no transform) so nested
              position:fixed modals are not trapped in a containing block */}
          <div className="animate-content-in" style={{ animationDelay: '120ms' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
