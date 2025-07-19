/**
 * PaymentStatusChip Component
 * Specialized chip component for displaying payment statuses
 * Following Instructions file standards with atomic design
 */

import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { CheckCircle, AccessTime, Error, Block, Replay, Cancel, MonetizationOn, Refresh } from '@mui/icons-material';
import { PaymentStatus } from '@/types';

// Styled chip variants
const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'paymentStatus',
})<{ paymentStatus?: PaymentStatus }>(({ theme, paymentStatus }) => {
  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'completed':
        return {
          backgroundColor: theme.palette.success.light,
          color: theme.palette.success.dark,
          border: `1px solid ${theme.palette.success.main}`,
        };
      case 'pending':
      case 'processing':
        return {
          backgroundColor: theme.palette.info.light,
          color: theme.palette.info.dark,
          border: `1px solid ${theme.palette.info.main}`,
        };
      case 'failed':
        return {
          backgroundColor: theme.palette.error.light,
          color: theme.palette.error.dark,
          border: `1px solid ${theme.palette.error.main}`,
        };
      case 'cancelled':
        return {
          backgroundColor: theme.palette.grey[100],
          color: theme.palette.grey[700],
          border: `1px solid ${theme.palette.grey[400]}`,
        };
      case 'refunded':
      case 'partially_refunded':
        return {
          backgroundColor: theme.palette.warning.light,
          color: theme.palette.warning.dark,
          border: `1px solid ${theme.palette.warning.main}`,
        };
      case 'expired':
        return {
          backgroundColor: theme.palette.error.light,
          color: theme.palette.error.dark,
          border: `1px solid ${theme.palette.error.main}`,
        };
      default:
        return {
          backgroundColor: theme.palette.grey[100],
          color: theme.palette.grey[700],
          border: `1px solid ${theme.palette.grey[400]}`,
        };
    }
  };

  return {
    fontWeight: 600,
    fontSize: '0.75rem',
    height: '24px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    ...getStatusColor(),
  };
});

// Status display labels
const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partial Refund',
  expired: 'Expired',
};

// Status icons
const STATUS_ICONS: Record<PaymentStatus, React.ComponentType> = {
  pending: AccessTime,
  processing: Refresh,
  completed: CheckCircle,
  failed: Error,
  cancelled: Cancel,
  refunded: Replay,
  partially_refunded: MonetizationOn,
  expired: Block,
};

// Component props
export interface PaymentStatusChipProps extends Omit<ChipProps, 'variant'> {
  status: PaymentStatus;
  showIcon?: boolean;
  'data-testid'?: string;
}

/**
 * PaymentStatusChip Component
 * Displays payment status with appropriate color coding and styling
 */
export const PaymentStatusChip: React.FC<PaymentStatusChipProps> = ({
  status,
  showIcon = false,
  'data-testid': testId,
  ...chipProps
}) => {
  const label = STATUS_LABELS[status] || status;
  const IconComponent = STATUS_ICONS[status];

  const iconProps = showIcon && IconComponent ? { icon: <IconComponent /> } : {};

  return (
    <StyledChip
      label={label}
      paymentStatus={status}
      size='small'
      data-testid={testId || `payment-status-chip-${status}`}
      {...iconProps}
      {...chipProps}
    />
  );
};

// Default export
export default PaymentStatusChip;
