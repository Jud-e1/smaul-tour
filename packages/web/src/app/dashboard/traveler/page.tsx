'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { bookingsApi, tripPlannerApi, userApi, paymentsApi, reviewsApi, experiencesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
import { useNotifications } from '@/hooks/useNotifications';
import StarRating from '@/components/ui/StarRating';
import BrandLogo from '@/components/brand/BrandLogo';
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
  const cls = 'w-5 h-5 text-forest-600';
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

export default function TravelerDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const notificationList = useNotifications(true).notifications as { status?: string }[];
  const unreadCount = notificationList.filter((n) => n.status !== 'read').length;

  const [tab, setTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    if (!user) { void router.push('/login'); return; }
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
  }, [user, router]);

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

  const navItems: { key: Tab | 'explore' | 'notifications' | 'settings'; label: string; icon: string; href?: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'explore', label: 'Explore', icon: 'explore', href: '/experiences' },
    { key: 'bookings', label: 'My Bookings', icon: 'bookings' },
    { key: 'itineraries', label: 'Itineraries', icon: 'itineraries' },
    { key: 'wishlist', label: 'Wishlist', icon: 'wishlist' },
    { key: 'notifications', label: 'Notifications', icon: 'notifications', href: '/settings/notifications' },
    { key: 'profile', label: 'Profile', icon: 'profile' },
    { key: 'settings', label: 'Settings', icon: 'settings', href: '/settings/notifications' },
  ];

  const stats: { label: string; value: string | number; icon: StatIconName }[] = [
    { label: 'Total Bookings', value: allBookings.length, icon: 'bookings' },
    { label: 'Upcoming Trips', value: upcomingCount, icon: 'upcoming' },
    { label: 'Total Spent', value: `$${totalSpent.toFixed(0)}`, icon: 'spent' },
    { label: 'Wishlist', value: wishlist.length, icon: 'wishlist' },
  ];

  const renderSidebar = () => (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-100/80 shadow-soft transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
      style={{ width: '260px', minHeight: '100vh' }}
    >
      <div className="px-5 pt-6 pb-4">
        <Link href="/" className="block" onClick={() => setSidebarOpen(false)} aria-label="Nsoroma home">
          <BrandLogo className="h-28 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const active = tab === item.key && !item.href;
          const cls = `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
            active
              ? 'traveler-nav-active'
              : 'text-slate-500 hover:bg-forest-50 hover:text-forest-700'
          }`;
          if (item.href) {
            return (
              <Link key={item.key} href={item.href} className={cls} onClick={() => setSidebarOpen(false)}>
                <NavIcon name={item.icon} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.key === 'notifications' && unreadCount > 0 && (
                  <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-forest-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          }
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => { setTab(item.key as Tab); setSidebarOpen(false); }}
              className={cls}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-slate-100 space-y-2">
        <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-2xl bg-slate-50/80">
          <div className="w-10 h-10 rounded-full bg-forest-600 text-white flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
            {user.profile?.profilePhotoUrl
              ? <img src={user.profile.profilePhotoUrl} alt={firstName} className="w-full h-full object-cover" />
              : avatarInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slateink truncate">{displayName}</p>
            <p className="text-[11px] text-slate-400 font-medium">Traveler</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { logout(); void router.push('/'); }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <NavIcon name="signout" />
          Sign out
        </button>
      </div>
    </aside>
  );

  const renderDiscoverSection = () => (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 min-w-0 space-y-6">
        {/* Greeting header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">
                {greeting}, {firstName}{' '}
                <span className="inline-block animate-wave" aria-hidden>👋</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Ready to explore your next adventure?
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
              <svg className="w-3.5 h-3.5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Accra, Ghana
            </span>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto lg:max-w-md lg:flex-1">
            <form onSubmit={handleDashboardSearch} className="flex-1 relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destinations, experiences, or activities..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-200 bg-white text-sm text-slateink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-200 focus:border-forest-400 shadow-sm"
              />
            </form>
            <Link
              href="/settings/notifications"
              className="relative w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-forest-600 hover:border-forest-200 transition-colors shadow-sm shrink-0"
              title="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </Link>
            <button
              type="button"
              onClick={() => setTab('profile')}
              className="w-10 h-10 rounded-full bg-forest-600 text-white flex items-center justify-center text-sm font-bold overflow-hidden shadow-sm shrink-0"
              aria-label="Open profile"
            >
              {user.profile?.profilePhotoUrl
                ? <img src={user.profile.profilePhotoUrl} alt={firstName} className="w-full h-full object-cover" />
                : avatarInitial}
            </button>
          </div>
        </div>

        {/* Hero + Featured */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 traveler-hero relative overflow-hidden min-h-[220px] p-6 sm:p-7 flex flex-col justify-between">
            {featured?.images?.[0] && (
              <img
                src={featured.images[0].url || featured.images[0].thumbnailUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-35"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-forest-800/95 via-forest-700/85 to-forest-600/40" />
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-forest-100/90 mb-2">
                Your next adventure awaits
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight max-w-md">
                Discover your next experience
              </h2>
              <p className="mt-2 text-sm text-white/75 max-w-sm">
                Handpicked local experiences across Ghana — culture, nature, food, and more.
              </p>
            </div>
            <form onSubmit={handleHeroSearch} className="relative z-10 mt-5 flex flex-col sm:flex-row gap-2 max-w-lg">
              <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-3.5 py-2.5 shadow-sm">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Where do you want to go?"
                  className="flex-1 bg-transparent border-none outline-none text-sm text-slateink placeholder:text-slate-400"
                />
              </div>
              <button type="submit" className="traveler-btn-primary px-5 py-2.5 text-sm whitespace-nowrap shadow-md w-full sm:w-auto">
                Search
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            {featured ? (
              <div className="traveler-card traveler-card-hover h-full overflow-hidden flex flex-col">
                <div className="relative h-40 sm:h-44 overflow-hidden">
                  {featured.images?.[0] ? (
                    <img
                      src={featured.images[0].thumbnailUrl || featured.images[0].url}
                      alt={featured.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-forest-100" />
                  )}
                  {(featured.averageRating || 0) >= 4.5 && (
                    <span className="absolute top-3 left-3 rounded-lg bg-white/95 text-forest-700 text-[10px] font-bold px-2 py-1 shadow-sm">
                      Top Rated
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { void toggleWishlist(featured.id); }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                    aria-label="Toggle wishlist"
                  >
                    <svg
                      className={`w-4 h-4 ${wishlistIds.has(featured.id) ? 'text-red-500 fill-red-500' : 'text-slate-400'}`}
                      fill={wishlistIds.has(featured.id) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-slateink text-sm leading-snug line-clamp-2">{featured.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                    <svg className="w-3 h-3 text-forest-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {featured.location?.address || 'Accra, Ghana'}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <StarRating value={featured.averageRating || 0} readonly size="sm" />
                    {formatDuration(featured.duration) && (
                      <span className="font-medium">{formatDuration(featured.duration)}</span>
                    )}
                  </div>
                  <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slateink">
                      {featured.price.currency} {featured.price.amount.toFixed(0)}
                      <span className="text-[11px] font-medium text-slate-400"> / person</span>
                    </p>
                    <Link
                      href={`/experiences/${featured.id}`}
                      className="traveler-btn-primary text-xs px-3.5 py-2 inline-flex items-center gap-1"
                    >
                      View Details
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                  {experiences.length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-3">
                      {experiences.slice(0, 5).map((exp) => (
                        <button
                          key={exp.id}
                          type="button"
                          onClick={() => setFeaturedId(exp.id)}
                          className={`h-1.5 rounded-full transition-all ${
                            featured.id === exp.id ? 'w-5 bg-forest-600' : 'w-1.5 bg-slate-200 hover:bg-forest-300'
                          }`}
                          aria-label={`Featured: ${exp.title}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="traveler-card h-full min-h-[220px] flex items-center justify-center text-sm text-slate-400 p-6">
                {discoverLoading ? 'Loading featured…' : 'No featured experiences yet'}
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {CATEGORY_PILLS.map((cat) => (
            <Link
              key={cat.category}
              href={`/experiences?categories=${encodeURIComponent(cat.category)}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:border-forest-300 hover:text-forest-700 hover:bg-forest-50 transition-colors shadow-sm"
            >
              <CategoryIcon name={cat.icon} />
              {cat.label}
            </Link>
          ))}
          <Link
            href="/experiences"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:border-forest-300 hover:text-forest-700 hover:bg-forest-50 transition-colors shadow-sm"
          >
            <CategoryIcon name="more" />
            More
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="traveler-card p-4 traveler-card-hover">
              <div className="w-10 h-10 rounded-full bg-forest-50 flex items-center justify-center mb-3">
                <StatIcon name={stat.icon} />
              </div>
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slateink mt-0.5 tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Discover the world */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-slateink">Discover the world</h2>
              <p className="text-sm text-slate-500 mt-0.5">Experiences curated for you</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white border border-slate-200 p-1 shadow-sm self-start">
              {(['recommended', 'popular', 'trending'] as DiscoverTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDiscoverTab(t)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                    discoverTab === t
                      ? 'bg-forest-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-forest-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {discoverLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="traveler-card h-72 animate-pulse bg-slate-100" />
              ))}
            </div>
          ) : experiences.length === 0 ? (
            <div className="traveler-card text-center py-12 text-sm text-slate-500">
              No experiences found.{' '}
              <Link href="/experiences" className="text-forest-600 font-semibold hover:underline">Browse all</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {experiences.slice(0, 8).map((exp, i) => {
                const img = exp.images?.[0];
                const badge = discoverBadge(exp, discoverTab, i);
                const duration = formatDuration(exp.duration);
                return (
                  <div key={exp.id} className="traveler-card traveler-card-hover overflow-hidden flex flex-col">
                    <div className="relative h-40 overflow-hidden">
                      {img ? (
                        <img src={img.thumbnailUrl || img.url} alt={exp.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-forest-50" />
                      )}
                      {badge && (
                        <span className="absolute top-3 left-3 rounded-lg bg-white/95 text-forest-700 text-[10px] font-bold px-2 py-1 shadow-sm">
                          {badge}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => { void toggleWishlist(exp.id); }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:bg-white"
                        aria-label="Toggle wishlist"
                      >
                        <svg
                          className={`w-4 h-4 ${wishlistIds.has(exp.id) ? 'text-red-500 fill-red-500' : 'text-slate-400'}`}
                          fill={wishlistIds.has(exp.id) ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-3.5 flex flex-col flex-1">
                      <h3 className="font-bold text-sm text-slateink line-clamp-2 leading-snug">{exp.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">{exp.location?.address}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                        <StarRating value={exp.averageRating || 0} readonly size="sm" />
                        {exp.reviewCount > 0 && <span>({exp.reviewCount})</span>}
                      </div>
                      {duration && (
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">{duration}</p>
                      )}
                      <div className="mt-auto pt-3 space-y-2">
                        <p className="text-sm font-bold text-slateink">
                          {exp.price.currency} {exp.price.amount.toFixed(0)}
                          <span className="text-[11px] font-medium text-slate-400"> / person</span>
                        </p>
                        <div className="flex gap-2">
                          <Link
                            href={`/experiences/${exp.id}`}
                            className="flex-1 text-center traveler-btn-primary text-xs py-2"
                          >
                            View Details
                          </Link>
                          <Link
                            href={`/experiences/${exp.id}/book?date=${selectedDate.toISOString().split('T')[0]}`}
                            className="px-3 py-2 rounded-xl border border-forest-200 text-forest-700 text-xs font-semibold hover:bg-forest-50 transition-colors"
                          >
                            Book
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Lower row: wishlist + itineraries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="traveler-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slateink text-sm">Your Wishlist</h3>
              <button
                type="button"
                onClick={() => setTab('wishlist')}
                className="text-xs font-semibold text-forest-600 hover:underline"
              >
                See all
              </button>
            </div>
            {wishlist.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                No saved experiences yet.{' '}
                <Link href="/experiences" className="text-forest-600 font-semibold hover:underline">Explore</Link>
              </p>
            ) : (
              <DraggableScroll>
                {wishlist.slice(0, 8).map((item) => (
                  <Link
                    key={item.id}
                    href={`/experiences/${item.id}`}
                    className="shrink-0 w-40 traveler-card overflow-hidden border border-slate-100"
                  >
                    {item.images?.[0]?.url ? (
                      <img src={item.images[0].url} alt={item.title} className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-24 bg-forest-50" />
                    )}
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-slateink line-clamp-2 leading-snug">{item.title}</p>
                      <p className="text-[11px] font-bold text-forest-700 mt-1">
                        {item.price.currency} {item.price.amount.toFixed(0)}
                      </p>
                    </div>
                  </Link>
                ))}
              </DraggableScroll>
            )}
          </div>

          <div className="traveler-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slateink text-sm">Your Itineraries</h3>
              <Link href="/trip-planner" className="text-xs font-semibold text-forest-600 hover:underline">
                Plan a trip
              </Link>
            </div>
            {itineraries.length === 0 ? (
              <div className="rounded-2xl bg-forest-600 text-white p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-forest-100">AI Trip Planner</p>
                  <p className="text-sm font-semibold mt-1">Build a custom itinerary in minutes</p>
                </div>
                <Link
                  href="/trip-planner"
                  className="inline-flex items-center justify-center rounded-xl bg-white text-forest-700 text-xs font-bold px-4 py-2.5 hover:bg-forest-50 transition-colors shrink-0"
                >
                  Plan My Trip
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {itineraries.slice(0, 4).map((itin) => (
                  <li key={itin.id}>
                    <Link
                      href={`/trip-planner?itinerary=${itin.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-forest-50/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slateink truncate">
                          {itin.experiences.length} experience{itin.experiences.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(itin.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-forest-700 shrink-0">
                        {itin.totalCost.currency} {itin.totalCost.amount.toFixed(0)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Right rail */}
      <aside className="xl:w-[300px] shrink-0 space-y-4">
        <div className="traveler-card overflow-hidden">
          {nextTrip ? (
            <>
              {nextTrip.experience?.images?.[0]?.url && (
                <div className="relative h-36">
                  <img
                    src={nextTrip.experience.images[0].url}
                    alt={nextTrip.experience.title || 'Upcoming trip'}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 rounded-lg bg-forest-50 text-forest-700 text-[10px] font-bold px-2 py-1">
                    Upcoming
                  </span>
                </div>
              )}
              <div className="p-4">
                {!nextTrip.experience?.images?.[0]?.url && (
                  <span className="inline-block rounded-lg bg-forest-50 text-forest-700 text-[10px] font-bold px-2 py-1 mb-2">
                    Upcoming
                  </span>
                )}
                <h3 className="font-bold text-slateink text-sm leading-snug">
                  {nextTrip.experience?.title || 'Confirmed booking'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(nextTrip.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {nextTrip.startTime ? ` · ${nextTrip.startTime}` : ''}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">#{nextTrip.referenceNumber}</p>
                <div className="flex flex-col gap-2 mt-4">
                  {nextTrip.experience?.id ? (
                    <Link
                      href={`/experiences/${nextTrip.experience.id}`}
                      className="w-full text-center text-xs font-semibold py-2.5 rounded-xl border border-forest-200 text-forest-700 hover:bg-forest-50 transition-colors"
                    >
                      View Experience
                    </Link>
                  ) : null}
                  {nextTrip.paymentId ? (
                    <button
                      type="button"
                      onClick={() => { void downloadReceipt(nextTrip.paymentId!); }}
                      className="w-full traveler-btn-primary text-xs py-2.5"
                    >
                      Download Receipt
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { void downloadConfirmation(nextTrip.id); }}
                      className="w-full traveler-btn-primary text-xs py-2.5"
                    >
                      Download Confirmation
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-forest-50 flex items-center justify-center mx-auto mb-3">
                <StatIcon name="upcoming" />
              </div>
              <h3 className="font-bold text-slateink text-sm">No upcoming trips</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Book an experience to see it here.</p>
              <Link href="/experiences" className="inline-flex traveler-btn-primary text-xs px-4 py-2.5">
                Browse experiences
              </Link>
            </div>
          )}
        </div>

        <div className="traveler-card overflow-hidden bg-gradient-to-br from-forest-700 to-forest-500 text-white p-5 relative">
          <span className="absolute top-3 right-3 rounded-md bg-white/20 text-[10px] font-bold px-2 py-0.5">
            Beta
          </span>
          <p className="text-xs font-bold uppercase tracking-wider text-forest-100">AI Trip Planner</p>
          <p className="text-sm font-semibold mt-2 leading-snug">
            Tell us your vibe — we&apos;ll craft a day-by-day plan.
          </p>
          <Link
            href="/trip-planner"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white text-forest-700 text-xs font-bold px-4 py-2.5 hover:bg-forest-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Plan My Trip
          </Link>
        </div>

        {wishlist.length > 0 && (
          <div className="traveler-card p-4">
            <h3 className="font-bold text-slateink text-sm mb-3">Recent wishlist</h3>
            <ul className="space-y-2.5">
              {wishlist.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <Link href={`/experiences/${item.id}`} className="flex items-center gap-2.5 group">
                    {item.images?.[0]?.url ? (
                      <img src={item.images[0].url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-forest-50 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slateink truncate group-hover:text-forest-700">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.price.currency} {item.price.amount.toFixed(0)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );

  const renderBookingsTab = () => (
    <div className="animate-fade-in max-w-4xl">
      <h2 className="text-xl font-bold text-slateink mb-4">Your Bookings</h2>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(['upcoming', 'past', 'cancelled'] as BookingStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setBookingFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
              bookingFilter === s
                ? 'bg-forest-600 text-white shadow-sm'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-forest-300 hover:text-forest-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 traveler-card animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="traveler-card text-center py-14">
          <p className="text-slate-500 font-semibold text-sm">No {bookingFilter} bookings</p>
          <Link href="/experiences" className="inline-block mt-2 text-sm text-forest-600 font-semibold hover:underline">
            Browse experiences →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="traveler-card traveler-card-hover overflow-hidden">
              <div className="flex gap-3 p-4">
                {booking.experience?.images?.[0]?.url && (
                  <img
                    src={booking.experience.images[0].url}
                    alt={booking.experience.title}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/experiences/${booking.experience?.id}`}
                        className="font-bold text-slateink text-sm hover:text-forest-700 transition-colors"
                      >
                        {booking.experience?.title || 'Experience'}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(booking.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        · {booking.startTime}
                      </p>
                      <p className="text-[10px] text-slate-300 mt-0.5 font-mono">#{booking.referenceNumber}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          booking.status === 'confirmed'
                            ? 'bg-forest-50 text-forest-700'
                            : booking.status === 'completed'
                              ? 'bg-forest-50 text-forest-700'
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {booking.status}
                      </span>
                      <p className="text-sm font-bold text-slateink mt-1">
                        {booking.totalCurrency} {booking.totalAmount?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {booking.cancellationPolicy && (
                    <p className="text-[10px] text-slate-300 mt-1">
                      {CANCELLATION_POLICY_LABELS[booking.cancellationPolicy]}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {booking.status === 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => setCancelModal(booking)}
                        className="text-[10px] text-red-500 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    {booking.status === 'completed' && (
                      <button
                        type="button"
                        onClick={() =>
                          setReviewModal({
                            bookingId: booking.id,
                            experienceId: booking.experience?.id || '',
                          })
                        }
                        className="text-[10px] text-forest-600 border border-forest-200 px-2.5 py-1 rounded-lg hover:bg-forest-50 font-semibold transition-colors"
                      >
                        ★ Review
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { void downloadConfirmation(booking.id); }}
                      className="text-[10px] text-slate-400 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Download
                    </button>
                    {booking.paymentId && (
                      <button
                        type="button"
                        onClick={() => { void downloadReceipt(booking.paymentId!); }}
                        className="text-[10px] text-slate-400 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Receipt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderItinerariesTab = () => (
    <div className="animate-fade-in max-w-4xl">
      <div className="flex justify-between items-center mb-5 gap-3">
        <h2 className="text-xl font-bold text-slateink">Saved Itineraries</h2>
        <Link href="/trip-planner" className="traveler-btn-primary text-sm px-4 py-2">
          + New Itinerary
        </Link>
      </div>
      {itineraries.length === 0 ? (
        <div className="traveler-card text-center py-14">
          <p className="text-slate-500 font-semibold text-sm">No saved itineraries yet</p>
          <Link href="/trip-planner" className="inline-block mt-2 text-sm text-forest-600 font-semibold hover:underline">
            Plan your first trip →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {itineraries.map((itin) => (
            <div key={itin.id} className="traveler-card traveler-card-hover p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slateink text-sm">
                    {itin.experiences.length} experience{itin.experiences.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generated{' '}
                    {new Date(itin.generatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    {itin.experiences
                      .slice(0, 3)
                      .map((e) => e.experience?.title || e.experienceId)
                      .join(' · ')}
                    {itin.experiences.length > 3 && ` +${itin.experiences.length - 3} more`}
                  </p>
                </div>
                <span className="font-bold text-forest-700 shrink-0">
                  {itin.totalCost.currency} {itin.totalCost.amount.toFixed(0)}
                </span>
              </div>
              <Link
                href={`/trip-planner?itinerary=${itin.id}`}
                className="inline-block mt-3 text-xs text-forest-600 border border-forest-200 px-3 py-1.5 rounded-lg hover:bg-forest-50 font-semibold transition-colors"
              >
                View in Trip Planner →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderWishlistTab = () => (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-slateink mb-5">Saved Experiences</h2>
      {wishlist.length === 0 ? (
        <div className="traveler-card text-center py-14 max-w-4xl">
          <p className="text-slate-500 font-semibold text-sm">Your wishlist is empty</p>
          <Link href="/experiences" className="inline-block mt-2 text-sm text-forest-600 font-semibold hover:underline">
            Browse experiences →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.map((item) => (
            <div key={item.id} className="traveler-card traveler-card-hover overflow-hidden group">
              {item.images?.[0]?.url && (
                <div className="relative h-32 overflow-hidden">
                  <img
                    src={item.images[0].url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-3.5">
                <Link
                  href={`/experiences/${item.id}`}
                  className="font-bold text-slateink text-sm hover:text-forest-700 transition-colors block"
                >
                  {item.title}
                </Link>
                <div className="flex items-center justify-between mt-2 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <StarRating value={item.averageRating} readonly size="sm" />
                    <span className="text-sm font-bold text-slateink truncate">
                      {item.price.currency} {item.price.amount.toFixed(2)}
                    </span>
                  </div>
                  <Link
                    href={`/experiences/${item.id}/book`}
                    className="text-[10px] text-white bg-forest-600 px-2.5 py-1 rounded-lg hover:bg-forest-700 font-semibold shrink-0"
                  >
                    Book
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => { void removeFromWishlist(item.id); }}
                  className="mt-2 text-[10px] text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 px-2 py-0.5 rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfileTab = () => (
    <div className="traveler-card p-5 max-w-lg animate-fade-in">
      <h2 className="text-xl font-bold text-slateink mb-4">Edit Profile</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              First name
            </label>
            <input
              value={profileForm.firstName}
              onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-200 focus:border-forest-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              Last name
            </label>
            <input
              value={profileForm.lastName}
              onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-200 focus:border-forest-400"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
            Profile photo URL
          </label>
          <input
            type="url"
            value={profileForm.profilePhotoUrl}
            onChange={(e) => setProfileForm((p) => ({ ...p, profilePhotoUrl: e.target.value }))}
            placeholder="https://example.com/photo.jpg"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-200 focus:border-forest-400"
          />
          {profileForm.profilePhotoUrl && (
            <img
              src={profileForm.profilePhotoUrl}
              alt="Preview"
              className="mt-2 w-14 h-14 rounded-full object-cover border-2 border-black/[0.07]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Bio</label>
          <textarea
            value={profileForm.bio}
            onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
            rows={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-200 focus:border-forest-400 resize-none"
            placeholder="Tell us about yourself..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
            Travel preferences
          </label>
          <div className="flex gap-2 mb-2">
            <input
              value={prefInput}
              onChange={(e) => setPrefInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addPreference();
                }
              }}
              placeholder="e.g. food, adventure, culture"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-200 focus:border-forest-400"
            />
            <button
              type="button"
              onClick={addPreference}
              className="px-3 py-2 bg-forest-50 text-forest-700 rounded-xl text-sm hover:bg-forest-100 font-bold transition-colors"
            >
              Add
            </button>
          </div>
          {profileForm.travelPreferences.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profileForm.travelPreferences.map((pref) => (
                <span
                  key={pref}
                  className="inline-flex items-center gap-1 bg-forest-50 border border-forest-200 text-forest-700 text-xs px-2.5 py-0.5 rounded-full font-semibold"
                >
                  {pref}
                  <button type="button" onClick={() => removePreference(pref)} className="hover:text-forest-900 leading-none">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => { void saveProfile(); }}
          disabled={profileSaving}
          className="w-full traveler-btn-primary py-3 text-sm disabled:opacity-50"
        >
          {profileSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen traveler-page-bg relative">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-slateink/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {renderSidebar()}

      <div className="flex-1 flex flex-col min-h-screen min-w-0 relative z-10">
        <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-forest-50 text-slate-500 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <BrandLogo variant="mark" decorative className="h-9 w-9 object-contain" />
          <span className="font-bold text-slateink">Nsoroma</span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/settings/notifications"
              className="relative w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500"
            >
              <NavIcon name="notifications" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 xl:p-8 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto">
            {tab === 'dashboard' && renderDiscoverSection()}
            {tab === 'bookings' && renderBookingsTab()}
            {tab === 'itineraries' && renderItinerariesTab()}
            {tab === 'wishlist' && renderWishlistTab()}
            {tab === 'profile' && renderProfileTab()}
          </div>
        </main>
      </div>

      {cancelModal && (
        <div className="fixed inset-0 bg-slateink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-scale-in">
            <h3 className="font-bold text-slateink mb-1.5">Cancel Booking</h3>
            <p className="text-sm text-slate-500 mb-3">
              Cancel your booking for{' '}
              <span className="font-semibold text-slate-700">{cancelModal.experience?.title}</span>?
            </p>
            {cancelModal.cancellationPolicy && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs font-bold text-amber-700 mb-0.5">Cancellation Policy</p>
                <p className="text-xs text-amber-600">
                  {CANCELLATION_POLICY_LABELS[cancelModal.cancellationPolicy]}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={() => { void confirmCancel(); }}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewModal && (
        <div className="fixed inset-0 bg-slateink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-scale-in">
            <h3 className="font-bold text-slateink mb-4">Leave a Review</h3>
            <div className="mb-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                Rating
              </label>
              <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
            </div>
            <div className="mb-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                Comment{' '}
                <span className="text-slate-300 font-normal normal-case">({reviewComment.length}/1000)</span>
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value.slice(0, 1000))}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-200 focus:border-forest-400 resize-none"
                placeholder="Share your experience..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void submitReview(); }}
                className="flex-1 traveler-btn-primary py-2.5 text-sm"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
