'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { experiencesApi, bookingsApi, paymentsApi, userApi, reviewsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
import StarRating from '@/components/ui/StarRating';
import DashboardShell, { type StatItem, type TabItem } from '@/components/dashboard/DashboardShell';
import BarChart from '@/components/dashboard/BarChart';
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
  IconChart,
  IconClipboard,
  IconCompass,
  IconSparkles,
  IconStar,
  IconUser,
  IconWallet,
} from '@/components/dashboard/icons';

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

const inp = inputCls('emerald');

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
      const res = await experiencesApi.list({ guideId: user.id });
      const data = res.data as Experience[] | { experiences?: Experience[] };
      setExperiences(Array.isArray(data) ? data : data?.experiences || []);
    } catch { /* ignore */ }
    finally { setExpLoading(false); }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'guide' && tab === 'experiences') void loadExperiences();
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

  // Load payments on mount so earnings KPIs are accurate before the
  // Payments tab is ever opened.
  useEffect(() => {
    if (!user) return;
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
  }, [user]);

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
      void loadExperiences();
    } catch {
      toast('Failed to save experience', 'error');
    } finally { setExpSaving(false); }
  };

  const deleteExperience = async () => {
    if (!deleteConfirm) return;
    try {
      await experiencesApi.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      void loadExperiences();
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

  // Monthly revenue trend (last 6 months) from confirmed/completed bookings.
  const revenueTrend = (() => {
    const now = new Date();
    const months: { label: string; value: number; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), value: 0, key: `${d.getFullYear()}-${d.getMonth()}` });
    }
    allBookings
      .filter((b) => b.status === 'confirmed' || b.status === 'completed')
      .forEach((b) => {
        const d = new Date(b.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const bucket = months.find((m) => m.key === key);
        if (bucket) bucket.value += b.totalAmount || 0;
      });
    return months.map(({ label, value }) => ({ label, value }));
  })();
  const hasRevenue = revenueTrend.some((m) => m.value > 0);

  if (!user || user.role !== 'guide') return null;

  const firstName = user.profile?.firstName || user.email?.split('@')[0] || 'Guide';
  const avatarInitial = firstName.charAt(0).toUpperCase();

  const tabs: TabItem[] = [
    { key: 'experiences', label: 'Experiences', icon: IconSparkles },
    { key: 'bookings', label: 'Bookings', icon: IconCalendar },
    { key: 'payments', label: 'Payments', icon: IconWallet },
    { key: 'reviews', label: 'Reviews', icon: IconStar },
    { key: 'profile', label: 'Profile', icon: IconUser },
  ];

  const stats: StatItem[] = [
    { label: 'Total Earnings', value: `$${totalEarnings.toFixed(0)}`, icon: IconWallet, tone: 'emerald' },
    { label: 'Pending Payout', value: `$${pendingEarnings.toFixed(0)}`, icon: IconChart, tone: 'violet' },
    { label: 'Total Bookings', value: allBookings.length, icon: IconClipboard, tone: 'sky' },
    { label: 'Active Listings', value: activeExperiences, icon: IconSparkles, tone: 'teal' },
    { label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '—', icon: IconStar, tone: 'amber' },
  ];

  const subline = avgRating > 0 ? (
    <div className="mt-1 flex items-center gap-1.5">
      <StarRating value={Math.round(avgRating)} readonly size="sm" />
      <span className="text-xs text-gray-500">{avgRating.toFixed(1)} avg rating</span>
    </div>
  ) : undefined;

  return (
    <DashboardShell
      accent="emerald"
      roleLabel="Guide dashboard"
      firstName={firstName}
      avatarInitial={avatarInitial}
      photoUrl={user.profile?.profilePhotoUrl}
      subline={subline}
      tabs={tabs}
      activeTab={tab}
      onTab={(k) => setTab(k as Tab)}
      stats={stats}
      onSignOut={() => { logout(); router.push('/'); }}
    >
      {/* ── Experiences Tab ── */}
      {tab === 'experiences' && (
        <div>
          {/* Earnings overview */}
          <div className={`${card} mb-6 p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Revenue trend</p>
                <p className="text-sm text-gray-600">Confirmed &amp; completed bookings · last 6 months</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <IconChart className="h-[18px] w-[18px]" />
              </span>
            </div>
            {hasRevenue ? (
              <BarChart data={revenueTrend} prefix="$" />
            ) : (
              <div className="flex h-[120px] items-center justify-center text-sm text-gray-400">
                No booking revenue yet — your earnings trend will appear here.
              </div>
            )}
          </div>

          <SectionHeader title="My Experiences">
            <button onClick={openCreateForm} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_rgba(16,185,129,0.55)] transition hover:from-emerald-400 hover:to-teal-500">
              + New Experience
            </button>
          </SectionHeader>
          {expLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
          ) : experiences.length === 0 ? (
            <EmptyState
              icon={IconSparkles}
              title="No experiences yet"
              action={<button onClick={openCreateForm} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Create your first experience →</button>}
            />
          ) : (
            <div className="space-y-3">
              {experiences.map((exp) => (
                <div key={exp.id} className={`${card} ${cardHover} overflow-hidden`}>
                  <div className="flex gap-4 p-4">
                    {exp.images?.[0]?.url ? (
                      <img src={exp.images[0].url} alt={exp.title} className="h-20 w-20 shrink-0 rounded-xl object-cover ring-1 ring-gray-200" />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600">
                        <IconCompass className="h-7 w-7" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-semibold text-gray-900">{exp.title}</span>
                            <StatusBadge tone={toneFor(exp.status)}>{exp.status.replace('_', ' ')}</StatusBadge>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-gray-500">{exp.location?.address}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                            <span className="font-medium text-gray-600">{exp.price?.currency} {exp.price?.amount?.toFixed(2)}</span>
                            <span>{exp.duration}h</span>
                            {exp.averageRating > 0 && <span className="flex items-center gap-1"><IconStar className="h-3.5 w-3.5 text-amber-500" /> {exp.averageRating.toFixed(1)} ({exp.reviewCount})</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => void toggleStatus(exp)}
                            disabled={togglingId === exp.id || exp.status === 'pending_approval'}
                            title={exp.status === 'active' ? 'Deactivate' : 'Activate'}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                              exp.status === 'active' ? 'bg-emerald-500' : 'bg-gray-200'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${exp.status === 'active' ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <button onClick={() => openEditForm(exp)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100">Edit</button>
                          <button onClick={() => setDeleteConfirm(exp)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100">Delete</button>
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
          <div className="mb-5 flex items-center gap-2">
            {(['upcoming', 'past', 'cancelled'] as BookingFilter[]).map((s) => (
              <button key={s} onClick={() => setBookingFilter(s)}
                className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition-all ${
                  bookingFilter === s ? 'bg-emerald-600 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}>
                {s}
              </button>
            ))}
          </div>
          {bookingsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
          ) : bookings.length === 0 ? (
            <EmptyState icon={IconCalendar} title={`No ${bookingFilter} bookings`} />
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const travelerName = booking.traveler?.profile
                  ? `${booking.traveler.profile.firstName || ''} ${booking.traveler.profile.lastName || ''}`.trim()
                  : booking.traveler?.email || 'Traveler';
                return (
                  <div key={booking.id} className={`${card} ${cardHover} p-4`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900">{booking.experience?.title || 'Experience'}</p>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {travelerName} · {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {booking.startTime}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">#{booking.referenceNumber}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <StatusBadge tone={toneFor(booking.status)}>{booking.status}</StatusBadge>
                        <p className="mt-1 text-base font-bold text-gray-900">{booking.totalCurrency} {booking.totalAmount?.toFixed(2)}</p>
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
          <SectionHeader title="Payments" />
          {paymentsLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
          ) : payments.length === 0 ? (
            <EmptyState icon={IconWallet} title="No payments yet" />
          ) : (
            <div className="space-y-6">
              {[
                { label: 'Pending (Escrowed)', filter: (p: Payment) => p.status === 'escrowed' || p.status === 'captured', color: 'text-violet-600' },
                { label: 'Released', filter: (p: Payment) => p.status === 'released', color: 'text-emerald-600' },
                { label: 'Other', filter: (p: Payment) => !['escrowed', 'captured', 'released'].includes(p.status), color: 'text-gray-600' },
              ].map(({ label, filter, color }) => {
                const group = payments.filter(filter);
                if (group.length === 0) return null;
                return (
                  <div key={label}>
                    <h3 className={`mb-3 text-sm font-semibold ${color}`}>{label}</h3>
                    <div className="space-y-3">
                      {group.map((payment) => (
                        <div key={payment.id} className={`${card} p-4`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{payment.booking?.experience?.title || 'Experience'}</p>
                              <p className="mt-0.5 text-xs text-gray-400">
                                {new Date(payment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {payment.booking?.referenceNumber && ` · #${payment.booking.referenceNumber}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <StatusBadge tone={toneFor(payment.status)}>{payment.status}</StatusBadge>
                              <p className="mt-1 text-base font-bold text-gray-900">{payment.currency} {payment.amount?.toFixed(2)}</p>
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
          <SectionHeader title="Reviews" />
          {reviewsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
          ) : reviews.length === 0 ? (
            <EmptyState icon={IconStar} title="No reviews yet" />
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => {
                const reviewerName = review.traveler?.profile
                  ? `${review.traveler.profile.firstName || ''} ${review.traveler.profile.lastName || ''}`.trim() || 'Traveler'
                  : 'Traveler';
                return (
                  <div key={review.id} className={`${card} ${cardHover} p-4`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <StarRating value={review.rating} readonly size="sm" />
                          <span className="text-sm font-semibold text-gray-700">{reviewerName}</span>
                        </div>
                        {review.experience?.title && <p className="mb-1 text-xs font-medium text-emerald-600">{review.experience.title}</p>}
                        {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                      </div>
                      <p className="shrink-0 text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
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
              <textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Tell travelers about yourself..." className={`${inp} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Phone / Contact</label>
              <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 0000" className={inp} />
            </div>
            <button onClick={() => void saveProfile()} disabled={profileSaving} className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_rgba(16,185,129,0.55)] transition hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50">
              {profileSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Experience Form Modal ── */}
      {showExpForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm">
          <div className={`${card} my-4 w-full max-w-lg p-6 shadow-2xl animate-fade-up`}>
            <h3 className="mb-4 text-lg font-bold text-gray-900">{editingExp ? 'Edit Experience' : 'New Experience'}</h3>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Title</label>
                <input value={expForm.title} onChange={(e) => setExpForm((f) => ({ ...f, title: e.target.value }))} className={inp} placeholder="e.g. Sunset Kayaking Tour" />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} rows={3} className={`${inp} resize-none`} placeholder="Describe your experience..." />
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <input value={expForm.address} onChange={(e) => setExpForm((f) => ({ ...f, address: e.target.value }))} className={inp} placeholder="123 Main St, City, Country" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Latitude</label>
                  <input type="number" step="any" value={expForm.latitude} onChange={(e) => setExpForm((f) => ({ ...f, latitude: e.target.value }))} className={inp} placeholder="40.7128" />
                </div>
                <div>
                  <label className={labelCls}>Longitude</label>
                  <input type="number" step="any" value={expForm.longitude} onChange={(e) => setExpForm((f) => ({ ...f, longitude: e.target.value }))} className={inp} placeholder="-74.0060" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Price</label>
                  <input type="number" min="0" step="0.01" value={expForm.price} onChange={(e) => setExpForm((f) => ({ ...f, price: e.target.value }))} className={inp} placeholder="49.99" />
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <input value={expForm.currency} onChange={(e) => setExpForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} maxLength={3} className={inp} placeholder="USD" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Duration (hours)</label>
                  <input type="number" min="0.5" step="0.5" value={expForm.duration} onChange={(e) => setExpForm((f) => ({ ...f, duration: e.target.value }))} className={inp} placeholder="2" />
                </div>
                <div>
                  <label className={labelCls}>Cancellation Policy</label>
                  <select value={expForm.cancellationPolicy} onChange={(e) => setExpForm((f) => ({ ...f, cancellationPolicy: e.target.value as ExperienceForm['cancellationPolicy'] }))} className={inp}>
                    <option value="flexible">Flexible</option>
                    <option value="moderate">Moderate</option>
                    <option value="strict">Strict</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Categories <span className="font-normal normal-case text-gray-400">(comma-separated)</span></label>
                <input value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))} className={inp} placeholder="food, culture, adventure" />
              </div>
              {!editingExp && (
                <div>
                  <label className={labelCls}>Image URL <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                  <input type="url" value={expForm.imageUrl} onChange={(e) => setExpForm((f) => ({ ...f, imageUrl: e.target.value }))} className={inp} placeholder="https://example.com/image.jpg" />
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowExpForm(false)} className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">Cancel</button>
              <button onClick={() => void saveExperience()} disabled={expSaving} className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-sm font-semibold text-white hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50">
                {expSaving ? 'Saving…' : editingExp ? 'Save Changes' : 'Create Experience'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
          <div className={`${card} w-full max-w-sm p-6 shadow-2xl animate-fade-up`}>
            <h3 className="mb-2 text-lg font-bold text-gray-900">Delete Experience</h3>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirm.title}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">Cancel</button>
              <button onClick={() => void deleteExperience()} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-400">Delete</button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
