/**
 * Expiry Warning Component
 * Shows subscription expiration alerts and grace period management
 * Part of the 5-step subscription flow - Step 4: Approaching Expiry & Grace Period
 */

import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Warning,
  Error,
  Schedule,
  Close,
  Refresh,
  Star,
  CheckCircle,
  Info,
  CalendarToday,
  CreditCard,
  Shield,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

import { useSubscription } from '../../../hooks/useSubscription';

export interface ExpiryWarningProps {
  /** Position of the warning component */
  position?: 'top' | 'bottom' | 'inline';
  /** Whether to show as a dismissible alert */
  dismissible?: boolean;
  /** Custom styling */
  sx?: any;
  /** Callback when user clicks renew */
  onRenewClick?: () => void;
}

export const ExpiryWarning: React.FC<ExpiryWarningProps> = ({
  position = 'top',
  dismissible = true,
  sx,
  onRenewClick,
}) => {
  const {
    expiryWarning,
    daysRemaining,
    isInGracePeriod,
    gracePeriodDays,
    subscriptionTier,
    expiresAt,
    dismissExpiryWarning,
    performSync,
    syncInProgress,
  } = useSubscription();

  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Don't show if no warning
  if (!expiryWarning?.shouldShow) {
    return null;
  }

  const { type, message } = expiryWarning;

  // Get warning configuration based on type
  const getWarningConfig = () => {
    switch (type) {
      case 'approaching':
        return {
          severity: 'warning' as const,
          icon: <Warning />,
          color: 'warning' as const,
          title: 'Subscription Expiring Soon',
          actionText: 'Renew Now',
          bgColor: '#fff3cd',
          borderColor: '#ffc107',
        };
      case 'grace_period':
        return {
          severity: 'error' as const,
          icon: <Schedule />,
          color: 'warning' as const,
          title: 'Grace Period Active',
          actionText: 'Renew Immediately',
          bgColor: '#f8d7da',
          borderColor: '#dc3545',
        };
      case 'expired':
        return {
          severity: 'error' as const,
          icon: <Error />,
          color: 'error',
          title: 'Subscription Expired',
          actionText: 'Restore Access',
          bgColor: '#f8d7da',
          borderColor: '#dc3545',
        };
      default:
        return {
          severity: 'info' as const,
          icon: <Info />,
          color: 'info',
          title: 'Subscription Notice',
          actionText: 'Learn More',
          bgColor: '#d1ecf1',
          borderColor: '#17a2b8',
        };
    }
  };

  const config = getWarningConfig();

  // Handle renewal action
  const handleRenewClick = () => {
    if (onRenewClick) {
      onRenewClick();
    } else {
      setShowDetailsDialog(true);
    }
  };

  // Handle sync action
  const handleSyncClick = async () => {
    await performSync();
  };

  // Render inline warning
  if (position === 'inline') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        style={{ ...sx }}
      >
        <Card
          elevation={3}
          sx={{
            border: `2px solid ${config.borderColor}`,
            bgcolor: config.bgColor,
            mb: 2,
          }}
        >
          <CardContent>
            <Box display='flex' alignItems='center' justifyContent='space-between'>
              <Box display='flex' alignItems='center'>
                {config.icon}
                <Box ml={2}>
                  <Typography variant='h6' color='textPrimary'>
                    {config.title}
                  </Typography>
                  <Typography variant='body2' color='textSecondary'>
                    {message}
                  </Typography>
                </Box>
              </Box>

              <Box display='flex' gap={1}>
                <Button variant='contained' color={config.color} size='small' onClick={handleRenewClick}>
                  {config.actionText}
                </Button>
                {dismissible && (
                  <IconButton size='small' onClick={dismissExpiryWarning}>
                    <Close />
                  </IconButton>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Render alert-style warning
  return (
    <>
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              position: position === 'top' ? 'sticky' : 'relative',
              top: position === 'top' ? 0 : 'auto',
              bottom: position === 'bottom' ? 0 : 'auto',
              zIndex: 1200,
              ...sx,
            }}
          >
            <Alert
              severity={config.severity}
              icon={config.icon}
              action={
                <Box display='flex' gap={1} alignItems='center'>
                  {/* Sync button */}
                  <IconButton
                    color='inherit'
                    size='small'
                    onClick={handleSyncClick}
                    disabled={syncInProgress}
                    title='Sync with server'
                  >
                    <Refresh sx={{ fontSize: 20 }} />
                  </IconButton>

                  {/* Renew button */}
                  <Button
                    color='inherit'
                    size='small'
                    variant='outlined'
                    onClick={handleRenewClick}
                    startIcon={<Star />}
                    sx={{ mr: 1 }}
                  >
                    {config.actionText}
                  </Button>

                  {/* Collapse/Dismiss */}
                  {dismissible && (
                    <>
                      <IconButton color='inherit' size='small' onClick={() => setIsCollapsed(true)} title='Minimize'>
                        <Close />
                      </IconButton>
                    </>
                  )}
                </Box>
              }
              sx={{ borderRadius: 0 }}
            >
              <AlertTitle>{config.title}</AlertTitle>
              <Box>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  {message}
                </Typography>

                {/* Status chips */}
                <Box display='flex' gap={1} flexWrap='wrap'>
                  <Chip
                    label={`${daysRemaining} days remaining`}
                    color={daysRemaining <= 3 ? 'error' : 'warning'}
                    size='small'
                  />

                  {isInGracePeriod && (
                    <Chip label={`Grace Period: ${gracePeriodDays} days`} color='error' size='small' />
                  )}

                  <Chip
                    label={subscriptionTier?.toUpperCase() || 'Unknown'}
                    color='primary'
                    size='small'
                    variant='outlined'
                  />
                </Box>
              </Box>
            </Alert>

            {/* Progress indicator for grace period */}
            {isInGracePeriod && (
              <LinearProgress
                variant='determinate'
                value={(daysRemaining / gracePeriodDays) * 100}
                color='error'
                sx={{ height: 4 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed state indicator */}
      <AnimatePresence>
        {isCollapsed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'fixed',
              top: 20,
              right: 20,
              zIndex: 1300,
            }}
          >
            <IconButton
              color={config.color}
              onClick={() => setIsCollapsed(false)}
              sx={{
                bgcolor: 'background.paper',
                border: `2px solid ${config.borderColor}`,
                '&:hover': {
                  bgcolor: 'background.default',
                },
              }}
            >
              {config.icon}
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onClose={() => setShowDetailsDialog(false)} maxWidth='md' fullWidth>
        <DialogTitle>
          <Box display='flex' alignItems='center'>
            {config.icon}
            <Typography variant='h6' sx={{ ml: 2 }}>
              Subscription Details
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <List>
            <ListItem>
              <ListItemIcon>
                <CalendarToday />
              </ListItemIcon>
              <ListItemText
                primary='Expiration Date'
                secondary={expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Unknown'}
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Schedule />
              </ListItemIcon>
              <ListItemText primary='Days Remaining' secondary={`${daysRemaining} days`} />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Shield />
              </ListItemIcon>
              <ListItemText primary='Current Plan' secondary={subscriptionTier?.toUpperCase() || 'Unknown'} />
            </ListItem>

            {isInGracePeriod && (
              <ListItem>
                <ListItemIcon>
                  <Warning color='warning' />
                </ListItemIcon>
                <ListItemText primary='Grace Period' secondary={`${gracePeriodDays} days grace period active`} />
              </ListItem>
            )}
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant='body1' gutterBottom>
            To continue using Flowlytix without interruption, please renew your subscription.
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant='h6' gutterBottom>
              What happens if I don't renew?
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Info />
                </ListItemIcon>
                <ListItemText primary='Limited functionality during grace period' />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Info />
                </ListItemIcon>
                <ListItemText primary='Data export will be restricted' />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Info />
                </ListItemIcon>
                <ListItemText primary='No access to premium features' />
              </ListItem>
            </List>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
          <Button
            variant='contained'
            startIcon={<CreditCard />}
            onClick={() => {
              setShowDetailsDialog(false);
              // TODO: Integrate with actual renewal flow
              window.open('https://flowlytix.com/renew', '_blank');
            }}
          >
            Renew Subscription
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
