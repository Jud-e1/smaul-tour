'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { bookingsApi, tripPlannerApi, userApi, paymentsApi, reviewsApi, experiencesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
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

// ── Animated floating orb ────────────────────────────────────────────────
function FloatingOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl opacity-15 animate-drift pointer-events-none ${className}`} />;
}

// ── Floating green particles ─────────────────────────────────────────────
function Particles() {
  const dots = [
    { style: { top: '15%', left: '8%', animationDelay: '0s', width: 8, height: 8 } },
    { style: { top: '35%', left: '3%', animationDelay: '1.2s', width: 5, height: 5 } },
    { style: { top: '60%', left: '6%', animationDelay: '2.4s', width: 10, height: 10 } },
    { style: { top: '80%', left: '2%', animationDelay: '0.6s', width: 6, height: 6 } },
    { style: { top: '20%', right: '4%', animationDelay: '1.8s', width: 7, height: 7 } },
    { style: { top: '50%', right: '2%', animationDelay: '3s', width: 9, height: 9 } },
    { style: { top: '75%', right: '5%', animationDelay: '0.9s', width: 5, height: 5 } },
  ];
  return (
    <>
      {dots.map((d, i) => (
        <div
          key={i}
          className="fixed rounded-full bg-emerald-400 animate-float-particle pointer-events-none z-0"
          style={{ opacity: 0.35, position: 'fixed', ...d.style }}
        />
      ))}
    </>
  );
}

// ── Sidebar animated travel illustration ─────────────────────────────────
function SidebarIllustration({ name }: { name: string }) {
  return (
    <div className="relative h-36 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 via-green-400 to-emerald-600 mx-1">
      <div className="absolute inset-0 animate-pan-gradient bg-gradient-to-br from-emerald-300/50 via-transparent to-green-700/40" style={{ backgroundSize: '200% 200%' }} />
      {/* Clouds */}
      <div className="absolute top-3 left-2 right-2 flex justify-between animate-cloud-drift">
        <div className="w-10 h-3 bg-white/60 rounded-full blur-[2px]" />
        <div className="w-7 h-2.5 bg-white/50 rounded-full blur-[2px]" />
        <div className="w-12 h-3 bg-white/60 rounded-full blur-[2px]" />
      </div>
      {/* Floating traveler */}
      <div className="absolute inset-0 flex items-center justify-center animate-float-y">
        <svg viewBox="0 0 120 110" className="w-20 h-18 drop-shadow-xl" aria-hidden>
          <ellipse cx="60" cy="92" rx="22" ry="4" fill="#0A3417" opacity="0.2" />
          <rect x="49" y="64" width="22" height="24" rx="4" fill="#ffffff" />
          <rect x="44" y="66" width="7" height="14" rx="3" fill="#4ade80" />
          <circle cx="60" cy="54" r="11" fill="#FBBF24" />
          <ellipse cx="60" cy="43" rx="13" ry="3" fill="#0E4A22" />
          <rect x="54" y="37" width="12" height="7" rx="3" fill="#0E4A22" />
          <circle cx="56.5" cy="54" r="1.6" fill="white" />
          <circle cx="63.5" cy="54" r="1.6" fill="white" />
          <path d="M56 58 Q60 61 64 58" stroke="#0A3417" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M49 70 L40 61" stroke="#FBBF24" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M71 70 L80 63" stroke="#FBBF24" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="80" y1="63" x2="80" y2="48" stroke="#0E4A22" strokeWidth="1.8" />
          <path d="M80 48 L91 52 L80 56Z" fill="#22c55e" />
          <rect x="53" y="87" width="6" height="9" rx="2" fill="#0E4A22" />
          <rect x="61" y="87" width="6" height="9" rx="2" fill="#0E4A22" />
        </svg>
      </div>
      {/* Name badge */}
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-white text-xs font-bold drop-shadow-sm">{name}</span>
      </div>
    </div>
  );
}

// ── Nav icon set ─────────────────────────────────────────────────────────
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

function buildDateRange(count = 9) {
  const dates: Date[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// ── Draggable scroll container ────────────────────────────────────────────
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
    <div ref={ref} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory select-none"
      style={{ cursor: 'grab' }} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onMouseMove={onMouseMove}>
      {children}
    </div>
  );
}

export default function TravelerDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
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
  const [selectedDate, setSelectedDate] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [featuredId, setFeaturedId] = useState<string | null>(null);
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

  const dateRange = useMemo(() => buildDateRange(9), []);
  const totalSpent = allBookings.filter((b) => b.status === 'completed' || b.status === 'confirmed').reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const upcomingCount = allBookings.filter((b) => b.status === 'confirmed').length;

  const featured = useMemo(() => {
    if (!experiences.length) return null;
    if (featuredId) return experiences.find((e) => e.id === featuredId) ?? experiences[0];
    return experiences[0];
  }, [experiences, featuredId]);

  const sidebarRecommendations = useMemo(() => experiences.slice(1, 4), [experiences]);

  const fetchDiscover = useCallback(async (mode: DiscoverTab) => {
    setDiscoverLoading(true);
    try {
      const params: Record<string, unknown> = { pageSize: 8, page: 1 };
      if (mode === 'recommended') { params.sortBy = 'rating'; params.sortOrder = 'desc'; }
      else if (mode === 'popular') { params.sortBy = 'popularity'; params.sortOrder = 'desc'; }
      else { params.sortBy = 'rating'; params.sortOrder = 'desc'; }
      const { data } = await experiencesApi.list(params);
      const list: Experience[] = data.experiences || [];
      setExperiences(list);
      setFeaturedId((prev) => (prev && list.some((e) => e.id === prev) ? prev : list[0]?.id ?? null));
    } catch { setExperiences([]); }
    finally { setDiscoverLoading(false); }
  }, []);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    setProfileForm({ firstName: user.profile?.firstName || '', lastName: user.profile?.lastName || '', bio: user.profile?.bio || '', profilePhotoUrl: user.profile?.profilePhotoUrl || '', travelPreferences: [] });
    bookingsApi.getUserBookings(user.id, {}).then(({ data }: { data: Booking[] }) => setAllBookings(data || [])).catch(() => {});
    userApi.getWishlist(user.id).then(({ data }: { data: WishlistItem[] }) => { setWishlist(data || []); setWishlistIds(new Set((data || []).map((w) => w.id))); }).catch(() => {});
  }, [user, router]);

  useEffect(() => { if (!user) return; fetchDiscover(discoverTab); }, [user, discoverTab, fetchDiscover]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const statusMap: Record<BookingStatus, string> = { upcoming: 'confirmed', past: 'completed', cancelled: 'cancelled' };
    bookingsApi.getUserBookings(user.id, { status: statusMap[bookingFilter] }).then(({ data }: { data: Booking[] }) => setBookings(data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [user, bookingFilter]);

  useEffect(() => {
    if (!user || tab !== 'itineraries') return;
    tripPlannerApi.getItineraries().then(({ data }: { data: Itinerary[] }) => setItineraries(data || [])).catch(() => {});
  }, [user, tab]);

  useEffect(() => {
    if (!user || tab !== 'wishlist') return;
    userApi.getWishlist(user.id).then(({ data }: { data: WishlistItem[] }) => { setWishlist(data || []); setWishlistIds(new Set((data || []).map((w) => w.id))); }).catch(() => {});
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
        next.delete(itemId); await userApi.removeFromWishlist(user.id, itemId);
        setWishlist((prev) => prev.filter((w) => w.id !== itemId));
        toast('Removed from wishlist', 'info');
      } else {
        next.add(itemId); await userApi.addToWishlist(user.id, itemId);
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
      const booking: Booking = response.data;
      const content = ['BOOKING CONFIRMATION', '===================', `Reference: ${booking.referenceNumber}`, `Experience: ${booking.experience?.title || 'N/A'}`, `Date: ${new Date(booking.date).toLocaleDateString()} at ${booking.startTime}`, `Status: ${booking.status}`, `Amount: ${booking.totalCurrency} ${booking.totalAmount?.toFixed(2)}`, `Policy: ${booking.cancellationPolicy ? CANCELLATION_POLICY_LABELS[booking.cancellationPolicy] : 'N/A'}`].join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `booking-${booking.referenceNumber}.txt`; a.click(); URL.revokeObjectURL(url);
    } catch { toast('Could not download confirmation', 'error'); }
  };

  const downloadReceipt = async (paymentId: string) => {
    try { const { data } = await paymentsApi.getReceipt(paymentId); window.open(data.receiptUrl, '_blank'); }
    catch { toast('Could not open receipt', 'error'); }
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    try {
      await reviewsApi.create({ bookingId: reviewModal.bookingId, experienceId: reviewModal.experienceId, rating: reviewRating, comment: reviewComment });
      setReviewModal(null); setReviewRating(5); setReviewComment('');
      toast('Review submitted — thanks!', 'success');
    } catch { toast('Failed to submit review', 'error'); }
  };

  const addPreference = () => {
    const trimmed = prefInput.trim();
    if (trimmed && !profileForm.travelPreferences.includes(trimmed)) setProfileForm((p) => ({ ...p, travelPreferences: [...p.travelPreferences, trimmed] }));
    setPrefInput('');
  };
  const removePreference = (pref: string) => setProfileForm((p) => ({ ...p, travelPreferences: p.travelPreferences.filter((x) => x !== pref) }));

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      await userApi.updateProfile(user.id, { firstName: profileForm.firstName, lastName: profileForm.lastName, bio: profileForm.bio, profilePhotoUrl: profileForm.profilePhotoUrl, travelPreferences: profileForm.travelPreferences });
      toast('Profile updated!', 'success');
    } catch { toast('Failed to save profile', 'error'); }
    finally { setProfileSaving(false); }
  };

  const handleDashboardSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(searchQuery.trim() ? `/experiences?q=${encodeURIComponent(searchQuery.trim())}` : '/experiences');
  };

  if (!user) return null;

  const firstName = user.profile?.firstName || user.email?.split('@')[0] || 'Traveler';
  const lastName = user.profile?.lastName || '';
  const displayName = lastName ? `${firstName} ${lastName}` : firstName;
  const avatarInitial = firstName.charAt(0).toUpperCase();

  const navItems: { key: Tab | 'explore' | 'settings'; label: string; icon: string; href?: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'bookings', label: 'Bookings', icon: 'bookings' },
    { key: 'itineraries', label: 'Itineraries', icon: 'itineraries' },
    { key: 'wishlist', label: 'Wishlist', icon: 'wishlist' },
    { key: 'profile', label: 'Profile', icon: 'profile' },
    { key: 'explore', label: 'Explore', icon: 'explore', href: '/experiences' },
    { key: 'settings', label: 'Settings', icon: 'settings', href: '/settings/notifications' },
  ];

  const stats = [
    { label: 'Bookings', value: allBookings.length, icon: '📋', color: 'from-emerald-400 to-green-600' },
    { label: 'Upcoming', value: upcomingCount, icon: '✈️', color: 'from-green-400 to-emerald-500' },
    { label: 'Spent', value: `$${totalSpent.toFixed(0)}`, icon: '💳', color: 'from-emerald-500 to-green-700' },
    { label: 'Wishlist', value: wishlist.length, icon: '❤️', color: 'from-green-300 to-emerald-500' },
  ];

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  // ── SIDEBAR ────────────────────────────────────────────────────────────
  const renderSidebar = () => (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-100 shadow-2xl transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      style={{ width: '240px', minHeight: '100vh' }}
    >
      {/* Top green accent bar */}
      <div className="h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 shrink-0" />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {/* Illustration */}
        <SidebarIllustration name={displayName} />

        {/* User info */}
        <div className="flex flex-col items-center mt-4 mb-5">
          <div className="relative group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-4 ring-emerald-50 transition-all duration-300 group-hover:scale-110 group-hover:ring-emerald-200 overflow-hidden">
              {user.profile?.profilePhotoUrl
                ? <img src={user.profile.profilePhotoUrl} alt={firstName} className="w-14 h-14 object-cover" />
                : avatarInitial}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <p className="mt-2.5 text-sm font-bold text-gray-900 text-center truncate max-w-[180px]">{displayName}</p>
          <span className="mt-0.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-0.5 rounded-full">✈️ Traveler</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const active = tab === item.key && !item.href;
            const cls = `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${
              active
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-900/20'
                : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'
            }`;
            if (item.href) {
              return (
                <Link key={item.key} href={item.href} className={cls} onClick={() => setSidebarOpen(false)}>
                  <span className={`transition-transform duration-200 ${active ? '' : 'group-hover:scale-110 group-hover:text-emerald-600'}`}><NavIcon name={item.icon} /></span>
                  {item.label}
                </Link>
              );
            }
            return (
              <button key={item.key} type="button" onClick={() => { setTab(item.key as Tab); setSidebarOpen(false); }} className={cls}>
                {active && <span className="absolute inset-0 bg-white/10 animate-pulse-green pointer-events-none" />}
                <span className={`transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`}><NavIcon name={item.icon} /></span>
                {item.label}
                {active && <span className="ml-auto w-2 h-2 rounded-full bg-white/70 animate-pulse shrink-0" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sign out */}
      <div className="px-4 py-3 border-t border-gray-100 shrink-0">
        <button type="button" onClick={() => { logout(); router.push('/'); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 group">
          <span className="group-hover:scale-110 transition-transform"><NavIcon name="signout" /></span>
          Sign out
        </button>
      </div>
    </aside>
  );

  // ── DISCOVER / DASHBOARD MAIN SECTION ──────────────────────────────────
  const renderDiscoverSection = () => (
    <>
      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="relative overflow-hidden bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm dashboard-card-hover animate-slide-up group"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-full bg-gradient-to-br ${stat.color} opacity-10 translate-x-4 -translate-y-4 group-hover:opacity-20 transition-opacity duration-300`} />
            <div className="text-xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-black text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-400 mt-0.5 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* LEFT COLUMN */}
        <div className="flex-1 min-w-0">

          {/* Discover the World header */}
          <div className="mb-4 animate-rise-in">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-black text-gray-900">Discover the world</h2>
              <Link href="/experiences" className="text-xs text-emerald-600 font-semibold hover:underline">View all →</Link>
            </div>
            <div className="flex gap-5 border-b border-gray-100 mt-3">
              {(['recommended', 'popular', 'trending'] as DiscoverTab[]).map((t) => (
                <button key={t} type="button" onClick={() => setDiscoverTab(t)}
                  className={`pb-2.5 text-sm font-semibold capitalize transition-all relative ${discoverTab === t ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  {t}
                  {discoverTab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-green-600 rounded-full" />}
                </button>
              ))}
            </div>
          </div>

          {/* Draggable discover cards */}
          {discoverLoading ? (
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-40 h-60 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 animate-pulse" />
              ))}
            </div>
          ) : experiences.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100">
              <div className="text-4xl mb-2">🌍</div>
              <p className="text-gray-500 text-sm">No experiences found</p>
              <Link href="/experiences" className="inline-block mt-2 text-sm text-emerald-600 font-semibold hover:underline">Browse all →</Link>
            </div>
          ) : (
            <DraggableScroll>
              {experiences.slice(0, 6).map((exp, i) => {
                const img = exp.images?.[0];
                const isFeatured = featured?.id === exp.id;
                return (
                  <div
                    key={exp.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setFeaturedId(exp.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setFeaturedId(exp.id); }}
                    className={`relative shrink-0 w-40 h-60 rounded-2xl overflow-hidden cursor-pointer snap-start animate-slide-up transition-all duration-300 ${isFeatured ? 'ring-2 ring-emerald-500 ring-offset-2 scale-[1.04]' : 'hover:scale-[1.02]'}`}
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    {img
                      ? <img src={img.thumbnailUrl || img.url} alt={exp.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                      : <div className="absolute inset-0 bg-gradient-to-br from-emerald-300 to-green-600" />
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    {/* Wishlist btn */}
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleWishlist(exp.id); }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow hover:scale-110 transition-transform"
                      aria-label="Toggle wishlist">
                      <svg className={`w-3.5 h-3.5 ${wishlistIds.has(exp.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
                        fill={wishlistIds.has(exp.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    {/* Rating */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-0.5 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                      <svg className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      <span className="text-white text-[10px] font-bold">{exp.averageRating?.toFixed(1) || '4.5'}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <p className="font-bold text-xs leading-tight line-clamp-2">{exp.title}</p>
                      <p className="text-[10px] text-white/70 mt-0.5 truncate flex items-center gap-0.5">
                        <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {exp.location?.address || 'Ghana'}
                      </p>
                      <span className="inline-block mt-1.5 text-[10px] font-bold bg-emerald-500/80 rounded-full px-2 py-0.5">
                        {exp.price.currency} {exp.price.amount.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </DraggableScroll>
          )}

          {/* Event Dates */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-gray-900">Event Dates</h3>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Date strip */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {dateRange.map((date) => {
                const active = isSameDay(date, selectedDate);
                return (
                  <button key={date.toISOString()} type="button" onClick={() => setSelectedDate(date)}
                    className={`shrink-0 flex flex-col items-center px-3.5 py-2.5 rounded-2xl min-w-[3.5rem] transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-b from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-900/20 scale-110'
                        : 'bg-white border border-emerald-100 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 hover:-translate-y-0.5'
                    }`}>
                    <span className="text-[9px] font-bold uppercase tracking-wide">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="text-base font-black mt-0.5">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            {/* Experiences for selected date */}
            <div className="flex gap-3 mt-3 overflow-x-auto pb-2 scrollbar-hide">
              {experiences.slice(0, 5).map((exp, i) => {
                const img = exp.images?.[0];
                const isFirst = i === 0;
                return (
                  <Link key={exp.id}
                    href={`/experiences/${exp.id}/book?date=${selectedDate.toISOString().split('T')[0]}`}
                    className={`shrink-0 flex items-center gap-2.5 rounded-2xl border transition-all dashboard-card-hover ${
                      isFirst
                        ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 pl-2 pr-3 py-1.5 min-w-[200px]'
                        : 'w-14 h-14 overflow-hidden border-emerald-100'
                    }`}>
                    {img
                      ? <img src={img.thumbnailUrl || img.url} alt={exp.title} className={`object-cover rounded-xl ${isFirst ? 'w-12 h-12' : 'w-full h-full'}`} />
                      : <div className={`bg-gradient-to-br from-emerald-200 to-green-300 rounded-xl ${isFirst ? 'w-12 h-12' : 'w-full h-full'}`} />
                    }
                    {isFirst && (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{exp.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">{exp.location?.address}</p>
                        </div>
                        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </span>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Featured + More to explore */}
        <div className="xl:w-72 shrink-0">
          {featured && (
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-xl overflow-hidden animate-rise-in sticky top-6">
              {/* Featured image */}
              {featured.images?.[0] && (
                <div className="relative h-44 overflow-hidden group">
                  <img src={featured.images[0].thumbnailUrl || featured.images[0].url} alt={featured.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2.5 py-1">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-white text-[10px] font-bold">Featured</span>
                  </div>
                </div>
              )}

              <div className="p-4">
                <h3 className="text-base font-black text-gray-900 leading-tight">{featured.title}</h3>
                <p className="text-xs text-emerald-600 mt-0.5 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {featured.location?.address || 'Accra, Ghana'}
                </p>
                <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                  {featured.description || 'An unforgettable local experience curated just for you. Book now and explore with expert guides.'}
                </p>

                <div className="flex items-center justify-between mt-3 p-2.5 bg-emerald-50 rounded-xl">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Price</p>
                    <span className="text-lg font-black text-emerald-700">{featured.price.currency} {featured.price.amount.toFixed(0)}</span>
                  </div>
                  <StarRating value={featured.averageRating || 4.5} readonly size="sm" />
                </div>

                <Link href={`/experiences/${featured.id}/book?date=${selectedDate.toISOString().split('T')[0]}`}
                  className="mt-3 w-full block text-center bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-emerald-900/25 hover:from-emerald-600 hover:to-green-700 transition-all animate-pulse-green">
                  🌍 Book Now
                </Link>
                <Link href={`/experiences/${featured.id}`} className="mt-1.5 w-full block text-center text-xs text-emerald-500 font-semibold hover:underline">
                  View details →
                </Link>
              </div>

              {/* More to explore */}
              <div className="border-t border-emerald-50 px-4 py-3 space-y-1.5">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">More to explore</p>
                {sidebarRecommendations.map((exp, idx) => {
                  const img = exp.images?.[0];
                  return (
                    <button key={exp.id} type="button" onClick={() => setFeaturedId(exp.id)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-emerald-50 transition-all text-left group animate-slide-up"
                      style={{ animationDelay: `${idx * 80}ms` }}>
                      {img
                        ? <img src={img.thumbnailUrl || img.url} alt={exp.title} className="w-10 h-10 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform" />
                        : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-200 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate group-hover:text-emerald-700 transition-colors">{exp.title}</p>
                        <p className="text-[10px] text-gray-400 truncate">{exp.location?.address}</p>
                      </div>
                      <div className="shrink-0 w-7 h-7 rounded-full border-2 border-emerald-100 flex items-center justify-center group-hover:border-emerald-500 group-hover:bg-emerald-500 transition-all">
                        <svg className="w-3 h-3 text-emerald-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // ── BOOKINGS TAB ───────────────────────────────────────────────────────
  const renderBookingsTab = () => (
    <div className="animate-fade-in">
      <h2 className="text-xl font-black text-gray-900 mb-4">Your Bookings</h2>
      <div className="flex items-center gap-2 mb-5">
        {(['upcoming', 'past', 'cancelled'] as BookingStatus[]).map((s) => (
          <button key={s} type="button" onClick={() => setBookingFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
              bookingFilter === s
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                : 'bg-white text-gray-500 border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50'
            }`}>{s}</button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 bg-gradient-to-r from-emerald-50 to-white rounded-2xl border border-emerald-100 animate-pulse" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-14 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100">
          <div className="text-4xl mb-2">🗓</div>
          <p className="text-gray-500 font-semibold text-sm">No {bookingFilter} bookings</p>
          <Link href="/experiences" className="inline-block mt-2 text-sm text-emerald-600 font-semibold hover:underline">Browse experiences →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden dashboard-card-hover">
              <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-green-500" />
              <div className="flex gap-3 p-4">
                {booking.experience?.images?.[0]?.url && (
                  <img src={booking.experience.images[0].url} alt={booking.experience.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/experiences/${booking.experience?.id}`} className="font-bold text-gray-900 text-sm hover:text-emerald-700 transition-colors">
                        {booking.experience?.title || 'Experience'}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {booking.startTime}
                      </p>
                      <p className="text-[10px] text-gray-300 mt-0.5">#{booking.referenceNumber}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700'
                        : booking.status === 'completed' ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-400'
                      }`}>{booking.status}</span>
                      <p className="text-sm font-black text-gray-900 mt-1">{booking.totalCurrency} {booking.totalAmount?.toFixed(2)}</p>
                    </div>
                  </div>
                  {booking.cancellationPolicy && <p className="text-[10px] text-gray-300 mt-1">{CANCELLATION_POLICY_LABELS[booking.cancellationPolicy]}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {booking.status === 'confirmed' && (
                      <button type="button" onClick={() => setCancelModal(booking)} className="text-[10px] text-red-500 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 font-semibold transition-colors">Cancel</button>
                    )}
                    {booking.status === 'completed' && (
                      <button type="button" onClick={() => setReviewModal({ bookingId: booking.id, experienceId: booking.experience?.id || '' })} className="text-[10px] text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-50 font-semibold transition-colors">★ Review</button>
                    )}
                    <button type="button" onClick={() => downloadConfirmation(booking.id)} className="text-[10px] text-gray-400 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors">Download</button>
                    {booking.paymentId && (
                      <button type="button" onClick={() => downloadReceipt(booking.paymentId!)} className="text-[10px] text-gray-400 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors">Receipt</button>
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

  // ── ITINERARIES TAB ────────────────────────────────────────────────────
  const renderItinerariesTab = () => (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-black text-gray-900">Saved Itineraries</h2>
        <Link href="/trip-planner" className="text-sm bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-xl hover:from-emerald-600 hover:to-green-700 font-semibold shadow-sm transition-all">
          + New Itinerary
        </Link>
      </div>
      {itineraries.length === 0 ? (
        <div className="text-center py-14 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100">
          <div className="text-4xl mb-2">🗺</div>
          <p className="text-gray-500 font-semibold text-sm">No saved itineraries yet</p>
          <Link href="/trip-planner" className="inline-block mt-2 text-sm text-emerald-600 font-semibold hover:underline">Plan your first trip →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {itineraries.map((itin) => (
            <div key={itin.id} className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 dashboard-card-hover">
              <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mb-3" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{itin.experiences.length} experience{itin.experiences.length !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Generated {new Date(itin.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">{itin.experiences.slice(0, 3).map((e) => e.experience?.title || e.experienceId).join(' · ')}{itin.experiences.length > 3 && ` +${itin.experiences.length - 3} more`}</p>
                </div>
                <span className="font-black text-emerald-700">{itin.totalCost.currency} {itin.totalCost.amount.toFixed(0)}</span>
              </div>
              <Link href={`/trip-planner?itinerary=${itin.id}`} className="inline-block mt-2 text-xs text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 font-semibold transition-colors">
                View in Trip Planner →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── WISHLIST TAB ────────────────────────────────────────────────────────
  const renderWishlistTab = () => (
    <div className="animate-fade-in">
      <h2 className="text-xl font-black text-gray-900 mb-5">Saved Experiences</h2>
      {wishlist.length === 0 ? (
        <div className="text-center py-14 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100">
          <div className="text-4xl mb-2">❤️</div>
          <p className="text-gray-500 font-semibold text-sm">Your wishlist is empty</p>
          <Link href="/experiences" className="inline-block mt-2 text-sm text-emerald-600 font-semibold hover:underline">Browse experiences →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden dashboard-card-hover group">
              {item.images?.[0]?.url && (
                <div className="relative h-32 overflow-hidden">
                  <img src={item.images[0].url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
              )}
              <div className="p-3">
                <Link href={`/experiences/${item.id}`} className="font-bold text-gray-900 text-sm hover:text-emerald-700 transition-colors block">{item.title}</Link>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <StarRating value={item.averageRating} readonly size="sm" />
                    <span className="text-sm font-black text-gray-900">{item.price.currency} {item.price.amount.toFixed(2)}</span>
                  </div>
                  <Link href={`/experiences/${item.id}/book`} className="text-[10px] text-white bg-gradient-to-r from-emerald-500 to-green-600 px-2.5 py-1 rounded-lg hover:from-emerald-600 hover:to-green-700 font-semibold shadow-sm">Book</Link>
                </div>
                <button type="button" onClick={() => removeFromWishlist(item.id)} className="mt-1.5 text-[10px] text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 px-2 py-0.5 rounded-lg transition-colors">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── PROFILE TAB ─────────────────────────────────────────────────────────
  const renderProfileTab = () => (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 max-w-lg animate-fade-in">
      <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-600 rounded-full mb-5" />
      <h2 className="text-xl font-black text-gray-900 mb-4">Edit Profile</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">First name</label>
            <input value={profileForm.firstName} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} className="w-full border border-emerald-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Last name</label>
            <input value={profileForm.lastName} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} className="w-full border border-emerald-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Profile photo URL</label>
          <input type="url" value={profileForm.profilePhotoUrl} onChange={(e) => setProfileForm((p) => ({ ...p, profilePhotoUrl: e.target.value }))} placeholder="https://example.com/photo.jpg" className="w-full border border-emerald-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
          {profileForm.profilePhotoUrl && <img src={profileForm.profilePhotoUrl} alt="Preview" className="mt-2 w-14 h-14 rounded-full object-cover border-2 border-emerald-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Bio</label>
          <textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} rows={3} className="w-full border border-emerald-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none" placeholder="Tell us about yourself..." />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Travel preferences</label>
          <div className="flex gap-2 mb-2">
            <input value={prefInput} onChange={(e) => setPrefInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPreference(); } }} placeholder="e.g. food, adventure, culture" className="flex-1 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
            <button type="button" onClick={addPreference} className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm hover:bg-emerald-100 font-bold transition-colors">Add</button>
          </div>
          {profileForm.travelPreferences.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profileForm.travelPreferences.map((pref) => (
                <span key={pref} className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  {pref}
                  <button type="button" onClick={() => removePreference(pref)} className="hover:text-emerald-900 leading-none">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={saveProfile} disabled={profileSaving} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl text-sm font-bold hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 transition-all shadow-md">
          {profileSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  // ── MAIN RENDER ─────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50/30 relative">

      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <FloatingOrb className="w-80 h-80 bg-emerald-200 top-[-8%] left-[15%]" />
        <FloatingOrb className="w-56 h-56 bg-green-200 bottom-[8%] right-[8%]" />
        <FloatingOrb className="w-44 h-44 bg-emerald-100 top-[45%] left-[55%]" />
      </div>
      <Particles />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button type="button" className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" />
      )}

      {renderSidebar()}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 relative z-10">

        {/* Sticky header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-emerald-100/60 px-4 lg:px-6 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button type="button" onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-emerald-50 text-gray-500 transition-colors" aria-label="Open menu">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Search bar — matches image design */}
            <form onSubmit={handleDashboardSearch} className="flex-1 max-w-lg">
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for places…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-emerald-100 bg-white/90 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm transition-all shadow-sm placeholder:text-gray-300"
                />
              </div>
            </form>

            {/* Right controls */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {/* Filters */}
              <Link href="/experiences"
                className="w-9 h-9 rounded-xl border border-emerald-100 bg-white flex items-center justify-center text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors shadow-sm"
                title="Browse experiences">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </Link>
              {/* Notifications */}
              <Link href="/settings/notifications"
                className="relative w-9 h-9 rounded-xl border border-emerald-100 bg-white flex items-center justify-center text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors shadow-sm"
                title="Notifications">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              </Link>
              {/* Brand + greeting */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-100">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-sm">
                  {user.profile?.profilePhotoUrl
                    ? <img src={user.profile.profilePhotoUrl} alt={firstName} className="w-7 h-7 object-cover" />
                    : avatarInitial}
                </div>
                <span className="text-sm font-bold text-gray-700 hidden md:block">{displayName}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto">

            {/* Page greeting banner (dashboard tab only) */}
            {tab === 'dashboard' && (
              <div className="mb-6 animate-rise-in">
                <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 rounded-2xl p-5 shadow-lg">
                  {/* Animated shine */}
                  <div className="absolute inset-0 featured-shine" />
                  {/* Background pattern */}
                  <div className="absolute right-0 top-0 w-48 h-full opacity-10">
                    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
                      <circle cx="150" cy="50" r="80" stroke="white" strokeWidth="1" />
                      <circle cx="150" cy="50" r="50" stroke="white" strokeWidth="1" />
                      <circle cx="150" cy="50" r="20" stroke="white" strokeWidth="1" />
                    </svg>
                  </div>
                  <p className="text-emerald-100 text-xs font-semibold uppercase tracking-widest mb-1">Welcome back</p>
                  <h1 className="text-xl font-black text-white mb-0.5">Hello, {firstName}! 👋</h1>
                  <p className="text-emerald-100 text-sm">Ready for your next adventure?</p>
                  <div className="flex gap-2 mt-4">
                    <Link href="/experiences"
                      className="bg-white text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors shadow-sm">
                      Explore Now
                    </Link>
                    <Link href="/trip-planner"
                      className="bg-white/20 border border-white/30 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/30 transition-colors backdrop-blur-sm">
                      Plan a Trip
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {tab === 'dashboard' && renderDiscoverSection()}
            {tab === 'bookings' && renderBookingsTab()}
            {tab === 'itineraries' && renderItinerariesTab()}
            {tab === 'wishlist' && renderWishlistTab()}
            {tab === 'profile' && renderProfileTab()}
          </div>
        </main>
      </div>

      {/* ── Cancel Modal ── */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="h-1 bg-gradient-to-r from-red-400 to-red-500 rounded-full mb-4" />
            <h3 className="font-black text-gray-900 mb-1.5">Cancel Booking</h3>
            <p className="text-sm text-gray-500 mb-3">Cancel your booking for <span className="font-semibold text-gray-700">{cancelModal.experience?.title}</span>?</p>
            {cancelModal.cancellationPolicy && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs font-bold text-amber-700 mb-0.5">Cancellation Policy</p>
                <p className="text-xs text-amber-600">{CANCELLATION_POLICY_LABELS[cancelModal.cancellationPolicy]}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setCancelModal(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">Keep Booking</button>
              <button type="button" onClick={confirmCancel} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">Cancel Booking</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Modal ── */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mb-4" />
            <h3 className="font-black text-gray-900 mb-4">Leave a Review</h3>
            <div className="mb-3">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Rating</label>
              <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
            </div>
            <div className="mb-4">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Comment <span className="text-gray-300 font-normal normal-case">({reviewComment.length}/1000)</span></label>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value.slice(0, 1000))} rows={3} className="w-full border border-emerald-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none" placeholder="Share your experience..." />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setReviewModal(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="button" onClick={submitReview} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 rounded-xl text-sm font-bold hover:from-emerald-600 hover:to-green-700 transition-all shadow-sm">Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
