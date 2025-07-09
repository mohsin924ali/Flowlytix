/**
 * Subscription Test Page
 * Comprehensive testing interface for the 5-step subscription flow
 * Task 9: Test complete user flow and integration with subscription server
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Divider,
  TextField,
  Paper,
} from '@mui/material';
import {
  ExpandMore,
  PlayArrow,
  Stop,
  Refresh,
  Settings,
  CheckCircle,
  Error,
  Warning,
  Info,
  VpnKey,
  Cloud,
  Security,
  Schedule,
  Computer,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

import { useSubscription } from '../../../hooks/useSubscription';
import { ActivationScreen } from '../../organisms/ActivationScreen';
import { FeatureGate } from '../../molecules/FeatureGate';
import { ExpiryWarning } from '../../molecules/ExpiryWarning';

interface TestStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
  error?: string;
}

export const SubscriptionTestPage: React.FC = () => {
  const subscription = useSubscription();
  const [testSteps, setTestSteps] = useState<TestStep[]>([
    {
      id: 'step1-activation',
      title: 'Step 1: License Activation',
      description: 'Test license key activation and device registration',
      status: 'pending',
    },
    {
      id: 'step2-startup-validation',
      title: 'Step 2: Startup Validation',
      description: 'Test offline-first validation on app startup',
      status: 'pending',
    },
    {
      id: 'step3-periodic-sync',
      title: 'Step 3: Periodic Sync',
      description: 'Test background sync with licensing server',
      status: 'pending',
    },
    {
      id: 'step4-expiry-warning',
      title: 'Step 4: Expiry Warning',
      description: 'Test approaching expiry and grace period warnings',
      status: 'pending',
    },
    {
      id: 'step5-feature-gating',
      title: 'Step 5: Feature Access Control',
      description: 'Test feature gating based on subscription tier',
      status: 'pending',
    },
  ]);

  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [testLicenseKey, setTestLicenseKey] = useState('TEST-1234-5678-9012');
  const [isRunningFullTest, setIsRunningFullTest] = useState(false);

  // Update test steps based on subscription state
  useEffect(() => {
    updateTestStepsFromSubscriptionState();
  }, [subscription]);

  const updateTestStepsFromSubscriptionState = () => {
    setTestSteps((prev) =>
      prev.map((step) => {
        switch (step.id) {
          case 'step1-activation':
            return {
              ...step,
              status: subscription.isActivated ? 'success' : 'pending',
              result: subscription.isActivated
                ? {
                    deviceId: subscription.deviceId,
                    tier: subscription.subscriptionTier,
                  }
                : undefined,
            };
          case 'step2-startup-validation':
            return {
              ...step,
              status: subscription.lastValidatedAt ? 'success' : 'pending',
              result: subscription.lastValidatedAt
                ? {
                    lastValidated: subscription.lastValidatedAt,
                    daysRemaining: subscription.daysRemaining,
                  }
                : undefined,
            };
          default:
            return step;
        }
      })
    );
  };

  // Run individual test step
  const runTestStep = async (stepId: string) => {
    setTestSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, status: 'running', error: undefined } : step))
    );

    try {
      let result: any;

      switch (stepId) {
        case 'step1-activation':
          result = await testActivation();
          break;
        case 'step2-startup-validation':
          result = await testStartupValidation();
          break;
        case 'step3-periodic-sync':
          result = await testPeriodicSync();
          break;
        case 'step4-expiry-warning':
          result = await testExpiryWarning();
          break;
        case 'step5-feature-gating':
          result = await testFeatureGating();
          break;
        default:
          throw new Error('Unknown test step');
      }

      setTestSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, status: 'success', result } : step)));
    } catch (error) {
      setTestSteps((prev) =>
        prev.map((step) =>
          step.id === stepId
            ? {
                ...step,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              }
            : step
        )
      );
    }
  };

  // Test implementations
  const testActivation = async () => {
    const success = await subscription.activateDevice({
      licenseKey: testLicenseKey,
    });

    if (!success) {
      throw new Error('License activation failed');
    }

    return {
      activated: true,
      deviceId: subscription.deviceId,
      tier: subscription.subscriptionTier,
    };
  };

  const testStartupValidation = async () => {
    const success = await subscription.validateOnStartup();

    if (!success) {
      throw new Error('Startup validation failed');
    }

    return {
      validated: true,
      lastValidated: subscription.lastValidatedAt,
      daysRemaining: subscription.daysRemaining,
    };
  };

  const testPeriodicSync = async () => {
    const success = await subscription.performSync();

    if (!success) {
      throw new Error('Periodic sync failed');
    }

    return {
      synced: true,
      lastSync: new Date(),
      needsOnlineValidation: subscription.needsOnlineValidation,
    };
  };

  const testExpiryWarning = async () => {
    // This test checks if expiry warning system is working
    return {
      hasWarning: !!subscription.expiryWarning,
      warningType: subscription.expiryWarning?.type,
      daysRemaining: subscription.daysRemaining,
      isInGracePeriod: subscription.isInGracePeriod,
    };
  };

  const testFeatureGating = async () => {
    // Test feature access for different features
    const features = ['advanced_analytics', 'multi_agency', 'api_access'];
    const accessResults = {};

    for (const feature of features) {
      accessResults[feature] = await subscription.checkFeatureAccess(feature);
    }

    return {
      featureAccess: accessResults,
      tier: subscription.subscriptionTier,
    };
  };

  // Run full test suite
  const runFullTestSuite = async () => {
    setIsRunningFullTest(true);

    try {
      for (const step of testSteps) {
        await runTestStep(step.id);
        // Add delay between steps
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Full test suite error:', error);
    } finally {
      setIsRunningFullTest(false);
    }
  };

  // Reset all tests
  const resetAllTests = () => {
    setTestSteps((prev) =>
      prev.map((step) => ({
        ...step,
        status: 'pending',
        result: undefined,
        error: undefined,
      }))
    );
  };

  // Get status icon for test step
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Refresh className='animate-spin' color='primary' />;
      case 'success':
        return <CheckCircle color='success' />;
      case 'error':
        return <Error color='error' />;
      default:
        return <Schedule color='disabled' />;
    }
  };

  // Get status color for test step
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'primary';
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant='h4' gutterBottom>
        Subscription System Test Suite
      </Typography>
      <Typography variant='body1' color='textSecondary' sx={{ mb: 4 }}>
        Test the complete 5-step subscription flow and server integration
      </Typography>

      {/* Current Status */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant='h6' gutterBottom>
            Current Subscription Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Chip
                label={subscription.isActivated ? 'Activated' : 'Not Activated'}
                color={subscription.isActivated ? 'success' : 'default'}
                icon={<VpnKey />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Chip
                label={subscription.subscriptionTier?.toUpperCase() || 'Unknown'}
                color='primary'
                icon={<Security />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Chip
                label={subscription.needsOnlineValidation ? 'Needs Sync' : 'Synced'}
                color={subscription.needsOnlineValidation ? 'warning' : 'success'}
                icon={<Cloud />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Chip
                label={`${subscription.daysRemaining} days left`}
                color={subscription.daysRemaining <= 7 ? 'error' : 'default'}
                icon={<Schedule />}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Control Buttons */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant='contained'
          startIcon={<PlayArrow />}
          onClick={runFullTestSuite}
          disabled={isRunningFullTest}
          size='large'
        >
          Run Full Test Suite
        </Button>

        <Button variant='outlined' startIcon={<Refresh />} onClick={resetAllTests} disabled={isRunningFullTest}>
          Reset All Tests
        </Button>

        <Button variant='outlined' startIcon={<VpnKey />} onClick={() => setShowActivationDialog(true)}>
          Test Activation Screen
        </Button>

        <TextField
          label='Test License Key'
          value={testLicenseKey}
          onChange={(e) => setTestLicenseKey(e.target.value)}
          size='small'
          sx={{ minWidth: 200 }}
        />
      </Box>

      {/* Test Steps */}
      <Grid container spacing={3}>
        {testSteps.map((step, index) => (
          <Grid item xs={12} key={step.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display='flex' alignItems='center' width='100%'>
                    <Box sx={{ mr: 2 }}>{getStatusIcon(step.status)}</Box>
                    <Box flex={1}>
                      <Typography variant='h6'>{step.title}</Typography>
                      <Typography variant='body2' color='textSecondary'>
                        {step.description}
                      </Typography>
                    </Box>
                    <Chip label={step.status.toUpperCase()} color={getStatusColor(step.status)} size='small' />
                  </Box>
                </AccordionSummary>

                <AccordionDetails>
                  {step.status === 'running' && (
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress />
                      <Typography variant='body2' sx={{ mt: 1 }}>
                        Running test...
                      </Typography>
                    </Box>
                  )}

                  {step.error && (
                    <Alert severity='error' sx={{ mb: 2 }}>
                      {step.error}
                    </Alert>
                  )}

                  {step.result && (
                    <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                      <Typography variant='subtitle2' gutterBottom>
                        Test Result:
                      </Typography>
                      <pre style={{ fontSize: '0.875rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(step.result, null, 2)}
                      </pre>
                    </Paper>
                  )}

                  <Button
                    variant='contained'
                    size='small'
                    onClick={() => runTestStep(step.id)}
                    disabled={step.status === 'running' || isRunningFullTest}
                    startIcon={<PlayArrow />}
                  >
                    Run Test
                  </Button>
                </AccordionDetails>
              </Accordion>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Demo Components */}
      <Box sx={{ mt: 6 }}>
        <Typography variant='h5' gutterBottom>
          Component Demonstrations
        </Typography>

        <Grid container spacing={3}>
          {/* Expiry Warning Demo */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom>
                  Expiry Warning Component
                </Typography>
                <ExpiryWarning position='inline' />
              </CardContent>
            </Card>
          </Grid>

          {/* Feature Gate Demo */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom>
                  Feature Gate Component
                </Typography>
                <FeatureGate featureId='advanced_analytics'>
                  <Alert severity='success'>✅ You have access to Advanced Analytics!</Alert>
                </FeatureGate>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Activation Screen Dialog */}
      <Dialog open={showActivationDialog} onClose={() => setShowActivationDialog(false)} maxWidth='lg' fullWidth>
        <DialogContent sx={{ p: 0 }}>
          <ActivationScreen
            onActivationSuccess={() => setShowActivationDialog(false)}
            onTrialMode={() => setShowActivationDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
