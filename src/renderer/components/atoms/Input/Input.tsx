/**
 * Input Atom Component
 * Reusable input component following Atomic Design principles
 * Using Material-UI with proper accessibility, validation, and animations
 */

import React, { forwardRef, useState } from 'react';
import { TextField, type TextFieldProps, InputAdornment, IconButton, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Extended input props interface
 */
export interface InputProps extends Omit<TextFieldProps, 'variant'> {
  /** Input variant - standardized to outlined */
  variant?: 'outlined';
  /** Show/hide password toggle for password fields */
  showPasswordToggle?: boolean;
  /** Password visibility state */
  isPasswordVisible?: boolean;
  /** Password visibility toggle handler */
  onPasswordVisibilityToggle?: () => void;
  /** Input test id for testing */
  'data-testid'?: string;
}

/**
 * Input atom component with forwarded ref
 * Follows Material-UI design system with custom enhancements and animations
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'outlined',
      showPasswordToggle = false,
      isPasswordVisible = false,
      onPasswordVisibilityToggle,
      type,
      InputProps: inputProps,
      'data-testid': testId,
      ...rest
    },
    ref
  ) => {
    const { t } = useTranslation();
    const [isFocused, setIsFocused] = useState(false);

    /**
     * Determine input type based on password visibility
     */
    const inputType = showPasswordToggle ? (isPasswordVisible ? 'text' : 'password') : type;

    /**
     * Password visibility toggle button with animation
     */
    const passwordToggleAdornment = showPasswordToggle && (
      <InputAdornment position='end'>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <IconButton
            aria-label={isPasswordVisible ? t('common.hide_password') : t('common.show_password')}
            onClick={onPasswordVisibilityToggle}
            edge='end'
            size='small'
            data-testid={`${testId}-password-toggle`}
            sx={{
              transition: 'color 0.2s ease-in-out',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <AnimatePresence mode='wait'>
              <motion.div
                key={isPasswordVisible ? 'visible' : 'hidden'}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                {isPasswordVisible ? <VisibilityOff /> : <Visibility />}
              </motion.div>
            </AnimatePresence>
          </IconButton>
        </motion.div>
      </InputAdornment>
    );

    return (
      <Box sx={{ position: 'relative' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <TextField
            ref={ref}
            variant={variant}
            type={inputType}
            onFocus={(e) => {
              setIsFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              rest.onBlur?.(e);
            }}
            InputProps={{
              ...inputProps,
              endAdornment: passwordToggleAdornment || inputProps?.endAdornment,
              sx: {
                transition: 'all 0.3s ease-in-out',
                '& .MuiOutlinedInput-notchedOutline': {
                  transition: 'all 0.3s ease-in-out',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: '1.5px',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: '2px',
                  boxShadow: '0 0 0 3px rgba(81, 63, 242, 0.1)',
                },
                ...inputProps?.sx,
              },
            }}
            InputLabelProps={{
              sx: {
                transition: 'all 0.2s ease-in-out',
                '&.Mui-focused': {
                  color: 'primary.main',
                },
              },
              ...rest.InputLabelProps,
            }}
            inputProps={{
              'data-testid': testId,
              ...inputProps?.inputProps,
            }}
            {...rest}
          />
        </motion.div>

        {/* Focus indicator animation */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                bottom: -2,
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, #513ff2, #6b52f5)',
                borderRadius: 1,
                transformOrigin: 'center',
              }}
            />
          )}
        </AnimatePresence>
      </Box>
    );
  }
);

// Display name for debugging
Input.displayName = 'Input';
