'use client';

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { bookingsApi, tripPlannerApi, userApi, paymentsApi, reviewsApi, experiencesApi } from '@/lib/api';
import { useAuthStore, hasStoredSession } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
import { useNotifications } from '@/hooks/useNotifications';
import StarRating from '@/components/ui/StarRating';
import type { Experience } from '@/components/experiences/ExperienceCard';

type Tab = 'dashboard' | 'bookings' | 'itineraries' | 'wishlist' | 'profile';
type BookingStatus = 'upcoming' | 'past' | 'cancelled';
type DiscoverTab = 'recommended' | 'popular' | 'trending';

interface Booking {
  id: string;
  referenceNumber: string;
  status: string;
  date: string;
  startTime: string;
  totalAmount: number;
  totalCurrency: string;
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
  experience?: { title: string; id: string; images?: { url: string }[] };
  paymentId?: string;
}

interface Itinerary {
  id: string;
  generatedAt: string;
  totalCost: { amount: number; currency: string };
  experiences: { experienceId: string; experience?: { title: string } }[];
}

interface WishlistItem {
  id: string;
  title: string;
  price: { amount: number; currency: string };
  averageRating: number;
  images?: { url: string }[];
}

const CANCELLATION_POLICY_LABELS: Record<string, string> = {
  flexible: 'Flexible – full refund up to 24h before',
  moderate: 'Moderate – full refund up to 7 days before',
  strict: 'Strict – full refund up to 14 days before',
};

type CategoryIconName = 'culture' | 'adventure' | 'nature' | 'food' | 'more';
type StatIconName = 'bookings' | 'upcoming' | 'spent' | 'wishlist';

const CATEGORY_PILLS: { label: string; category: string; icon: CategoryIconName }[] = [
  { label: 'Culture', category: 'Culture', icon: 'culture' },
  { label: 'Adventure', category: 'Adventure', icon: 'adventure' },
  { label: 'Nature', category: 'Nature', icon: 'nature' },
  { label: 'Food', category: 'Food & Drink', icon: 'food' },
];

function formatDuration(hours?: number): string | null {
  if (!hours || hours <= 0) return null;
  if (hours >= 24) {
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${hours} hr${hours === 1 ? '' : 's'}`;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function discoverBadge(exp: Experience, tab: DiscoverTab, index: number): string | null {
  switch (tab) {
    case 'trending':
      return 'Trending';
    case 'popular':
      return 'Popular';
    case 'recommended':
      if ((exp.averageRating || 0) >= 4.7) return 'Top Rated';
      if (index === 0) return 'Recommended';
      return null;
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

function CategoryIcon({ name }: { name: CategoryIconName }) {
  const cls = 'w-4 h-4';
  switch (name) {
    case 'culture':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case 'adventure':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17l6-6 4 4 8-8M14 7h7v7" />
        </svg>
      );
    case 'nature':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3c.5 3.5-2 6-4.5 8C5 13.5 4 16 4 18.5S6.5 22 12 22s8-1 8-3.5S19 13.5 16.5 11C14 9 11.5 6.5 12 3z" />
        </svg>
      );
    case 'food':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v13m0-13c1.5-3 4-5 7-5v5c-3 0-5.5 1-7 5zm0 0C10.5 6 8 4 5 4v5c3 0 5.5 1 7 5z" />
        </svg>
      );
    case 'more':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      );
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    dashboard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    bookings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    itineraries: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    wishlist: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    profile: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    explore: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
    notifications: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    signout: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
  };
  return icons[name] ?? null;
}

function StatIcon({ name }: { name: StatIconName }) {
  const cls = 'w-7 h-7 text-ink';
  switch (name) {
    case 'bookings':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case 'upcoming':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      );
    case 'spent':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case 'wishlist':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}

function DraggableScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX - (ref.current?.offsetLeft ?? 0);
    scrollLeft.current = ref.current?.scrollLeft ?? 0;
    if (ref.current) ref.current.style.cursor = 'grabbing';
  };
  const onMouseUp = () => { isDragging.current = false; if (ref.current) ref.current.style.cursor = 'grab'; };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    ref.current.scrollLeft = scrollLeft.current - (x - startX.current) * 1.5;
  };
  return (
    <div
      ref={ref}
      className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide select-none"
      style={{ cursor: 'grab' }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onMouseMove={onMouseMove}
    >
      {children}
    </div>
  );
}

const Heart = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 32 32" className={`w-6 h-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] ${on ? 'text-sun' : 'text-black/50'}`} fill="currentColor" stroke="white" strokeWidth={2} aria-hidden>
    <path d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z" />
  </svg>
);


const EmptyState = ({ icon, title, body, cta, href }: { icon: string; title: string; body: string; cta: string; href: string }) => (
  <div className="rounded-2xl border border-[#DCE4E5] px-6 py-14 text-center">
    <p className="text-4xl" aria-hidden>{icon}</p>
    <h3 className="mt-4 text-[22px] font-semibold">{title}</h3>
    <p className="mt-2 text-ink-muted max-w-sm mx-auto">{body}</p>
    <Link href={href} className="btn-ghost mt-6">{cta}</Link>
  </div>
);


const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
    <button className="absolute inset-0 bg-black/50 cursor-default" onClick={onClose} aria-label="Close dialog" />
    <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full sm:max-w-[480px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-sheet sm:animate-scale-in">
      <div className="relative h-16 flex items-center justify-center border-b border-[#EDF2F2]">
        <button onClick={onClose} className="absolute left-5 w-8 h-8 rounded-full hover:bg-fog flex items-center justify-center" aria-label="Close">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

function TravelerDashboardInner() {
  const { user, logout, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const notificationList = useNotifications(true).notifications as { status?: string }[];
  const unreadCount = notificationList.filter((n) => n.status !== 'read').length;

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>('dashboard');
  // Deep links from the header menu / bottom bar, e.g. ?tab=wishlist
  useEffect(() => {
    if (tabParam && ['dashboard', 'bookings', 'itineraries', 'wishlist', 'profile'].includes(tabParam)) setTab(tabParam as Tab);
  }, [tabParam]);
  const [bookingFilter, setBookingFilter] = useState<BookingStatus>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [discoverTab, setDiscoverTab] = useState<DiscoverTab>('recommended');
  const [selectedDate] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroSearch, setHeroSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [cancelModal, setCancelModal] = useState<Booking | null>(null);
  const [reviewModal, setReviewModal] = useState<{ bookingId: string; experienceId: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', bio: '', profilePhotoUrl: '', travelPreferences: [] as string[] });
  const [prefInput, setPrefInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const totalSpent = allBookings
    .filter((b) => b.status === 'completed' || b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const upcomingCount = allBookings.filter((b) => b.status === 'confirmed').length;

  const featured = useMemo(() => {
    if (!experiences.length) return null;
    if (featuredId) return experiences.find((e) => e.id === featuredId) ?? experiences[0];
    return experiences[0];
  }, [experiences, featuredId]);

  const nextTrip = useMemo(() => {
    const confirmed = allBookings
      .filter((b) => b.status === 'confirmed')
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return confirmed[0] ?? null;
  }, [allBookings]);

  const fetchDiscover = useCallback(async (mode: DiscoverTab) => {
    setDiscoverLoading(true);
    try {
      const params: Record<string, unknown> = { pageSize: 8, page: 1 };
      if (mode === 'recommended') { params.sortBy = 'rating'; params.sortOrder = 'desc'; }
      else if (mode === 'popular') { params.sortBy = 'popularity'; params.sortOrder = 'desc'; }
      else { params.sortBy = 'rating'; params.sortOrder = 'desc'; }
      const response = await experiencesApi.list(params);
      const list: Experience[] = (response.data as { experiences?: Experience[] }).experiences || [];
      setExperiences(list);
      setFeaturedId((prev) => (prev && list.some((e) => e.id === prev) ? prev : list[0]?.id ?? null));
    } catch { setExperiences([]); }
    finally { setDiscoverLoading(false); }
  }, []);

  useEffect(() => {
    if (!user) { if (!authLoading && !hasStoredSession()) void router.push('/login'); return; }
    setProfileForm({
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      bio: user.profile?.bio || '',
      profilePhotoUrl: user.profile?.profilePhotoUrl || '',
      travelPreferences: [],
    });
    bookingsApi.getUserBookings(user.id, {}).then(({ data }: { data: Booking[] }) => setAllBookings(data || [])).catch(() => {});
    userApi.getWishlist(user.id).then(({ data }: { data: WishlistItem[] }) => {
      setWishlist(data || []);
      setWishlistIds(new Set((data || []).map((w) => w.id)));
    }).catch(() => {});
    tripPlannerApi.getItineraries().then(({ data }: { data: Itinerary[] }) => setItineraries(data || [])).catch(() => {});
  }, [user, router, authLoading]);

  useEffect(() => { if (!user) return; void fetchDiscover(discoverTab); }, [user, discoverTab, fetchDiscover]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const statusMap: Record<BookingStatus, string> = { upcoming: 'confirmed', past: 'completed', cancelled: 'cancelled' };
    bookingsApi.getUserBookings(user.id, { status: statusMap[bookingFilter] })
      .then(({ data }: { data: Booking[] }) => setBookings(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, bookingFilter]);

  useEffect(() => {
    if (!user || tab !== 'itineraries') return;
    tripPlannerApi.getItineraries().then(({ data }: { data: Itinerary[] }) => setItineraries(data || [])).catch(() => {});
  }, [user, tab]);

  useEffect(() => {
    if (!user || tab !== 'wishlist') return;
    userApi.getWishlist(user.id).then(({ data }: { data: WishlistItem[] }) => {
      setWishlist(data || []);
      setWishlistIds(new Set((data || []).map((w) => w.id)));
    }).catch(() => {});
  }, [user, tab]);

  const confirmCancel = async () => {
    if (!cancelModal) return;
    try {
      await bookingsApi.cancel(cancelModal.id, 'Traveler requested cancellation');
      setBookings((prev) => prev.filter((b) => b.id !== cancelModal.id));
      setAllBookings((prev) => prev.filter((b) => b.id !== cancelModal.id));
      setCancelModal(null);
      toast('Booking cancelled successfully', 'success');
    } catch { toast('Failed to cancel booking', 'error'); }
  };

  const toggleWishlist = async (itemId: string) => {
    if (!user) return;
    const next = new Set(wishlistIds);
    try {
      if (next.has(itemId)) {
        next.delete(itemId);
        await userApi.removeFromWishlist(user.id, itemId);
        setWishlist((prev) => prev.filter((w) => w.id !== itemId));
        toast('Removed from wishlist', 'info');
      } else {
        next.add(itemId);
        await userApi.addToWishlist(user.id, itemId);
        toast('Added to wishlist', 'success');
      }
      setWishlistIds(next);
    } catch { toast('Failed to update wishlist', 'error'); }
  };

  const removeFromWishlist = async (itemId: string) => {
    try {
      await userApi.removeFromWishlist(user!.id, itemId);
      setWishlist((prev) => prev.filter((w) => w.id !== itemId));
      setWishlistIds((prev) => { const next = new Set(prev); next.delete(itemId); return next; });
      toast('Removed from wishlist', 'info');
    } catch { toast('Failed to remove from wishlist', 'error'); }
  };

  const downloadConfirmation = async (bookingId: string) => {
    try {
      const response = await bookingsApi.get(bookingId);
      const booking = response.data as Booking;
      const content = [
        'BOOKING CONFIRMATION',
        '===================',
        `Reference: ${booking.referenceNumber}`,
        `Experience: ${booking.experience?.title || 'N/A'}`,
        `Date: ${new Date(booking.date).toLocaleDateString()} at ${booking.startTime}`,
        `Status: ${booking.status}`,
        `Amount: ${booking.totalCurrency} ${booking.totalAmount?.toFixed(2)}`,
        `Policy: ${booking.cancellationPolicy ? CANCELLATION_POLICY_LABELS[booking.cancellationPolicy] : 'N/A'}`,
      ].join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `booking-${booking.referenceNumber}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast('Could not download confirmation', 'error'); }
  };

  const downloadReceipt = async (paymentId: string) => {
    try {
      const response = await paymentsApi.getReceipt(paymentId);
      const receiptUrl = (response.data as { receiptUrl: string }).receiptUrl;
      window.open(receiptUrl, '_blank');
    } catch { toast('Could not open receipt', 'error'); }
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    try {
      await reviewsApi.create({
        bookingId: reviewModal.bookingId,
        experienceId: reviewModal.experienceId,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewModal(null);
      setReviewRating(5);
      setReviewComment('');
      toast('Review submitted — thanks!', 'success');
    } catch { toast('Failed to submit review', 'error'); }
  };

  const addPreference = () => {
    const trimmed = prefInput.trim();
    if (trimmed && !profileForm.travelPreferences.includes(trimmed)) {
      setProfileForm((p) => ({ ...p, travelPreferences: [...p.travelPreferences, trimmed] }));
    }
    setPrefInput('');
  };
  const removePreference = (pref: string) =>
    setProfileForm((p) => ({ ...p, travelPreferences: p.travelPreferences.filter((x) => x !== pref) }));

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      await userApi.updateProfile(user.id, {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        bio: profileForm.bio,
        profilePhotoUrl: profileForm.profilePhotoUrl,
        travelPreferences: profileForm.travelPreferences,
      });
      toast('Profile updated!', 'success');
    } catch { toast('Failed to save profile', 'error'); }
    finally { setProfileSaving(false); }
  };

  const handleDashboardSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim() || heroSearch.trim();
    void router.push(q ? `/experiences?q=${encodeURIComponent(q)}` : '/experiences');
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroSearch.trim() || searchQuery.trim();
    void router.push(q ? `/experiences?q=${encodeURIComponent(q)}` : '/experiences');
  };

  if (!user) return null;

  const firstName = user.profile?.firstName || user.email?.split('@')[0] || 'Traveler';
  const lastName = user.profile?.lastName || '';
  const displayName = lastName ? `${firstName} ${lastName}` : firstName;
  const avatarInitial = firstName.charAt(0).toUpperCase();
  const greeting = greetingForHour(new Date().getHours());

  const tabs: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: 'dashboard', label: 'Overview', icon: 'dashboard' },
    { key: 'bookings', label: 'Trips', icon: 'bookings', count: upcomingCount },
    { key: 'itineraries', label: 'Itineraries', icon: 'itineraries', count: itineraries.length },
    { key: 'wishlist', label: 'Wishlists', icon: 'wishlist', count: wishlist.length },
    { key: 'profile', label: 'Profile', icon: 'profile' },
  ];

  const stats: { label: string; value: string | number; icon: StatIconName }[] = [
    { label: 'Total bookings', value: allBookings.length, icon: 'bookings' },
    { label: 'Upcoming trips', value: upcomingCount, icon: 'upcoming' },
    { label: 'Total spent', value: `$${totalSpent.toFixed(0)}`, icon: 'spent' },
    { label: 'Saved', value: wishlist.length, icon: 'wishlist' },
  ];

  const money = (amount: number, currency: string) => `${currency === 'USD' ? '$' : `${currency} `}${amount.toFixed(amount % 1 ? 2 : 0)}`;
  const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  const field = 'w-full rounded-lg border border-[#A9B8BA] px-3.5 py-3 text-[15px] text-ink outline-none focus:border-ink focus:shadow-[0_0_0_1px_#0B2E33]';
  const textBtn = 'text-sm font-semibold underline underline-offset-2 hover:text-[#072226] disabled:opacity-40';

  const renderDiscoverSection = () => (
    <div className="space-y-14 animate-fade-in">
      {/* ── Next trip (Airbnb "upcoming reservation") ───────────────── */}
      <section>
        <h2 className="text-[22px] font-semibold mb-5">{nextTrip ? 'Your next trip' : 'Trips'}</h2>
        {nextTrip ? (
          <div className="grid md:grid-cols-[1fr_1.15fr] rounded-2xl border border-[#DCE4E5] overflow-hidden hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] transition-shadow">
            <div className="p-6 sm:p-8 flex flex-col order-2 md:order-1">
              <span className="self-start rounded-full bg-leaf-50 text-leaf-700 text-xs font-semibold px-3 py-1">
                {daysUntil(nextTrip.date) <= 0 ? 'Today' : daysUntil(nextTrip.date) === 1 ? 'Tomorrow' : `In ${daysUntil(nextTrip.date)} days`}
              </span>
              <h3 className="mt-4 text-[26px] font-semibold leading-tight">{nextTrip.experience?.title || 'Confirmed booking'}</h3>
              <div className="mt-5 grid grid-cols-2 gap-4 text-sm border-y border-[#EDF2F2] py-4">
                <div>
                  <p className="font-semibold">Date</p>
                  <p className="text-ink-muted">{new Date(nextTrip.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="font-semibold">Starts</p>
                  <p className="text-ink-muted">{nextTrip.startTime || '—'}</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-ink-muted">Confirmation code <span className="font-mono font-semibold text-ink">{nextTrip.referenceNumber}</span></p>
              <div className="mt-6 flex flex-wrap gap-3 md:mt-auto md:pt-6">
                {nextTrip.experience?.id && (
                  <Link href={`/experiences/${nextTrip.experience.id}`} className="btn-primary !py-2.5 text-sm">View experience</Link>
                )}
                {nextTrip.paymentId ? (
                  <button type="button" onClick={() => { void downloadReceipt(nextTrip.paymentId!); }} className="btn-outline !py-2.5 text-sm">Download receipt</button>
                ) : (
                  <button type="button" onClick={() => { void downloadConfirmation(nextTrip.id); }} className="btn-outline !py-2.5 text-sm">Download confirmation</button>
                )}
              </div>
            </div>
            <div className="relative min-h-[220px] bg-[#EDF2F2] order-1 md:order-2">
              {nextTrip.experience?.images?.[0]?.url && (
                <img src={nextTrip.experience.images[0].url} alt={nextTrip.experience.title || 'Upcoming trip'} className="absolute inset-0 w-full h-full object-cover" />
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 rounded-2xl border border-[#DCE4E5] overflow-hidden">
            <div className="p-8 sm:p-10 flex flex-col justify-center">
              <p className="text-3xl" aria-hidden>👋</p>
              <h3 className="mt-4 text-[22px] font-semibold">No trips booked… yet!</h3>
              <p className="mt-2 text-ink-muted">Time to dust off your bags and start planning your next adventure in Accra.</p>
              <Link href="/experiences" className="btn-ghost mt-6 self-start">Start searching</Link>
            </div>
            <img src="/photos/labadi.jpg" alt="" className="hidden md:block w-full h-full min-h-[260px] object-cover" />
          </div>
        )}
      </section>

      {/* ── Search + quick categories ───────────────────────────────── */}
      <section>
        <form onSubmit={handleHeroSearch} className="flex items-center gap-2 rounded-full border border-[#DCE4E5] shadow-[0_3px_12px_rgba(0,0,0,0.08)] pl-6 pr-2 py-2 max-w-2xl" role="search">
          <div className="flex-1 min-w-0">
            <label htmlFor="hero-search" className="block text-xs font-semibold">Where to next?</label>
            <input
              id="hero-search"
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
              placeholder="Search experiences, places or activities"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted"
            />
          </div>
          <button type="submit" className="btn-accent !p-0 w-12 h-12 !rounded-full shrink-0" aria-label="Search">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORY_PILLS.map((cat) => (
            <Link key={cat.category} href={`/experiences?categories=${encodeURIComponent(cat.category)}`} className="pill-tab inline-flex items-center gap-2">
              <CategoryIcon name={cat.icon} />
              {cat.label}
            </Link>
          ))}
          <Link href="/experiences" className="pill-tab inline-flex items-center gap-2"><CategoryIcon name="more" />More</Link>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl border border-[#DCE4E5] divide-[#DCE4E5] [&>*:nth-child(odd)]:border-r lg:divide-x [&>*:nth-child(-n+2)]:border-b lg:[&>*]:border-b-0">
        {stats.map((stat) => (
          <div key={stat.label} className="p-5 sm:p-6">
            <StatIcon name={stat.icon} />
            <p className="mt-4 text-[28px] font-semibold leading-none tracking-[-0.02em]">{stat.value}</p>
            <p className="mt-1.5 text-sm text-ink-muted">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* ── Picked for you ─────────────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-[22px] font-semibold">Picked for you</h2>
            <p className="text-sm text-ink-muted">Experiences we think you’ll love in Accra</p>
          </div>
          <div className="flex gap-2" role="tablist" aria-label="Discover">
            {(['recommended', 'popular', 'trending'] as DiscoverTab[]).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={discoverTab === t} onClick={() => setDiscoverTab(t)} className={`pill-tab capitalize ${discoverTab === t ? 'pill-tab-active' : ''}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Spotlight */}
        {featured && !discoverLoading && (
          <div className="mb-10 grid md:grid-cols-[1.3fr_1fr] gap-6 md:gap-10 items-center">
            <Link href={`/experiences/${featured.id}`} className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-[#EDF2F2] group">
              {featured.images?.[0] && (
                <img src={featured.images[0].url || featured.images[0].thumbnailUrl} alt={featured.title} className="absolute inset-0 w-full h-full object-cover card-img" />
              )}
              {(featured.averageRating || 0) >= 4.5 && <span className="badge absolute top-4 left-4">Top rated</span>}
            </Link>
            <div>
              <p className="text-sm font-semibold text-ink-muted">Spotlight</p>
              <h3 className="mt-1 text-[26px] font-semibold leading-tight">{featured.title}</h3>
              <p className="mt-2 text-ink-muted">{featured.location?.address || 'Accra, Ghana'}{formatDuration(featured.duration) ? ` · ${formatDuration(featured.duration)}` : ''}</p>
              <div className="mt-2"><StarRating value={featured.averageRating || 0} readonly size="sm" /></div>
              <p className="mt-4 text-lg"><span className="font-semibold">{money(featured.price.amount, featured.price.currency)}</span><span className="text-ink-muted"> / guest</span></p>
              <div className="mt-6 flex items-center gap-3">
                <Link href={`/experiences/${featured.id}`} className="btn-primary !py-2.5 text-sm">View details</Link>
                <button type="button" onClick={() => { void toggleWishlist(featured.id); }} className="btn-outline !py-2.5 text-sm" aria-pressed={wishlistIds.has(featured.id)}>
                  {wishlistIds.has(featured.id) ? '♥ Saved' : '♡ Save'}
                </button>
              </div>
              {experiences.length > 1 && (
                <div className="flex gap-1.5 mt-6">
                  {experiences.slice(0, 5).map((exp) => (
                    <button key={exp.id} type="button" onClick={() => setFeaturedId(exp.id)} aria-label={`Spotlight: ${exp.title}`}
                      className={`h-1.5 rounded-full transition-all ${featured.id === exp.id ? 'w-6 bg-ink' : 'w-1.5 bg-[#DCE4E5] hover:bg-[#A9B8BA]'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {discoverLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}><div className="aspect-[20/19] rounded-2xl shimmer" /><div className="mt-3 h-4 w-3/4 rounded-full shimmer" /><div className="mt-2 h-3.5 w-1/2 rounded-full shimmer" /></div>
            ))}
          </div>
        ) : experiences.length === 0 ? (
          <EmptyState icon="🧭" title="Nothing to show yet" body="We couldn’t load recommendations right now." cta="Browse all experiences" href="/experiences" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {experiences.slice(0, 8).map((exp, i) => {
              const img = exp.images?.[0];
              const badge = discoverBadge(exp, discoverTab, i);
              const duration = formatDuration(exp.duration);
              return (
                <div key={exp.id} className="group">
                  <div className="relative aspect-[20/19] rounded-2xl overflow-hidden bg-[#EDF2F2]">
                    <Link href={`/experiences/${exp.id}`} className="absolute inset-0" aria-label={exp.title}>
                      {img && (
                        <img src={img.thumbnailUrl || img.url} alt={exp.title} className="w-full h-full object-cover card-img" />
                      )}
                    </Link>
                    {badge && <span className="badge absolute top-3 left-3 pointer-events-none">{badge}</span>}
                    <button type="button" onClick={() => { void toggleWishlist(exp.id); }} className="absolute top-3 right-3 p-1 hover:scale-110 transition-transform" aria-label="Toggle wishlist" aria-pressed={wishlistIds.has(exp.id)}>
                      <Heart on={wishlistIds.has(exp.id)} />
                    </button>
                  </div>
                  <div className="pt-3 text-[15px]">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/experiences/${exp.id}`} className="font-semibold line-clamp-2 leading-snug hover:underline">{exp.title}</Link>
                      {exp.averageRating > 0 && <span className="shrink-0 text-sm">★ {exp.averageRating.toFixed(2)}{exp.reviewCount > 0 && <span className="text-ink-muted"> ({exp.reviewCount})</span>}</span>}
                    </div>
                    <p className="text-sm text-ink-muted truncate">{exp.location?.address}{duration ? ` · ${duration}` : ''}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-sm"><span className="font-semibold">{money(exp.price.amount, exp.price.currency)}</span><span className="text-ink-muted"> / guest</span></p>
                      <Link href={`/experiences/${exp.id}/book?date=${selectedDate.toISOString().split('T')[0]}`} className={textBtn}>Book</Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Wishlist + itineraries ─────────────────────────────────── */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#DCE4E5] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recently saved</h3>
            <button type="button" onClick={() => setTab('wishlist')} className={textBtn}>See all</button>
          </div>
          {wishlist.length === 0 ? (
            <p className="text-sm text-ink-muted py-6">Tap the ♡ on any experience to save it here.</p>
          ) : (
            <DraggableScroll>
              {wishlist.slice(0, 8).map((item) => (
                <Link key={item.id} href={`/experiences/${item.id}`} className="shrink-0 w-40 group" draggable={false}>
                  <div className="aspect-square rounded-xl overflow-hidden bg-[#EDF2F2]">
                    {item.images?.[0]?.url && (
                      <img src={item.images[0].url} alt={item.title} className="w-full h-full object-cover card-img" draggable={false} />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-semibold line-clamp-2 leading-snug">{item.title}</p>
                  <p className="text-sm text-ink-muted">{money(item.price.amount, item.price.currency)}</p>
                </Link>
              ))}
            </DraggableScroll>
          )}
        </div>

        <div className="rounded-2xl border border-[#DCE4E5] p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Your itineraries</h3>
            <Link href="/trip-planner" className={textBtn}>Plan a trip</Link>
          </div>
          {itineraries.length === 0 ? (
            <div className="flex-1 rounded-xl bg-fog p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-3xl" aria-hidden>✨</span>
              <div className="flex-1">
                <p className="font-semibold">Build a custom itinerary in minutes</p>
                <p className="text-sm text-ink-muted">Tell the AI planner your vibe — it crafts a day-by-day plan.</p>
              </div>
              <Link href="/trip-planner" className="btn-accent !py-2.5 text-sm shrink-0">Plan my trip</Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#EDF2F2]">
              {itineraries.slice(0, 4).map((itin) => (
                <li key={itin.id}>
                  <Link href={`/trip-planner?itinerary=${itin.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-fog -mx-3 px-3 rounded-lg transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{itin.experiences.length} experience{itin.experiences.length !== 1 ? 's' : ''} · {itin.experiences.slice(0, 2).map((e) => e.experience?.title).filter(Boolean).join(', ')}</p>
                      <p className="text-xs text-ink-muted">{new Date(itin.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">{money(itin.totalCost.amount, itin.totalCost.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );

  const renderBookingsTab = () => (
    <div className="animate-fade-in">
      <div className="flex gap-2 mb-8 flex-wrap" role="tablist" aria-label="Trip status">
        {(['upcoming', 'past', 'cancelled'] as BookingStatus[]).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={bookingFilter === s} onClick={() => setBookingFilter(s)} className={`pill-tab capitalize ${bookingFilter === s ? 'pill-tab-active' : ''}`}>
            {s}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl shimmer" />)}</div>
      ) : bookings.length === 0 ? (
        <EmptyState icon="🧳" title={`No ${bookingFilter} trips`} body={bookingFilter === 'upcoming' ? 'Time to dust off your bags and start planning your next adventure.' : 'Trips will show up here once they happen.'} cta="Start searching" href="/experiences" />
      ) : (
        <ul className="space-y-4">
          {bookings.map((booking) => (
            <li key={booking.id} className="rounded-2xl border border-[#DCE4E5] overflow-hidden flex flex-col sm:flex-row hover:shadow-[0_6px_16px_rgba(0,0,0,0.1)] transition-shadow">
              <div className="sm:w-56 h-40 sm:h-auto bg-[#EDF2F2] shrink-0 relative">
                {booking.experience?.images?.[0]?.url && (
                  <img src={booking.experience.images[0].url} alt={booking.experience.title} className="absolute inset-0 w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-0.5 ${
                      booking.status === 'confirmed' ? 'bg-leaf-50 text-leaf-700' : booking.status === 'completed' ? 'bg-fog text-ink' : 'bg-fog text-ink-muted'
                    }`}>
                      {booking.status === 'confirmed' ? 'Confirmed' : booking.status === 'completed' ? 'Completed' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                    <Link href={`/experiences/${booking.experience?.id}`} className="mt-2 block text-lg font-semibold leading-snug hover:underline">
                      {booking.experience?.title || 'Experience'}
                    </Link>
                    <p className="text-sm text-ink-muted mt-0.5">
                      {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {booking.startTime}
                    </p>
                  </div>
                  <p className="text-lg font-semibold shrink-0">{money(booking.totalAmount ?? 0, booking.totalCurrency)}</p>
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  Code <span className="font-mono text-ink">{booking.referenceNumber}</span>
                  {booking.cancellationPolicy && <> · {CANCELLATION_POLICY_LABELS[booking.cancellationPolicy]}</>}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  {booking.status === 'completed' && (
                    <button type="button" onClick={() => setReviewModal({ bookingId: booking.id, experienceId: booking.experience?.id || '' })} className={textBtn}>
                      ★ Write a review
                    </button>
                  )}
                  <button type="button" onClick={() => { void downloadConfirmation(booking.id); }} className={textBtn}>Download confirmation</button>
                  {booking.paymentId && (
                    <button type="button" onClick={() => { void downloadReceipt(booking.paymentId!); }} className={textBtn}>Receipt</button>
                  )}
                  {booking.status === 'confirmed' && (
                    <button type="button" onClick={() => setCancelModal(booking)} className="text-sm font-semibold underline underline-offset-2 text-[#C13515]">
                      Cancel booking
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderItinerariesTab = () => (
    <div className="animate-fade-in">
      <div className="flex justify-end mb-6">
        <Link href="/trip-planner" className="btn-accent !py-2.5 text-sm">✨ New itinerary</Link>
      </div>
      {itineraries.length === 0 ? (
        <EmptyState icon="🗺️" title="No saved itineraries yet" body="Describe your trip in plain words and the AI planner will build a bookable day-by-day plan." cta="Plan your first trip" href="/trip-planner" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {itineraries.map((itin) => (
            <Link key={itin.id} href={`/trip-planner?itinerary=${itin.id}`} className="group rounded-2xl border border-[#DCE4E5] p-6 hover:shadow-[0_6px_16px_rgba(0,0,0,0.1)] transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-ink-muted">Generated {new Date(itin.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <h3 className="mt-1 text-lg font-semibold">{itin.experiences.length}-stop plan</h3>
                </div>
                <span className="text-lg font-semibold">{money(itin.totalCost.amount, itin.totalCost.currency)}</span>
              </div>
              <ol className="mt-4 space-y-2">
                {itin.experiences.slice(0, 3).map((e, i) => (
                  <li key={`${e.experienceId}-${i}`} className="flex items-center gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-fog text-xs font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="truncate">{e.experience?.title || e.experienceId}</span>
                  </li>
                ))}
                {itin.experiences.length > 3 && <li className="text-sm text-ink-muted pl-9">+{itin.experiences.length - 3} more</li>}
              </ol>
              <span className="mt-5 inline-block text-sm font-semibold underline underline-offset-2">Open in trip planner</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const renderWishlistTab = () => (
    <div className="animate-fade-in">
      <form onSubmit={handleDashboardSearch} className="mb-8 flex items-center gap-2 max-w-md rounded-full border border-[#DCE4E5] pl-5 pr-1.5 py-1.5 focus-within:border-ink" role="search">
        <svg className="w-4 h-4 text-ink-muted shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Find more experiences to save" className="flex-1 min-w-0 bg-transparent text-sm outline-none" />
        <button type="submit" className="btn-primary !py-2 !px-4 text-sm !rounded-full">Search</button>
      </form>
      {wishlist.length === 0 ? (
        <EmptyState icon="♡" title="Create your first wishlist" body="As you search, tap the heart icon to save your favorite experiences." cta="Browse experiences" href="/experiences" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {wishlist.map((item) => (
            <div key={item.id} className="group">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#EDF2F2]">
                <Link href={`/experiences/${item.id}`} className="absolute inset-0" aria-label={item.title}>
                  {item.images?.[0]?.url && (
                    <img src={item.images[0].url} alt={item.title} className="w-full h-full object-cover card-img" />
                  )}
                </Link>
                <button type="button" onClick={() => { void removeFromWishlist(item.id); }} className="absolute top-3 right-3 p-1 hover:scale-110 transition-transform" aria-label="Remove from wishlist">
                  <Heart on />
                </button>
              </div>
              <div className="pt-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/experiences/${item.id}`} className="font-semibold leading-snug hover:underline">{item.title}</Link>
                  <StarRating value={item.averageRating} readonly size="sm" />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-sm"><span className="font-semibold">{money(item.price.amount, item.price.currency)}</span><span className="text-ink-muted"> / guest</span></p>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => { void removeFromWishlist(item.id); }} className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink">Remove</button>
                    <Link href={`/experiences/${item.id}/book`} className={textBtn}>Book</Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfileTab = () => (
    <div className="grid lg:grid-cols-[320px_1fr] gap-10 lg:gap-16 items-start animate-fade-in">
      <div className="rounded-3xl shadow-[0_6px_20px_rgba(0,0,0,0.15)] p-8 text-center">
        <div className="w-28 h-28 mx-auto rounded-full bg-ink text-white text-4xl font-semibold overflow-hidden flex items-center justify-center">
          {profileForm.profilePhotoUrl || user.profile?.profilePhotoUrl
            ? <img src={profileForm.profilePhotoUrl || user.profile?.profilePhotoUrl} alt={displayName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            : avatarInitial}
        </div>
        <p className="mt-4 text-[26px] font-bold leading-tight">{displayName}</p>
        <p className="text-sm font-semibold">Traveler</p>
        <p className="mt-4 pt-4 border-t border-[#EDF2F2] text-sm text-ink-muted truncate">{user.email}</p>
      </div>

      <div className="max-w-xl">
        <h2 className="text-[26px] font-semibold">Personal info</h2>
        <p className="text-ink-muted mt-1">Help guides get to know you before your experience.</p>
        <div className="mt-8 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold mb-1.5">First name</span>
              <input value={profileForm.firstName} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} className={field} />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold mb-1.5">Last name</span>
              <input value={profileForm.lastName} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} className={field} />
            </label>
          </div>
          <label className="block">
            <span className="block text-sm font-semibold mb-1.5">Profile photo URL</span>
            <input type="url" value={profileForm.profilePhotoUrl} onChange={(e) => setProfileForm((p) => ({ ...p, profilePhotoUrl: e.target.value }))} placeholder="https://example.com/photo.jpg" className={field} />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold mb-1.5">About you</span>
            <textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} rows={4} className={`${field} resize-none`} placeholder="Where you’re from, what you love about travel…" />
          </label>
          <div>
            <span className="block text-sm font-semibold mb-1.5">Travel interests</span>
            <div className="flex gap-2">
              <input
                value={prefInput}
                onChange={(e) => setPrefInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPreference(); } }}
                placeholder="e.g. food, history, beaches"
                className={field}
              />
              <button type="button" onClick={addPreference} className="btn-outline shrink-0">Add</button>
            </div>
            {profileForm.travelPreferences.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {profileForm.travelPreferences.map((pref) => (
                  <span key={pref} className="inline-flex items-center gap-2 rounded-full border border-[#DCE4E5] pl-4 pr-2 py-1.5 text-sm">
                    {pref}
                    <button type="button" onClick={() => removePreference(pref)} className="w-5 h-5 rounded-full hover:bg-fog flex items-center justify-center" aria-label={`Remove ${pref}`}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-[#EDF2F2] flex items-center justify-between gap-4">
            <button type="button" onClick={() => { logout(); void router.push('/'); }} className="text-sm font-semibold underline underline-offset-2">Log out</button>
            <button type="button" onClick={() => { void saveProfile(); }} disabled={profileSaving} className="btn-primary">
              {profileSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white">
      <div className="max-w-[1120px] mx-auto px-6 sm:px-10 pt-8 md:pt-12 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-[28px] sm:text-[32px] font-semibold leading-tight">
              {greeting}, {firstName} <span className="animate-wave" aria-hidden>👋</span>
            </h1>
            <p className="mt-1 text-ink-muted">
              Accra, Ghana · {upcomingCount > 0 ? `${upcomingCount} upcoming trip${upcomingCount === 1 ? '' : 's'}` : 'Ready for your next adventure?'}
            </p>
          </div>
          <button type="button" onClick={() => setTab('profile')} className="hidden sm:flex w-14 h-14 rounded-full bg-ink text-white text-xl font-semibold overflow-hidden items-center justify-center shrink-0 ring-4 ring-fog hover:ring-[#DCE4E5] transition" aria-label="Open profile">
            {user.profile?.profilePhotoUrl
              ? <img src={user.profile.profilePhotoUrl} alt={firstName} className="w-full h-full object-cover" />
              : avatarInitial}
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex items-center justify-between gap-6 border-b border-[#DCE4E5]">
          <nav className="flex gap-6 sm:gap-8 overflow-x-auto scrollbar-hide -mb-px" aria-label="Dashboard">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-current={tab === t.key ? 'page' : undefined}
                className={`flex items-center gap-2 pb-3 pt-1 border-b-2 text-[15px] whitespace-nowrap transition-colors ${
                  tab === t.key ? 'border-ink text-ink font-semibold' : 'border-transparent text-ink-muted hover:text-ink hover:border-[#DCE4E5]'
                }`}
              >
                <span className="hidden sm:inline"><NavIcon name={t.icon} /></span>
                {t.label}
                {t.count ? <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-fog text-[11px] font-semibold flex items-center justify-center">{t.count}</span> : null}
              </button>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-1 pb-2 shrink-0">
            <Link href="/experiences" className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold hover:bg-fog"><NavIcon name="explore" />Explore</Link>
            <Link href="/settings/notifications" className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold hover:bg-fog">
              <NavIcon name="notifications" />Notifications
              {unreadCount > 0 && <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-sun text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </Link>
            <Link href="/settings/notifications" className="w-9 h-9 rounded-full hover:bg-fog flex items-center justify-center" aria-label="Settings"><NavIcon name="settings" /></Link>
          </div>
        </div>

        <div className="pt-10">
          {tab === 'dashboard' && renderDiscoverSection()}
          {tab === 'bookings' && renderBookingsTab()}
          {tab === 'itineraries' && renderItinerariesTab()}
          {tab === 'wishlist' && renderWishlistTab()}
          {tab === 'profile' && renderProfileTab()}
        </div>
      </div>

      {cancelModal && (
        <Modal title="Cancel booking" onClose={() => setCancelModal(null)}>
          <p className="text-[15px]">
            Cancel your booking for <span className="font-semibold">{cancelModal.experience?.title}</span>?
          </p>
          {cancelModal.cancellationPolicy && (
            <div className="mt-4 rounded-xl bg-fog p-4">
              <p className="text-sm font-semibold">Cancellation policy</p>
              <p className="text-sm text-ink-muted mt-0.5">{CANCELLATION_POLICY_LABELS[cancelModal.cancellationPolicy]}</p>
            </div>
          )}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setCancelModal(null)} className="text-sm font-semibold underline underline-offset-2">Keep booking</button>
            <button type="button" onClick={() => { void confirmCancel(); }} className="btn bg-[#C13515] text-white hover:bg-[#A42D12]">Cancel booking</button>
          </div>
        </Modal>
      )}

      {reviewModal && (
        <Modal title="Write a review" onClose={() => setReviewModal(null)}>
          <p className="text-sm font-semibold mb-2">How was it?</p>
          <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
          <label className="block mt-5">
            <span className="flex justify-between text-sm font-semibold mb-1.5">
              Your review <span className="font-normal text-ink-muted">{reviewComment.length}/1000</span>
            </span>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value.slice(0, 1000))}
              rows={4}
              className={`${field} resize-none`}
              placeholder="What did you love? What should future guests know?"
            />
          </label>
          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setReviewModal(null)} className="text-sm font-semibold underline underline-offset-2">Cancel</button>
            <button type="button" onClick={() => { void submitReview(); }} className="btn-primary">Submit review</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function TravelerDashboard() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <TravelerDashboardInner />
    </Suspense>
  );
}
