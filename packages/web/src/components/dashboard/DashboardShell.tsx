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

const STAT_TONES: Record<StatItem['tone'], { text: string; ring: string }> = {
  rose: { text: 'text-rose-300', ring: 'shadow-[inset_0_0_0_1px_rgba(244,63,94,0.18)]' },
  emerald: { text: 'text-emerald-300', ring: 'shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)]' },
  sky: { text: 'text-sky-300', ring: 'shadow-[inset_0_0_0_1px_rgba(56,189,248,0.18)]' },
  violet: { text: 'text-violet-300', ring: 'shadow-[inset_0_0_0_1px_rgba(167,139,250,0.18)]' },
  amber: { text: 'text-amber-300', ring: 'shadow-[inset_0_0_0_1px_rgba(251,191,36,0.18)]' },
  teal: { text: 'text-teal-300', ring: 'shadow-[inset_0_0_0_1px_rgba(45,212,191,0.18)]' },
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
            : 'text-white/55 hover:bg-white/5 hover:text-white'
        } ${mobile ? 'w-full' : ''}`}
      >
        <Ico className={`h-[18px] w-[18px] ${active ? 'text-white' : 'text-white/45 group-hover:text-white'}`} />
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
    <div className="relative min-h-screen overflow-hidden bg-[#0a0b12] text-white">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -left-32 -top-40 h-[36rem] w-[36rem] rounded-full bg-gradient-to-br ${a.grad} opacity-[0.18] blur-[120px] animate-float-slow`}
        />
        <div className="absolute -right-40 top-20 h-[34rem] w-[34rem] rounded-full bg-gradient-to-br from-violet-600 to-sky-500 opacity-[0.14] blur-[120px] animate-float-slower" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-500 opacity-[0.12] blur-[120px] animate-float-slow" />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.16) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1440px] gap-6 px-4 py-5 lg:px-8 lg:py-7">
        {/* Sidebar — desktop */}
        <aside className="sticky top-7 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl lg:flex">
          <Link href="/" className="mb-6 flex items-center gap-2 px-2 pt-1">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${a.grad} ${a.glow}`}>
              <IconCompass className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight">tourlocal</span>
          </Link>

          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">Menu</p>
          <nav className="flex flex-1 flex-col gap-1">{tabs.map((t) => navButton(t))}</nav>

          <div className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-3">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/55 transition-all hover:bg-white/5 hover:text-white"
            >
              <IconHome className="h-[18px] w-[18px] text-white/45" />
              Home
            </Link>
            <Link
              href="/notifications"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/55 transition-all hover:bg-white/5 hover:text-white"
            >
              <IconBell className="h-[18px] w-[18px] text-white/45" />
              Notifications
            </Link>
            <button
              onClick={onSignOut}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/55 transition-all hover:bg-rose-500/10 hover:text-rose-300"
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
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 lg:hidden"
                aria-label="Toggle menu"
              >
                <IconMenu className="h-5 w-5" />
              </button>
              {avatar}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{roleLabel}</p>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Hey, {firstName} <span className="inline-block">👋</span>
                </h1>
                {subline}
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/notifications"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
                title="Notifications"
              >
                <IconBell className="h-5 w-5" />
              </Link>
              <button
                onClick={onSignOut}
                className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white lg:flex"
              >
                <IconLogout className="h-[18px] w-[18px]" />
                Sign out
              </button>
            </div>
          </header>

          {/* Mobile nav drawer */}
          {mobileNav && (
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 backdrop-blur-xl lg:hidden animate-fade-up">
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
                      : 'border border-white/10 bg-white/5 text-white/60'
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
                  className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.07] ${tone.ring} animate-fade-up`}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ${tone.text}`}>
                    <Ico className="h-[18px] w-[18px]" />
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-white">{s.value}</div>
                  <div className="mt-0.5 text-xs font-medium text-white/45">{s.label}</div>
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
