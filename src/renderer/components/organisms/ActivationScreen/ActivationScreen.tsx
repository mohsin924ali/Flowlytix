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
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';

import { useSubscription } from '../../../hooks/useSubscription';
import { Logo } from '../../atoms/Logo/Logo';

// Validation schema for license key
const ActivationSchema = z.object({
  licenseKey: z
    .string()
    .min(1, 'License key is required')
    .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'License key must be in format XXXX-XXXX-XXXX-XXXX'),
});

type ActivationForm = z.infer<typeof ActivationSchema>;

export interface ActivationScreenProps {
  /** Called when activation is successful */
  onActivationSuccess?: () => void;
  /** Called when user wants to use trial mode */
  onTrialMode?: () => void;
  /** Show device info panel */
  showDeviceInfo?: boolean;
}

export const ActivationScreen: React.FC<ActivationScreenProps> = ({
  onActivationSuccess,
  onTrialMode,
  showDeviceInfo = true,
}) => {
  const { activateDevice, deviceDescription, isLoading, error, activationInProgress, clearError } = useSubscription();

  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [activationResult, setActivationResult] = useState<any>(null);

  const form = useForm<ActivationForm>({
    resolver: zodResolver(ActivationSchema),
    defaultValues: {
      licenseKey: '',
    },
  });

  // Clear errors when form changes
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
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
      }
    } catch (error) {
      console.error('Activation failed:', error);
    }
  };

  // Handle success dialog close
  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    onActivationSuccess?.();
  };

  // Format license key input
  const formatLicenseKey = (value: string) => {
    const cleaned = value.replace(/[^A-Z0-9]/g, '').toUpperCase();
    const formatted = cleaned.replace(/(.{4})/g, '$1-').replace(/-$/, '');
    return formatted.slice(0, 19); // Max length with dashes
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Card
          elevation={24}
          sx={{
            maxWidth: 800,
            width: '100%',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
              color: 'white',
              p: 4,
              textAlign: 'center',
            }}
          >
            <Logo size='large' variant='white' sx={{ mb: 2 }} />
            <Typography variant='h4' component='h1' gutterBottom fontWeight='bold'>
              Activate Flowlytix
            </Typography>
            <Typography variant='subtitle1' sx={{ opacity: 0.9 }}>
              Enter your license key to activate your distribution management system
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            {/* Loading Progress */}
            <AnimatePresence>
              {activationInProgress && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Box sx={{ mb: 3 }}>
                    <LinearProgress />
                    <Typography variant='body2' sx={{ mt: 1, textAlign: 'center' }}>
                      Activating your license...
                    </Typography>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Alert
                    severity='error'
                    sx={{ mb: 3 }}
                    action={
                      <IconButton aria-label='close' color='inherit' size='small' onClick={clearError}>
                        <Error />
                      </IconButton>
                    }
                  >
                    {error}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <Grid container spacing={4}>
              {/* Activation Form */}
              <Grid item xs={12} md={showDeviceInfo ? 8 : 12}>
                <form onSubmit={form.handleSubmit(handleActivation)}>
                  <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <VpnKey sx={{ mr: 1, color: 'primary.main' }} />
                    License Key
                  </Typography>

                  <Controller
                    name='licenseKey'
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label='Enter License Key'
                        placeholder='XXXX-XXXX-XXXX-XXXX'
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
                        sx={{ mb: 3 }}
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
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {activationInProgress ? 'Activating...' : 'Activate License'}
                    </Button>

                    {onTrialMode && (
                      <Button
                        variant='outlined'
                        size='large'
                        onClick={onTrialMode}
                        disabled={activationInProgress}
                        sx={{ flex: { xs: 1, sm: 'auto' }, py: 1.5 }}
                      >
                        Start Trial
                      </Button>
                    )}
                  </Box>
                </form>

                {/* Help Section */}
                <Divider sx={{ my: 3 }} />

                <Typography variant='h6' gutterBottom>
                  Need Help?
                </Typography>

                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Info color='primary' />
                    </ListItemIcon>
                    <ListItemText primary='Contact Support' secondary='Email: support@flowlytix.com' />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Cloud color='primary' />
                    </ListItemIcon>
                    <ListItemText
                      primary='Online Activation'
                      secondary='Requires internet connection for initial setup'
                    />
                  </ListItem>
                </List>
              </Grid>

              {/* Device Information Panel */}
              {showDeviceInfo && (
                <Grid item xs={12} md={4}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      bgcolor: 'grey.50',
                      height: 'fit-content',
                    }}
                  >
                    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <Computer sx={{ mr: 1, color: 'primary.main' }} />
                      Device Information
                    </Typography>

                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <DeviceHub />
                        </ListItemIcon>
                        <ListItemText primary='Device ID' secondary={deviceDescription || 'Loading...'} />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Computer />
                        </ListItemIcon>
                        <ListItemText primary='Platform' secondary={navigator.platform || 'Unknown'} />
                      </ListItem>
                    </List>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Chip label='Secure' color='success' size='small' icon={<Security />} />
                      <Chip label='Encrypted' color='primary' size='small' />
                    </Box>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      </motion.div>

      {/* Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        onClose={handleSuccessClose}
        maxWidth='sm'
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
          <CheckCircle color='success' sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant='h5' component='div'>
            Activation Successful!
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant='body1' sx={{ mb: 2 }}>
            Your Flowlytix license has been successfully activated.
          </Typography>

          {activationResult && (
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant='body2' color='textSecondary'>
                License Key: {activationResult.licenseKey}
              </Typography>
              <Typography variant='body2' color='textSecondary'>
                Device: {activationResult.deviceId}
              </Typography>
            </Paper>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button variant='contained' size='large' onClick={handleSuccessClose} sx={{ minWidth: 120 }}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
