'use client';

import useSWR from 'swr';
import { bookingsApi } from '@/lib/api';

export function useUserBookings(userId: string | null, status?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? ['bookings', 'user', userId, status] : null,
    () => bookingsApi.getUserBookings(userId!, status ? { status } : undefined).then((r) => r.data),
    { revalidateOnFocus: false }
  );

  return { bookings: data ?? [], isLoading, error, mutate };
}

export function useGuideBookings(guideId: string | null, status?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    guideId ? ['bookings', 'guide', guideId, status] : null,
    () =>
      bookingsApi.getGuideBookings(guideId!, status ? { status } : undefined).then((r) => r.data),
    { revalidateOnFocus: false }
  );

  return { bookings: data ?? [], isLoading, error, mutate };
}
