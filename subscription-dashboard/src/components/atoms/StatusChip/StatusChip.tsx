/**
 * StatusChip Component
 * Reusable chip component for displaying various statuses
 * Following Instructions file standards with atomic design
 */

import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { SubscriptionStatus, DeviceStatus, CustomerStatus } from '@/types';

// Styled chip variants
const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'statusVariant',
})<{ statusVariant?: StatusVariant }>(({ theme, statusVariant }) => {
  const getStatusColor = () => {
    switch (statusVariant) {
      case 'active':
        return {
          backgroundColor: theme.palette.success.light,
          color: theme.palette.success.dark,
          border: `1px solid ${theme.palette.success.main}`,
        };
      case 'expired':
      case 'inactive':
        return {
          backgroundColor: theme.palette.error.light,
          color: theme.palette.error.dark,
          border: `1px solid ${theme.palette.error.main}`,
        };
      case 'suspended':
        return {
          backgroundColor: theme.palette.warning.light,
          color: theme.palette.warning.dark,
          border: `1px solid ${theme.palette.warning.main}`,
        };
      case 'cancelled':
      case 'revoked':
        return {
          backgroundColor: theme.palette.grey[100],
          color: theme.palette.grey[700],
          border: `1px solid ${theme.palette.grey[400]}`,
        };
      case 'pending':
        return {
          backgroundColor: theme.palette.info.light,
          color: theme.palette.info.dark,
          border: `1px solid ${theme.palette.info.main}`,
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

// Status variant type
type StatusVariant =
  | SubscriptionStatus
  | DeviceStatus
  | CustomerStatus
  | 'active'
  | 'inactive'
  | 'expired'
  | 'suspended'
  | 'cancelled'
  | 'pending'
  | 'revoked';

// Status display labels
const STATUS_LABELS: Record<StatusVariant, string> = {
  active: 'Active',
  inactive: 'Inactive',
  expired: 'Expired',
  suspended: 'Suspended',
  cancelled: 'Cancelled',
  pending: 'Pending',
  revoked: 'Revoked',
  deleted: 'Deleted',
};

// Component props
export interface StatusChipProps extends Omit<ChipProps, 'variant'> {
  status: StatusVariant;
  showIcon?: boolean;
  'data-testid'?: string;
}

/**
 * StatusChip Component
 * Displays status with appropriate color coding and styling
 */
export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  showIcon = false,
  'data-testid': testId,
  ...chipProps
}) => {
  const label = STATUS_LABELS[status] || status;

  return (
    <StyledChip
      label={label}
      statusVariant={status}
      size='small'
      data-testid={testId || `status-chip-${status}`}
      {...chipProps}
    />
  );
};

// Default export
export default StatusChip;
