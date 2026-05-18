'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { experiencesApi, bookingsApi, paymentsApi, userApi, reviewsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
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
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-500',
  pending_approval: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
  pending: 'bg-amber-100 text-amber-700',
  escrowed: 'bg-purple-100 text-purple-700',
  released: 'bg-blue-100 text-blue-700',
};

export default function GuideDashboard() {
  const { user, logout } = useAuthStore();
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
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'guide') { router.push('/dashboard/traveler'); return; }
    setProfileForm({
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      bio: user.profile?.bio || '',
      profilePhotoUrl: user.profile?.profilePhotoUrl || '',
      phone: '',
    });
  }, [user, router]);

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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-md overflow-hidden">
                {user.profile?.profilePhotoUrl
                  ? <img src={user.profile.profilePhotoUrl} alt={firstName} className="w-12 h-12 object-cover" />
                  : avatarInitial}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Guide Dashboard</p>
                <h1 className="text-xl font-bold text-gray-900">{firstName}</h1>
                {avgRating > 0 && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StarRating value={Math.round(avgRating)} readonly size="sm" />
                    <span className="text-xs text-gray-500">{avgRating.toFixed(1)} avg rating</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="Home">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
              <Link href="/notifications" className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="Notifications">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </Link>
              <button onClick={() => { logout(); router.push('/'); }} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                Sign out
              </button>
            </div>
          </div>

          {/* KPI Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
            {[
              { label: 'Total Earnings', value: `$${totalEarnings.toFixed(0)}`, icon: '💰', color: 'from-emerald-50 to-emerald-100', text: 'text-emerald-700' },
              { label: 'Pending Payout', value: `$${pendingEarnings.toFixed(0)}`, icon: '⏳', color: 'from-purple-50 to-purple-100', text: 'text-purple-700' },
              { label: 'Total Bookings', value: allBookings.length, icon: '🗓', color: 'from-blue-50 to-blue-100', text: 'text-blue-700' },
              { label: 'Active Listings', value: activeExperiences, icon: '🌟', color: 'from-teal-50 to-teal-100', text: 'text-teal-700' },
              { label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '—', icon: '⭐', color: 'from-amber-50 to-amber-100', text: 'text-amber-700' },
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
        <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 mb-6 w-fit shadow-sm flex-wrap">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Experiences Tab ── */}
        {tab === 'experiences' && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-gray-900">My Experiences</h2>
              <button onClick={openCreateForm} className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-teal-600 hover:to-emerald-700 shadow-sm transition-all">
                + New Experience
              </button>
            </div>
            {expLoading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
            ) : experiences.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="text-5xl mb-3">🌟</div>
                <p className="text-gray-500 font-medium">No experiences yet</p>
                <button onClick={openCreateForm} className="inline-block mt-3 text-sm text-teal-500 hover:text-teal-600 font-medium">Create your first experience →</button>
              </div>
            ) : (
              <div className="space-y-3">
                {experiences.map((exp) => (
                  <div key={exp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex gap-4 p-4">
                      {exp.images?.[0]?.url ? (
                        <img src={exp.images[0].url} alt={exp.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-3xl shrink-0">🌍</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 truncate">{exp.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[exp.status] || 'bg-gray-100 text-gray-600'}`}>
                                {exp.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5 truncate">{exp.location?.address}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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
                                exp.status === 'active' ? 'bg-teal-500' : 'bg-gray-300'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${exp.status === 'active' ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <button onClick={() => openEditForm(exp)} className="text-xs text-teal-600 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 font-medium transition-colors">Edit</button>
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
                    bookingFilter === s ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
            {bookingsLoading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="text-5xl mb-3">🗓</div>
                <p className="text-gray-500 font-medium">No {bookingFilter} bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => {
                  const travelerName = booking.traveler?.profile
                    ? `${booking.traveler.profile.firstName || ''} ${booking.traveler.profile.lastName || ''}`.trim()
                    : booking.traveler?.email || 'Traveler';
                  return (
                    <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-gray-900">{booking.experience?.title || 'Experience'}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {travelerName} · {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {booking.startTime}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">#{booking.referenceNumber}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                            {booking.status}
                          </span>
                          <p className="text-base font-bold text-gray-900 mt-1">{booking.totalCurrency} {booking.totalAmount?.toFixed(2)}</p>
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
            <h2 className="font-semibold text-gray-900 mb-5">Payments</h2>
            {paymentsLoading ? (
              <div className="space-y-3">{[1,2].map((i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="text-5xl mb-3">💰</div>
                <p className="text-gray-500 font-medium">No payments yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {[
                  { label: 'Pending (Escrowed)', filter: (p: Payment) => p.status === 'escrowed' || p.status === 'captured', icon: '⏳', color: 'text-purple-700' },
                  { label: 'Released', filter: (p: Payment) => p.status === 'released', icon: '✅', color: 'text-emerald-700' },
                  { label: 'Other', filter: (p: Payment) => !['escrowed', 'captured', 'released'].includes(p.status), icon: '📋', color: 'text-gray-700' },
                ].map(({ label, filter, icon, color }) => {
                  const group = payments.filter(filter);
                  if (group.length === 0) return null;
                  return (
                    <div key={label}>
                      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-1.5 ${color}`}>{icon} {label}</h3>
                      <div className="space-y-3">
                        {group.map((payment) => (
                          <div key={payment.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">{payment.booking?.experience?.title || 'Experience'}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {new Date(payment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  {payment.booking?.referenceNumber && ` · #${payment.booking.referenceNumber}`}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[payment.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {payment.status}
                                </span>
                                <p className="text-base font-bold text-gray-900 mt-1">{payment.currency} {payment.amount?.toFixed(2)}</p>
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
            <h2 className="font-semibold text-gray-900 mb-5">Reviews</h2>
            {reviewsLoading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="text-5xl mb-3">⭐</div>
                <p className="text-gray-500 font-medium">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => {
                  const reviewerName = review.traveler?.profile
                    ? `${review.traveler.profile.firstName || ''} ${review.traveler.profile.lastName || ''}`.trim() || 'Traveler'
                    : 'Traveler';
                  return (
                    <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <StarRating value={review.rating} readonly size="sm" />
                            <span className="text-sm font-semibold text-gray-700">{reviewerName}</span>
                          </div>
                          {review.experience?.title && <p className="text-xs text-teal-600 mb-1 font-medium">{review.experience.title}</p>}
                          {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                        </div>
                        <p className="text-xs text-gray-400 shrink-0">{new Date(review.createdAt).toLocaleDateString()}</p>
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-lg">
            <h2 className="font-semibold text-gray-900 mb-5">Edit Profile</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">First name</label>
                  <input value={profileForm.firstName} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Last name</label>
                  <input value={profileForm.lastName} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Profile photo URL</label>
                <input type="url" value={profileForm.profilePhotoUrl} onChange={(e) => setProfileForm((p) => ({ ...p, profilePhotoUrl: e.target.value }))} placeholder="https://example.com/photo.jpg" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
                {profileForm.profilePhotoUrl && (
                  <img src={profileForm.profilePhotoUrl} alt="Preview" className="mt-2 w-16 h-16 rounded-full object-cover border-2 border-gray-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bio</label>
                <textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Tell travelers about yourself..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone / Contact</label>
                <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 0000" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
              </div>
              <button onClick={saveProfile} disabled={profileSaving} className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-teal-600 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-sm">
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
            <h3 className="font-bold text-gray-900 text-lg mb-4">{editingExp ? 'Edit Experience' : 'New Experience'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title</label>
                <input value={expForm.title} onChange={(e) => setExpForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" placeholder="e.g. Sunset Kayaking Tour" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none" placeholder="Describe your experience..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
                <input value={expForm.address} onChange={(e) => setExpForm((f) => ({ ...f, address: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" placeholder="123 Main St, City, Country" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Latitude</label>
                  <input type="number" step="any" value={expForm.latitude} onChange={(e) => setExpForm((f) => ({ ...f, latitude: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" placeholder="40.7128" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Longitude</label>
                  <input type="number" step="any" value={expForm.longitude} onChange={(e) => setExpForm((f) => ({ ...f, longitude: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" placeholder="-74.0060" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Price</label>
                  <input type="number" min="0" step="0.01" value={expForm.price} onChange={(e) => setExpForm((f) => ({ ...f, price: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" placeholder="49.99" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Currency</label>
                  <input value={expForm.currency} onChange={(e) => setExpForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} maxLength={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" placeholder="USD" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Duration (hours)</label>
                  <input type="number" min="0.5" step="0.5" value={expForm.duration} onChange={(e) => setExpForm((f) => ({ ...f, duration: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" placeholder="2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cancellation Policy</label>
                  <select value={expForm.cancellationPolicy} onChange={(e) => setExpForm((f) => ({ ...f, cancellationPolicy: e.target.value as ExperienceForm['cancellationPolicy'] }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent">
                    <option value="flexible">Flexible</option>
                    <option value="moderate">Moderate</option>
                    <option value="strict">Strict</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Categories <span className="text-gray-400 font-normal normal-case">(comma-separated)</span></label>
                <input value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" placeholder="food, culture, adventure" />
              </div>
              {!editingExp && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Image URL <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                  <input type="url" value={expForm.imageUrl} onChange={(e) => setExpForm((f) => ({ ...f, imageUrl: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" placeholder="https://example.com/image.jpg" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowExpForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={saveExperience} disabled={expSaving} className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-teal-600 hover:to-emerald-700 disabled:opacity-50">
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
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete Experience</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm.title}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={deleteExperience} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
