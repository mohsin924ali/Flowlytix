/**
 * Button Atom Component
 * Reusable button component following Atomic Design principles
 * Using Material-UI with proper accessibility, loading states, and animations
 */

import React, { forwardRef } from 'react';
import { Button as MuiButton, type ButtonProps as MuiButtonProps, CircularProgress, Box } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * Extended button props interface
 */
export interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  /** Button variant */
  variant?: 'contained' | 'outlined' | 'text';
  /** Loading state */
  isLoading?: boolean;
  /** Loading text override */
  loadingText?: string;
  /** Button test id for testing */
  'data-testid'?: string;
  /** Full width button */
  fullWidth?: boolean;
}

/**
 * Button atom component with forwarded ref
 * Follows Material-UI design system with loading state enhancement and animations
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'contained',
      isLoading = false,
      loadingText,
      children,
      disabled,
      'data-testid': testId,
      fullWidth = false,
      sx,
      ...rest
    },
    ref
  ) => {
    /**
     * Determine if button should be disabled
     */
    const isDisabled = disabled || isLoading;

    /**
     * Button content with loading state and animation
     */
    const buttonContent = isLoading ? (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <CircularProgress size={16} color='inherit' data-testid={`${testId}-loading-spinner`} />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {loadingText || children}
          </motion.span>
        </Box>
      </motion.div>
    ) : (
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        {children}
      </motion.span>
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        style={{ width: fullWidth ? '100%' : 'auto' }}
      >
        <MuiButton
          ref={ref}
          variant={variant}
          disabled={isDisabled}
          fullWidth={fullWidth}
          data-testid={testId}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease-in-out',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            py: 1.5,
            px: 3,
            ...(variant === 'contained' && {
              background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
              boxShadow: '0 4px 15px rgba(81, 63, 242, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4338ca 0%, #513ff2 100%)',
                boxShadow: '0 6px 20px rgba(81, 63, 242, 0.4)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0px)',
                boxShadow: '0 2px 8px rgba(81, 63, 242, 0.3)',
              },
            }),
            ...(variant === 'outlined' && {
              borderWidth: 2,
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                backgroundColor: 'rgba(81, 63, 242, 0.04)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(81, 63, 242, 0.2)',
              },
            }),
            '&:before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              transition: 'left 0.5s',
            },
            '&:hover:before': {
              left: '100%',
            },
            '&.Mui-disabled': {
              opacity: 0.6,
              transform: 'none',
              boxShadow: 'none',
            },
            ...sx,
          }}
          {...rest}
        >
          {buttonContent}
        </MuiButton>
      </motion.div>
    );
  }
);

// Display name for debugging
Button.displayName = 'Button';
