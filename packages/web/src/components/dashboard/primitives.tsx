import type { Icon } from './icons';

export type Accent = 'rose' | 'emerald';

export const accentMap: Record<
  Accent,
  { grad: string; gradHover: string; glow: string; ring: string; text: string; soft: string; softText: string }
> = {
  rose: {
    grad: 'from-[#FF385C] to-[#E31C5F]',
    gradHover: 'hover:from-[#E31C5F] hover:to-[#d11a55]',
    glow: 'shadow-[0_8px_24px_-10px_rgba(255,56,92,0.5)]',
    ring: 'focus:ring-rose-300',
    text: 'text-[#FF385C]',
    soft: 'bg-rose-50 border-rose-200',
    softText: 'text-rose-700',
  },
  emerald: {
    grad: 'from-emerald-500 to-teal-600',
    gradHover: 'hover:from-emerald-400 hover:to-teal-500',
    glow: 'shadow-[0_8px_24px_-10px_rgba(16,185,129,0.45)]',
    ring: 'focus:ring-emerald-300',
    text: 'text-emerald-600',
    soft: 'bg-emerald-50 border-emerald-200',
    softText: 'text-emerald-700',
  },
};

// Shared surface tokens — keep the whole dashboard visually consistent.
export const card = 'rounded-2xl border border-gray-200 bg-white shadow-sm';
export const cardHover =
  'transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md';
export const label = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500';
export const input =
  'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-transparent focus:ring-2';

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
      <h2 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
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
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-400">
        <IconCmp className="h-7 w-7" />
      </div>
      <p className="font-medium text-gray-500">{title}</p>
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

// Light-mode status tones used across both dashboards.
export const STATUS_TONES: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  released: 'border-sky-200 bg-sky-50 text-sky-700',
  completed: 'border-sky-200 bg-sky-50 text-sky-700',
  inactive: 'border-gray-200 bg-gray-100 text-gray-500',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  pending_approval: 'border-amber-200 bg-amber-50 text-amber-700',
  escrowed: 'border-violet-200 bg-violet-50 text-violet-700',
  captured: 'border-violet-200 bg-violet-50 text-violet-700',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
  refunded: 'border-rose-200 bg-rose-50 text-rose-700',
};

export function toneFor(status: string) {
  return STATUS_TONES[status] || 'border-gray-200 bg-gray-100 text-gray-600';
}
