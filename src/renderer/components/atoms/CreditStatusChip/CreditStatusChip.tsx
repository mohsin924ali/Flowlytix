/**
 * Credit Status Chip Component
 * Atomic component for displaying credit status with proper visual indicators
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Credit Management
 * @architecture Atom Component (Atomic Design)
 * @version 1.0.0
 */

import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Warning, Error, Block, Pause, HourglassEmpty } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { CreditStatus, CreditStatusUtils } from '../../../domains/payment';

/**
 * Props interface for CreditStatusChip
 */
export interface CreditStatusChipProps extends Omit<ChipProps, 'color' | 'icon' | 'label'> {
  readonly status: CreditStatus;
  readonly showIcon?: boolean;
  readonly variant?: 'filled' | 'outlined';
  readonly animated?: boolean;
  readonly 'data-testid'?: string;
}

/**
 * Get credit status configuration for display
 */
const getCreditStatusConfig = (
  status: CreditStatus,
  t: (key: string) => string
): {
  label: string;
  color: 'success' | 'warning' | 'error' | 'info' | 'primary';
  icon: React.ElementType;
  pulse?: boolean;
} => {
  switch (status) {
    case CreditStatus.GOOD:
      return {
        label: t('credit.status.good'),
        color: 'success',
        icon: CheckCircle,
      };

    case CreditStatus.FAIR:
      return {
        label: t('credit.status.fair'),
        color: 'warning',
        icon: Warning,
      };

    case CreditStatus.POOR:
      return {
        label: t('credit.status.poor'),
        color: 'error',
        icon: Error,
      };

    case CreditStatus.BLOCKED:
      return {
        label: t('credit.status.blocked'),
        color: 'error',
        icon: Block,
      };

    case CreditStatus.SUSPENDED:
      return {
        label: t('credit.status.suspended'),
        color: 'warning',
        icon: Pause,
      };

    case CreditStatus.UNDER_REVIEW:
      return {
        label: t('credit.status.under_review'),
        color: 'info',
        icon: HourglassEmpty,
        pulse: true,
      };

    default:
      return {
        label: t('credit.status.unknown'),
        color: 'primary',
        icon: HourglassEmpty,
      };
  }
};

/**
 * CreditStatusChip component
 *
 * Displays credit status with proper visual indicators, animations, and accessibility.
 * Follows Material-UI design system with custom enhancements.
 */
export const CreditStatusChip: React.FC<CreditStatusChipProps> = ({
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
  const { label, color, icon: Icon, pulse } = getCreditStatusConfig(status, t);

  const chipContent = (
    <Chip
      {...(showIcon && {
        icon: (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <Icon />
          </motion.div>
        ),
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
        ...(status === CreditStatus.GOOD && {
          background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #388e3c 0%, #4caf50 100%)',
          },
        }),
        ...(status === CreditStatus.FAIR && {
          background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #f57c00 0%, #ff9800 100%)',
          },
        }),
        ...(status === CreditStatus.POOR && {
          background: 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
          },
        }),
        ...(status === CreditStatus.BLOCKED && {
          background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #7b1fa2 0%, #9c27b0 100%)',
          },
        }),
        ...(status === CreditStatus.SUSPENDED && {
          background: 'linear-gradient(135deg, #607d8b 0%, #78909c 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #455a64 0%, #607d8b 100%)',
          },
        }),
        ...(status === CreditStatus.UNDER_REVIEW && {
          background: 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1976d2 0%, #2196f3 100%)',
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

export default CreditStatusChip;
