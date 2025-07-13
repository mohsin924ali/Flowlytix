'use client';

import { ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { theme } from '@/styles/theme';
import { globalStyles } from '@/styles/globals';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { AuthGuard } from '@/components/organisms/AuthGuard/AuthGuard';
import { ErrorBoundary } from '@/components/templates/ErrorBoundary/ErrorBoundary';
import { LayoutProvider } from '@/components/providers/LayoutProvider';

// React Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AppRouterCacheProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <GlobalStyles styles={globalStyles} />
          <ErrorBoundary>
            <AuthProvider>
              <AuthGuard>
                <LayoutProvider>{children}</LayoutProvider>
              </AuthGuard>
              <Toaster
                position='top-right'
                toastOptions={{
                  duration: 5000,
                  style: {
                    background: '#fff',
                    color: '#1a1a1a',
                    border: '1px solid #e0e0e0',
                    fontSize: '14px',
                  },
                }}
              />
            </AuthProvider>
          </ErrorBoundary>
          {process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS === 'true' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </AppRouterCacheProvider>
  );
}
