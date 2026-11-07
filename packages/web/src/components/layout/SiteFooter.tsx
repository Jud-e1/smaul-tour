import Link from 'next/link';
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
  return (
    <footer className="bg-fog border-t border-[#DDDDDD] mt-16">
      <div className="max-w-page mx-auto px-6 lg:px-10 xl:px-20 pt-12 pb-28 md:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#DDDDDD]">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5" aria-label="Nsoroma home">
              <BrandLogo variant="mark" decorative className="h-8 w-8 object-contain" />
              <span className="text-xl font-extrabold tracking-[-0.045em] accent-text">nsoroma</span>
            </Link>
            <p className="mt-3 text-sm text-ink-muted max-w-xs leading-relaxed">
              Explore · Experience · Belong. Local experiences across Accra and the Gold Coast, hosted by people who live there.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-ink">{col.heading}</h3>
              <ul className="mt-3 space-y-3">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-ink hover:underline underline-offset-2">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 flex flex-col-reverse md:flex-row md:items-center justify-between gap-3 text-sm text-ink">
          <p>© 2026 Nsoroma, Inc. · Made in Accra · <a href="/photos/CREDITS.md" className="hover:underline underline-offset-2">Photo credits</a></p>
          <p className="flex items-center gap-5 font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
              </svg>
              English (GH)
            </span>
            <span>$ USD</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
