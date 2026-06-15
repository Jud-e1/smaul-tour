import type { Icon } from './icons';

export type Accent = 'rose' | 'emerald';

export const accentMap: Record<
  Accent,
  { grad: string; gradHover: string; glow: string; ring: string; text: string; soft: string; softText: string }
> = {
  rose: {
    grad: 'from-rose-500 to-pink-600',
    gradHover: 'hover:from-rose-400 hover:to-pink-500',
    glow: 'shadow-[0_8px_30px_-8px_rgba(244,63,94,0.6)]',
    ring: 'focus:ring-rose-400/50',
    text: 'text-rose-300',
    soft: 'bg-rose-500/10 border-rose-400/20',
    softText: 'text-rose-200',
  },
  emerald: {
    grad: 'from-emerald-500 to-teal-600',
    gradHover: 'hover:from-emerald-400 hover:to-teal-500',
    glow: 'shadow-[0_8px_30px_-8px_rgba(16,185,129,0.55)]',
    ring: 'focus:ring-emerald-400/50',
    text: 'text-emerald-300',
    soft: 'bg-emerald-500/10 border-emerald-400/20',
    softText: 'text-emerald-200',
  },
};

// Shared surface tokens — keep the whole dashboard visually consistent.
export const card = 'rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl';
export const cardHover =
  'transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]';
export const label = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40';
export const input =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-transparent focus:ring-2';

export function inputCls(accent: Accent) {
  return `${input} ${accentMap[accent].ring}`;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-2xl ${className}`} />;
}

export function SectionHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
      {children}
    </div>
  );
}

export function EmptyState({
  icon: IconCmp,
  title,
  action,
}: {
  icon: Icon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`${card} flex flex-col items-center justify-center px-6 py-16 text-center`}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/50">
        <IconCmp className="h-7 w-7" />
      </div>
      <p className="font-medium text-white/70">{title}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusBadge({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      {children}
    </span>
  );
}

// Dark-mode status tones used across both dashboards.
export const STATUS_TONES: Record<string, string> = {
  active: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  confirmed: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  released: 'border-sky-400/20 bg-sky-500/10 text-sky-300',
  completed: 'border-sky-400/20 bg-sky-500/10 text-sky-300',
  inactive: 'border-white/10 bg-white/5 text-white/50',
  pending: 'border-amber-400/20 bg-amber-500/10 text-amber-300',
  pending_approval: 'border-amber-400/20 bg-amber-500/10 text-amber-300',
  escrowed: 'border-violet-400/20 bg-violet-500/10 text-violet-300',
  captured: 'border-violet-400/20 bg-violet-500/10 text-violet-300',
  cancelled: 'border-rose-400/20 bg-rose-500/10 text-rose-300',
  refunded: 'border-rose-400/20 bg-rose-500/10 text-rose-300',
};

export function toneFor(status: string) {
  return STATUS_TONES[status] || 'border-white/10 bg-white/5 text-white/60';
}
