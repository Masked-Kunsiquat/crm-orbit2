import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Query Client Configuration
 * Optimized for local-first SQLite operations
 * Created once at module level to ensure stability
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes (local SQLite is fast, but avoid unnecessary reads)
      staleTime: 5 * 60 * 1000,

      // Keep unused data in cache for 10 minutes (v5 uses gcTime instead of cacheTime)
      gcTime: 10 * 60 * 1000,

      // Don't refetch on window focus (mobile app)
      refetchOnWindowFocus: false,

      // Don't refetch on reconnect (we're offline-first)
      refetchOnReconnect: false,

      // Retry failed queries once (SQLite errors are usually not transient)
      retry: 1,

      // Show errors in development
      useErrorBoundary: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

/**
 * QueryProvider component
 * Wraps app with TanStack Query context
 */
export default function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export { queryClient };
