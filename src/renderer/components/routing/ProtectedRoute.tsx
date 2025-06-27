/**
 * Protected Route Component
 * Route wrapper that requires authentication
 * Following Instructions file standards with strict TypeScript compliance
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import type { ProtectedRouteProps } from '../../types/navigation.types';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  fallback = null,
}) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  // Debug logging
  console.log('🛡️ ProtectedRoute check:', {
    path: location.pathname,
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    userEmail: user?.email,
  });

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '4px solid #e3f2fd',
            borderTop: '4px solid #513ff2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // Check permissions if required
  if (requiredPermissions.length > 0) {
    // TODO: Implement permission checking logic
    // For now, assume user has all permissions
    const hasPermission = true;

    if (!hasPermission) {
      return fallback || <Navigate to='/' replace />;
    }
  }

  return <>{children}</>;
};
