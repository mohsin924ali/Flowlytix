/**
 * Subscription Test Page
 * Testing component for subscription functionality
 */

import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Card, CardContent, Alert, Chip, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../../hooks/useSubscription';
import { useSubscriptionStore } from '../../../store/subscription.store';
import { DashboardLayout } from '../../templates/DashboardLayout/DashboardLayout';

export const SubscriptionTestPage: React.FC = () => {
  const subscription = useSubscription();
  const { resetSubscription } = useSubscriptionStore();
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [realUserFlowResult, setRealUserFlowResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Log initialization state
  useEffect(() => {
    console.log('🧪 SubscriptionTestPage: Component mounted, subscription state:', {
      isActivated: subscription.isActivated,
      isLoading: subscription.isLoading,
      error: subscription.error,
      deviceId: subscription.deviceId,
      subscriptionTier: subscription.subscriptionTier,
    });
  }, []);

  // Log state changes
  useEffect(() => {
    const log = `State Change: isActivated=${subscription.isActivated}, isLoading=${subscription.isLoading}, error=${subscription.error}`;
    console.log('🧪 SubscriptionTestPage:', log);
  }, [subscription.isActivated, subscription.isLoading, subscription.error]);

  const addTestResult = (result: string) => {
    setTestResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testActivation = async () => {
    addTestResult('Testing activation...');
    try {
      const success = await subscription.activateDevice({
        licenseKey: 'FL-GQHBEQ-H1L107-NGGIO6-SNETVB',
        email: 'test@example.com',
      });
      addTestResult(`Activation ${success ? 'successful' : 'failed'}`);
    } catch (error) {
      addTestResult(`Activation error: ${error}`);
    }
  };

  const testReset = async () => {
    addTestResult('Testing reset...');
    try {
      const success = await subscription.resetSubscription();
      addTestResult(`Reset ${success ? 'successful' : 'failed'}`);
    } catch (error) {
      addTestResult(`Reset error: ${error}`);
    }
  };

  // NEW: Test real user flow
  const testRealUserFlow = async () => {
    setIsResetting(true);
    addTestResult('🎭 Starting REAL USER FLOW test...');

    try {
      // Reset subscription state
      addTestResult('Resetting subscription state...');
      const success = await resetSubscription();

      if (success) {
        addTestResult('✅ Subscription reset successful');
        addTestResult('🔄 Redirecting to protected route to trigger ActivationScreen...');

        // Wait a moment for the state to update
        setTimeout(() => {
          // Navigate to any protected route - this will trigger the ActivationScreen
          navigate('/dashboard');
        }, 1000);
      } else {
        addTestResult('❌ Subscription reset failed');
      }
    } catch (error) {
      addTestResult(`❌ Real user flow test error: ${error}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleRealUserFlowTest = async () => {
    try {
      setRealUserFlowResult('Testing real user flow...');

      // Reset subscription state first
      const resetResult = await window.electronAPI.subscription.resetSubscription();
      console.log('🔄 Reset result:', resetResult);

      // Navigate to ActivationScreen
      navigate('/activation');

      setRealUserFlowResult('✅ Redirected to activation screen. Please complete activation manually.');
    } catch (error) {
      console.error('❌ Real user flow test failed:', error);
      setRealUserFlowResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Add a debug activation test
  const handleDebugActivationTest = async () => {
    try {
      setRealUserFlowResult('Testing activation with debugging...');

      const credentials = {
        licenseKey: 'FL-GQHBEQ-H1L107-NGGIO6-SNETVB',
      };

      console.log('🔍 DEBUG: Calling activateDevice with:', credentials);

      const response = await window.electronAPI.subscription.activateDevice(credentials);

      console.log('🔍 DEBUG: Full response received:', response);
      console.log('🔍 DEBUG: Response success:', response.success);
      console.log('🔍 DEBUG: Response subscription:', response.subscription);
      console.log('🔍 DEBUG: Response error:', response.error);

      if (response.success) {
        setRealUserFlowResult(
          `✅ DEBUG: Activation successful! Subscription: ${JSON.stringify(response.subscription, null, 2)}`
        );
      } else {
        setRealUserFlowResult(`❌ DEBUG: Activation failed! Error: ${response.error}`);
      }
    } catch (error) {
      console.error('❌ DEBUG: Activation test failed:', error);
      setRealUserFlowResult(`❌ DEBUG: Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Add a manual sync test
  const handleManualSyncTest = async () => {
    try {
      setRealUserFlowResult('Testing manual sync...');

      console.log('🔄 Manual sync test: Calling performPeriodicSync via store...');
      const success = await useSubscriptionStore.getState().performPeriodicSync();

      if (success) {
        setRealUserFlowResult('✅ Manual sync successful! Check the app for any status changes.');

        // Force a state refresh
        setTimeout(() => {
          const currentState = useSubscriptionStore.getState();
          console.log('🔄 Manual sync test: Current subscription state after sync:', {
            isActivated: currentState.isActivated,
            subscriptionStatus: currentState.subscriptionStatus,
            subscriptionTier: currentState.subscriptionTier,
            error: currentState.error,
          });
        }, 1000);
      } else {
        setRealUserFlowResult('❌ Manual sync failed. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Manual sync test failed:', error);
      setRealUserFlowResult(`❌ Manual sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant='h4' gutterBottom>
          🧪 Subscription Testing
        </Typography>

        <Typography variant='body1' sx={{ mb: 3 }}>
          Test subscription functionality and state management
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Current State */}
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                📊 Current State
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Chip
                  label={`Activated: ${subscription.isActivated}`}
                  color={subscription.isActivated ? 'success' : 'default'}
                />
                <Chip
                  label={`Status: ${subscription.subscriptionStatus || 'None'}`}
                  color={
                    subscription.subscriptionStatus === 'active'
                      ? 'success'
                      : subscription.subscriptionStatus === 'suspended'
                        ? 'error'
                        : 'default'
                  }
                />
                <Chip
                  label={`Loading: ${subscription.isLoading}`}
                  color={subscription.isLoading ? 'warning' : 'default'}
                />
                <Chip
                  label={`Tier: ${subscription.subscriptionTier || 'None'}`}
                  color={subscription.subscriptionTier ? 'info' : 'default'}
                />
              </Box>
              {subscription.error && (
                <Alert severity='error' sx={{ mt: 1 }}>
                  {subscription.error}
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Real User Flow Testing */}
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom sx={{ color: 'primary.main' }}>
                🎭 Real User Flow Testing
              </Typography>
              <Typography variant='body2' sx={{ mb: 3, color: 'text.secondary' }}>
                Test the actual user experience - this will reset your subscription and show the real ActivationScreen
              </Typography>

              <Alert severity='info' sx={{ mb: 2 }}>
                <Typography variant='body2'>
                  <strong>What this does:</strong>
                  <br />
                  1. Resets your subscription state (marks as not activated)
                  <br />
                  2. Redirects you to a protected route
                  <br />
                  3. Shows the real ActivationScreen where you enter a license key manually
                  <br />
                  4. You can test with: <code>FL-GQHBEQ-H1L107-NGGIO6-SNETVB</code>
                </Typography>
              </Alert>

              <Button
                variant='contained'
                color='primary'
                onClick={testRealUserFlow}
                disabled={isResetting}
                sx={{ mb: 2 }}
              >
                {isResetting ? 'Testing Real User Flow...' : '🎭 Test Real User Flow'}
              </Button>

              <Button variant='contained' onClick={handleRealUserFlowTest} disabled={isLoading} sx={{ mb: 2 }}>
                Test Real User Flow
              </Button>

              <Button variant='outlined' onClick={handleDebugActivationTest} disabled={isLoading} sx={{ mb: 2 }}>
                Debug Activation Test
              </Button>

              <Button
                variant='outlined'
                color='secondary'
                onClick={handleManualSyncTest}
                disabled={isLoading}
                sx={{ mb: 2 }}
              >
                🔄 Manual Sync Test (Check for Suspension)
              </Button>

              {realUserFlowResult && (
                <Alert severity={realUserFlowResult.includes('✅') ? 'success' : 'info'} sx={{ mt: 2 }}>
                  {realUserFlowResult}
                </Alert>
              )}
            </CardContent>
          </Card>

          <Divider sx={{ my: 2 }} />

          {/* Developer Testing */}
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom sx={{ color: 'secondary.main' }}>
                🔧 Developer Testing (Programmatic)
              </Typography>
              <Typography variant='body2' sx={{ mb: 3, color: 'text.secondary' }}>
                These tests use hardcoded values for developer testing
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button variant='outlined' onClick={testActivation}>
                  Test Activation (Hardcoded)
                </Button>
                <Button variant='outlined' onClick={testReset}>
                  Test Reset
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom>
                  📋 Test Results
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {testResults.map((result, index) => (
                    <Typography key={index} variant='body2' sx={{ fontFamily: 'monospace' }}>
                      {result}
                    </Typography>
                  ))}
                </Box>
                <Button variant='outlined' size='small' onClick={() => setTestResults([])} sx={{ mt: 2 }}>
                  Clear Results
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
};
