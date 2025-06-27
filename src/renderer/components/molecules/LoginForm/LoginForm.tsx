/**
 * LoginForm Molecule Component
 * Beautiful animated login form following the loginTest design
 * Following Atomic Design principles with animations and professional styling
 * Implements WCAG 2.1 AA accessibility standards
 */

import React, { useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Visibility, VisibilityOff, Email, Lock, Login as LoginIcon } from '@mui/icons-material';
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
  'data-testid': testId = 'login-form',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    onSubmit,
    clearError,
    isLoading,
    error,
    setValue,
  } = useLoginForm();

  /**
   * Toggle password visibility
   */
  const handlePasswordVisibilityToggle = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  /**
   * Handle input changes
   */
  const handleInputChange = useCallback(
    (field: 'email' | 'password') => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setValue(field, value);
      if (error) clearError();
    },
    [setValue, error, clearError]
  );

  /**
   * Handle form submission
   */
  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await onSubmit(data);
      onSubmitCallback?.();
    } catch (submitError) {
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
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <motion.div
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
                boxShadow: '0 10px 25px rgba(81, 63, 242, 0.3)',
              }}
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <LoginIcon sx={{ color: 'white', fontSize: 32 }} />
              </motion.div>
            </Box>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Typography
              variant='h4'
              component='h2'
              sx={{
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              Welcome Back
            </Typography>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
            <Typography
              variant='h6'
              sx={{
                color: 'text.secondary',
                fontWeight: 400,
              }}
            >
              Sign in to your dashboard
            </Typography>
          </motion.div>
        </Box>

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
              initial={{ opacity: 0, scale: 0.95, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 2,
                  padding: 2,
                  mb: 3,
                }}
              >
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      mr: 1,
                      color: '#dc2626',
                    }}
                  >
                    <svg fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </Box>
                </motion.div>
                <Typography variant='body2' sx={{ color: '#dc2626' }}>
                  {error}
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Input */}
        <motion.div
          variants={itemVariants}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.1 }}
        >
          <Typography
            variant='body2'
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 1,
            }}
          >
            Email Address
          </Typography>
          <Box sx={{ position: 'relative', mb: 3 }}>
            <Input
              {...register('email')}
              type='email'
              placeholder='Enter your email'
              value={formData.email}
              onChange={(e) => handleInputChange('email')(e.target.value)}
              disabled={isLoading}
              error={!!errors.email}
              helperText={errors.email?.message}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 56,
                  pl: 6,
                  pr: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 0 0 2px rgba(81, 63, 242, 0.2)',
                  },
                },
                '& .MuiOutlinedInput-input': {
                  height: 'auto',
                },
              }}
            />
            <Email
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'text.secondary',
                fontSize: 20,
                zIndex: 1,
              }}
            />
          </Box>
        </motion.div>

        {/* Password Input */}
        <motion.div
          variants={itemVariants}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2 }}
        >
          <Typography
            variant='body2'
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 1,
            }}
          >
            Password
          </Typography>
          <Box sx={{ position: 'relative', mb: 4 }}>
            <Input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder='Enter your password'
              value={formData.password}
              onChange={(e) => handleInputChange('password')(e.target.value)}
              disabled={isLoading}
              error={!!errors.password}
              helperText={errors.password?.message}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 56,
                  pl: 6,
                  pr: 6,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 0 0 2px rgba(81, 63, 242, 0.2)',
                  },
                },
                '& .MuiOutlinedInput-input': {
                  height: 'auto',
                },
              }}
            />
            <Lock
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'text.secondary',
                fontSize: 20,
                zIndex: 1,
              }}
            />
            <motion.button
              type='button'
              onClick={handlePasswordVisibilityToggle}
              disabled={isLoading}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                padding: 8,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              {showPassword ? <VisibilityOff fontSize='small' /> : <Visibility fontSize='small' />}
            </motion.button>
          </Box>
        </motion.div>

        {/* Submit Button */}
        <motion.div
          variants={itemVariants}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
        >
          <Button
            type='submit'
            variant='contained'
            fullWidth
            disabled={
              isLoading || !formData.email.trim() || !formData.password.trim() || Object.keys(errors).length > 0
            }
            sx={{
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: 2,
              background:
                isLoading || !formData.email.trim() || !formData.password.trim() || Object.keys(errors).length > 0
                  ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                  : 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
              boxShadow:
                isLoading || !formData.email.trim() || !formData.password.trim() || Object.keys(errors).length > 0
                  ? 'none'
                  : '0 10px 25px rgba(81, 63, 242, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background:
                  isLoading || !formData.email.trim() || !formData.password.trim() || Object.keys(errors).length > 0
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                    : 'linear-gradient(135deg, #4338ca 0%, #5b21b6 100%)',
                boxShadow:
                  isLoading || !formData.email.trim() || !formData.password.trim() || Object.keys(errors).length > 0
                    ? 'none'
                    : '0 15px 35px rgba(81, 63, 242, 0.4)',
                transform:
                  isLoading || !formData.email.trim() || !formData.password.trim() || Object.keys(errors).length > 0
                    ? 'none'
                    : 'translateY(-2px)',
              },
              '&:active': {
                transform:
                  isLoading || !formData.email.trim() || !formData.password.trim() || Object.keys(errors).length > 0
                    ? 'none'
                    : 'translateY(0px)',
              },
            }}
          >
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  style={{ marginRight: 8 }}
                >
                  <svg width='24' height='24' viewBox='0 0 24 24'>
                    <circle
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                      fill='none'
                      strokeDasharray='31.416'
                      strokeDashoffset='31.416'
                      opacity='0.25'
                    />
                    <path
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      opacity='0.75'
                    />
                  </svg>
                </motion.div>
                Signing In...
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LoginIcon sx={{ mr: 1, fontSize: 20 }} />
                Sign In to Dashboard
              </Box>
            )}
          </Button>
        </motion.div>
      </Box>
    </motion.div>
  );
};

// Display name for debugging
LoginForm.displayName = 'LoginForm';
