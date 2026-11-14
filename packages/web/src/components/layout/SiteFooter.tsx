'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

const COLUMNS: { heading: string; links: [string, string][] }[] = [
  {
    heading: 'Explore',
    links: [
      ['All experiences', '/experiences'],
      ['Food & Drink', '/experiences?categories=Food%20%26%20Drink'],
      ['Culture & heritage', '/experiences?categories=Culture'],
      ['Eco-stays & nature', '/experiences?categories=Nature'],
    ],
  },
  {
    heading: 'Plan',
    links: [
      ['AI trip planner', '/trip-planner'],
      ['Trips & bookings', '/dashboard/traveler?tab=bookings'],
      ['Wishlists', '/dashboard/traveler?tab=wishlist'],
      ['Notification settings', '/settings/notifications'],
    ],
  },
  {
    heading: 'Hosting',
    links: [
      ['Become a guide', '/register'],
      ['Guide dashboard', '/dashboard/guide'],
      ['Log in', '/login'],
    ],
  },
];

export default function SiteFooter() {
  const pathname = usePathname() || '/';
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) return null;
  return (
    <footer className="bg-canvas border-t border-hairline mt-20">
      <div className="max-w-page mx-auto px-6 lg:px-10 xl:px-16 pt-16 pb-28 md:pb-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 pb-12 border-b border-stone-300/60">
          <div>
            <Link href="/" className="inline-flex items-center gap-2" aria-label="Nsoroma home">
              <BrandLogo variant="mark" decorative className="h-8 w-8 object-contain" />
              <span className="font-display text-[28px] leading-none tracking-[-0.02em]">Nsoroma</span>
            </Link>
            <p className="mt-5 font-display text-[22px] leading-snug text-stone-600 max-w-xs">Explore. Experience. Belong.</p>
            <p className="mt-3 text-sm text-ink-muted max-w-xs leading-relaxed">
              Local experiences across Accra and the Gold Coast, hosted by people who live there.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="eyebrow">{col.heading}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-[15px] text-ink hover:underline underline-offset-4">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 flex flex-col-reverse md:flex-row md:items-center justify-between gap-3 text-sm text-stone-600">
          <p>© 2026 Nsoroma, Inc. · Made in Accra · <a href="/photos/CREDITS.md" className="hover:underline underline-offset-4">Photo credits</a></p>
          <p className="flex items-center gap-5 font-semibold text-ink">
            <span className="inline-flex items-center gap-1.5"><Globe className="w-4 h-4" />English (GH)</span>
            <span>$ USD</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
