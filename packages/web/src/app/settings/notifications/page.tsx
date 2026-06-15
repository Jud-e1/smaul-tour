'use client';

import { useState, useEffect } from 'react';
import { notificationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'itinerary_generated'
  | 'review_received';

type Channel = 'email' | 'push' | 'in_app';

interface Preferences {
  [key: string]: {
    email: boolean;
    push: boolean;
    in_app: boolean;
  };
}

const NOTIFICATION_TYPES: { key: NotificationType; label: string; description: string }[] = [
  {
    key: 'booking_confirmed',
    label: 'Booking Confirmed',
    description: 'When a booking is confirmed',
  },
  {
    key: 'booking_cancelled',
    label: 'Booking Cancelled',
    description: 'When a booking is cancelled',
  },
  {
    key: 'payment_received',
    label: 'Payment Received',
    description: 'When a payment is processed',
  },
  {
    key: 'itinerary_generated',
    label: 'Itinerary Generated',
    description: 'When an AI itinerary is ready',
  },
  {
    key: 'review_received',
    label: 'Review Received',
    description: 'When you receive a new review',
  },
];

const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'push', label: 'Push' },
  { key: 'in_app', label: 'In-App' },
];

const defaultPreferences = (): Preferences =>
  Object.fromEntries(
    NOTIFICATION_TYPES.map(({ key }) => [key, { email: true, push: true, in_app: true }])
  );

export default function NotificationPreferencesPage() {
  const { user } = useAuthStore();
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    notificationsApi
      .getPreferences(user.id)
      .then(({ data }: { data: Preferences }) => {
        if (data && typeof data === 'object') {
          setPreferences({ ...defaultPreferences(), ...data });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const toggle = (type: NotificationType, channel: Channel) => {
    setPreferences((prev: Preferences) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: !prev[type][channel],
      },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await notificationsApi.updatePreferences(user.id, preferences);
      setSaved(true);
    } catch {
      setError('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Please log in to manage notification preferences.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <a href="/" className="text-sm text-blue-600 hover:text-blue-800">
            &larr; Back
          </a>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Notification Preferences</h1>
          <p className="text-gray-500 text-sm mt-1">
            Choose how you want to be notified for each event type.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            Loading preferences...
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-1/2">
                    Notification Type
                  </th>
                  {CHANNELS.map((ch) => (
                    <th
                      key={ch.key}
                      className="text-center py-3 px-4 text-sm font-semibold text-gray-700"
                    >
                      {ch.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NOTIFICATION_TYPES.map(({ key, label, description }, idx) => (
                  <tr
                    key={key}
                    className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-800 text-sm">{label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{description}</div>
                    </td>
                    {CHANNELS.map((ch) => (
                      <td key={ch.key} className="py-4 px-4 text-center">
                        <button
                          role="switch"
                          aria-checked={preferences[key]?.[ch.key] ?? false}
                          aria-label={`${label} ${ch.label}`}
                          onClick={() => toggle(key, ch.key)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                            preferences[key]?.[ch.key] ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              preferences[key]?.[ch.key] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-4 flex items-center justify-between border-t border-gray-100">
              {error && <p className="text-sm text-red-600">{error}</p>}
              {saved && !error && <p className="text-sm text-green-600">Preferences saved.</p>}
              {!error && !saved && <span />}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save preferences'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
