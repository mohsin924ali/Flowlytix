/**
 * Amount Input Component
 * Atomic component for monetary amount input with proper formatting and validation
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Payment Management
 * @architecture Atom Component (Atomic Design)
 * @version 1.0.0
 */

import React, { useState, useCallback, forwardRef } from 'react';
import { TextField, type TextFieldProps, InputAdornment, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AttachMoney, Euro, CurrencyPound } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { PaymentFormatters, PaymentDomainUtils } from '../../../domains/payment';

/**
 * Props interface for AmountInput
 */
export interface AmountInputProps extends Omit<TextFieldProps, 'value' | 'onChange' | 'type'> {
  readonly value: number | '';
  readonly onChange: (value: number | '') => void;
  readonly currency?: string;
  readonly showCurrencySymbol?: boolean;
  readonly showCurrencyCode?: boolean;
  readonly allowNegative?: boolean;
  readonly maxAmount?: number;
  readonly minAmount?: number;
  readonly decimalPlaces?: number;
  readonly showFormattedPreview?: boolean;
  readonly 'data-testid'?: string;
}

/**
 * Get currency symbol component
 */
const getCurrencySymbol = (currency: string): React.ReactNode => {
  switch (currency) {
    case 'USD':
      return <AttachMoney />;
    case 'EUR':
      return <Euro />;
    case 'GBP':
      return <CurrencyPound />;
    default:
      return <AttachMoney />;
  }
};

/**
 * Format input value for display
 */
const formatInputValue = (value: number | '', decimalPlaces: number): string => {
  if (value === '' || value === null || value === undefined) return '';
  return Number(value).toFixed(decimalPlaces);
};

/**
 * Parse input value from string
 */
const parseInputValue = (
  input: string,
  allowNegative: boolean,
  maxAmount?: number,
  minAmount?: number
): number | '' => {
  if (!input || input.trim() === '') return '';

  // Remove any non-numeric characters except decimal point and minus sign
  const cleaned = input.replace(/[^0-9.-]/g, '');

  // Handle negative values
  if (!allowNegative && cleaned.startsWith('-')) {
    return '';
  }

  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) return '';

  // Apply min/max constraints
  if (maxAmount !== undefined && parsed > maxAmount) {
    return maxAmount;
  }

  if (minAmount !== undefined && parsed < minAmount) {
    return minAmount;
  }

  return parsed;
};

/**
 * AmountInput component with forwarded ref
 *
 * Specialized input for monetary amounts with currency support,
 * formatting, validation, and user-friendly features.
 */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  (
    {
      value,
      onChange,
      currency = 'USD',
      showCurrencySymbol = true,
      showCurrencyCode = false,
      allowNegative = false,
      maxAmount,
      minAmount = 0,
      decimalPlaces = 2,
      showFormattedPreview = true,
      error,
      helperText,
      'data-testid': testId,
      onBlur,
      onFocus,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation();
    const [displayValue, setDisplayValue] = useState(formatInputValue(value, decimalPlaces));
    const [isFocused, setIsFocused] = useState(false);

    // Handle input change
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;
        setDisplayValue(inputValue);

        const parsedValue = parseInputValue(inputValue, allowNegative, maxAmount, minAmount);
        onChange(parsedValue);
      },
      [onChange, allowNegative, maxAmount, minAmount]
    );

    // Handle focus
    const handleFocus = useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        onFocus?.(event);
      },
      [onFocus]
    );

    // Handle blur - format the value
    const handleBlur = useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        if (value !== '') {
          setDisplayValue(formatInputValue(value, decimalPlaces));
        }
        onBlur?.(event);
      },
      [value, decimalPlaces, onBlur]
    );

    // Validation
    const isValidAmount = value === '' || PaymentDomainUtils.validatePaymentAmount(Number(value));
    const hasError = error || !isValidAmount;

    // Get formatted amount for preview
    const formattedAmount =
      value !== '' && typeof value === 'number' ? PaymentFormatters.formatCurrency(value, currency || 'USD') : '';

    // Currency symbol/code adornment
    const currencyAdornment = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {showCurrencySymbol && (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
            {getCurrencySymbol(currency)}
          </motion.div>
        )}
        {showCurrencyCode && (
          <Typography variant='body2' color='text.secondary' fontWeight={500}>
            {currency}
          </Typography>
        )}
      </Box>
    );

    return (
      <Box>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <TextField
            ref={ref}
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            type='text'
            inputMode='decimal'
            error={hasError}
            helperText={hasError && !isValidAmount ? t('payment.amount.invalid') : helperText}
            InputProps={{
              startAdornment: (showCurrencySymbol || showCurrencyCode) && (
                <InputAdornment position='start'>{currencyAdornment}</InputAdornment>
              ),
              sx: {
                '& input': {
                  textAlign: 'right',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                },
                transition: 'all 0.3s ease-in-out',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: '1.5px',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: '2px',
                  boxShadow: '0 0 0 3px rgba(81, 63, 242, 0.1)',
                },
              },
            }}
            inputProps={{
              'data-testid': testId,
              step: Math.pow(10, -decimalPlaces),
              min: minAmount,
              max: maxAmount,
            }}
            {...props}
          />
        </motion.div>

        {/* Formatted preview */}
        {showFormattedPreview && formattedAmount && !isFocused && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Box
              sx={{
                mt: 0.5,
                px: 1,
                py: 0.5,
                bgcolor: 'grey.50',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Typography variant='caption' color='primary.main' fontWeight={600}>
                {formattedAmount}
              </Typography>
            </Box>
          </motion.div>
        )}

        {/* Amount constraints helper */}
        {(minAmount > 0 || maxAmount) && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant='caption' color='text.secondary'>
              {minAmount > 0 && maxAmount
                ? t('payment.amount.range', {
                    min: PaymentFormatters.formatCurrency(minAmount, currency || 'USD'),
                    max: PaymentFormatters.formatCurrency(maxAmount, currency || 'USD'),
                  })
                : minAmount > 0
                  ? t('payment.amount.minimum', {
                      min: PaymentFormatters.formatCurrency(minAmount, currency || 'USD'),
                    })
                  : maxAmount
                    ? t('payment.amount.maximum', {
                        max: PaymentFormatters.formatCurrency(maxAmount, currency || 'USD'),
                      })
                    : ''}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }
);

// Display name for debugging
AmountInput.displayName = 'AmountInput';

export default AmountInput;
