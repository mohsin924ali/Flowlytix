/**
 * Feature Gate Component
 * Controls access to features based on subscription tier and status
 * Part of the 5-step subscription flow - Step 5: Feature Access Control
 */

import React, { ReactNode } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import { Lock, Star, Warning, Upgrade, CheckCircle, Cancel, Info } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

import { useFeatureAccess, useSubscription } from '../../../hooks/useSubscription';
import { SubscriptionTier } from '../../../domains/subscription/valueObjects/SubscriptionTier';

export interface FeatureGateProps {
  /** Feature ID to check access for */
  featureId: string;
  /** Child components to render when access is granted */
  children: ReactNode;
  /** Custom fallback component when access is denied */
  fallback?: ReactNode;
  /** Show upgrade prompt instead of simple message */
  showUpgradePrompt?: boolean;
  /** Required subscription tier for this feature */
  requiredTier?: SubscriptionTier;
  /** Custom error message */
  customMessage?: string;
  /** Callback when upgrade is clicked */
  onUpgradeClick?: () => void;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  featureId,
  children,
  fallback,
  showUpgradePrompt = true,
  requiredTier,
  customMessage,
  onUpgradeClick,
}) => {
  const { hasAccess, isChecking } = useFeatureAccess(featureId);
  const { isActivated, subscriptionTier, isCompletelyExpired, expiryWarning, daysRemaining } = useSubscription();

  const [showUpgradeDialog, setShowUpgradeDialog] = React.useState(false);

  // Show loading state while checking access
  if (isChecking) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress />
        <Typography variant='body2' sx={{ mt: 1, textAlign: 'center' }}>
          Checking feature access...
        </Typography>
      </Box>
    );
  }

  // Grant access if user has permission
  if (hasAccess && isActivated && !isCompletelyExpired) {
    return <>{children}</>;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Determine the reason for access denial
  const getAccessDenialReason = () => {
    if (!isActivated) {
      return {
        title: 'License Not Activated',
        message: 'Please activate your license to access this feature.',
        severity: 'warning' as const,
        icon: <Lock />,
        action: 'activate',
      };
    }

    if (isCompletelyExpired) {
      return {
        title: 'Subscription Expired',
        message: 'Your subscription has expired. Please renew to continue using this feature.',
        severity: 'error' as const,
        icon: <Cancel />,
        action: 'renew',
      };
    }

    if (requiredTier && subscriptionTier) {
      const currentTierValue = SubscriptionTier[subscriptionTier.toUpperCase() as keyof typeof SubscriptionTier];
      if (currentTierValue < requiredTier) {
        return {
          title: 'Upgrade Required',
          message:
            customMessage ||
            `This feature requires ${Object.keys(SubscriptionTier).find((key) => SubscriptionTier[key as keyof typeof SubscriptionTier] === requiredTier)} subscription or higher.`,
          severity: 'info' as const,
          icon: <Upgrade />,
          action: 'upgrade',
        };
      }
    }

    return {
      title: 'Feature Not Available',
      message: customMessage || 'This feature is not available with your current subscription.',
      severity: 'warning' as const,
      icon: <Lock />,
      action: 'upgrade',
    };
  };

  const denialReason = getAccessDenialReason();

  // Simple blocked state (not upgrade prompt)
  if (!showUpgradePrompt) {
    return (
      <Alert severity={denialReason.severity} icon={denialReason.icon} sx={{ m: 2 }}>
        <Typography variant='subtitle2' gutterBottom>
          {denialReason.title}
        </Typography>
        <Typography variant='body2'>{denialReason.message}</Typography>
      </Alert>
    );
  }

  // Full upgrade prompt UI
  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      setShowUpgradeDialog(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          elevation={3}
          sx={{
            m: 2,
            border: '2px dashed',
            borderColor: denialReason.severity === 'error' ? 'error.main' : 'warning.main',
            bgcolor: denialReason.severity === 'error' ? 'error.50' : 'warning.50',
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Box sx={{ mb: 2 }}>
              {React.cloneElement(denialReason.icon, {
                sx: { fontSize: 48, color: `${denialReason.severity}.main` },
              })}
            </Box>

            <Typography variant='h6' gutterBottom>
              {denialReason.title}
            </Typography>

            <Typography variant='body1' color='textSecondary' sx={{ mb: 3 }}>
              {denialReason.message}
            </Typography>

            {/* Current subscription info */}
            {isActivated && subscriptionTier && (
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={`Current: ${subscriptionTier.toUpperCase()}`}
                  color='primary'
                  variant='outlined'
                  sx={{ mr: 1 }}
                />
                {expiryWarning && <Chip label={`${daysRemaining} days remaining`} color='warning' variant='outlined' />}
              </Box>
            )}

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              {denialReason.action === 'upgrade' && (
                <Button variant='contained' startIcon={<Upgrade />} onClick={handleUpgradeClick} sx={{ minWidth: 120 }}>
                  Upgrade Plan
                </Button>
              )}

              {denialReason.action === 'activate' && (
                <Button
                  variant='contained'
                  startIcon={<Star />}
                  onClick={() => window.location.reload()} // Simple activation trigger
                  sx={{ minWidth: 120 }}
                >
                  Activate License
                </Button>
              )}

              {denialReason.action === 'renew' && (
                <Button variant='contained' startIcon={<Star />} onClick={handleUpgradeClick} sx={{ minWidth: 120 }}>
                  Renew Subscription
                </Button>
              )}
            </Box>

            {/* Required tier info */}
            {requiredTier && (
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant='body2' color='textSecondary'>
                  Required: {SubscriptionTier[requiredTier]} plan or higher
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)} maxWidth='md' fullWidth>
        <DialogTitle>
          <Box display='flex' alignItems='center'>
            <Upgrade sx={{ mr: 2, color: 'primary.main' }} />
            Upgrade Your Subscription
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography variant='body1' gutterBottom>
            To access this feature, you need to upgrade your subscription plan.
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color='success' />
              </ListItemIcon>
              <ListItemText primary='Advanced Analytics' secondary='Detailed reports and insights' />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color='success' />
              </ListItemIcon>
              <ListItemText primary='Multi-Agency Support' secondary='Manage multiple distribution agencies' />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color='success' />
              </ListItemIcon>
              <ListItemText primary='Priority Support' secondary='24/7 customer support' />
            </ListItem>
          </List>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowUpgradeDialog(false)}>Maybe Later</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowUpgradeDialog(false);
              // TODO: Integrate with actual upgrade flow
              window.open('https://flowlytix.com/upgrade', '_blank');
            }}
          >
            Upgrade Now
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * HOC for feature gating
 */
export function withFeatureGate<P extends object>(
  Component: React.ComponentType<P>,
  featureId: string,
  options?: Omit<FeatureGateProps, 'featureId' | 'children'>
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate featureId={featureId} {...options}>
        <Component {...props} />
      </FeatureGate>
    );
  };
}
