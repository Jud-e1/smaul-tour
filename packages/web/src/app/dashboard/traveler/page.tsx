'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays, ChevronLeft, ChevronRight, Compass, FileDown, Heart, LayoutGrid, Luggage, Map, Plus, Receipt,
  Search, Settings, Sparkles, Star, UserRound, Wallet, X, Bell, type LucideIcon,
} from 'lucide-react';
import { bookingsApi, tripPlannerApi, userApi, paymentsApi, reviewsApi, experiencesApi } from '@/lib/api';
import { useAuthStore, hasStoredSession } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
import { useNotifications } from '@/hooks/useNotifications';
import StarRating from '@/components/ui/StarRating';
import type { Experience } from '@/components/experiences/ExperienceCard';
import DashboardShell, { Card, Segmented } from '@/components/dashboard/DashboardShell';

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

const TABS: Tab[] = ['dashboard', 'bookings', 'itineraries', 'wishlist', 'profile'];

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
      if ((exp.averageRating || 0) >= 4.7) return 'Top rated';
      if (index === 0) return 'Recommended';
      return null;
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

const money = (amount: number, currency: string) => `${currency === 'USD' ? '$' : `${currency} `}${amount.toFixed(amount % 1 ? 2 : 0)}`;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: 'bg-espresso-50 text-espresso-700',
    completed: 'bg-black/[0.06] text-ink',
    cancelled: 'bg-black/[0.04] text-stone-500',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize ${map[status] ?? 'bg-black/[0.05] text-stone-600'}`}>
      {status}
    </span>
  );
}

function Thumb({ src, alt, className = 'w-11 h-11' }: { src?: string; alt: string; className?: string }) {
  return (
    <span className={`${className} rounded-[10px] bg-stone-200 overflow-hidden shrink-0 block`}>
      {src && <img src={src} alt={alt} className="w-full h-full object-cover" />}
    </span>
  );
}

function IconButton({ label, onClick, children, danger = false }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${danger ? 'text-[#D70015] hover:bg-[#D70015]/10' : 'text-stone-500 hover:text-ink hover:bg-black/[0.05]'}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ Icon, title, body, cta, href }: { Icon: LucideIcon; title: string; body: string; cta?: string; href?: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <span className="mx-auto w-12 h-12 rounded-full bg-black/[0.04] flex items-center justify-center text-stone-500"><Icon className="w-5 h-5" /></span>
      <p className="mt-3 font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-stone-600 max-w-xs mx-auto">{body}</p>
      {cta && href && <Link href={href} className="btn-primary !py-2 !px-4 text-sm mt-5">{cta}</Link>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <button className="absolute inset-0 bg-black/40 backdrop-blur-[2px] cursor-default" onClick={onClose} aria-label="Close dialog" />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full sm:max-w-[440px] bg-white rounded-t-[22px] sm:rounded-[18px] shadow-2xl animate-sheet sm:animate-scale-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-hairline">
          <h3 className="text-[17px] font-semibold">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.08] flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/** Month grid with trip dates marked. */
function TripCalendar({ bookings }: { bookings: Booking[] }) {
  const today = new Date();
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const tripDays = useMemo(() => {
    const set = new Set<string>();
    bookings.filter((b) => b.status === 'confirmed').forEach((b) => {
      const d = new Date(b.date);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    });
    return set;
  }, [bookings]);
  const first = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array.from({ length: first }, (): null => null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const key = (d: number) => `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const isToday = (d: number) => d === today.getDate() && view.getMonth() === today.getMonth() && view.getFullYear() === today.getFullYear();

  return (
    <div className="px-5 pb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[15px] font-semibold">{view.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>
        <div className="flex">
          <IconButton label="Previous month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></IconButton>
          <IconButton label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></IconButton>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-stone-500 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[13px]">
        {cells.map((d, i) =>
          d === null ? <span key={`e${i}`} /> : (
            <span key={d} className="flex flex-col items-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                tripDays.has(key(d)) ? 'bg-espresso text-white font-semibold' : isToday(d) ? 'text-espresso font-semibold ring-1 ring-espresso/40' : 'text-ink'
              }`}>{d}</span>
            </span>
          ),
        )}
      </div>
      <p className="mt-3 flex items-center gap-2 text-[12px] text-stone-500"><span className="w-2.5 h-2.5 rounded-full bg-espresso" />Booked experience</p>
    </div>
  );
}

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
    if (tabParam && (TABS as string[]).includes(tabParam)) setTab(tabParam as Tab);
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
  const [searchQuery, setSearchQuery] = useState('');
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

  const upcoming = useMemo(
    () => allBookings.filter((b) => b.status === 'confirmed').slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [allBookings],
  );
  const nextTrip = upcoming[0] ?? null;

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
    const q = searchQuery.trim();
    void router.push(q ? `/experiences?q=${encodeURIComponent(q)}` : '/experiences');
  };

  if (!user) return null;

  const firstName = user.profile?.firstName || user.email?.split('@')[0] || 'Traveler';
  const lastName = user.profile?.lastName || '';
  const displayName = lastName ? `${firstName} ${lastName}` : firstName;
  const avatarInitial = firstName.charAt(0).toUpperCase();
  const greeting = greetingForHour(new Date().getHours());
  const field = 'w-full rounded-[10px] bg-white border border-[#D2D2D7] px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-espresso focus:ring-4 focus:ring-espresso/15';

  const TITLES: Record<Tab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Overview', subtitle: `${greeting}, ${firstName}. ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}` },
    bookings: { title: 'Trips', subtitle: 'Every experience you’ve booked, in one place.' },
    itineraries: { title: 'Itineraries', subtitle: 'Plans generated by the AI trip planner.' },
    wishlist: { title: 'Wishlist', subtitle: 'Experiences you’ve saved for later.' },
    profile: { title: 'Profile', subtitle: 'How guides see you before your experience.' },
  };

  const nav = [
    { key: 'dashboard', label: 'Overview', Icon: LayoutGrid },
    { key: 'bookings', label: 'Trips', Icon: Luggage, count: upcomingCount },
    { key: 'itineraries', label: 'Itineraries', Icon: Map, count: itineraries.length },
    { key: 'wishlist', label: 'Wishlist', Icon: Heart, count: wishlist.length },
    { key: 'profile', label: 'Profile', Icon: UserRound },
  ].map((n) => ({ ...n, active: tab === n.key, onClick: () => setTab(n.key as Tab) }));

  const links = [
    { key: 'explore', label: 'Explore experiences', Icon: Compass, href: '/experiences' },
    { key: 'planner', label: 'AI trip planner', Icon: Sparkles, href: '/trip-planner' },
    { key: 'notifications', label: 'Notifications', Icon: Bell, href: '/settings/notifications', count: unreadCount },
    { key: 'settings', label: 'Settings', Icon: Settings, href: '/settings/notifications' },
  ];

  const kpis: { label: string; value: string | number; sub: string; Icon: LucideIcon }[] = [
    { label: 'Total bookings', value: allBookings.length, sub: 'All time', Icon: CalendarDays },
    { label: 'Upcoming trips', value: upcomingCount, sub: nextTrip ? `Next: ${shortDate(nextTrip.date)}` : 'Nothing scheduled', Icon: Luggage },
    { label: 'Total spent', value: money(totalSpent, 'USD'), sub: 'Confirmed & completed', Icon: Wallet },
    { label: 'Saved', value: wishlist.length, sub: 'In your wishlist', Icon: Heart },
  ];

  const bookingActions = (b: Booking) => (
    <div className="flex items-center justify-end gap-0.5">
      {b.status === 'completed' && (
        <IconButton label="Write a review" onClick={() => setReviewModal({ bookingId: b.id, experienceId: b.experience?.id || '' })}><Star className="w-4 h-4" /></IconButton>
      )}
      <IconButton label="Download confirmation" onClick={() => { void downloadConfirmation(b.id); }}><FileDown className="w-4 h-4" /></IconButton>
      {b.paymentId && <IconButton label="Open receipt" onClick={() => { void downloadReceipt(b.paymentId!); }}><Receipt className="w-4 h-4" /></IconButton>}
      {b.status === 'confirmed' && <IconButton label="Cancel booking" danger onClick={() => setCancelModal(b)}><X className="w-4 h-4" /></IconButton>}
    </div>
  );

  /** Responsive table: real columns on desktop, stacked rows on phones. */
  const BookingTable = ({ rows }: { rows: Booking[] }) => (
    <div className="min-w-0">
      <div className="hidden md:grid grid-cols-[minmax(0,2.4fr)_1.2fr_0.9fr_0.8fr_auto] gap-4 px-5 py-2 border-y border-hairline bg-[#FAFAFC] text-[12px] font-semibold text-stone-500">
        <span>Experience</span><span>Date</span><span>Status</span><span className="text-right">Amount</span><span className="w-[136px] text-right">Actions</span>
      </div>
      <ul className="divide-y divide-hairline">
        {rows.map((b) => (
          <li key={b.id} className="px-5 py-3 grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,2.4fr)_1.2fr_0.9fr_0.8fr_auto] gap-x-4 gap-y-2 items-center hover:bg-[#FAFAFC] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <Thumb src={b.experience?.images?.[0]?.url} alt={b.experience?.title || ''} />
              <div className="min-w-0">
                <Link href={`/experiences/${b.experience?.id}`} className="block text-[14px] font-semibold text-ink truncate hover:underline">{b.experience?.title || 'Experience'}</Link>
                <p className="text-[12px] text-stone-500 truncate">#{b.referenceNumber}<span className="md:hidden"> · {shortDate(b.date)} · {b.startTime}</span></p>
              </div>
            </div>
            <p className="hidden md:block text-[14px] text-ink">{shortDate(b.date)}<span className="block text-[12px] text-stone-500">{b.startTime}</span></p>
            <span className="hidden md:block"><StatusPill status={b.status} /></span>
            <p className="text-[14px] font-semibold text-ink text-right">{money(b.totalAmount ?? 0, b.totalCurrency)}</p>
            <div className="col-span-2 md:col-span-1 flex items-center justify-between md:justify-end gap-2 md:w-[136px]">
              <span className="md:hidden"><StatusPill status={b.status} /></span>
              {bookingActions(b)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, Icon }) => (
          <div key={label} className="rounded-[18px] bg-white ring-1 ring-hairline p-4 sm:p-5 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-stone-600">{label}</p>
              <span className="w-8 h-8 rounded-full bg-espresso-50 text-espresso flex items-center justify-center"><Icon className="w-4 h-4" /></span>
            </div>
            <p className="mt-3 text-[28px] sm:text-[32px] font-bold tracking-[-0.035em] leading-none text-ink">{value}</p>
            <p className="mt-2 text-[12px] text-stone-500 truncate">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming trips table */}
        <Card
          className="lg:col-span-2 self-start"
          title="Upcoming trips"
          action={<button type="button" onClick={() => setTab('bookings')} className="text-[13px] font-semibold text-espresso hover:underline">View all</button>}
        >
          {upcoming.length === 0 ? (
            <EmptyState Icon={Luggage} title="No upcoming trips" body="Book an experience and it will show up here." cta="Find an experience" href="/experiences" />
          ) : (
            <div className="pb-2"><BookingTable rows={upcoming.slice(0, 5)} /></div>
          )}
        </Card>

        {/* Next trip + calendar */}
        <div className="space-y-6 min-w-0">
          <Card title="Next trip">
            {nextTrip ? (
              <div className="px-5 pb-5">
                <div className="flex items-center gap-3">
                  <Thumb src={nextTrip.experience?.images?.[0]?.url} alt={nextTrip.experience?.title || ''} className="w-14 h-14" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold truncate">{nextTrip.experience?.title || 'Confirmed booking'}</p>
                    <p className="text-[12px] text-stone-500">{shortDate(nextTrip.date)} · {nextTrip.startTime}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-[12px] bg-[#FAFAFC] ring-1 ring-hairline px-4 py-3 flex items-baseline justify-between">
                  <span className="text-[13px] text-stone-600">Starts in</span>
                  <span className="text-[24px] font-bold tracking-[-0.03em]">
                    {daysUntil(nextTrip.date) <= 0 ? 'Today' : `${daysUntil(nextTrip.date)} day${daysUntil(nextTrip.date) === 1 ? '' : 's'}`}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {nextTrip.experience?.id && <Link href={`/experiences/${nextTrip.experience.id}`} className="btn-primary !py-2 !px-3 text-[13px]">View</Link>}
                  {nextTrip.paymentId ? (
                    <button type="button" onClick={() => { void downloadReceipt(nextTrip.paymentId!); }} className="btn-outline !py-2 !px-3 text-[13px]">Receipt</button>
                  ) : (
                    <button type="button" onClick={() => { void downloadConfirmation(nextTrip.id); }} className="btn-outline !py-2 !px-3 text-[13px]">Confirmation</button>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState Icon={CalendarDays} title="Nothing scheduled" body="Your next confirmed booking will appear here." />
            )}
          </Card>
          <Card title="Calendar"><TripCalendar bookings={allBookings} /></Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recommendations */}
        <Card
          className="lg:col-span-2 self-start"
          title="Recommended for you"
          action={
            <Segmented
              label="Recommendations"
              value={discoverTab}
              onChange={setDiscoverTab}
              options={[{ value: 'recommended', label: 'For you' }, { value: 'popular', label: 'Popular' }, { value: 'trending', label: 'Trending' }]}
            />
          }
        >
          {discoverLoading ? (
            <ul className="divide-y divide-hairline">{[1, 2, 3, 4].map((i) => <li key={i} className="px-5 py-3 flex gap-3"><span className="w-14 h-14 rounded-[10px] shimmer" /><span className="flex-1 space-y-2 pt-1"><span className="block h-3.5 w-2/3 rounded shimmer" /><span className="block h-3 w-1/3 rounded shimmer" /></span></li>)}</ul>
          ) : experiences.length === 0 ? (
            <EmptyState Icon={Compass} title="No recommendations yet" body="We couldn’t load experiences right now." cta="Browse all" href="/experiences" />
          ) : (
            <ul className="divide-y divide-hairline pb-2">
              {experiences.slice(0, 6).map((exp, i) => {
                const badge = discoverBadge(exp, discoverTab, i);
                const duration = formatDuration(exp.duration);
                return (
                  <li key={exp.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[#FAFAFC] transition-colors">
                    <Thumb src={exp.images?.[0]?.thumbnailUrl || exp.images?.[0]?.url} alt={exp.title} className="w-14 h-14" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link href={`/experiences/${exp.id}`} className="text-[14px] font-semibold text-ink truncate hover:underline">{exp.title}</Link>
                        {badge && <span className="hidden sm:inline shrink-0 rounded-full bg-espresso-50 text-espresso-700 text-[11px] font-semibold px-2 py-0.5">{badge}</span>}
                      </div>
                      <p className="text-[12px] text-stone-500 truncate">
                        {exp.location?.address}{duration ? ` · ${duration}` : ''}{exp.averageRating > 0 ? ` · ★ ${exp.averageRating.toFixed(2)}` : ''}
                      </p>
                    </div>
                    <p className="hidden sm:block text-[14px] font-semibold shrink-0">{money(exp.price.amount, exp.price.currency)}</p>
                    <IconButton label={wishlistIds.has(exp.id) ? 'Remove from wishlist' : 'Save to wishlist'} onClick={() => { void toggleWishlist(exp.id); }}>
                      <Heart className={`w-4 h-4 ${wishlistIds.has(exp.id) ? 'fill-espresso text-espresso' : ''}`} />
                    </IconButton>
                    <Link href={`/experiences/${exp.id}/book?date=${selectedDate.toISOString().split('T')[0]}`} className="shrink-0 rounded-full bg-black/[0.05] hover:bg-black/[0.08] px-3 py-1.5 text-[13px] font-semibold">Book</Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6 min-w-0">
          <Card title="Wishlist" action={<button type="button" onClick={() => setTab('wishlist')} className="text-[13px] font-semibold text-espresso hover:underline">See all</button>}>
            {wishlist.length === 0 ? (
              <EmptyState Icon={Heart} title="Nothing saved yet" body="Tap the heart on any experience to save it." />
            ) : (
              <ul className="divide-y divide-hairline pb-2">
                {wishlist.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <Link href={`/experiences/${item.id}`} className="px-5 py-2.5 flex items-center gap-3 hover:bg-[#FAFAFC] min-w-0">
                      <Thumb src={item.images?.[0]?.url} alt={item.title} className="w-10 h-10" />
                      <span className="min-w-0 flex-1 text-[13px] font-semibold truncate">{item.title}</span>
                      <span className="text-[13px] text-stone-600 shrink-0">{money(item.price.amount, item.price.currency)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Itineraries" action={<Link href="/trip-planner" className="text-[13px] font-semibold text-espresso hover:underline">New</Link>}>
            {itineraries.length === 0 ? (
              <EmptyState Icon={Sparkles} title="No itineraries yet" body="Let the AI planner build a day-by-day plan." cta="Plan a trip" href="/trip-planner" />
            ) : (
              <ul className="divide-y divide-hairline pb-2">
                {itineraries.slice(0, 3).map((itin) => (
                  <li key={itin.id}>
                    <Link href={`/trip-planner?itinerary=${itin.id}`} className="px-5 py-2.5 flex items-center gap-3 hover:bg-[#FAFAFC] min-w-0">
                      <span className="w-10 h-10 rounded-[10px] bg-espresso-50 text-espresso flex items-center justify-center shrink-0"><Map className="w-4 h-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold truncate">{itin.experiences.length} stops</span>
                        <span className="block text-[12px] text-stone-500">{new Date(itin.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </span>
                      <span className="text-[13px] font-semibold shrink-0">{money(itin.totalCost.amount, itin.totalCost.currency)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );

  const renderBookingsTab = () => (
    <Card
      className="animate-fade-in"
      title={`${bookings.length} ${bookingFilter} trip${bookings.length === 1 ? '' : 's'}`}
      action={
        <Segmented
          label="Trip status"
          value={bookingFilter}
          onChange={setBookingFilter}
          options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }, { value: 'cancelled', label: 'Cancelled' }]}
        />
      }
    >
      {loading ? (
        <ul className="divide-y divide-hairline">{[1, 2, 3].map((i) => <li key={i} className="px-5 py-4"><span className="block h-10 rounded-[10px] shimmer" /></li>)}</ul>
      ) : bookings.length === 0 ? (
        <EmptyState Icon={Luggage} title={`No ${bookingFilter} trips`} body={bookingFilter === 'upcoming' ? 'Find something to look forward to.' : 'Trips will show up here once they happen.'} cta="Find an experience" href="/experiences" />
      ) : (
        <div className="pb-2">
          <BookingTable rows={bookings} />
          {bookings.some((b) => b.cancellationPolicy) && (
            <p className="px-5 pt-3 text-[12px] text-stone-500">Cancellation policies: {Object.values(CANCELLATION_POLICY_LABELS).join(' · ')}</p>
          )}
        </div>
      )}
    </Card>
  );

  const renderItinerariesTab = () => (
    <Card
      className="animate-fade-in"
      title={`${itineraries.length} saved itinerar${itineraries.length === 1 ? 'y' : 'ies'}`}
      action={<Link href="/trip-planner" className="btn-primary !py-1.5 !px-3.5 text-[13px]"><Plus className="w-4 h-4" />New itinerary</Link>}
    >
      {itineraries.length === 0 ? (
        <EmptyState Icon={Sparkles} title="No saved itineraries yet" body="Describe your trip and the AI planner will build a bookable plan." cta="Plan your first trip" href="/trip-planner" />
      ) : (
        <ul className="divide-y divide-hairline pb-2">
          {itineraries.map((itin) => (
            <li key={itin.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-[#FAFAFC]">
              <span className="w-10 h-10 rounded-[10px] bg-espresso-50 text-espresso flex items-center justify-center shrink-0"><Map className="w-4 h-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">{itin.experiences.length}-stop plan · {money(itin.totalCost.amount, itin.totalCost.currency)}</p>
                <p className="text-[12px] text-stone-500 truncate">
                  {itin.experiences.slice(0, 3).map((e) => e.experience?.title || e.experienceId).join(' → ')}
                  {itin.experiences.length > 3 && ` +${itin.experiences.length - 3} more`}
                </p>
              </div>
              <span className="text-[12px] text-stone-500 shrink-0">{new Date(itin.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <Link href={`/trip-planner?itinerary=${itin.id}`} className="shrink-0 rounded-full bg-black/[0.05] hover:bg-black/[0.08] px-3 py-1.5 text-[13px] font-semibold">Open</Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  const renderWishlistTab = () => (
    <div className="space-y-6 animate-fade-in">
      {wishlist.length === 0 ? (
        <Card><EmptyState Icon={Heart} title="Your wishlist is empty" body="As you browse, tap the heart to save experiences." cta="Browse experiences" href="/experiences" /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {wishlist.map((item) => (
            <div key={item.id} className="rounded-[18px] bg-white ring-1 ring-hairline overflow-hidden min-w-0">
              <Link href={`/experiences/${item.id}`} className="block aspect-[16/10] bg-stone-200">
                {item.images?.[0]?.url && <img src={item.images[0].url} alt={item.title} className="w-full h-full object-cover" />}
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/experiences/${item.id}`} className="text-[15px] font-semibold leading-snug hover:underline">{item.title}</Link>
                  <IconButton label="Remove from wishlist" onClick={() => { void removeFromWishlist(item.id); }}><Heart className="w-4 h-4 fill-espresso text-espresso" /></IconButton>
                </div>
                <div className="mt-1"><StarRating value={item.averageRating} readonly size="sm" /></div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[14px]"><span className="font-semibold">{money(item.price.amount, item.price.currency)}</span><span className="text-stone-500"> / guest</span></p>
                  <Link href={`/experiences/${item.id}/book`} className="btn-primary !py-1.5 !px-3.5 text-[13px]">Book</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfileTab = () => (
    <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
      <Card className="h-fit">
        <div className="p-6 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-ink text-white text-3xl font-semibold overflow-hidden flex items-center justify-center">
            {profileForm.profilePhotoUrl || user.profile?.profilePhotoUrl
              ? <img src={profileForm.profilePhotoUrl || user.profile?.profilePhotoUrl} alt={displayName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              : avatarInitial}
          </div>
          <p className="mt-4 text-[20px] font-bold tracking-[-0.02em]">{displayName}</p>
          <p className="text-[13px] text-stone-500">{user.email}</p>
          <div className="mt-5 grid grid-cols-3 divide-x divide-hairline rounded-[12px] ring-1 ring-hairline">
            {[[allBookings.length, 'Trips'], [wishlist.length, 'Saved'], [itineraries.length, 'Plans']].map(([v, l]) => (
              <div key={l as string} className="py-2.5"><p className="text-[17px] font-bold">{v}</p><p className="text-[11px] text-stone-500">{l}</p></div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="lg:col-span-2" title="Personal information">
        <div className="px-5 pb-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block"><span className="block text-[13px] font-semibold mb-1.5">First name</span>
              <input value={profileForm.firstName} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} className={field} /></label>
            <label className="block"><span className="block text-[13px] font-semibold mb-1.5">Last name</span>
              <input value={profileForm.lastName} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} className={field} /></label>
          </div>
          <label className="block"><span className="block text-[13px] font-semibold mb-1.5">Profile photo URL</span>
            <input type="url" value={profileForm.profilePhotoUrl} onChange={(e) => setProfileForm((p) => ({ ...p, profilePhotoUrl: e.target.value }))} placeholder="https://example.com/photo.jpg" className={field} /></label>
          <label className="block"><span className="block text-[13px] font-semibold mb-1.5">About you</span>
            <textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} rows={4} className={`${field} resize-none`} placeholder="Where you’re from, what you love about travel…" /></label>
          <div>
            <span className="block text-[13px] font-semibold mb-1.5">Travel interests</span>
            <div className="flex gap-2">
              <input value={prefInput} onChange={(e) => setPrefInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPreference(); } }} placeholder="e.g. food, history, beaches" className={field} />
              <button type="button" onClick={addPreference} className="btn-outline !py-2 !px-4 text-[13px] shrink-0">Add</button>
            </div>
            {profileForm.travelPreferences.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {profileForm.travelPreferences.map((pref) => (
                  <span key={pref} className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] pl-3 pr-1.5 py-1 text-[13px]">
                    {pref}
                    <button type="button" onClick={() => removePreference(pref)} className="w-5 h-5 rounded-full hover:bg-black/10 flex items-center justify-center" aria-label={`Remove ${pref}`}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-hairline flex justify-end">
            <button type="button" onClick={() => { void saveProfile(); }} disabled={profileSaving} className="btn-primary !py-2 !px-5 text-[14px]">
              {profileSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <>
      <DashboardShell
        nav={nav}
        links={links}
        navLabel="Travel"
        user={{ name: displayName, email: user.email, initial: avatarInitial, photo: user.profile?.profilePhotoUrl, role: 'Traveler' }}
        onLogout={() => { logout(); void router.push('/'); }}
        title={TITLES[tab].title}
        subtitle={TITLES[tab].subtitle}
        actions={tab === 'dashboard' ? (
          <>
            <Link href="/trip-planner" className="btn-outline !py-2 !px-4 text-[14px]"><Sparkles className="w-4 h-4" />Plan with AI</Link>
            <Link href="/experiences" className="btn-primary !py-2 !px-4 text-[14px]"><Plus className="w-4 h-4" />Book experience</Link>
          </>
        ) : undefined}
        search={
          <form onSubmit={handleDashboardSearch} role="search" className="max-w-md flex items-center gap-2 rounded-[10px] bg-black/[0.05] focus-within:bg-white focus-within:ring-2 focus-within:ring-espresso/30 px-3 h-9 transition">
            <Search className="w-4 h-4 text-stone-500 shrink-0" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search experiences" className="flex-1 min-w-0 bg-transparent text-[14px] outline-none placeholder:text-stone-500" />
          </form>
        }
      >
        {tab === 'dashboard' && renderOverview()}
        {tab === 'bookings' && renderBookingsTab()}
        {tab === 'itineraries' && renderItinerariesTab()}
        {tab === 'wishlist' && renderWishlistTab()}
        {tab === 'profile' && renderProfileTab()}
      </DashboardShell>

      {cancelModal && (
        <Modal title="Cancel booking" onClose={() => setCancelModal(null)}>
          <p className="text-[15px]">Cancel your booking for <span className="font-semibold">{cancelModal.experience?.title}</span>?</p>
          {cancelModal.cancellationPolicy && (
            <div className="mt-4 rounded-[12px] bg-[#FAFAFC] ring-1 ring-hairline p-4">
              <p className="text-[13px] font-semibold">Cancellation policy</p>
              <p className="text-[13px] text-stone-600 mt-0.5">{CANCELLATION_POLICY_LABELS[cancelModal.cancellationPolicy]}</p>
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setCancelModal(null)} className="btn-outline !py-2.5 text-[14px]">Keep booking</button>
            <button type="button" onClick={() => { void confirmCancel(); }} className="btn !py-2.5 text-[14px] bg-[#D70015] text-white hover:bg-[#A50011]">Cancel booking</button>
          </div>
        </Modal>
      )}

      {reviewModal && (
        <Modal title="Write a review" onClose={() => setReviewModal(null)}>
          <p className="text-[13px] font-semibold mb-2">How was it?</p>
          <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
          <label className="block mt-5">
            <span className="flex justify-between text-[13px] font-semibold mb-1.5">Your review <span className="font-normal text-stone-500">{reviewComment.length}/1000</span></span>
            <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value.slice(0, 1000))} rows={4} className={`${field} resize-none`} placeholder="What did you love? What should future guests know?" />
          </label>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setReviewModal(null)} className="btn-outline !py-2.5 text-[14px]">Cancel</button>
            <button type="button" onClick={() => { void submitReview(); }} className="btn-primary !py-2.5 text-[14px]">Submit review</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function TravelerDashboard() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <TravelerDashboardInner />
    </Suspense>
  );
}
