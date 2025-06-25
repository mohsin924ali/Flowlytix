/**
 * Alert Atom Component
 * Reusable alert component following Atomic Design principles
 * Using Material-UI with proper accessibility, animations, and enhanced styling
 */

import React, { forwardRef } from 'react';
import { Alert as MuiAlert, type AlertProps as MuiAlertProps, AlertTitle, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Extended alert props interface
 */
export interface AlertProps extends Omit<MuiAlertProps, 'variant'> {
  /** Alert variant */
  variant?: 'filled' | 'outlined' | 'standard';
  /** Alert title */
  title?: string;
  /** Show/hide alert with animation */
  show?: boolean;
  /** Closable alert */
  closable?: boolean;
  /** Close handler */
  onClose?: () => void;
  /** Alert test id for testing */
  'data-testid'?: string;
  /** Auto-hide duration in milliseconds */
  autoHideDuration?: number;
}

/**
 * Alert atom component with forwarded ref
 * Follows Material-UI design system with enhanced functionality and animations
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      variant = 'standard',
      title,
      show = true,
      closable = false,
      onClose,
      children,
      severity = 'info',
      'data-testid': testId,
      autoHideDuration,
      sx,
      ...rest
    },
    ref
  ) => {
    /**
     * Auto-hide effect
     */
    React.useEffect(() => {
      if (autoHideDuration && show && onClose) {
        const timer = setTimeout(() => {
          onClose();
        }, autoHideDuration);

        return () => clearTimeout(timer);
      }
    }, [autoHideDuration, show, onClose]);

    /**
     * Close action with animation
     */
    const closeAction = closable && onClose && (
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <IconButton
          aria-label='Close alert'
          color='inherit'
          size='small'
          onClick={onClose}
          data-testid={`${testId}-close-button`}
          sx={{
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
            },
          }}
        >
          <motion.div initial={{ rotate: 0 }} whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }}>
            <Close fontSize='inherit' />
          </motion.div>
        </IconButton>
      </motion.div>
    );

    /**
     * Alert content with enhanced styling
     */
    const alertContent = (
      <MuiAlert
        ref={ref}
        variant={variant}
        severity={severity}
        action={closeAction}
        data-testid={testId}
        role='alert'
        sx={{
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          ...(severity === 'error' && {
            background: 'linear-gradient(135deg, #f44336 0%, #e57373 100%)',
            color: 'white',
            '& .MuiAlert-icon': {
              color: 'white',
            },
          }),
          ...(severity === 'warning' && {
            background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
            color: 'white',
            '& .MuiAlert-icon': {
              color: 'white',
            },
          }),
          ...(severity === 'info' && {
            background: 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)',
            color: 'white',
            '& .MuiAlert-icon': {
              color: 'white',
            },
          }),
          ...(severity === 'success' && {
            background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
            color: 'white',
            '& .MuiAlert-icon': {
              color: 'white',
            },
          }),
          '& .MuiAlert-message': {
            fontWeight: 500,
          },
          ...sx,
        }}
        {...rest}
      >
        {title && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <AlertTitle sx={{ fontWeight: 600, mb: 1 }}>{title}</AlertTitle>
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: title ? 0.2 : 0.1 }}
        >
          {children}
        </motion.div>
      </MuiAlert>
    );

    // Return with collapse animation
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{
              duration: 0.3,
              ease: 'easeOut',
            }}
          >
            {alertContent}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

// Display name for debugging
Alert.displayName = 'Alert';
