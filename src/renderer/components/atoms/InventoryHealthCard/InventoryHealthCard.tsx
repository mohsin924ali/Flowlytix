/**
 * Inventory Health Card Component
 * Compact widget for displaying inventory health metrics
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Inventory Management
 * @architecture Atom Component (Atomic Design)
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Chip, useTheme, Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Inventory, Warning, CheckCircle, Error, TrendingUp, Assessment } from '@mui/icons-material';
import { motion } from 'framer-motion';

/**
 * Props interface for InventoryHealthCard
 */
export interface InventoryHealthCardProps {
  /** Total number of products */
  readonly totalProducts: number;
  /** Number of active products */
  readonly activeProducts: number;
  /** Number of low stock products */
  readonly lowStockProducts: number;
  /** Number of out of stock products */
  readonly outOfStockProducts: number;
  /** Total inventory value */
  readonly totalValue: number;
  /** Health percentage (0-100) */
  readonly healthPercentage: number;
  /** Loading state */
  readonly loading?: boolean;
  /** Card elevation */
  readonly elevation?: number;
  /** Custom styling */
  readonly sx?: object;
}

/**
 * Animation variants following Instructions naming conventions
 */
const CARD_ANIMATION_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Constants following Instructions SCREAMING_SNAKE_CASE convention
 */
const HEALTH_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 60,
  POOR: 40,
} as const;

const ANIMATION_DURATION = 0.3;

/**
 * Get health status based on percentage
 */
const getHealthStatus = (percentage: number, t: (key: string) => string) => {
  if (percentage >= HEALTH_THRESHOLDS.EXCELLENT) {
    return { label: t('inventory.health_excellent'), color: 'success', icon: CheckCircle };
  } else if (percentage >= HEALTH_THRESHOLDS.GOOD) {
    return { label: t('inventory.health_good'), color: 'success', icon: TrendingUp };
  } else if (percentage >= HEALTH_THRESHOLDS.FAIR) {
    return { label: t('inventory.health_fair'), color: 'warning', icon: Warning };
  } else if (percentage >= HEALTH_THRESHOLDS.POOR) {
    return { label: t('inventory.health_poor'), color: 'warning', icon: Warning };
  } else {
    return { label: t('inventory.health_critical'), color: 'error', icon: Error };
  }
};

/**
 * Format currency value
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * InventoryHealthCard Component
 * Displays inventory health metrics in a compact, visually appealing card
 */
export const InventoryHealthCard: React.FC<InventoryHealthCardProps> = ({
  totalProducts,
  activeProducts,
  lowStockProducts,
  outOfStockProducts,
  totalValue,
  healthPercentage,
  loading = false,
  elevation = 0,
  sx = {},
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const healthStatus = getHealthStatus(healthPercentage, t);
  const StatusIcon = healthStatus.icon;

  // Calculate derived metrics
  const criticalIssues = lowStockProducts + outOfStockProducts;
  const healthyProducts = totalProducts - criticalIssues;

  if (loading) {
    return (
      <Card elevation={elevation} sx={{ p: 2.5, textAlign: 'center', ...sx }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
          <Typography variant='body2' color='text.secondary'>
            {t('inventory.loading_inventory_data')}
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <motion.div
      variants={CARD_ANIMATION_VARIANTS}
      initial='hidden'
      animate='visible'
      transition={{ duration: ANIMATION_DURATION }}
    >
      <Card
        elevation={elevation}
        sx={{
          p: 2.5,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: 2,
          height: '100%',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4],
          },
          ...sx,
        }}
      >
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant='h6' sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Inventory color='primary' />
              {t('inventory.inventory_health')}
            </Typography>
            <Chip
              icon={<StatusIcon sx={{ fontSize: 16 }} />}
              label={healthStatus.label}
              size='small'
              color={healthStatus.color as any}
              variant='outlined'
            />
          </Box>

          {/* Health Progress Bar */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant='body2' color='text.secondary'>
                {t('inventory.overall_health')}
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 600, color: `${healthStatus.color}.main` }}>
                {healthPercentage.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={healthPercentage}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  bgcolor: `${healthStatus.color}.main`,
                },
              }}
            />
          </Box>

          {/* Key Metrics Grid */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant='h5' sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                  {totalProducts.toLocaleString()}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {t('inventory.total_products')}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant='h5' sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                  {healthyProducts.toLocaleString()}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {t('inventory.healthy_stock')}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant='h5' sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                  {lowStockProducts.toLocaleString()}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {t('inventory.low_stock')}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant='h5' sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                  {outOfStockProducts.toLocaleString()}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {t('inventory.out_of_stock')}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Total Value */}
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(81, 63, 242, 0.05)', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'between', gap: 1 }}>
              <Assessment sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' color='text.secondary'>
                  {t('inventory.total_inventory_value')}
                </Typography>
                <Typography variant='h6' sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                  {formatCurrency(totalValue)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Alerts Section */}
          {criticalIssues > 0 && (
            <Box sx={{ mt: 2 }}>
              <Chip
                icon={<Warning sx={{ fontSize: 16 }} />}
                label={t('inventory.products_need_attention', { count: criticalIssues })}
                size='small'
                color='warning'
                variant='outlined'
                sx={{ width: '100%' }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
