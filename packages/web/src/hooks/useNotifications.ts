'use client';

import useSWR from 'swr';
import { notificationsApi } from '@/lib/api';

export function useNotifications(unreadOnly = false) {
  const { data, error, isLoading, mutate } = useSWR(
    ['notifications', unreadOnly],
    () => notificationsApi.list(unreadOnly ? { unreadOnly: true } : undefined).then((r) => r.data),
    { refreshInterval: 30000 } // poll every 30s
  );

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    mutate();
  };

  return {
    notifications: data ?? [],
    isLoading,
    error,
    markRead,
    mutate,
  };
}
