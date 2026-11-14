'use client';

import { useState, useEffect } from 'react';
import { adminApi, reviewsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/brand/BrandLogo';

type Tab = 'verifications' | 'experiences' | 'reviews' | 'users' | 'metrics' | 'audit';

interface VerificationRequest {
  id: string;
  guideId: string;
  guideName: string;
  status: string;
  submittedAt: string;
}

interface Experience {
  id: string;
  title: string;
  guideId: string;
  guideName: string;
  status: string;
  createdAt: string;
}

interface Review {
  id: string;
  experienceId: string;
  experienceTitle: string;
  authorName: string;
  rating: number;
  comment: string;
  flagReason: string;
}

interface UserRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface Metrics {
  totalUsers: number;
  totalGuides: number;
  totalTravelers: number;
  totalExperiences: number;
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
}

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('verifications');
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [pendingExperiences, setPendingExperiences] = useState<Experience[]>([]);
  const [flaggedReviews, setFlaggedReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [actionTarget, setActionTarget] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/');
  }, [user, router]);

  useEffect(() => {
    loadTab(tab);
  }, [tab]);

  const loadTab = async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'verifications') {
        const { data } = await adminApi.getVerificationRequests('pending');
        setVerifications(data);
      } else if (t === 'experiences') {
        const { data } = await adminApi.getVerificationRequests('pending');
        setPendingExperiences(data);
      } else if (t === 'reviews') {
        const { data } = await adminApi.getFlaggedReviews();
        setFlaggedReviews(data);
      } else if (t === 'users') {
        const { data } = await adminApi.getAuditLogs({ resourceType: 'user' });
        setUsers(data);
      } else if (t === 'metrics') {
        const { data } = await adminApi.getMetrics();
        setMetrics(data);
      } else if (t === 'audit') {
        const { data } = await adminApi.getAuditLogs();
        setAuditLogs(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const approveVerification = async (id: string) => {
    await adminApi.approveVerification(id).catch(() => {});
    setVerifications((prev) => prev.filter((v) => v.id !== id));
  };

  const rejectVerification = async (id: string) => {
    if (!rejectReason.trim()) return;
    await adminApi.rejectVerification(id, rejectReason).catch(() => {});
    setVerifications((prev) => prev.filter((v) => v.id !== id));
    setRejectReason('');
    setActionTarget(null);
  };

  const approveExperience = async (id: string) => {
    await adminApi.approveExperience(id).catch(() => {});
    setPendingExperiences((prev) => prev.filter((e) => e.id !== id));
  };

  const rejectExperience = async (id: string) => {
    if (!rejectReason.trim()) return;
    await adminApi.rejectExperience(id, rejectReason).catch(() => {});
    setPendingExperiences((prev) => prev.filter((e) => e.id !== id));
    setRejectReason('');
    setActionTarget(null);
  };

  const removeReview = async (id: string) => {
    await reviewsApi.flag(id, 'admin_removed').catch(() => {});
    setFlaggedReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const suspendUser = async (id: string) => {
    if (!suspendReason.trim()) return;
    await adminApi.suspendUser(id, suspendReason).catch(() => {});
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'suspended' } : u)));
    setSuspendReason('');
    setActionTarget(null);
  };

  const unsuspendUser = async (id: string) => {
    await adminApi.unsuspendUser(id).catch(() => {});
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'active' } : u)));
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'verifications', label: 'Verifications' },
    { key: 'experiences', label: 'Experiences' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'users', label: 'Users' },
    { key: 'metrics', label: 'Metrics' },
    { key: 'audit', label: 'Audit Log' },
  ];

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="bg-canvas">
      <div className="max-w-page mx-auto px-6 lg:px-10 xl:px-20 pt-8 md:pt-12 pb-10">
        <div className="flex items-center gap-4">
          <BrandLogo variant="mark" decorative className="h-11 w-11 object-contain" />
          <div>
            <p className="text-sm text-ink-muted">Nsoroma operations</p>
            <h1 className="text-[38px] sm:text-[46px] leading-[1.05] font-semibold leading-tight">Admin console</h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="mt-8 mb-8 flex gap-6 sm:gap-8 overflow-x-auto scrollbar-hide border-b border-[#E0E0E5]" aria-label="Admin">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? 'page' : undefined}
              className={`pb-3 -mb-px border-b-2 text-[15px] whitespace-nowrap transition-colors ${
                tab === t.key ? 'border-ink text-ink font-semibold' : 'border-transparent text-ink-muted hover:text-ink hover:border-[#E0E0E5]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="h-16 rounded-xl shimmer" />)}</div>
        ) : (
          <>
            {/* Verifications Tab */}
            {tab === 'verifications' && (
              <div className="bg-paper rounded-2xl border border-[#E0E0E5] overflow-hidden">
                <div className="p-4 border-b border-[#E0E0E5]">
                  <h2 className="text-lg font-semibold text-ink">Pending Guide Verifications</h2>
                </div>
                {verifications.length === 0 ? (
                  <div className="p-8 text-center text-ink-muted">No pending verifications</div>
                ) : (
                  <div className="divide-y divide-black/[0.06]">
                    {verifications.map((v) => (
                      <div key={v.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium text-ink">{v.guideName}</div>
                          <div className="text-sm text-ink-muted">
                            Submitted {new Date(v.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approveVerification(v.id)}
                            className="px-4 py-2 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-[#000000]"
                          >
                            Approve
                          </button>
                          {actionTarget === v.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Rejection reason"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="border border-[#E0E0E5] rounded px-2 py-1 text-sm w-48"
                              />
                              <button
                                onClick={() => rejectVerification(v.id)}
                                className="px-4 py-2 bg-[#D70015] text-white text-sm font-semibold rounded-lg hover:bg-[#A50011]"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setActionTarget(null)}
                                className="px-4 py-2 border border-[#E0E0E5] text-ink text-sm font-semibold rounded-lg hover:border-ink"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setActionTarget(v.id)}
                              className="px-4 py-2 border border-[#E0E0E5] text-[#D70015] text-sm font-semibold rounded-lg hover:border-[#D70015]"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Experiences Tab */}
            {tab === 'experiences' && (
              <div className="bg-paper rounded-2xl border border-[#E0E0E5] overflow-hidden">
                <div className="p-4 border-b border-[#E0E0E5]">
                  <h2 className="text-lg font-semibold text-ink">Pending Experience Approvals</h2>
                </div>
                {pendingExperiences.length === 0 ? (
                  <div className="p-8 text-center text-ink-muted">No pending experiences</div>
                ) : (
                  <div className="divide-y divide-black/[0.06]">
                    {pendingExperiences.map((e) => (
                      <div key={e.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium text-ink">{e.title}</div>
                          <div className="text-sm text-ink-muted">by {e.guideName}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approveExperience(e.id)}
                            className="px-4 py-2 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-[#000000]"
                          >
                            Approve
                          </button>
                          {actionTarget === e.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Rejection reason"
                                value={rejectReason}
                                onChange={(ex) => setRejectReason(ex.target.value)}
                                className="border border-[#E0E0E5] rounded px-2 py-1 text-sm w-48"
                              />
                              <button
                                onClick={() => rejectExperience(e.id)}
                                className="px-4 py-2 bg-[#D70015] text-white text-sm font-semibold rounded-lg hover:bg-[#A50011]"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setActionTarget(null)}
                                className="px-4 py-2 border border-[#E0E0E5] text-ink text-sm font-semibold rounded-lg hover:border-ink"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setActionTarget(e.id)}
                              className="px-4 py-2 border border-[#E0E0E5] text-[#D70015] text-sm font-semibold rounded-lg hover:border-[#D70015]"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Flagged Reviews Tab */}
            {tab === 'reviews' && (
              <div className="bg-paper rounded-2xl border border-[#E0E0E5] overflow-hidden">
                <div className="p-4 border-b border-[#E0E0E5]">
                  <h2 className="text-lg font-semibold text-ink">Flagged Reviews</h2>
                </div>
                {flaggedReviews.length === 0 ? (
                  <div className="p-8 text-center text-ink-muted">No flagged reviews</div>
                ) : (
                  <div className="divide-y divide-black/[0.06]">
                    {flaggedReviews.map((r) => (
                      <div key={r.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium text-ink">{r.experienceTitle}</div>
                            <div className="text-sm text-ink-muted">by {r.authorName} · {r.rating}/5</div>
                            <div className="text-sm text-ink/80 mt-1">{r.comment}</div>
                            <div className="text-xs text-red-600 mt-1">Flag reason: {r.flagReason}</div>
                          </div>
                          <button
                            onClick={() => removeReview(r.id)}
                            className="px-4 py-2 bg-[#D70015] text-white text-sm font-semibold rounded-lg hover:bg-[#A50011] whitespace-nowrap"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Users Tab */}
            {tab === 'users' && (
              <div className="bg-paper rounded-2xl border border-[#E0E0E5] overflow-hidden">
                <div className="p-4 border-b border-[#E0E0E5]">
                  <h2 className="text-lg font-semibold text-ink">User Management</h2>
                </div>
                {users.length === 0 ? (
                  <div className="p-8 text-center text-ink-muted">No users found</div>
                ) : (
                  <div className="divide-y divide-black/[0.06]">
                    {users.map((u) => (
                      <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium text-ink">{u.email}</div>
                          <div className="text-sm text-ink-muted capitalize">{u.role} · {u.status}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {u.status === 'suspended' ? (
                            <button
                              onClick={() => unsuspendUser(u.id)}
                              className="px-4 py-2 border border-ink text-ink text-sm font-semibold rounded-lg hover:bg-fog"
                            >
                              Unsuspend
                            </button>
                          ) : actionTarget === u.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Suspension reason"
                                value={suspendReason}
                                onChange={(ev) => setSuspendReason(ev.target.value)}
                                className="border border-[#E0E0E5] rounded px-2 py-1 text-sm w-48"
                              />
                              <button
                                onClick={() => suspendUser(u.id)}
                                className="px-4 py-2 bg-[#D70015] text-white text-sm font-semibold rounded-lg hover:bg-[#A50011]"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setActionTarget(null)}
                                className="px-4 py-2 border border-[#E0E0E5] text-ink text-sm font-semibold rounded-lg hover:border-ink"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setActionTarget(u.id)}
                              className="px-4 py-2 border border-[#E0E0E5] text-[#D70015] text-sm font-semibold rounded-lg hover:border-[#D70015]"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Metrics Tab */}
            {tab === 'metrics' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics ? (
                  <>
                    {[
                      { label: 'Total Users', value: metrics.totalUsers },
                      { label: 'Guides', value: metrics.totalGuides },
                      { label: 'Travelers', value: metrics.totalTravelers },
                      { label: 'Experiences', value: metrics.totalExperiences },
                      { label: 'Bookings', value: metrics.totalBookings },
                      { label: 'Revenue', value: `$${metrics.totalRevenue?.toLocaleString()}` },
                      { label: 'Avg Booking Value', value: `$${metrics.averageBookingValue?.toFixed(2)}` },
                    ].map((m) => (
                      <div key={m.label} className="bg-paper rounded-2xl border border-[#E0E0E5] overflow-hidden p-4">
                        <div className="text-sm text-ink-muted">{m.label}</div>
                        <div className="text-2xl font-bold text-ink mt-1">{m.value}</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="col-span-4 text-center py-12 text-ink-muted">No metrics available</div>
                )}
              </div>
            )}

            {/* Audit Log Tab */}
            {tab === 'audit' && (
              <div className="bg-paper rounded-2xl border border-[#E0E0E5] overflow-hidden">
                <div className="p-4 border-b border-[#E0E0E5]">
                  <h2 className="text-lg font-semibold text-ink">Audit Log</h2>
                </div>
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-ink-muted">No audit logs</div>
                ) : (
                  <div className="divide-y divide-black/[0.06]">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-ink">{log.action}</span>
                            <span className="text-ink-muted text-sm ml-2">
                              on {log.resourceType} #{log.resourceId}
                            </span>
                          </div>
                          <div className="text-xs text-ink-soft">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-xs text-ink-muted mt-0.5">Admin: {log.adminId}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
