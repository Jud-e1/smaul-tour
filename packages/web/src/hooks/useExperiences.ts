'use client';

import useSWR from 'swr';
import { experiencesApi } from '@/lib/api';

interface ExperienceQuery {
  text?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minRating?: number;
  sortBy?: 'price' | 'rating' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

const fetcher = (params: ExperienceQuery) =>
  experiencesApi.list(params as Record<string, unknown>).then((r: { data: unknown }) => r.data);

export function useExperiences(query: ExperienceQuery = {}) {
  const key = ['experiences', JSON.stringify(query)];
  const { data, error, isLoading, mutate } = useSWR(key, () => fetcher(query), {
    revalidateOnFocus: false,
  });

  return {
    experiences: data?.experiences ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    mutate,
  };
}

export function useExperience(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ['experience', id] : null,
    () => experiencesApi.get(id!).then((r: { data: unknown }) => r.data),
    { revalidateOnFocus: false }
  );

  return { experience: data ?? null, isLoading, error, mutate };
}
