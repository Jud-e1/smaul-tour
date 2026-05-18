'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { bookingsApi, tripPlannerApi, userApi, paymentsApi, reviewsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
import StarRating from '@/components/ui/StarRating';

type Tab = 'bookings' | 'itineraries' | 'wishlist' | 'profile';
type BookingStatus = 'upcoming' | 'past' | 'cancelled';

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

export default function TravelerDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('bookings');
  const [bookingFilter, setBookingFilter] = useState<BookingStatus>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelModal, setCancelModal] = useState<Booking | null>(null);
  const [reviewModal, setReviewModal] = useState<{ bookingId: string; experienceId: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    profilePhotoUrl: '',
    travelPreferences: [] as string[],
  });
  const [prefInput, setPrefInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Stats
  const totalSpent = allBookings
    .filter((b) => b.status === 'completed' || b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const upcomingCount = allBookings.filter((b) => b.status === 'confirmed').length;

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    setProfileForm({
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      bio: user.profile?.bio || '',
      profilePhotoUrl: user.profile?.profilePhotoUrl || '',
      travelPreferences: [],
    });
    // Load all bookings for stats
    bookingsApi.getUserBookings(user.id, {})
      .then(({ data }: { data: Booking[] }) => setAllBookings(data || []))
      .catch(() => {});
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const statusMap: Record<BookingStatus, string> = {
      upcoming: 'confirmed',
      past: 'completed',
      cancelled: 'cancelled',
    };
    bookingsApi.getUserBookings(user.id, { status: statusMap[bookingFilter] })
      .then(({ data }: { data: Booking[] }) => setBookings(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, bookingFilter]);

  useEffect(() => {
    if (!user || tab !== 'itineraries') return;
    tripPlannerApi.getItineraries()
      .then(({ data }: { data: Itinerary[] }) => setItineraries(data || []))
      .catch(() => {});
  }, [user, tab]);

  useEffect(() => {
    if (!user || tab !== 'wishlist') return;
    userApi.getWishlist(user.id)
      .then(({ data }: { data: WishlistItem[] }) => setWishlist(data || []))
      .catch(() => {});
  }, [user, tab]);

  const confirmCancel = async () => {
    if (!cancelModal) return;
    try {
      await bookingsApi.cancel(cancelModal.id, 'Traveler requested cancellation');
      setBookings((prev) => prev.filter((b) => b.id !== cancelModal.id));
      setAllBookings((prev) => prev.filter((b) => b.id !== cancelModal.id));
      setCancelModal(null);
      toast('Booking cancelled successfully', 'success');
    } catch {
      toast('Failed to cancel booking', 'error');
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    try {
      await userApi.removeFromWishlist(user!.id, itemId);
      setWishlist((prev) => prev.filter((w) => w.id !== itemId));
      toast('Removed from wishlist', 'info');
    } catch {
      toast('Failed to remove from wishlist', 'error');
    }
  };

  const downloadConfirmation = async (bookingId: string) => {
    try {
      const response = await bookingsApi.get(bookingId);
      const booking: Booking = response.data;
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
    } catch {
      toast('Could not download confirmation', 'error');
    }
  };

  const downloadReceipt = async (paymentId: string) => {
    try {
      const { data } = await paymentsApi.getReceipt(paymentId);
      window.open(data.receiptUrl, '_blank');
    } catch {
      toast('Could not open receipt', 'error');
    }
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
    } catch {
      toast('Failed to submit review', 'error');
    }
  };

  const addPreference = () => {
    const trimmed = prefInput.trim();
    if (trimmed && !profileForm.travelPreferences.includes(trimmed)) {
      setProfileForm((p) => ({ ...p, travelPreferences: [...p.travelPreferences, trimmed] }));
    }
    setPrefInput('');
  };

  const removePreference = (pref: string) => {
    setProfileForm((p) => ({ ...p, travelPreferences: p.travelPreferences.filter((x) => x !== pref) }));
  };

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
    } catch {
      toast('Failed to save profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  if (!user) return null;

  const firstName = user.profile?.firstName || user.email?.split('@')[0] || 'Traveler';
  const avatarInitial = firstName.charAt(0).toUpperCase();

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'bookings', label: 'Bookings', icon: '🗓' },
    { key: 'itineraries', label: 'Itineraries', icon: '🗺' },
    { key: 'wishlist', label: 'Wishlist', icon: '❤️' },
    { key: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {user.profile?.profilePhotoUrl ? (
                  <img src={user.profile.profilePhotoUrl} alt={firstName} className="w-12 h-12 rounded-full object-cover" />
                ) : avatarInitial}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Welcome back</p>
                <h1 className="text-xl font-bold text-gray-900">{firstName}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="Home">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
              <Link href="/notifications" className="relative p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="Notifications">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </Link>
              <button
                onClick={() => { logout(); router.push('/'); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* KPI Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Total Bookings', value: allBookings.length, icon: '📋', color: 'from-blue-50 to-blue-100', text: 'text-blue-700' },
              { label: 'Upcoming Trips', value: upcomingCount, icon: '✈️', color: 'from-emerald-50 to-emerald-100', text: 'text-emerald-700' },
              { label: 'Total Spent', value: `$${totalSpent.toFixed(0)}`, icon: '💳', color: 'from-purple-50 to-purple-100', text: 'text-purple-700' },
              { label: 'Wishlist', value: wishlist.length, icon: '❤️', color: 'from-rose-50 to-rose-100', text: 'text-rose-700' },
            ].map((stat) => (
              <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-4`}>
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className={`text-2xl font-bold ${stat.text}`}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 mb-6 w-fit shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Bookings Tab ── */}
        {tab === 'bookings' && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              {(['upcoming', 'past', 'cancelled'] as BookingStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setBookingFilter(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                    bookingFilter === s
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="text-5xl mb-3">🗓</div>
                <p className="text-gray-500 font-medium">No {bookingFilter} bookings</p>
                <Link href="/experiences" className="inline-block mt-3 text-sm text-rose-500 hover:text-rose-600 font-medium">
                  Browse experiences →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex gap-4 p-4">
                      {booking.experience?.images?.[0]?.url && (
                        <img
                          src={booking.experience.images[0].url}
                          alt={booking.experience.title}
                          className="w-20 h-20 rounded-xl object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link href={`/experiences/${booking.experience?.id}`} className="font-semibold text-gray-900 hover:text-rose-500 transition-colors">
                              {booking.experience?.title || 'Experience'}
                            </Link>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {booking.startTime}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">#{booking.referenceNumber}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                              booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700'
                              : booking.status === 'completed' ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                              {booking.status}
                            </span>
                            <p className="text-base font-bold text-gray-900 mt-1">
                              {booking.totalCurrency} {booking.totalAmount?.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {booking.cancellationPolicy && (
                          <p className="text-xs text-gray-400 mt-1">{CANCELLATION_POLICY_LABELS[booking.cancellationPolicy]}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {booking.status === 'confirmed' && (
                            <button onClick={() => setCancelModal(booking)} className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 font-medium transition-colors">
                              Cancel
                            </button>
                          )}
                          {booking.status === 'completed' && (
                            <button onClick={() => setReviewModal({ bookingId: booking.id, experienceId: booking.experience?.id || '' })} className="text-xs text-rose-500 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-50 font-medium transition-colors">
                              ★ Leave Review
                            </button>
                          )}
                          <button onClick={() => downloadConfirmation(booking.id)} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                            Download
                          </button>
                          {booking.paymentId && (
                            <button onClick={() => downloadReceipt(booking.paymentId!)} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
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
        )}

        {/* ── Itineraries Tab ── */}
        {tab === 'itineraries' && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-gray-900">Saved Itineraries</h2>
              <Link href="/trip-planner" className="text-sm bg-rose-500 text-white px-4 py-2 rounded-xl hover:bg-rose-600 font-medium transition-colors">
                + New Itinerary
              </Link>
            </div>
            {itineraries.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="text-5xl mb-3">🗺</div>
                <p className="text-gray-500 font-medium">No saved itineraries yet</p>
                <Link href="/trip-planner" className="inline-block mt-3 text-sm text-rose-500 hover:text-rose-600 font-medium">
                  Plan your first trip →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {itineraries.map((itin) => (
                  <div key={itin.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {itin.experiences.length} experience{itin.experiences.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Generated {new Date(itin.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {itin.experiences.slice(0, 3).map((e) => e.experience?.title || e.experienceId).join(' · ')}
                          {itin.experiences.length > 3 && ` +${itin.experiences.length - 3} more`}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900 text-lg">
                        {itin.totalCost.currency} {itin.totalCost.amount.toFixed(0)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <Link href={`/trip-planner?itinerary=${itin.id}`} className="text-xs text-rose-500 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-50 font-medium transition-colors inline-block">
                        View in Trip Planner →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Wishlist Tab ── */}
        {tab === 'wishlist' && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-5">Saved Experiences</h2>
            {wishlist.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="text-5xl mb-3">❤️</div>
                <p className="text-gray-500 font-medium">Your wishlist is empty</p>
                <Link href="/experiences" className="inline-block mt-3 text-sm text-rose-500 hover:text-rose-600 font-medium">
                  Browse experiences →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {wishlist.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                    {item.images?.[0]?.url && (
                      <div className="relative h-36 overflow-hidden">
                        <img src={item.images[0].url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    )}
                    <div className="p-4">
                      <Link href={`/experiences/${item.id}`} className="font-semibold text-gray-900 hover:text-rose-500 transition-colors block">
                        {item.title}
                      </Link>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <StarRating value={item.averageRating} readonly size="sm" />
                          <span className="text-sm font-bold text-gray-900">
                            {item.price.currency} {item.price.amount.toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={() => removeFromWishlist(item.id)}
                          className="text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Profile Tab ── */}
        {tab === 'profile' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-lg">
            <h2 className="font-semibold text-gray-900 mb-5">Edit Profile</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">First name</label>
                  <input value={profileForm.firstName} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Last name</label>
                  <input value={profileForm.lastName} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Profile photo URL</label>
                <input type="url" value={profileForm.profilePhotoUrl} onChange={(e) => setProfileForm((p) => ({ ...p, profilePhotoUrl: e.target.value }))} placeholder="https://example.com/photo.jpg" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent" />
                {profileForm.profilePhotoUrl && (
                  <img src={profileForm.profilePhotoUrl} alt="Preview" className="mt-2 w-16 h-16 rounded-full object-cover border-2 border-gray-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bio</label>
                <textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent resize-none" placeholder="Tell us about yourself..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Travel preferences</label>
                <div className="flex gap-2 mb-2">
                  <input value={prefInput} onChange={(e) => setPrefInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPreference(); } }} placeholder="e.g. food, adventure, culture" className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent" />
                  <button type="button" onClick={addPreference} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 font-medium">Add</button>
                </div>
                {profileForm.travelPreferences.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {profileForm.travelPreferences.map((pref) => (
                      <span key={pref} className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-xs px-2.5 py-1 rounded-full font-medium">
                        {pref}
                        <button type="button" onClick={() => removePreference(pref)} className="hover:text-rose-800 leading-none">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={saveProfile} disabled={profileSaving} className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 transition-all shadow-sm">
                {profileSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Cancel Booking</h3>
            <p className="text-sm text-gray-600 mb-3">
              Cancel your booking for <span className="font-semibold">{cancelModal.experience?.title}</span>?
            </p>
            {cancelModal.cancellationPolicy && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs font-semibold text-amber-800 mb-0.5">Cancellation Policy</p>
                <p className="text-xs text-amber-700">{CANCELLATION_POLICY_LABELS[cancelModal.cancellationPolicy]}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setCancelModal(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Keep Booking</button>
              <button onClick={confirmCancel} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600">Cancel Booking</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Leave a Review</h3>
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rating</label>
              <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Comment <span className="text-gray-400 font-normal normal-case">({reviewComment.length}/1000)</span>
              </label>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value.slice(0, 1000))} rows={4} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent resize-none" placeholder="Share your experience..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReviewModal(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={submitReview} className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-rose-600 hover:to-pink-700">Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
