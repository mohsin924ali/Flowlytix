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
  const [forceNoLoading, setForceNoLoading] = React.useState(false);

  // Failsafe: if loading state persists too long, force it to false
  React.useEffect(() => {
    if (isLoading) {
      const timeoutId = setTimeout(() => {
        console.log('⚠️ ProtectedRoute: Loading state timeout, forcing no loading');
        setForceNoLoading(true);
      }, 5000); // 5 second timeout

      return () => clearTimeout(timeoutId);
    } else {
      setForceNoLoading(false);
    }
  }, [isLoading]);

  // Debug logging with explicit boolean values
  console.log('🛡️ ProtectedRoute check:', {
    path: location.pathname,
    isAuthenticated: Boolean(isAuthenticated),
    isLoading: Boolean(isLoading),
    hasUser: !!user,
    userEmail: user?.email,
  });

  console.log('🛡️ ProtectedRoute raw values:', {
    isAuthenticated,
    isLoading,
    user,
  });

  // Show loading state while checking authentication (with failsafe)
  if (isLoading && !forceNoLoading) {
    console.log('🔄 ProtectedRoute: Showing loading screen because isLoading =', isLoading);
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
    console.log('🔀 ProtectedRoute: Redirecting to login because user is not authenticated');
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
