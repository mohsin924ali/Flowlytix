/**
 * Subscription Gate Component
 * Handles the flow between login and subscription activation
 * Shows activation screen if subscription is needed, otherwise shows children
 */

import React, { useEffect, useState } from 'react';
import { Box, Alert, CircularProgress, Typography, Card, CardContent, Button } from '@mui/material';
import { useSubscription } from '../../hooks/useSubscription';
import { ActivationScreen } from '../organisms/ActivationScreen/ActivationScreen';
import { useAuthStore } from '../../store/auth.store';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const { isActivated, isLoading, error, clearError } = useSubscription();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Debug logging to track activation state changes
  useEffect(() => {
    console.log('🚪 SubscriptionGate: State changed', {
      isAuthenticated,
      isActivated,
      isLoading,
      isTransitioning,
      error: error ? error.substring(0, 100) : null,
    });
  }, [isAuthenticated, isActivated, isLoading, isTransitioning, error]);

  // Handle successful activation
  const handleActivationSuccess = () => {
    console.log('🎉 SubscriptionGate: Activation successful, starting transition');
    clearError();
    setIsTransitioning(true);

    // Brief transition delay to ensure state is properly updated
    setTimeout(() => {
      console.log('🔄 SubscriptionGate: Transition completed, current state:', {
        isActivated,
        isLoading,
        error,
      });
      setIsTransitioning(false);
    }, 100);
  };

  // Handle trial mode (if you want to support it)
  const handleTrialMode = () => {
    console.log('🆓 SubscriptionGate: Trial mode selected');
    // You can implement trial logic here or just allow access
    // For now, we'll just proceed without activation
  };

  // If not authenticated, don't show anything (login screen will be shown)
  if (!isAuthenticated) {
    console.log('🔒 SubscriptionGate: Not authenticated, returning null');
    return null;
  }

  // Show loading while initializing or transitioning
  if (isLoading || isTransitioning) {
    console.log('⏳ SubscriptionGate: Loading subscription status...');
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant='body1' color='text.secondary'>
          {isTransitioning ? 'Activating subscription...' : 'Checking subscription status...'}
        </Typography>
      </Box>
    );
  }

  // Show error if there's an issue
  if (error) {
    console.log('❌ SubscriptionGate: Error state:', error);

    // CRITICAL FIX: Handle license invalidation errors specially
    // Show activation screen instead of error screen for license issues
    if (
      error.includes('License invalid') ||
      error.includes('activation required') ||
      error.includes('invalid_license')
    ) {
      console.log('🔑 SubscriptionGate: License invalid - showing activation screen instead of error');
      return (
        <ActivationScreen
          onActivationSuccess={handleActivationSuccess}
          onTrialMode={handleTrialMode}
          showDeviceInfo={true}
          isReactivation={true} // Indicate this is a re-activation
        />
      );
    }

    // Show friendly error screen for other errors
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}
      >
        <Card sx={{ maxWidth: 500, p: 3, textAlign: 'center' }}>
          <CardContent>
            <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant='h5' gutterBottom color='error'>
              Subscription Error
            </Typography>
            <Typography variant='body1' sx={{ mb: 3 }}>
              {error}
            </Typography>
            <Button
              variant='contained'
              onClick={() => {
                clearError();
                window.location.reload();
              }}
              startIcon={<Refresh />}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Determine if activation is needed
  const needsActivation = isAuthenticated && !isActivated;

  // Show activation screen if needed
  if (needsActivation) {
    console.log('🔑 SubscriptionGate: Showing activation screen');
    return (
      <ActivationScreen
        onActivationSuccess={handleActivationSuccess}
        onTrialMode={handleTrialMode}
        showDeviceInfo={true}
      />
    );
  }

  // Show main app - even if subscription is suspended/ended
  // Individual pages (Dashboard/Analytics) will show warnings
  console.log('✅ SubscriptionGate: Allowing access to main app');
  return <>{children}</>;
};
