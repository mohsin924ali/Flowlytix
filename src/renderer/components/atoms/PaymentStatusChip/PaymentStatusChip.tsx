/**
 * Payment Status Chip Component
 * Atomic component for displaying payment status with proper visual indicators
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Payment Management
 * @architecture Atom Component (Atomic Design)
 * @version 1.0.0
 */

import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  Schedule,
  HourglassEmpty,
  AccountBalanceWallet,
  Error,
  Cancel,
  Undo,
  PieChart,
  TrendingUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { PaymentStatus } from '../../../domains/payment';

/**
 * Props interface for PaymentStatusChip
 */
export interface PaymentStatusChipProps extends Omit<ChipProps, 'color' | 'icon' | 'label'> {
  readonly status: PaymentStatus;
  readonly showIcon?: boolean;
  readonly variant?: 'filled' | 'outlined';
  readonly animated?: boolean;
  readonly 'data-testid'?: string;
}

/**
 * Get payment status configuration for display
 */
const getPaymentStatusConfig = (
  status: PaymentStatus,
  t: (key: string) => string
): {
  label: string;
  color: 'success' | 'warning' | 'error' | 'info' | 'primary';
  icon: React.ElementType;
  pulse?: boolean;
} => {
  switch (status) {
    case PaymentStatus.CONFIRMED:
      return {
        label: t('payment.status.confirmed'),
        color: 'success',
        icon: CheckCircle,
      };

    case PaymentStatus.PENDING:
      return {
        label: t('payment.status.pending'),
        color: 'warning',
        icon: Schedule,
        pulse: true,
      };

    case PaymentStatus.PROCESSING:
      return {
        label: t('payment.status.processing'),
        color: 'info',
        icon: HourglassEmpty,
        pulse: true,
      };

    case PaymentStatus.RECEIVED:
      return {
        label: t('payment.status.received'),
        color: 'success',
        icon: AccountBalanceWallet,
      };

    case PaymentStatus.FAILED:
      return {
        label: t('payment.status.failed'),
        color: 'error',
        icon: Error,
      };

    case PaymentStatus.CANCELLED:
      return {
        label: t('payment.status.cancelled'),
        color: 'error',
        icon: Cancel,
      };

    case PaymentStatus.REFUNDED:
      return {
        label: t('payment.status.refunded'),
        color: 'info',
        icon: Undo,
      };

    case PaymentStatus.PARTIAL:
      return {
        label: t('payment.status.partial'),
        color: 'warning',
        icon: PieChart,
      };

    case PaymentStatus.OVERPAID:
      return {
        label: t('payment.status.overpaid'),
        color: 'info',
        icon: TrendingUp,
      };

    default:
      return {
        label: t('payment.status.unknown'),
        color: 'primary',
        icon: HourglassEmpty,
      };
  }
};

/**
 * PaymentStatusChip component
 *
 * Displays payment status with proper visual indicators, animations, and accessibility.
 * Follows Material-UI design system with custom enhancements.
 */
export const PaymentStatusChip: React.FC<PaymentStatusChipProps> = ({
  status,
  showIcon = true,
  variant = 'filled',
  animated = true,
  size = 'small',
  'data-testid': testId,
  sx,
  ...props
}) => {
  const { t } = useTranslation();
  const { label, color, icon: Icon, pulse } = getPaymentStatusConfig(status, t);

  const chipContent = (
    <Chip
      {...(showIcon && {
        icon: <Icon />,
      })}
      label={label}
      color={color}
      variant={variant}
      size={size}
      data-testid={testId}
      sx={{
        fontWeight: 600,
        textTransform: 'capitalize',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: (theme) =>
            variant === 'filled'
              ? `0 4px 8px ${theme.palette[color].main}40`
              : `0 2px 4px ${theme.palette[color].main}20`,
        },
        // Status-specific styling
        ...(status === PaymentStatus.CONFIRMED && {
          background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #388e3c 0%, #4caf50 100%)',
          },
        }),
        ...(status === PaymentStatus.PENDING && {
          background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #f57c00 0%, #ff9800 100%)',
          },
        }),
        ...(status === PaymentStatus.PROCESSING && {
          background: 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1976d2 0%, #2196f3 100%)',
          },
        }),
        ...(status === PaymentStatus.FAILED && {
          background: 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
          },
        }),
        ...(status === PaymentStatus.CANCELLED && {
          background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #7b1fa2 0%, #9c27b0 100%)',
          },
        }),
        ...(status === PaymentStatus.REFUNDED && {
          background: 'linear-gradient(135deg, #607d8b 0%, #78909c 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #455a64 0%, #607d8b 100%)',
          },
        }),
        ...sx,
      }}
      {...props}
    />
  );

  if (!animated) {
    return chipContent;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {pulse ? (
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {chipContent}
        </motion.div>
      ) : (
        chipContent
      )}
    </motion.div>
  );
};

export default PaymentStatusChip;
