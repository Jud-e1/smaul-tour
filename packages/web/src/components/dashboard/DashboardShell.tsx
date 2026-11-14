'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { LogOut, type LucideIcon } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import NotificationCenter from '@/components/ui/NotificationCenter';

export interface ShellNavItem {
  key: string;
  label: string;
  Icon: LucideIcon;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}

interface DashboardShellProps {
  /** Primary sections (in-page tabs). */
  nav: ShellNavItem[];
  /** Secondary links (other parts of the app). */
  links?: ShellNavItem[];
  /** Small grey group label above the primary sections. */
  navLabel?: string;
  user: { name: string; email?: string; initial: string; photo?: string; role: string };
  onLogout: () => void;
  /** Large page title + optional subtitle and actions on the right. */
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Optional search field rendered in the top bar. */
  search?: ReactNode;
  children: ReactNode;
}

function NavRow({ item }: { item: ShellNavItem }) {
  const cls = `group flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] transition-colors ${
    item.active ? 'bg-white text-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-hairline' : 'text-stone-600 hover:bg-black/[0.04] hover:text-ink'
  }`;
  const inner = (
    <>
      <item.Icon className={`w-[18px] h-[18px] shrink-0 ${item.active ? 'text-espresso' : 'text-stone-500 group-hover:text-ink'}`} strokeWidth={1.8} />
      <span className="flex-1 text-left truncate">{item.label}</span>
      {item.count ? (
        <span className={`min-w-[22px] h-[20px] px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center ${item.active ? 'bg-espresso text-white' : 'bg-black/[0.06] text-stone-600'}`}>
          {item.count > 99 ? '99+' : item.count}
        </span>
      ) : null}
    </>
  );
  return item.href ? (
    <Link href={item.href} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={item.onClick} className={cls} aria-current={item.active ? 'page' : undefined}>{inner}</button>
  );
}

/**
 * App chrome for signed-in areas, following Apple's app conventions: a quiet
 * translucent sidebar, a sticky top bar, a large page title and white utility
 * cards on the #F5F5F7 canvas.
 */
export default function DashboardShell({ nav, links = [], navLabel = 'Menu', user, onLogout, title, subtitle, actions, search, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[252px] flex-col border-r border-hairline bg-[#FBFBFD]/90 backdrop-blur-xl px-3 py-4">
        <Link href="/" className="flex items-center gap-2 px-3 h-10" aria-label="Nsoroma home">
          <BrandLogo variant="mark" decorative className="h-7 w-7 object-contain" />
          <span className="text-[17px] font-bold tracking-[-0.03em] text-ink">Nsoroma</span>
        </Link>

        <p className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">{navLabel}</p>
        <nav className="mt-2 space-y-0.5" aria-label={navLabel}>
          {nav.map((item) => <NavRow key={item.key} item={item} />)}
        </nav>

        {links.length > 0 && (
          <>
            <p className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">Nsoroma</p>
            <nav className="mt-2 space-y-0.5" aria-label="App">
              {links.map((item) => <NavRow key={item.key} item={item} />)}
            </nav>
          </>
        )}

        <div className="mt-auto rounded-[14px] bg-white ring-1 ring-hairline p-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-ink text-white text-sm font-semibold flex items-center justify-center overflow-hidden shrink-0">
            {user.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : user.initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink truncate">{user.name}</p>
            <p className="text-[11px] text-stone-500 truncate capitalize">{user.role}</p>
          </div>
          <button type="button" onClick={onLogout} className="w-8 h-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center text-stone-500 hover:text-ink" aria-label="Log out" title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <div className="lg:pl-[252px] min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-canvas/80 backdrop-blur-xl border-b border-hairline">
          <div className="h-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3">
            <Link href="/" className="lg:hidden flex items-center gap-2 shrink-0" aria-label="Nsoroma home">
              <BrandLogo variant="mark" decorative className="h-7 w-7 object-contain" />
            </Link>
            <div className="flex-1 min-w-0">{search}</div>
            <NotificationCenter />
            <span className="lg:hidden w-9 h-9 rounded-full bg-ink text-white text-sm font-semibold flex items-center justify-center overflow-hidden shrink-0">
              {user.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : user.initial}
            </span>
          </div>
        </header>

        {/* Sections (mobile / tablet) */}
        <div className="lg:hidden border-b border-hairline bg-canvas">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto scrollbar-hide py-2">
            {nav.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  item.active ? 'bg-ink text-white' : 'text-stone-600 hover:bg-black/[0.05]'
                }`}
              >
                <item.Icon className="w-3.5 h-3.5" />
                {item.label}
                {item.count ? <span className={`text-[11px] ${item.active ? 'text-white/70' : 'text-stone-400'}`}>{item.count}</span> : null}
              </button>
            ))}
          </div>
        </div>

        <main className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 lg:pt-9 pb-28 lg:pb-14 min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
            <div className="min-w-0">
              <h1 className="text-[30px] sm:text-[34px] leading-[1.1] text-ink">{title}</h1>
              {subtitle && <p className="mt-1 text-[15px] text-stone-600">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

/** Apple-style white utility card with an optional header row. */
export function Card({ title, action, children, className = '', bodyClassName = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={`rounded-[18px] bg-white ring-1 ring-hairline min-w-0 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          {title && <h2 className="!font-semibold !tracking-[-0.02em] text-[17px] text-ink">{title}</h2>}
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Apple segmented control. */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex p-0.5 rounded-[9px] bg-black/[0.06]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-[7px] text-[13px] font-medium transition-all ${
            value === o.value ? 'bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'text-stone-600 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
