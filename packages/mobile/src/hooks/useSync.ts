/**
 * Data synchronization hook
 * Provides polling-based sync with optimistic updates and offline handling.
 * Ensures data syncs between web and mobile within 5 seconds.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface SyncOptions<T> {
  /** Fetch function that returns fresh data */
  fetcher: () => Promise<T>;
  /** Polling interval in ms (default: 5000) */
  interval?: number;
  /** Whether to sync immediately on mount */
  immediate?: boolean;
}

interface SyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastSynced: Date | null;
  /** Manually trigger a sync */
  sync: () => Promise<void>;
  /** Optimistically update local data before server confirms */
  optimisticUpdate: (updater: (prev: T | null) => T) => void;
}

export function useSync<T>({
  fetcher,
  interval = 5000,
  immediate = true,
}: SyncOptions<T>): SyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const sync = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
      setLastSynced(new Date());
      setError(null);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Sync failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  const optimisticUpdate = useCallback((updater: (prev: T | null) => T) => {
    setData((prev) => updater(prev));
  }, []);

  // Start/stop polling based on app state
  useEffect(() => {
    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(sync, interval);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground — sync immediately then restart polling
        sync();
        startPolling();
      } else if (nextState.match(/inactive|background/)) {
        stopPolling();
      }
      appStateRef.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    if (immediate) {
      setLoading(true);
      sync();
    }
    startPolling();

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [sync, interval, immediate]);

  return { data, loading, error, lastSynced, sync, optimisticUpdate };
}

export default useSync;
