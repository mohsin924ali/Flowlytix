/**
 * Inventory Status Chip Component
 * Atomic component for displaying inventory status with proper visual indicators
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Product Management
 * @architecture Atom Component (Atomic Design)
 * @version 1.0.0
 */

import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Warning, TrendingDown, TrendingUp, CheckCircle } from '@mui/icons-material';

/**
 * Inventory status types
 */
export type InventoryStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK' | 'OVERSTOCKED';

/**
 * Props interface for InventoryStatusChip
 */
export interface InventoryStatusChipProps extends Omit<ChipProps, 'color' | 'icon' | 'label'> {
  readonly currentStock: number;
  readonly reorderLevel: number;
  readonly maxStockLevel?: number;
  readonly showIcon?: boolean;
  readonly variant?: 'filled' | 'outlined';
}

/**
 * Get inventory status based on stock levels
 */
const getInventoryStatus = (
  currentStock: number,
  reorderLevel: number,
  t: (key: string) => string,
  maxStockLevel?: number
): {
  status: InventoryStatus;
  label: string;
  color: 'error' | 'warning' | 'success' | 'info';
  icon: React.ElementType;
} => {
  if (currentStock === 0) {
    return {
      status: 'OUT_OF_STOCK',
      label: t('inventory.out_of_stock'),
      color: 'error',
      icon: Warning,
    };
  }

  if (currentStock <= reorderLevel) {
    return {
      status: 'LOW_STOCK',
      label: t('inventory.low_stock_alert'),
      color: 'warning',
      icon: TrendingDown,
    };
  }

  if (maxStockLevel && currentStock > maxStockLevel) {
    return {
      status: 'OVERSTOCKED',
      label: t('inventory.overstocked'),
      color: 'info',
      icon: TrendingUp,
    };
  }

  return {
    status: 'IN_STOCK',
    label: t('inventory.in_stock'),
    color: 'success',
    icon: CheckCircle,
  };
};

/**
 * InventoryStatusChip component
 */
export const InventoryStatusChip: React.FC<InventoryStatusChipProps> = ({
  currentStock,
  reorderLevel,
  maxStockLevel,
  showIcon = true,
  variant = 'filled',
  size = 'small',
  ...props
}) => {
  const { t } = useTranslation();
  const { label, color, icon: Icon } = getInventoryStatus(currentStock, reorderLevel, t, maxStockLevel);

  return (
    <Chip {...(showIcon && { icon: <Icon /> })} label={label} color={color} variant={variant} size={size} {...props} />
  );
};

export default InventoryStatusChip;
