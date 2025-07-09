/**
 * AmountDisplay Component
 * Displays payment amounts with proper formatting and currency
 * Following Instructions file standards with atomic design
 */

import React from 'react';
import { Typography, TypographyProps } from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled amount display
const StyledTypography = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'amountSize' && prop !== 'colorVariant',
})<{ amountSize?: AmountSize; colorVariant?: ColorVariant }>(({ theme, amountSize, colorVariant }) => {
  const getSizeStyles = () => {
    switch (amountSize) {
      case 'small':
        return {
          fontSize: '0.875rem',
          fontWeight: 500,
        };
      case 'medium':
        return {
          fontSize: '1rem',
          fontWeight: 600,
        };
      case 'large':
        return {
          fontSize: '1.25rem',
          fontWeight: 700,
        };
      default:
        return {
          fontSize: '1rem',
          fontWeight: 600,
        };
    }
  };

  const getColorStyles = () => {
    switch (colorVariant) {
      case 'success':
        return {
          color: theme.palette.success.main,
        };
      case 'error':
        return {
          color: theme.palette.error.main,
        };
      case 'warning':
        return {
          color: theme.palette.warning.main,
        };
      case 'info':
        return {
          color: theme.palette.info.main,
        };
      case 'muted':
        return {
          color: theme.palette.text.secondary,
        };
      default:
        return {
          color: theme.palette.text.primary,
        };
    }
  };

  return {
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
    ...getSizeStyles(),
    ...getColorStyles(),
  };
});

// Component types
type AmountSize = 'small' | 'medium' | 'large';
type ColorVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'muted';

// Component props
export interface AmountDisplayProps extends Omit<TypographyProps, 'variant'> {
  amount: number;
  currency?: string;
  size?: AmountSize;
  colorVariant?: ColorVariant;
  showSign?: boolean;
  precision?: number;
  'data-testid'?: string;
}

/**
 * Formats amount with currency and proper decimal places
 */
const formatAmount = (amount: number, currency: string = 'USD', precision: number = 2): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  return formatter.format(amount);
};

/**
 * AmountDisplay Component
 * Displays payment amounts with proper formatting and styling
 */
export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  currency = 'USD',
  size = 'medium',
  colorVariant = 'default',
  showSign = false,
  precision = 2,
  'data-testid': testId,
  ...typographyProps
}) => {
  const formattedAmount = formatAmount(amount, currency, precision);
  const displayAmount = showSign && amount > 0 ? `+${formattedAmount}` : formattedAmount;

  return (
    <StyledTypography
      amountSize={size}
      colorVariant={colorVariant}
      data-testid={testId || 'amount-display'}
      {...typographyProps}
    >
      {displayAmount}
    </StyledTypography>
  );
};

// Default export
export default AmountDisplay;
