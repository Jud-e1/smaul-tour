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
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <span className="font-semibold text-gray-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
            ) : (
              notifications.map((n: Notification) => (
                <div
                  key={n.id}
                  className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    n.status !== 'read' ? 'bg-blue-50' : 'bg-white'
                  }`}
                  onClick={() => n.status !== 'read' && markRead(n.id)}
                >
                  <div
                    className={`text-sm text-gray-800 ${n.status !== 'read' ? 'font-semibold' : 'font-normal'}`}
                  >
                    {n.subject}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{n.body}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                    {n.status !== 'read' && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full inline-block" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-gray-100 text-center">
            <a
              href="/settings/notifications"
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Notification preferences
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
