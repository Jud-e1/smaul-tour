'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { bookingsApi, tripPlannerApi, userApi, paymentsApi, reviewsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
import StarRating from '@/components/ui/StarRating';
import DashboardShell, { type StatItem, type TabItem } from '@/components/dashboard/DashboardShell';
import {
  card,
  cardHover,
  EmptyState,
  inputCls,
  label as labelCls,
  SectionHeader,
  StatusBadge,
  toneFor,
} from '@/components/dashboard/primitives';
import {
  IconCalendar,
  IconClipboard,
  IconCompass,
  IconHeart,
  IconPlane,
  IconStar,
  IconUser,
  IconWallet,
} from '@/components/dashboard/icons';

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

const inp = inputCls('rose');
const ghostBtn =
  'rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900';

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
    } catch {
      toast('Could not download confirmation', 'error');
    }
  };

  const downloadReceipt = async (paymentId: string) => {
    try {
      const response = await paymentsApi.getReceipt(paymentId);
      const { receiptUrl } = response.data as { receiptUrl: string };
      window.open(receiptUrl, '_blank');
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

  const tabs: TabItem[] = [
    { key: 'bookings', label: 'Bookings', icon: IconCalendar },
    { key: 'itineraries', label: 'Itineraries', icon: IconCompass },
    { key: 'wishlist', label: 'Wishlist', icon: IconHeart },
    { key: 'profile', label: 'Profile', icon: IconUser },
  ];

  const stats: StatItem[] = [
    { label: 'Total Bookings', value: allBookings.length, icon: IconClipboard, tone: 'sky' },
    { label: 'Upcoming Trips', value: upcomingCount, icon: IconPlane, tone: 'emerald' },
    { label: 'Total Spent', value: `$${totalSpent.toFixed(0)}`, icon: IconWallet, tone: 'violet' },
    { label: 'Wishlist', value: wishlist.length, icon: IconHeart, tone: 'rose' },
  ];

  return (
    <DashboardShell
      accent="rose"
      roleLabel="Traveler workspace"
      firstName={firstName}
      avatarInitial={avatarInitial}
      photoUrl={user.profile?.profilePhotoUrl}
      tabs={tabs}
      activeTab={tab}
      onTab={(k) => setTab(k as Tab)}
      stats={stats}
      onSignOut={() => { logout(); router.push('/'); }}
    >
      {/* ── Bookings Tab ── */}
      {tab === 'bookings' && (
        <div>
          <div className="mb-5 flex items-center gap-2">
            {(['upcoming', 'past', 'cancelled'] as BookingStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setBookingFilter(s)}
                className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition-all ${
                  bookingFilter === s
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState
              icon={IconCalendar}
              title={`No ${bookingFilter} bookings`}
              action={
                <Link href="/experiences" className="text-sm font-medium text-rose-600 hover:text-rose-700">
                  Browse experiences →
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className={`${card} ${cardHover} overflow-hidden`}>
                  <div className="flex gap-4 p-4">
                    {booking.experience?.images?.[0]?.url && (
                      <img
                        src={booking.experience.images[0].url}
                        alt={booking.experience.title}
                        className="h-20 w-20 shrink-0 rounded-xl object-cover ring-1 ring-gray-200"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link href={`/experiences/${booking.experience?.id}`} className="font-semibold text-gray-900 transition-colors hover:text-rose-600">
                            {booking.experience?.title || 'Experience'}
                          </Link>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {booking.startTime}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">#{booking.referenceNumber}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <StatusBadge tone={toneFor(booking.status)}>{booking.status}</StatusBadge>
                          <p className="mt-1 text-base font-bold text-gray-900">
                            {booking.totalCurrency} {booking.totalAmount?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {booking.cancellationPolicy && (
                        <p className="mt-1 text-xs text-gray-400">{CANCELLATION_POLICY_LABELS[booking.cancellationPolicy]}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {booking.status === 'confirmed' && (
                          <button onClick={() => setCancelModal(booking)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100">
                            Cancel
                          </button>
                        )}
                        {booking.status === 'completed' && (
                          <button onClick={() => setReviewModal({ bookingId: booking.id, experienceId: booking.experience?.id || '' })} className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100">
                            <IconStar className="h-3.5 w-3.5" /> Leave Review
                          </button>
                        )}
                        <button onClick={() => void downloadConfirmation(booking.id)} className={ghostBtn}>
                          Download
                        </button>
                        {booking.paymentId && (
                          <button onClick={() => void downloadReceipt(booking.paymentId!)} className={ghostBtn}>
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
          <SectionHeader title="Saved Itineraries">
            <Link href="/trip-planner" className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_rgba(244,63,94,0.6)] transition hover:from-rose-400 hover:to-pink-500">
              + New Itinerary
            </Link>
          </SectionHeader>
          {itineraries.length === 0 ? (
            <EmptyState
              icon={IconCompass}
              title="No saved itineraries yet"
              action={
                <Link href="/trip-planner" className="text-sm font-medium text-rose-600 hover:text-rose-700">
                  Plan your first trip →
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {itineraries.map((itin) => (
                <div key={itin.id} className={`${card} ${cardHover} p-4`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {itin.experiences.length} experience{itin.experiences.length !== 1 ? 's' : ''}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-500">
                        Generated {new Date(itin.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {itin.experiences.slice(0, 3).map((e) => e.experience?.title || e.experienceId).join(' · ')}
                        {itin.experiences.length > 3 && ` +${itin.experiences.length - 3} more`}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {itin.totalCost.currency} {itin.totalCost.amount.toFixed(0)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <Link href={`/trip-planner?itinerary=${itin.id}`} className="inline-block rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100">
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
          <SectionHeader title="Saved Experiences" />
          {wishlist.length === 0 ? (
            <EmptyState
              icon={IconHeart}
              title="Your wishlist is empty"
              action={
                <Link href="/experiences" className="text-sm font-medium text-rose-600 hover:text-rose-700">
                  Browse experiences →
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {wishlist.map((item) => (
                <div key={item.id} className={`${card} ${cardHover} group overflow-hidden`}>
                  {item.images?.[0]?.url && (
                    <div className="relative h-36 overflow-hidden">
                      <img src={item.images[0].url} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>
                  )}
                  <div className="p-4">
                    <Link href={`/experiences/${item.id}`} className="block font-semibold text-gray-900 transition-colors hover:text-rose-600">
                      {item.title}
                    </Link>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StarRating value={item.averageRating} readonly size="sm" />
                        <span className="text-sm font-bold text-gray-900">
                          {item.price.currency} {item.price.amount.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={() => void removeFromWishlist(item.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-600 transition hover:bg-rose-100"
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
        <div className={`${card} max-w-lg p-6`}>
          <SectionHeader title="Edit Profile" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First name</label>
                <input value={profileForm.firstName} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className={labelCls}>Last name</label>
                <input value={profileForm.lastName} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} className={inp} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Profile photo URL</label>
              <input type="url" value={profileForm.profilePhotoUrl} onChange={(e) => setProfileForm((p) => ({ ...p, profilePhotoUrl: e.target.value }))} placeholder="https://example.com/photo.jpg" className={inp} />
              {profileForm.profilePhotoUrl && (
                <img src={profileForm.profilePhotoUrl} alt="Preview" className="mt-2 h-16 w-16 rounded-full border-2 border-gray-200 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
            <div>
              <label className={labelCls}>Bio</label>
              <textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} rows={3} className={`${inp} resize-none`} placeholder="Tell us about yourself..." />
            </div>
            <div>
              <label className={labelCls}>Travel preferences</label>
              <div className="mb-2 flex gap-2">
                <input value={prefInput} onChange={(e) => setPrefInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPreference(); } }} placeholder="e.g. food, adventure, culture" className={inp} />
                <button type="button" onClick={addPreference} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100">Add</button>
              </div>
              {profileForm.travelPreferences.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profileForm.travelPreferences.map((pref) => (
                    <span key={pref} className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                      {pref}
                      <button type="button" onClick={() => removePreference(pref)} className="leading-none hover:text-gray-900">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => void saveProfile()} disabled={profileSaving} className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 py-2.5 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_rgba(244,63,94,0.6)] transition hover:from-rose-400 hover:to-pink-500 disabled:opacity-50">
              {profileSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
          <div className={`${card} w-full max-w-md p-6 shadow-2xl animate-fade-up`}>
            <h3 className="mb-2 text-lg font-bold text-gray-900">Cancel Booking</h3>
            <p className="mb-3 text-sm text-gray-600">
              Cancel your booking for <span className="font-semibold text-gray-900">{cancelModal.experience?.title}</span>?
            </p>
            {cancelModal.cancellationPolicy && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="mb-0.5 text-xs font-semibold text-amber-700">Cancellation Policy</p>
                <p className="text-xs text-amber-700/80">{CANCELLATION_POLICY_LABELS[cancelModal.cancellationPolicy]}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setCancelModal(null)} className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">Keep Booking</button>
              <button onClick={() => void confirmCancel()} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-400">Cancel Booking</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
          <div className={`${card} w-full max-w-md p-6 shadow-2xl animate-fade-up`}>
            <h3 className="mb-4 text-lg font-bold text-gray-900">Leave a Review</h3>
            <div className="mb-3">
              <label className={labelCls}>Rating</label>
              <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
            </div>
            <div className="mb-4">
              <label className={labelCls}>
                Comment <span className="font-normal normal-case text-gray-400">({reviewComment.length}/1000)</span>
              </label>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value.slice(0, 1000))} rows={4} className={`${inp} resize-none`} placeholder="Share your experience..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReviewModal(null)} className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">Cancel</button>
              <button onClick={() => void submitReview()} className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 py-2.5 text-sm font-semibold text-white hover:from-rose-400 hover:to-pink-500">Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
