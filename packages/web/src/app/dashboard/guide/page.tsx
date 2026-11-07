'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import { experiencesApi, bookingsApi, paymentsApi, userApi, reviewsApi } from '@/lib/api';
import { useAuthStore, hasStoredSession } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
import StarRating from '@/components/ui/StarRating';

type Tab = 'experiences' | 'bookings' | 'payments' | 'reviews' | 'profile';
type BookingFilter = 'upcoming' | 'past' | 'cancelled';

interface Experience {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'inactive' | 'pending_approval';
  averageRating: number;
  reviewCount: number;
  location: { address: string; latitude: number; longitude: number };
  duration: number;
  price: { amount: number; currency: string };
  category: string[];
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  images: { id: string; url: string }[];
}

interface Booking {
  id: string;
  referenceNumber: string;
  status: string;
  date: string;
  startTime: string;
  totalAmount: number;
  totalCurrency: string;
  experience?: { title: string; id: string };
  traveler?: { profile?: { firstName?: string; lastName?: string }; email?: string };
  paymentId?: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  booking?: { referenceNumber?: string; experience?: { title?: string } };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  experience?: { title?: string };
  traveler?: { profile?: { firstName?: string; lastName?: string } };
}

interface ExperienceForm {
  title: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  price: string;
  currency: string;
  duration: string;
  category: string;
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  imageUrl: string;
}

const EMPTY_FORM: ExperienceForm = {
  title: '', description: '', address: '', latitude: '', longitude: '',
  price: '', currency: 'USD', duration: '', category: '',
  cancellationPolicy: 'moderate', imageUrl: '',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-forest-100 text-forest-700',
  inactive: 'bg-gray-100 text-ink-muted',
  pending_approval: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-forest-100 text-forest-700',
  completed: 'bg-forest-100 text-forest-700',
  cancelled: 'bg-red-100 text-red-600',
  pending: 'bg-amber-100 text-amber-700',
  escrowed: 'bg-purple-100 text-purple-700',
  released: 'bg-forest-100 text-forest-700',
};

export default function GuideDashboard() {
  const { user, logout, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('experiences');
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('upcoming');

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [expLoading, setExpLoading] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [expForm, setExpForm] = useState<ExperienceForm>(EMPTY_FORM);
  const [expSaving, setExpSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Experience | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', bio: '', profilePhotoUrl: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (!user) { if (!authLoading && !hasStoredSession()) void router.push('/login'); return; }
    if (user.role !== 'guide') { router.push('/dashboard/traveler'); return; }
    setProfileForm({
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      bio: user.profile?.bio || '',
      profilePhotoUrl: user.profile?.profilePhotoUrl || '',
      phone: '',
    });
  }, [user, router, authLoading]);

  const loadExperiences = useCallback(async () => {
    if (!user) return;
    setExpLoading(true);
    try {
      const { data } = await experiencesApi.list({ guideId: user.id });
      setExperiences(Array.isArray(data) ? data : data?.experiences || []);
    } catch { /* ignore */ }
    finally { setExpLoading(false); }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'guide' && tab === 'experiences') loadExperiences();
  }, [user, tab, loadExperiences]);

  // Load all bookings for stats
  useEffect(() => {
    if (!user) return;
    bookingsApi.getGuideBookings(user.id)
      .then(({ data }: { data: Booking[] }) => setAllBookings(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [user]);

  // Load filtered bookings
  useEffect(() => {
    if (!user || tab !== 'bookings') return;
    setBookingsLoading(true);
    const statusMap: Record<BookingFilter, string> = { upcoming: 'confirmed', past: 'completed', cancelled: 'cancelled' };
    bookingsApi.getGuideBookings(user.id, { status: statusMap[bookingFilter] })
      .then(({ data }: { data: Booking[] }) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setBookingsLoading(false));
  }, [user, tab, bookingFilter]);

  useEffect(() => {
    if (!user || tab !== 'payments') return;
    setPaymentsLoading(true);
    bookingsApi.getGuideBookings(user.id)
      .then(async ({ data }: { data: Booking[] }) => {
        const bookingList: Booking[] = Array.isArray(data) ? data : [];
        const paymentIds = bookingList.filter((b) => b.paymentId).map((b) => b.paymentId as string);
        const results = await Promise.allSettled(paymentIds.map((id) => paymentsApi.get(id)));
        setPayments(
          results
            .filter((r) => r.status === 'fulfilled')
            .map((r) => (r as PromiseFulfilledResult<{ data: Payment }>).value.data)
        );
      })
      .catch(() => {})
      .finally(() => setPaymentsLoading(false));
  }, [user, tab]);

  useEffect(() => {
    if (!user || tab !== 'reviews') return;
    setReviewsLoading(true);
    reviewsApi.getGuideReviews(user.id)
      .then(({ data }: { data: Review[] }) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [user, tab]);

  const openCreateForm = () => { setEditingExp(null); setExpForm(EMPTY_FORM); setShowExpForm(true); };
  const openEditForm = (exp: Experience) => {
    setEditingExp(exp);
    setExpForm({
      title: exp.title, description: exp.description, address: exp.location.address,
      latitude: String(exp.location.latitude), longitude: String(exp.location.longitude),
      price: String(exp.price.amount), currency: exp.price.currency,
      duration: String(exp.duration), category: exp.category.join(', '),
      cancellationPolicy: exp.cancellationPolicy, imageUrl: exp.images?.[0]?.url || '',
    });
    setShowExpForm(true);
  };

  const saveExperience = async () => {
    setExpSaving(true);
    try {
      const payload = {
        title: expForm.title, description: expForm.description,
        location: { address: expForm.address, latitude: parseFloat(expForm.latitude), longitude: parseFloat(expForm.longitude) },
        price: { amount: parseFloat(expForm.price), currency: expForm.currency },
        duration: parseFloat(expForm.duration),
        category: expForm.category.split(',').map((c) => c.trim()).filter(Boolean),
        cancellationPolicy: expForm.cancellationPolicy,
      };
      if (editingExp) {
        await experiencesApi.update(editingExp.id, payload);
        toast('Experience updated!', 'success');
      } else {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => formData.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v)));
        if (expForm.imageUrl) formData.append('imageUrl', expForm.imageUrl);
        await experiencesApi.create(formData);
        toast('Experience created!', 'success');
      }
      setShowExpForm(false);
      loadExperiences();
    } catch {
      toast('Failed to save experience', 'error');
    } finally { setExpSaving(false); }
  };

  const deleteExperience = async () => {
    if (!deleteConfirm) return;
    try {
      await experiencesApi.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      loadExperiences();
      toast('Experience deleted', 'info');
    } catch {
      toast('Failed to delete experience', 'error');
    }
  };

  const toggleStatus = async (exp: Experience) => {
    setTogglingId(exp.id);
    try {
      const newStatus = exp.status === 'active' ? 'inactive' : 'active';
      await experiencesApi.update(exp.id, { status: newStatus });
      setExperiences((prev) => prev.map((e) => e.id === exp.id ? { ...e, status: newStatus as Experience['status'] } : e));
      toast(`Experience ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
    } catch {
      toast('Failed to update status', 'error');
    } finally { setTogglingId(null); }
  };

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      await userApi.updateProfile(user.id, { ...profileForm });
      toast('Profile updated!', 'success');
    } catch {
      toast('Failed to save profile', 'error');
    } finally { setProfileSaving(false); }
  };

  const avgRating = experiences.length
    ? experiences.reduce((sum, e) => sum + (e.averageRating || 0), 0) / experiences.length : 0;
  const totalEarnings = payments.filter((p) => p.status === 'released').reduce((sum, p) => sum + p.amount, 0);
  const pendingEarnings = payments.filter((p) => p.status === 'escrowed' || p.status === 'captured').reduce((sum, p) => sum + p.amount, 0);
  const activeExperiences = experiences.filter((e) => e.status === 'active').length;

  if (!user || user.role !== 'guide') return null;

  const firstName = user.profile?.firstName || user.email?.split('@')[0] || 'Guide';
  const avatarInitial = firstName.charAt(0).toUpperCase();

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'experiences', label: 'Experiences', icon: '🌟' },
    { key: 'bookings', label: 'Bookings', icon: '🗓' },
    { key: 'payments', label: 'Payments', icon: '💰' },
    { key: 'reviews', label: 'Reviews', icon: '⭐' },
    { key: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="bg-white">
      <div className="max-w-[1120px] mx-auto px-6 sm:px-10 pt-8 md:pt-12 pb-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="hidden sm:block shrink-0" aria-label="Nsoroma home">
              <BrandLogo variant="mark" decorative className="h-10 w-10 object-contain" />
            </Link>
            <div className="w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center text-xl font-semibold overflow-hidden shrink-0">
              {user.profile?.profilePhotoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.profile.profilePhotoUrl} alt={firstName} className="w-14 h-14 object-cover" />
                : avatarInitial}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-ink-muted">Hosting dashboard</p>
              <h1 className="text-[28px] sm:text-[32px] font-semibold leading-tight truncate">Welcome back, {firstName}</h1>
              {avgRating > 0 && (
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRating value={Math.round(avgRating)} readonly size="sm" />
                  <span className="text-sm text-ink-muted">{avgRating.toFixed(1)} average rating</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings/notifications" className="btn-outline !py-2.5 text-sm">Notifications</Link>
            <button onClick={() => { logout(); router.push('/'); }} className="text-sm font-semibold underline underline-offset-2 px-3">
              Log out
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-5 rounded-2xl border border-[#DDDDDD] overflow-hidden">
          {[
            { label: 'Total earnings', value: `$${totalEarnings.toFixed(0)}`, icon: '💰' },
            { label: 'Pending payout', value: `$${pendingEarnings.toFixed(0)}`, icon: '⏳' },
            { label: 'Total bookings', value: allBookings.length, icon: '🗓️' },
            { label: 'Active listings', value: activeExperiences, icon: '🌟' },
            { label: 'Avg rating', value: avgRating > 0 ? avgRating.toFixed(1) : '—', icon: '⭐' },
          ].map((stat, i) => (
            <div key={stat.label} className={`p-5 sm:p-6 border-[#DDDDDD] ${i % 2 === 0 ? 'border-r' : ''} sm:border-r sm:last:border-r-0 ${i < 4 ? 'border-b sm:border-b-0' : ''}`}>
              <div className="text-xl" aria-hidden>{stat.icon}</div>
              <div className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.02em]">{stat.value}</div>
              <div className="mt-1.5 text-sm text-ink-muted">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <nav className="mt-10 mb-8 flex gap-6 sm:gap-8 overflow-x-auto scrollbar-hide border-b border-[#DDDDDD]" aria-label="Hosting">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} aria-current={tab === t.key ? 'page' : undefined}
              className={`flex items-center gap-2 pb-3 -mb-px border-b-2 text-[15px] whitespace-nowrap transition-colors ${
                tab === t.key ? 'border-ink text-ink font-semibold' : 'border-transparent text-ink-muted hover:text-ink hover:border-[#DDDDDD]'
              }`}>
              <span aria-hidden>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* ── Experiences Tab ── */}
        {tab === 'experiences' && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-ink">My Experiences</h2>
              <button onClick={openCreateForm} className="bg-ink text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-black shadow-sm transition-all">
                + New Experience
              </button>
            </div>
            {expLoading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-28 bg-white rounded-2xl border border-[#DDDDDD] animate-pulse" />)}</div>
            ) : experiences.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#DDDDDD]">
                <div className="text-5xl mb-3">🌟</div>
                <p className="text-ink-muted font-medium">No experiences yet</p>
                <button onClick={openCreateForm} className="inline-block mt-3 text-sm text-forest-600 hover:text-forest-700 font-medium">Create your first experience →</button>
              </div>
            ) : (
              <div className="space-y-3">
                {experiences.map((exp) => (
                  <div key={exp.id} className="bg-white rounded-2xl border border-[#DDDDDD] overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex gap-4 p-4">
                      {exp.images?.[0]?.url ? (
                        <img src={exp.images[0].url} alt={exp.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-forest-100 to-forest-100 flex items-center justify-center text-3xl shrink-0">🌍</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-ink truncate">{exp.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[exp.status] || 'bg-gray-100 text-ink-muted'}`}>
                                {exp.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-ink-muted mt-0.5 truncate">{exp.location?.address}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted">
                              <span className="font-medium">{exp.price?.currency} {exp.price?.amount?.toFixed(2)}</span>
                              <span>{exp.duration}h</span>
                              {exp.averageRating > 0 && <span>★ {exp.averageRating.toFixed(1)} ({exp.reviewCount})</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Active/Inactive toggle */}
                            <button
                              onClick={() => toggleStatus(exp)}
                              disabled={togglingId === exp.id || exp.status === 'pending_approval'}
                              title={exp.status === 'active' ? 'Deactivate' : 'Activate'}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                                exp.status === 'active' ? 'bg-forest-600' : 'bg-gray-300'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${exp.status === 'active' ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <button onClick={() => openEditForm(exp)} className="text-xs text-forest-700 border border-forest-200 px-3 py-1.5 rounded-lg hover:bg-forest-50 font-medium transition-colors">Edit</button>
                            <button onClick={() => setDeleteConfirm(exp)} className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 font-medium transition-colors">Delete</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Bookings Tab ── */}
        {tab === 'bookings' && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              {(['upcoming', 'past', 'cancelled'] as BookingFilter[]).map((s) => (
                <button key={s} onClick={() => setBookingFilter(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                    bookingFilter === s ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-ink-muted border border-[#DDDDDD] hover:border-[#DDDDDD]'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
            {bookingsLoading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-2xl border border-[#DDDDDD] animate-pulse" />)}</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#DDDDDD]">
                <div className="text-5xl mb-3">🗓</div>
                <p className="text-ink-muted font-medium">No {bookingFilter} bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => {
                  const travelerName = booking.traveler?.profile
                    ? `${booking.traveler.profile.firstName || ''} ${booking.traveler.profile.lastName || ''}`.trim()
                    : booking.traveler?.email || 'Traveler';
                  return (
                    <div key={booking.id} className="bg-white rounded-2xl border border-[#DDDDDD] p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-ink">{booking.experience?.title || 'Experience'}</p>
                          <p className="text-sm text-ink-muted mt-0.5">
                            {travelerName} · {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {booking.startTime}
                          </p>
                          <p className="text-xs text-ink-soft mt-0.5">#{booking.referenceNumber}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-ink-muted'}`}>
                            {booking.status}
                          </span>
                          <p className="text-base font-bold text-ink mt-1">{booking.totalCurrency} {booking.totalAmount?.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Payments Tab ── */}
        {tab === 'payments' && (
          <div>
            <h2 className="font-semibold text-ink mb-5">Payments</h2>
            {paymentsLoading ? (
              <div className="space-y-3">{[1,2].map((i) => <div key={i} className="h-20 bg-white rounded-2xl border border-[#DDDDDD] animate-pulse" />)}</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#DDDDDD]">
                <div className="text-5xl mb-3">💰</div>
                <p className="text-ink-muted font-medium">No payments yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {[
                  { label: 'Pending (Escrowed)', filter: (p: Payment) => p.status === 'escrowed' || p.status === 'captured', icon: '⏳', color: 'text-purple-700' },
                  { label: 'Released', filter: (p: Payment) => p.status === 'released', icon: '✅', color: 'text-forest-700' },
                  { label: 'Other', filter: (p: Payment) => !['escrowed', 'captured', 'released'].includes(p.status), icon: '📋', color: 'text-ink/80' },
                ].map(({ label, filter, icon, color }) => {
                  const group = payments.filter(filter);
                  if (group.length === 0) return null;
                  return (
                    <div key={label}>
                      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-1.5 ${color}`}>{icon} {label}</h3>
                      <div className="space-y-3">
                        {group.map((payment) => (
                          <div key={payment.id} className="bg-white rounded-2xl border border-[#DDDDDD] p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-ink">{payment.booking?.experience?.title || 'Experience'}</p>
                                <p className="text-xs text-ink-soft mt-0.5">
                                  {new Date(payment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  {payment.booking?.referenceNumber && ` · #${payment.booking.referenceNumber}`}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[payment.status] || 'bg-gray-100 text-ink-muted'}`}>
                                  {payment.status}
                                </span>
                                <p className="text-base font-bold text-ink mt-1">{payment.currency} {payment.amount?.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Reviews Tab ── */}
        {tab === 'reviews' && (
          <div>
            <h2 className="font-semibold text-ink mb-5">Reviews</h2>
            {reviewsLoading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-2xl border border-[#DDDDDD] animate-pulse" />)}</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#DDDDDD]">
                <div className="text-5xl mb-3">⭐</div>
                <p className="text-ink-muted font-medium">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => {
                  const reviewerName = review.traveler?.profile
                    ? `${review.traveler.profile.firstName || ''} ${review.traveler.profile.lastName || ''}`.trim() || 'Traveler'
                    : 'Traveler';
                  return (
                    <div key={review.id} className="bg-white rounded-2xl border border-[#DDDDDD] p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <StarRating value={review.rating} readonly size="sm" />
                            <span className="text-sm font-semibold text-ink/80">{reviewerName}</span>
                          </div>
                          {review.experience?.title && <p className="text-xs text-forest-700 mb-1 font-medium">{review.experience.title}</p>}
                          {review.comment && <p className="text-sm text-ink-muted">{review.comment}</p>}
                        </div>
                        <p className="text-xs text-ink-soft shrink-0">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Profile Tab ── */}
        {tab === 'profile' && (
          <div className="bg-white rounded-2xl border border-[#DDDDDD] p-6 max-w-lg">
            <h2 className="font-semibold text-ink mb-5">Edit Profile</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">First name</label>
                  <input value={profileForm.firstName} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Last name</label>
                  <input value={profileForm.lastName} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Profile photo URL</label>
                <input type="url" value={profileForm.profilePhotoUrl} onChange={(e) => setProfileForm((p) => ({ ...p, profilePhotoUrl: e.target.value }))} placeholder="https://example.com/photo.jpg" className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" />
                {profileForm.profilePhotoUrl && (
                  <img src={profileForm.profilePhotoUrl} alt="Preview" className="mt-2 w-16 h-16 rounded-full object-cover border-2 border-[#DDDDDD]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Bio</label>
                <textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Tell travelers about yourself..." className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Phone / Contact</label>
                <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 0000" className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" />
              </div>
              <button onClick={saveProfile} disabled={profileSaving} className="w-full bg-ink text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-50 transition-all shadow-sm">
                {profileSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Experience Form Modal ── */}
      {showExpForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg my-4 shadow-2xl">
            <h3 className="font-bold text-ink text-lg mb-4">{editingExp ? 'Edit Experience' : 'New Experience'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Title</label>
                <input value={expForm.title} onChange={(e) => setExpForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" placeholder="e.g. Sunset Kayaking Tour" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Description</label>
                <textarea value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink resize-none" placeholder="Describe your experience..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Address</label>
                <input value={expForm.address} onChange={(e) => setExpForm((f) => ({ ...f, address: e.target.value }))} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" placeholder="123 Main St, City, Country" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Latitude</label>
                  <input type="number" step="any" value={expForm.latitude} onChange={(e) => setExpForm((f) => ({ ...f, latitude: e.target.value }))} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" placeholder="40.7128" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Longitude</label>
                  <input type="number" step="any" value={expForm.longitude} onChange={(e) => setExpForm((f) => ({ ...f, longitude: e.target.value }))} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" placeholder="-74.0060" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-ink mb-1.5">Price</label>
                  <input type="number" min="0" step="0.01" value={expForm.price} onChange={(e) => setExpForm((f) => ({ ...f, price: e.target.value }))} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" placeholder="49.99" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Currency</label>
                  <input value={expForm.currency} onChange={(e) => setExpForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} maxLength={3} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" placeholder="USD" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Duration (hours)</label>
                  <input type="number" min="0.5" step="0.5" value={expForm.duration} onChange={(e) => setExpForm((f) => ({ ...f, duration: e.target.value }))} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" placeholder="2" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Cancellation Policy</label>
                  <select value={expForm.cancellationPolicy} onChange={(e) => setExpForm((f) => ({ ...f, cancellationPolicy: e.target.value as ExperienceForm['cancellationPolicy'] }))} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink">
                    <option value="flexible">Flexible</option>
                    <option value="moderate">Moderate</option>
                    <option value="strict">Strict</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Categories <span className="text-ink-soft font-normal normal-case">(comma-separated)</span></label>
                <input value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" placeholder="food, culture, adventure" />
              </div>
              {!editingExp && (
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Image URL <span className="text-ink-soft font-normal normal-case">(optional)</span></label>
                  <input type="url" value={expForm.imageUrl} onChange={(e) => setExpForm((f) => ({ ...f, imageUrl: e.target.value }))} className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink" placeholder="https://example.com/image.jpg" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowExpForm(false)} className="flex-1 border border-[#DDDDDD] text-ink/80 py-2.5 rounded-xl text-sm font-medium hover:bg-canvas">Cancel</button>
              <button onClick={saveExperience} disabled={expSaving} className="flex-1 bg-ink text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-50">
                {expSaving ? 'Saving…' : editingExp ? 'Save Changes' : 'Create Experience'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-ink text-lg mb-2">Delete Experience</h3>
            <p className="text-sm text-ink-muted mb-4">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm.title}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-[#DDDDDD] text-ink/80 py-2.5 rounded-xl text-sm font-medium hover:bg-canvas">Cancel</button>
              <button onClick={deleteExperience} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
