/**
 * LoginForm Molecule Component
 * Combines multiple atoms to create a complete login form
 * Following Atomic Design principles with animations and professional styling
 */

import React, { useState, useCallback } from 'react';
import { Box, FormControlLabel, Checkbox, Typography, Divider } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Input, Button, Alert } from '../../atoms';
import { useLoginForm } from '../../../hooks/useLoginForm';
import { A11Y_CONFIG, ERROR_MESSAGES } from '../../../constants/app.constants';

/**
 * LoginForm props interface
 */
export interface LoginFormProps {
  /** Form submission callback */
  onSubmit?: () => void;
  /** Custom form title */
  title?: string;
  /** Show development credentials */
  showDevCredentials?: boolean;
  /** Form test id for testing */
  'data-testid'?: string;
}

/**
 * Animation variants
 */
const formVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

/**
 * LoginForm molecule component
 * Handles complete login form functionality with validation and animations
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit: onSubmitCallback,
  title,
  showDevCredentials = true,
  'data-testid': testId = 'login-form',
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    onSubmit,
    clearError,
    isLoading,
    error,
  } = useLoginForm();

  /**
   * Toggle password visibility
   */
  const handlePasswordVisibilityToggle = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  /**
   * Handle form submission
   */
  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await onSubmit(data);
      onSubmitCallback?.();
    } catch (submitError) {
      // Error is handled by the hook
      console.error('Form submission error:', submitError);
    }
  });

  /**
   * Check if Electron API is available
   */
  const isElectronAPIAvailable = typeof window !== 'undefined' && window.electronAPI;

  return (
    <motion.div variants={formVariants} initial='hidden' animate='visible'>
      <Box
        component='form'
        onSubmit={handleFormSubmit}
        noValidate
        data-testid={testId}
        aria-label={A11Y_CONFIG.ARIA_LABELS.LOGIN_FORM}
        sx={{
          width: '100%',
          maxWidth: 400,
          mx: 'auto',
        }}
      >
        {/* Form Title - Only show if provided */}
        {title && (
          <motion.div variants={itemVariants}>
            <Typography
              variant='h4'
              component='h1'
              gutterBottom
              align='center'
              sx={{
                mb: 4,
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
            >
              {title}
            </Typography>
          </motion.div>
        )}

        {/* Welcome Message */}
        <motion.div variants={itemVariants}>
          <Typography
            variant='h5'
            component='h2'
            align='center'
            sx={{
              mb: 1,
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            Welcome Back!
          </Typography>
          <Typography
            variant='body2'
            align='center'
            sx={{
              mb: 4,
              color: 'text.secondary',
              fontWeight: 400,
            }}
          >
            Please sign in to your account
          </Typography>
        </motion.div>

        {/* API Status Alert */}
        <AnimatePresence>
          {!isElectronAPIAvailable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert severity='error' show={!isElectronAPIAvailable} sx={{ mb: 3 }} data-testid={`${testId}-api-error`}>
                {ERROR_MESSAGES.ELECTRON_API_UNAVAILABLE}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Alert
                severity='error'
                show={!!error}
                closable
                onClose={clearError}
                sx={{ mb: 3 }}
                data-testid={`${testId}-error-alert`}
              >
                {error}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Input */}
        <motion.div variants={itemVariants}>
          <Input
            {...register('email')}
            type='email'
            label='Email Address'
            placeholder='Enter your email'
            fullWidth
            required
            autoComplete='email'
            error={!!errors.email}
            helperText={errors.email?.message}
            disabled={isLoading || !isElectronAPIAvailable}
            sx={{ mb: 3 }}
            data-testid={`${testId}-email-input`}
            aria-label={A11Y_CONFIG.ARIA_LABELS.EMAIL_INPUT}
          />
        </motion.div>

        {/* Password Input */}
        <motion.div variants={itemVariants}>
          <Input
            {...register('password')}
            type='password'
            label='Password'
            placeholder='Enter your password'
            fullWidth
            required
            autoComplete='current-password'
            showPasswordToggle
            isPasswordVisible={showPassword}
            onPasswordVisibilityToggle={handlePasswordVisibilityToggle}
            error={!!errors.password}
            helperText={errors.password?.message}
            disabled={isLoading || !isElectronAPIAvailable}
            sx={{ mb: 3 }}
            data-testid={`${testId}-password-input`}
            aria-label={A11Y_CONFIG.ARIA_LABELS.PASSWORD_INPUT}
          />
        </motion.div>

        {/* Remember Me Checkbox */}
        <motion.div variants={itemVariants}>
          <FormControlLabel
            control={
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Checkbox
                  {...register('rememberMe')}
                  disabled={isLoading || !isElectronAPIAvailable}
                  data-testid={`${testId}-remember-me-checkbox`}
                  sx={{
                    '&.Mui-checked': {
                      color: 'primary.main',
                    },
                  }}
                />
              </motion.div>
            }
            label={
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                Remember me for 30 days
              </Typography>
            }
            sx={{ mb: 4 }}
            aria-label={A11Y_CONFIG.ARIA_LABELS.REMEMBER_ME}
          />
        </motion.div>

        {/* Submit Button */}
        <motion.div variants={itemVariants}>
          <Button
            type='submit'
            fullWidth
            isLoading={isLoading || isSubmitting}
            loadingText='Signing in...'
            disabled={!isElectronAPIAvailable}
            sx={{ mb: 3, py: 1.5 }}
            data-testid={`${testId}-submit-button`}
            aria-label={A11Y_CONFIG.ARIA_LABELS.SUBMIT_BUTTON}
          >
            Sign In
          </Button>
        </motion.div>

        {/* Development Credentials */}
        {showDevCredentials && (
          <motion.div
            variants={itemVariants}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Divider sx={{ my: 3 }}>
              <Typography variant='caption' color='text.secondary'>
                Development
              </Typography>
            </Divider>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
              <Box
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, rgba(81, 63, 242, 0.05) 0%, rgba(107, 82, 245, 0.05) 100%)',
                  borderRadius: 2,
                  border: '1px solid rgba(81, 63, 242, 0.1)',
                  backdropFilter: 'blur(10px)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(81, 63, 242, 0.3), transparent)',
                  },
                }}
              >
                <Typography
                  variant='caption'
                  sx={{
                    display: 'block',
                    mb: 2,
                    fontWeight: 'bold',
                    color: 'primary.main',
                    textAlign: 'center',
                  }}
                >
                  🔑 Test Credentials
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant='caption' color='text.secondary'>
                    <strong>Email:</strong> admin@flowlytix.com
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    <strong>Password:</strong> admin123
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          </motion.div>
        )}
      </Box>
    </motion.div>
  );
};

// Display name for debugging
LoginForm.displayName = 'LoginForm';
