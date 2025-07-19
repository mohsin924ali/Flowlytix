/**
 * Activation Screen Component
 * Handles license key activation and device registration
 * Part of the 5-step subscription flow - Step 1: First Install/Activation
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  LinearProgress,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  IconButton,
  InputAdornment,
  Collapse,
  Link,
} from '@mui/material';
import {
  VpnKey,
  Computer,
  CheckCircle,
  Error,
  Info,
  Refresh,
  Visibility,
  VisibilityOff,
  Security,
  Cloud,
  DeviceHub,
  ExpandMore,
  ContactSupport,
  Help,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';

import { useSubscription } from '../../../hooks/useSubscription';
import { Logo } from '../../atoms/Logo/Logo';
import {
  parseSubscriptionError,
  getSubscriptionErrorInfo,
  SubscriptionErrorType,
} from '../../../domains/subscription/valueObjects/SubscriptionStatus';

// Validation schema for license key
const ActivationSchema = z.object({
  licenseKey: z
    .string()
    .min(1, 'License key is required')
    .regex(/^[A-Z0-9-]{4,30}$/, 'License key must contain only letters, numbers, and dashes'),
});

type ActivationForm = z.infer<typeof ActivationSchema>;

export interface ActivationScreenProps {
  /** Called when activation is successful */
  onActivationSuccess?: () => void;
  /** Called when user wants to use trial mode */
  onTrialMode?: () => void;
  /** Show device info panel */
  showDeviceInfo?: boolean;
  isReactivation?: boolean; // NEW: Indicates this is a re-activation (not first-time)
}

/**
 * Get appropriate messaging based on activation type
 */
const getActivationMessaging = (isReactivation: boolean) => {
  if (isReactivation) {
    return {
      title: 'License Reactivation Required',
      subtitle: 'Your license needs to be reactivated to continue using the application.',
      description:
        'Your previous license was invalidated by the server. Please enter a valid license key to restore access to all features.',
      buttonText: 'Reactivate License',
      helpText: 'Need help? Contact support if you believe this is an error.',
    };
  }

  return {
    title: 'Activate Your License',
    subtitle: "Welcome to Flowlytix! Let's get you set up.",
    description: 'Enter your license key to unlock all features and start managing your business efficiently.',
    buttonText: 'Activate License',
    helpText: "Don't have a license key? Contact our sales team to get started.",
  };
};

export const ActivationScreen: React.FC<ActivationScreenProps> = ({
  onActivationSuccess,
  onTrialMode,
  showDeviceInfo = true,
  isReactivation = false,
}) => {
  const { activateDevice, deviceDescription, isLoading, error, activationInProgress, clearError } = useSubscription();

  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [activationResult, setActivationResult] = useState<any>(null);
  const [parsedError, setParsedError] = useState<{
    type: SubscriptionErrorType;
    info: ReturnType<typeof getSubscriptionErrorInfo>;
  } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const form = useForm<ActivationForm>({
    resolver: zodResolver(ActivationSchema),
    defaultValues: {
      licenseKey: '',
    },
  });

  // Parse error when it changes
  useEffect(() => {
    if (error) {
      const errorType = parseSubscriptionError(error);
      const errorInfo = getSubscriptionErrorInfo(errorType);
      setParsedError({ type: errorType, info: errorInfo });

      // Auto-clear error after 10 seconds for recoverable errors
      if (errorInfo.recoverable) {
        const timer = setTimeout(() => {
          clearError();
          setParsedError(null);
        }, 10000);
        return () => clearTimeout(timer);
      }
    } else {
      setParsedError(null);
    }
  }, [error, clearError]);

  // Handle activation
  const handleActivation = async (data: ActivationForm) => {
    try {
      const success = await activateDevice({
        licenseKey: data.licenseKey,
      });

      if (success) {
        setActivationResult({
          licenseKey: data.licenseKey,
          deviceId: deviceDescription,
        });
        setShowSuccessDialog(true);

        // CRITICAL FIX: Call onActivationSuccess immediately when activation is successful
        // This ensures the SubscriptionGate component re-renders and checks the updated state
        // Remove the problematic 2-second timeout that was causing the redirect issue
        onActivationSuccess?.();
      }
    } catch (error) {
      console.error('Activation failed:', error);
    }
  };

  // Handle success dialog close
  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    // Remove the onActivationSuccess call from here as it's now called immediately after successful activation
  };

  // Handle retry
  const handleRetry = () => {
    clearError();
    setParsedError(null);
    form.reset();
  };

  // Format license key input
  const formatLicenseKey = (value: string) => {
    // Allow letters, numbers, and dashes, convert to uppercase
    const cleaned = value.replace(/[^A-Z0-9-]/g, '').toUpperCase();
    return cleaned.slice(0, 30); // Max length for license keys
  };

  // Render enhanced error alert
  const renderErrorAlert = () => {
    if (!parsedError) return null;

    const { info } = parsedError;

    return (
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
        <Alert
          severity={info.severity}
          sx={{ mb: 3 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              {info.recoverable && (
                <Button color='inherit' size='small' onClick={handleRetry} startIcon={<Refresh />}>
                  Retry
                </Button>
              )}
              <IconButton
                aria-label='close'
                color='inherit'
                size='small'
                onClick={() => {
                  clearError();
                  setParsedError(null);
                }}
              >
                <Error />
              </IconButton>
            </Box>
          }
        >
          <Typography variant='subtitle2' gutterBottom>
            {info.title}
          </Typography>
          <Typography variant='body2' sx={{ mb: 1 }}>
            {info.message}
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                py: 1,
                px: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200',
              }}
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              <Typography variant='body2' color='text.secondary' sx={{ flex: 1 }}>
                <Help sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                Show suggestions
              </Typography>
              <ExpandMore
                sx={{
                  transform: showSuggestions ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </Box>
            <Collapse in={showSuggestions}>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mt: 1 }}>
                <List dense>
                  {info.suggestions.map((suggestion, index) => (
                    <ListItem key={index} sx={{ pl: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Info color='primary' sx={{ fontSize: 16 }} />
                      </ListItemIcon>
                      <ListItemText primary={suggestion} />
                    </ListItem>
                  ))}
                </List>

                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant='body2' color='text.secondary'>
                    Need additional help?{' '}
                    <Link href='#' onClick={() => console.log('Open support')}>
                      Contact Support
                    </Link>
                  </Typography>
                </Box>
              </Box>
            </Collapse>
          </Box>
        </Alert>
      </motion.div>
    );
  };

  const messaging = getActivationMessaging(isReactivation);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isReactivation
          ? 'linear-gradient(135deg, #ffecb3 0%, #ff8a65 100%)' // Warmer colors for re-activation
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Original colors for first-time
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        },
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            'radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <Paper
          elevation={10}
          sx={{
            maxWidth: 900,
            width: '100%',
            borderRadius: 4,
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            border: isReactivation ? '2px solid orange' : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: isReactivation ? '0 20px 40px rgba(255, 152, 0, 0.3)' : '0 20px 40px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Enhanced Header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
              color: 'white',
              p: 5,
              textAlign: 'center',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M20 20c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                pointerEvents: 'none',
              },
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Re-activation explanation */}
              {isReactivation && (
                <Alert
                  severity='warning'
                  sx={{
                    mb: 3,
                    bgcolor: 'rgba(255, 152, 0, 0.1)',
                    '& .MuiAlert-message': { width: '100%' },
                  }}
                  icon={<Security />}
                >
                  <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 1 }}>
                    License Validation Failed
                  </Typography>
                  <Typography variant='body2' sx={{ mb: 1 }}>
                    Your previous license was not found in our database or has been revoked. This could happen if:
                  </Typography>
                  <Box component='ul' sx={{ margin: 0, paddingLeft: 2 }}>
                    <li>Your subscription has expired</li>
                    <li>Your license was transferred to another device</li>
                    <li>There was a server synchronization issue</li>
                  </Box>
                </Alert>
              )}

              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: isReactivation ? 'orange' : 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                    boxShadow: 3,
                  }}
                >
                  <VpnKey sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography variant='h5' gutterBottom fontWeight='bold'>
                  {messaging.title}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {messaging.description}
                </Typography>
              </Box>
            </motion.div>
          </Box>

          <CardContent sx={{ p: 5, backgroundColor: 'rgba(255, 255, 255, 0.98)' }}>
            {/* Enhanced Loading Progress */}
            <AnimatePresence>
              {activationInProgress && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Box sx={{ mb: 4 }}>
                    <LinearProgress
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'rgba(81, 63, 242, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(90deg, #513ff2 0%, #6b52f5 100%)',
                          borderRadius: 3,
                        },
                      }}
                    />
                    <Typography variant='body2' sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
                      <Security sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                      Securely activating your license...
                    </Typography>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enhanced Error Alert */}
            <AnimatePresence>{parsedError && renderErrorAlert()}</AnimatePresence>

            <Grid container spacing={4}>
              {/* Enhanced Activation Form */}
              <Grid item xs={12} md={showDeviceInfo ? 7 : 12}>
                <Box sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 3, mb: 3 }}>
                  <form onSubmit={form.handleSubmit(handleActivation)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <VpnKey sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
                      <Box>
                        <Typography variant='h5' gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          License Key
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {messaging.description}
                        </Typography>
                      </Box>
                    </Box>

                    <Controller
                      name='licenseKey'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <TextField
                          {...field}
                          label='License Key'
                          placeholder='FL-GQHBEQ-H1L107-NGGIO6-SNETVB'
                          fullWidth
                          variant='outlined'
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          disabled={activationInProgress}
                          type={showLicenseKey ? 'text' : 'password'}
                          onChange={(e) => {
                            const formatted = formatLicenseKey(e.target.value);
                            field.onChange(formatted);
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position='start'>
                                <Security color='action' />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position='end'>
                                <IconButton onClick={() => setShowLicenseKey(!showLicenseKey)} edge='end'>
                                  {showLicenseKey ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            mb: 4,
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              borderRadius: 2,
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 1)',
                              },
                              '&.Mui-focused': {
                                backgroundColor: 'rgba(255, 255, 255, 1)',
                              },
                            },
                          }}
                        />
                      )}
                    />

                    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                      <Button
                        type='submit'
                        variant='contained'
                        size='large'
                        disabled={activationInProgress || !form.formState.isValid}
                        startIcon={<VpnKey />}
                        sx={{
                          flex: 1,
                          py: 2,
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
                          boxShadow: '0 8px 32px rgba(81, 63, 242, 0.3)',
                          '&:hover': {
                            boxShadow: '0 12px 40px rgba(81, 63, 242, 0.4)',
                            transform: 'translateY(-2px)',
                          },
                          '&:disabled': {
                            background: 'rgba(81, 63, 242, 0.3)',
                            boxShadow: 'none',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {activationInProgress ? 'Activating...' : messaging.buttonText}
                      </Button>

                      {onTrialMode && (
                        <Button
                          variant='outlined'
                          size='large'
                          onClick={onTrialMode}
                          disabled={activationInProgress}
                          sx={{
                            flex: { xs: 1, sm: 'auto' },
                            py: 2,
                            borderRadius: 3,
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            '&:hover': {
                              borderColor: 'primary.dark',
                              backgroundColor: 'rgba(81, 63, 242, 0.05)',
                            },
                          }}
                        >
                          Start Trial
                        </Button>
                      )}
                    </Box>
                  </form>
                </Box>

                {/* Enhanced Help Section */}
                <Box sx={{ p: 3, backgroundColor: 'rgba(248, 250, 252, 0.8)', borderRadius: 3 }}>
                  <Typography
                    variant='h6'
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}
                  >
                    <ContactSupport sx={{ mr: 1, color: 'primary.main' }} />
                    {messaging.helpText}
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        <Info color='primary' sx={{ mr: 2 }} />
                        <Box>
                          <Typography variant='subtitle2' fontWeight='bold'>
                            Email Support
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            support@flowlytix.com
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        <Cloud color='primary' sx={{ mr: 2 }} />
                        <Box>
                          <Typography variant='subtitle2' fontWeight='bold'>
                            Online Activation
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            Requires internet connection
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* Enhanced Device Information Panel */}
              {showDeviceInfo && (
                <Grid item xs={12} md={5}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: 3,
                      height: 'fit-content',
                      border: '1px solid rgba(81, 63, 242, 0.1)',
                    }}
                  >
                    <Typography
                      variant='h6'
                      gutterBottom
                      sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: 'primary.main' }}
                    >
                      <Computer sx={{ mr: 2 }} />
                      Device Information
                    </Typography>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant='body2' color='text.secondary' gutterBottom>
                        This device will be registered with your license
                      </Typography>
                    </Box>

                    <List>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <DeviceHub color='primary' />
                        </ListItemIcon>
                        <ListItemText
                          primary='Device ID'
                          secondary={deviceDescription || 'Loading...'}
                          primaryTypographyProps={{ fontWeight: 'bold' }}
                        />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <Computer color='primary' />
                        </ListItemIcon>
                        <ListItemText
                          primary='Platform'
                          secondary={navigator.platform || 'Unknown'}
                          primaryTypographyProps={{ fontWeight: 'bold' }}
                        />
                      </ListItem>
                    </List>

                    <Divider sx={{ my: 3 }} />

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Chip
                        label='Secure'
                        color='success'
                        size='small'
                        icon={<Security />}
                        sx={{ fontWeight: 'bold' }}
                      />
                      <Chip label='Encrypted' color='primary' size='small' sx={{ fontWeight: 'bold' }} />
                      <Chip label='Verified' color='info' size='small' sx={{ fontWeight: 'bold' }} />
                    </Box>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Paper>
      </motion.div>

      {/* Enhanced Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        onClose={handleSuccessClose}
        maxWidth='sm'
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 2 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle color='success' sx={{ fontSize: 72, mb: 2 }} />
          </motion.div>
          <Typography variant='h4' component='div' sx={{ fontWeight: 'bold', color: 'success.main' }}>
            Activation Successful!
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
          <Typography variant='h6' sx={{ mb: 3, color: 'text.secondary' }}>
            Your Flowlytix license has been successfully activated.
          </Typography>

          {activationResult && (
            <Paper
              elevation={2}
              sx={{
                p: 3,
                backgroundColor: 'rgba(76, 175, 80, 0.05)',
                borderRadius: 3,
                border: '1px solid rgba(76, 175, 80, 0.2)',
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant='subtitle2' color='text.secondary' gutterBottom>
                    License Key
                  </Typography>
                  <Typography variant='body1' sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {activationResult.licenseKey}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant='subtitle2' color='text.secondary' gutterBottom>
                    Device ID
                  </Typography>
                  <Typography variant='body1' sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {activationResult.deviceId}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          <Typography variant='body2' sx={{ mt: 3, color: 'text.secondary' }}>
            You can now access all features of your Flowlytix subscription.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', pb: 4 }}>
          <Button
            variant='contained'
            size='large'
            onClick={handleSuccessClose}
            sx={{
              minWidth: 150,
              py: 1.5,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
              boxShadow: '0 8px 32px rgba(81, 63, 242, 0.3)',
              '&:hover': {
                boxShadow: '0 12px 40px rgba(81, 63, 242, 0.4)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Continue to App
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
