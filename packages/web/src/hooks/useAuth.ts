'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

/**
 * Hook to access auth state and actions.
 * Optionally redirects to login if not authenticated.
 */
export function useAuth(requireAuth = false) {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    loginOAuth,
    register,
    logout,
    fetchMe,
    clearError,
  } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      fetchMe();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [requireAuth, isLoading, isAuthenticated, router]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    loginOAuth,
    register,
    logout,
    clearError,
  };
}
