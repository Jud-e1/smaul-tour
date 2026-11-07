'use client';

import { useState, useEffect, useRef } from 'react';
import { notificationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface Notification {
  id: string;
  type: string;
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed' | 'read';
  createdAt: string;
}

export default function NotificationCenter() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.status !== 'read').length;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    notificationsApi
      .list()
      .then(({ data }: { data: Notification[] }) => setNotifications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id).catch(() => {});
    setNotifications((prev: Notification[]) =>
      prev.map((n: Notification) => (n.id === id ? { ...n, status: 'read' } : n))
    );
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n: Notification) => n.status !== 'read');
    await Promise.all(unread.map((n: Notification) => notificationsApi.markRead(n.id).catch(() => {})));
    setNotifications((prev: Notification[]) => prev.map((n: Notification) => ({ ...n, status: 'read' })));
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-fog transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.7}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-sun text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.12)] border border-[#EDF2F2] z-50 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDF2F2]">
            <span className="text-base font-semibold text-ink">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold underline text-ink"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-ink-muted text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="px-6 py-10 text-center"><p className="text-3xl mb-2" aria-hidden>🔔</p><p className="text-sm font-semibold text-ink">You’re all caught up</p><p className="text-xs text-ink-muted mt-1">Booking updates and messages will show up here.</p></div>
            ) : (
              notifications.map((n: Notification) => (
                <div
                  key={n.id}
                  className={`px-5 py-3.5 border-b border-[#EDF2F2] last:border-0 cursor-pointer hover:bg-fog transition-colors ${
                    n.status !== 'read' ? 'bg-sun-50/60' : 'bg-white'
                  }`}
                  onClick={() => n.status !== 'read' && markRead(n.id)}
                >
                  <div
                    className={`text-sm text-ink ${n.status !== 'read' ? 'font-semibold' : 'font-normal'}`}
                  >
                    {n.subject}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">{n.body}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-ink-soft">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                    {n.status !== 'read' && (
                      <span className="w-2 h-2 bg-sun rounded-full inline-block" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-5 py-3 border-t border-[#EDF2F2]">
            <a
              href="/settings/notifications"
              className="text-sm font-semibold underline text-ink"
            >
              Notification preferences
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
