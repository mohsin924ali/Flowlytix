/**
 * SubscriptionWarning Component
 * Shows warning banners for suspended/ended subscriptions
 * Following Instructions file standards with proper internationalization
 */

import React, { useState } from 'react';
import { Alert, AlertTitle, Box, Button, Collapse, IconButton, Typography, useTheme } from '@mui/material';
import { Warning, Error, Close, Refresh, ContactSupport, ExpandMore, ExpandLess } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscription } from '../../../hooks/useSubscription';

export interface SubscriptionWarningProps {
  /** Show only if subscription has issues */
  showOnlyIfNeeded?: boolean;
  /** Allow dismissing the warning */
  dismissible?: boolean;
  /** Show detailed information */
  showDetails?: boolean;
  /** Custom styling */
  sx?: any;
}

export const SubscriptionWarning: React.FC<SubscriptionWarningProps> = ({
  showOnlyIfNeeded = true,
  dismissible = true,
  showDetails = false,
  sx = {},
}) => {
  const theme = useTheme();
  const { isActivated, subscriptionStatus, isExpired, isCompletelyExpired, expiresAt, daysRemaining, isInGracePeriod } =
    useSubscription();

  const [dismissed, setDismissed] = useState(false);
  const [showDetailedInfo, setShowDetailedInfo] = useState(false);

  // Determine if we should show the warning
  const shouldShowWarning = () => {
    if (dismissed) return false;
    if (!isActivated) return false; // Don't show if not activated at all

    // Check subscription status first
    if (subscriptionStatus === 'suspended' || subscriptionStatus === 'cancelled') {
      return true;
    }

    // Fall back to time-based checks
    return isExpired || isCompletelyExpired || isInGracePeriod;
  };

  // Debug logging
  console.log('🔍 SubscriptionWarning: Debug info', {
    isActivated,
    subscriptionStatus,
    isExpired,
    isCompletelyExpired,
    isInGracePeriod,
    daysRemaining,
    shouldShow: shouldShowWarning(),
  });

  // Get warning severity and message
  const getWarningInfo = () => {
    // Check subscription status first
    if (subscriptionStatus === 'suspended') {
      return {
        severity: 'error' as const,
        title: 'Subscription Suspended',
        message:
          'Your subscription has been suspended. Please contact support or reactivate to continue using all features.',
        icon: <Error />,
        color: theme.palette.error.main,
      };
    }

    if (subscriptionStatus === 'cancelled') {
      return {
        severity: 'error' as const,
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled. Please reactivate to regain access to all features.',
        icon: <Error />,
        color: theme.palette.error.main,
      };
    }

    // Fall back to time-based checks
    if (isCompletelyExpired) {
      return {
        severity: 'error' as const,
        title: 'Subscription Expired',
        message: 'Your subscription has expired. Please reactivate to access all features.',
        icon: <Error />,
        color: theme.palette.error.main,
      };
    }

    if (isInGracePeriod) {
      return {
        severity: 'warning' as const,
        title: 'Grace Period Active',
        message: `Your subscription is in grace period. ${daysRemaining} days remaining before full expiration.`,
        icon: <Warning />,
        color: theme.palette.warning.main,
      };
    }

    if (isExpired) {
      return {
        severity: 'warning' as const,
        title: 'Subscription Requires Attention',
        message: 'Your subscription needs renewal. Please contact support or reactivate.',
        icon: <Warning />,
        color: theme.palette.warning.main,
      };
    }

    return {
      severity: 'info' as const,
      title: 'Subscription Status',
      message: 'Your subscription is active.',
      icon: <Warning />,
      color: theme.palette.info.main,
    };
  };

  const warningInfo = getWarningInfo();

  // Don't render if not needed
  if (showOnlyIfNeeded && !shouldShowWarning()) {
    return null;
  }

  const handleReactivate = () => {
    // TODO: Implement reactivation flow
    console.log('Reactivate subscription clicked');
  };

  const handleContactSupport = () => {
    // TODO: Implement contact support
    console.log('Contact support clicked');
  };

  return (
    <AnimatePresence>
      {shouldShowWarning() && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Alert
            severity={warningInfo.severity}
            sx={{
              mb: 2,
              borderRadius: 2,
              border: `1px solid ${warningInfo.color}30`,
              backgroundColor: `${warningInfo.color}08`,
              '& .MuiAlert-message': {
                width: '100%',
              },
              ...sx,
            }}
            action={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {showDetails && (
                  <IconButton
                    size='small'
                    onClick={() => setShowDetailedInfo(!showDetailedInfo)}
                    sx={{ color: warningInfo.color }}
                  >
                    {showDetailedInfo ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                )}
                {dismissible && (
                  <IconButton size='small' onClick={() => setDismissed(true)} sx={{ color: warningInfo.color }}>
                    <Close />
                  </IconButton>
                )}
              </Box>
            }
          >
            <AlertTitle sx={{ fontWeight: 600, color: warningInfo.color }}>{warningInfo.title}</AlertTitle>

            <Typography variant='body2' sx={{ mb: 2 }}>
              {warningInfo.message}
            </Typography>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size='small'
                variant='contained'
                color={warningInfo.severity === 'error' ? 'error' : 'warning'}
                startIcon={<Refresh />}
                onClick={handleReactivate}
              >
                Reactivate Subscription
              </Button>

              <Button
                size='small'
                variant='outlined'
                color={warningInfo.severity === 'error' ? 'error' : 'warning'}
                startIcon={<ContactSupport />}
                onClick={handleContactSupport}
              >
                Contact Support
              </Button>
            </Box>

            {/* Detailed Information */}
            {showDetails && (
              <Collapse in={showDetailedInfo}>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant='body2' color='text.secondary'>
                    <strong>Subscription Details:</strong>
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    • Status: {subscriptionStatus || 'Unknown'}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    • Activated: {isActivated ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    • Expires: {expiresAt ? expiresAt.toLocaleDateString() : 'Unknown'}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    • Days Remaining: {daysRemaining}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    • Grace Period: {isInGracePeriod ? 'Yes' : 'No'}
                  </Typography>
                </Box>
              </Collapse>
            )}
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
