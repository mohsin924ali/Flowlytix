/**
 * Authentication Guard Component
 * Protects routes by checking authentication status
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/components/providers/AuthProvider';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Routes that don't require authentication
const publicRoutes = ['/auth/login', '/auth/register'];

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip auth check for public routes
    if (publicRoutes.includes(pathname)) {
      return;
    }

    // If not loading and not authenticated, redirect to login
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, pathname, router]);

  // Show loading during initialization
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: '#f8fafc',
        }}
      >
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant='h6' color='textSecondary'>
          Loading Dashboard...
        </Typography>
      </Box>
    );
  }

  // Allow public routes to render without authentication
  if (publicRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  // Render children only if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
};
