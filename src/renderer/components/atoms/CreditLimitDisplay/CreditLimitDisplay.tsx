/**
 * Credit Limit Display Component
 * Atomic component for displaying credit limits with proper visual indicators
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Credit Management
 * @architecture Atom Component (Atomic Design)
 * @version 1.0.0
 */

import React from 'react';
import { Box, Typography, LinearProgress, Chip, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Warning, CheckCircle, Error } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { PaymentFormatters } from '../../../domains/payment';

/**
 * Props interface for CreditLimitDisplay
 */
export interface CreditLimitDisplayProps {
  readonly creditLimit: number;
  readonly availableCredit: number;
  readonly outstandingBalance: number;
  readonly currency?: string;
  readonly showUtilization?: boolean;
  readonly showProgress?: boolean;
  readonly showWarnings?: boolean;
  readonly variant?: 'compact' | 'detailed' | 'minimal';
  readonly size?: 'small' | 'medium' | 'large';
  readonly animated?: boolean;
  readonly 'data-testid'?: string;
}

/**
 * Calculate credit utilization percentage
 */
const calculateUtilization = (outstandingBalance: number, creditLimit: number): number => {
  if (creditLimit <= 0) return 0;
  return Math.min((outstandingBalance / creditLimit) * 100, 100);
};

/**
 * Get utilization status and color
 */
const getUtilizationStatus = (utilization: number) => {
  if (utilization >= 90) {
    return { status: 'critical', color: '#f44336', icon: Error };
  } else if (utilization >= 75) {
    return { status: 'warning', color: '#ff9800', icon: Warning };
  } else if (utilization >= 50) {
    return { status: 'moderate', color: '#2196f3', icon: TrendingUp };
  } else {
    return { status: 'good', color: '#4caf50', icon: CheckCircle };
  }
};

/**
 * CreditLimitDisplay component
 *
 * Displays credit limit information with utilization indicators,
 * warnings, and proper formatting. Follows Material-UI design system.
 */
export const CreditLimitDisplay: React.FC<CreditLimitDisplayProps> = ({
  creditLimit,
  availableCredit,
  outstandingBalance,
  currency = 'USD',
  showUtilization = true,
  showProgress = true,
  showWarnings = true,
  variant = 'detailed',
  size = 'medium',
  animated = true,
  'data-testid': testId,
}) => {
  const { t } = useTranslation();

  // Calculate utilization
  const utilization = calculateUtilization(outstandingBalance, creditLimit);
  const { status, color, icon: StatusIcon } = getUtilizationStatus(utilization);

  // Size configurations
  const sizeConfig = {
    small: {
      typography: 'body2' as const,
      spacing: 1,
      progressHeight: 4,
      chipSize: 'small' as const,
    },
    medium: {
      typography: 'body1' as const,
      spacing: 1.5,
      progressHeight: 6,
      chipSize: 'small' as const,
    },
    large: {
      typography: 'h6' as const,
      spacing: 2,
      progressHeight: 8,
      chipSize: 'medium' as const,
    },
  };

  const config = sizeConfig[size];

  // Format currency values
  const formatCurrency = (amount: number) => PaymentFormatters.formatCurrency(amount, currency);
  const formatPercentage = (percent: number) => PaymentFormatters.formatPercentage(percent / 100);

  // Render compact variant
  if (variant === 'compact') {
    const CompactWrapper = animated ? motion.div : Box;
    const animationProps = animated
      ? {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.3, ease: 'easeOut' },
        }
      : {};

    return (
      <CompactWrapper {...animationProps} data-testid={testId}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: config.spacing }}>
          <Typography variant={config.typography} fontWeight={600}>
            {formatCurrency(availableCredit)}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            / {formatCurrency(creditLimit)}
          </Typography>
          {showUtilization && (
            <Chip
              label={formatPercentage(utilization)}
              size={config.chipSize}
              sx={{
                backgroundColor: `${color}20`,
                color: color,
                fontWeight: 600,
              }}
            />
          )}
        </Box>
      </CompactWrapper>
    );
  }

  // Render minimal variant
  if (variant === 'minimal') {
    return (
      <motion.div
        initial={animated ? { opacity: 0, y: 10 } : false}
        animate={animated ? { opacity: 1, y: 0 } : false}
        transition={animated ? { duration: 0.3, ease: 'easeOut' } : false}
        data-testid={testId}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant={config.typography} fontWeight={600} color={color}>
            {formatCurrency(availableCredit)}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {t('credit.available')}
          </Typography>
        </Box>
      </motion.div>
    );
  }

  // Render detailed variant (default)
  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : false}
      animate={animated ? { opacity: 1, y: 0 } : false}
      transition={animated ? { duration: 0.3, ease: 'easeOut' } : false}
      data-testid={testId}
    >
      <Box sx={{ width: '100%' }}>
        {/* Header with utilization status */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: config.spacing,
          }}
        >
          <Typography variant={config.typography} fontWeight={600}>
            {t('credit.limit_display')}
          </Typography>

          {showUtilization && (
            <Tooltip title={t(`credit.utilization.${status}`)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <motion.div
                  animate={animated ? { rotate: [0, 5, -5, 0] } : false}
                  transition={animated ? { duration: 2, repeat: Infinity } : false}
                >
                  <StatusIcon sx={{ fontSize: '1rem', color }} />
                </motion.div>
                <Typography variant='caption' color={color} fontWeight={600}>
                  {formatPercentage(utilization)}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* Progress bar */}
        {showProgress && (
          <Box sx={{ mb: config.spacing }}>
            <LinearProgress
              variant='determinate'
              value={utilization}
              sx={{
                height: config.progressHeight,
                borderRadius: 1,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: color,
                  borderRadius: 1,
                  transition: 'all 0.5s ease-in-out',
                },
              }}
            />
          </Box>
        )}

        {/* Credit details */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: config.spacing * 0.5 }}>
          {/* Available Credit */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='body2' color='text.secondary'>
              {t('credit.available')}
            </Typography>
            <Typography variant='body2' fontWeight={600} color='success.main'>
              {formatCurrency(availableCredit)}
            </Typography>
          </Box>

          {/* Outstanding Balance */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='body2' color='text.secondary'>
              {t('credit.outstanding')}
            </Typography>
            <Typography variant='body2' fontWeight={600} color='error.main'>
              {formatCurrency(outstandingBalance)}
            </Typography>
          </Box>

          {/* Total Limit */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: 1,
              borderColor: 'grey.200',
              pt: config.spacing * 0.5,
              mt: config.spacing * 0.5,
            }}
          >
            <Typography variant='body2' color='text.secondary' fontWeight={600}>
              {t('credit.total_limit')}
            </Typography>
            <Typography variant='body2' fontWeight={700}>
              {formatCurrency(creditLimit)}
            </Typography>
          </Box>
        </Box>

        {/* Warnings */}
        {showWarnings && utilization >= 75 && (
          <motion.div
            initial={animated ? { opacity: 0, scale: 0.9 } : false}
            animate={animated ? { opacity: 1, scale: 1 } : false}
            transition={animated ? { delay: 0.3, duration: 0.3 } : false}
          >
            <Box
              sx={{
                mt: config.spacing,
                p: 1,
                backgroundColor: `${color}10`,
                border: `1px solid ${color}30`,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Warning sx={{ fontSize: '1rem', color }} />
              <Typography variant='caption' color={color} fontWeight={500}>
                {utilization >= 90 ? t('credit.warning.critical') : t('credit.warning.high_utilization')}
              </Typography>
            </Box>
          </motion.div>
        )}
      </Box>
    </motion.div>
  );
};

export default CreditLimitDisplay;
