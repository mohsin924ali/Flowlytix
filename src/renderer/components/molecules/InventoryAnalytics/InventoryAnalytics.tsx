/**
 * Inventory Analytics Component
 * Comprehensive inventory analytics and insights dashboard
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Product Management
 * @architecture Molecule Component (Atomic Design)
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  useTheme,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  TrendingUp,
  TrendingDown,
  Warning,
  AttachMoney,
  Category,
  Assessment,
  Star,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { ProductService, Product, ProductCategory, ProductStatus } from '../../../services/ProductService';
import { InventoryStatusChip } from '../../atoms';

/**
 * Props interface for InventoryAnalytics
 */
export interface InventoryAnalyticsProps {
  readonly agencyId: string;
  readonly refreshTrigger?: number; // Used to trigger refresh from parent
}

/**
 * Analytics data interface
 */
interface AnalyticsData {
  readonly totalProducts: number;
  readonly activeProducts: number;
  readonly lowStockProducts: number;
  readonly outOfStockProducts: number;
  readonly totalStockValue: number;
  readonly averageSellingPrice: number;
  readonly topProductsByValue: Product[];
  readonly productsByCategory: Record<ProductCategory, number>;
  readonly productsByStatus: Record<ProductStatus, number>;
}

/**
 * Animation variants
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Metric card component
 */
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  progress?: number;
}> = ({ title, value, subtitle, icon: Icon, color, trend, progress }) => {
  const theme = useTheme();

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp sx={{ color: 'success.main', fontSize: 16 }} />;
      case 'down':
        return <TrendingDown sx={{ color: 'error.main', fontSize: 16 }} />;
      default:
        return null;
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Icon sx={{ color, fontSize: 32 }} />
            {getTrendIcon()}
          </Box>

          <Typography variant='h4' sx={{ fontWeight: 700, color, mb: 0.5 }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>

          <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
            {title}
          </Typography>

          {subtitle && (
            <Typography variant='caption' color='text.secondary'>
              {subtitle}
            </Typography>
          )}

          {progress !== undefined && (
            <LinearProgress
              variant='determinate'
              value={progress}
              sx={{
                mt: 1,
                height: 6,
                borderRadius: 3,
                bgcolor: `${color}20`,
                '& .MuiLinearProgress-bar': {
                  bgcolor: color,
                },
              }}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Category breakdown component
 */
const CategoryBreakdown: React.FC<{
  productsByCategory: Record<ProductCategory, number>;
  totalProducts: number;
}> = ({ productsByCategory, totalProducts }) => {
  const theme = useTheme();

  const sortedCategories = Object.entries(productsByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8); // Show top 8 categories

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Category color='primary' />
            Products by Category
          </Typography>

          <List dense>
            {sortedCategories.map(([category, count]) => {
              const percentage = totalProducts > 0 ? (count / totalProducts) * 100 : 0;

              return (
                <ListItem key={category} sx={{ px: 0 }}>
                  <ListItemText
                    primary={category.replace('_', ' ')}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <LinearProgress
                          variant='determinate'
                          value={percentage}
                          sx={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: 'grey.200',
                          }}
                        />
                        <Typography variant='caption' sx={{ minWidth: 40 }}>
                          {count} ({percentage.toFixed(1)}%)
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Top products component
 */
const TopProducts: React.FC<{
  topProducts: Product[];
}> = ({ topProducts }) => {
  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Star color='primary' />
            Top Products by Value
          </Typography>

          <List dense>
            {topProducts.slice(0, 5).map((product, index) => {
              const stockValue = product.currentStock * product.costPrice;

              return (
                <ListItem key={product.id} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Chip
                      label={index + 1}
                      size='small'
                      color={index === 0 ? 'primary' : 'default'}
                      sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {product.name}
                        </Typography>
                        <Typography variant='body2' sx={{ color: 'success.main', fontWeight: 600 }}>
                          ${stockValue.toLocaleString()}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant='caption' color='text.secondary'>
                          {product.sku} • Stock: {product.currentStock}
                        </Typography>
                        <InventoryStatusChip
                          currentStock={product.currentStock}
                          reorderLevel={product.reorderLevel}
                          maxStockLevel={product.maxStockLevel}
                          size='small'
                          variant='outlined'
                        />
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Status breakdown component
 */
const StatusBreakdown: React.FC<{
  productsByStatus: Record<ProductStatus, number>;
  totalProducts: number;
}> = ({ productsByStatus, totalProducts }) => {
  const getStatusColor = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return 'success.main';
      case ProductStatus.INACTIVE:
        return 'warning.main';
      case ProductStatus.DISCONTINUED:
        return 'error.main';
      case ProductStatus.PENDING_APPROVAL:
        return 'info.main';
      case ProductStatus.OUT_OF_STOCK:
        return 'error.main';
      default:
        return 'grey.500';
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment color='primary' />
            Products by Status
          </Typography>

          <Grid container spacing={2}>
            {Object.entries(productsByStatus).map(([status, count]) => {
              const percentage = totalProducts > 0 ? (count / totalProducts) * 100 : 0;

              return (
                <Grid item xs={6} key={status}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant='h5' sx={{ fontWeight: 700, color: getStatusColor(status as ProductStatus) }}>
                      {count}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                      {status.replace('_', ' ')}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      ({percentage.toFixed(1)}%)
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Main InventoryAnalytics component
 */
export const InventoryAnalytics: React.FC<InventoryAnalyticsProps> = ({ agencyId, refreshTrigger = 0 }) => {
  const theme = useTheme();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load analytics data
   */
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await ProductService.getProductAnalytics(agencyId);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory analytics');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  /**
   * Load analytics on mount and when refresh trigger changes
   */
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, refreshTrigger]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert severity='info' sx={{ mb: 2 }}>
        No analytics data available.
      </Alert>
    );
  }

  const stockHealthPercentage =
    analytics.totalProducts > 0
      ? ((analytics.totalProducts - analytics.outOfStockProducts - analytics.lowStockProducts) /
          analytics.totalProducts) *
        100
      : 0;

  return (
    <motion.div variants={containerVariants} initial='hidden' animate='visible'>
      <Box sx={{ mb: 3 }}>
        <Typography variant='h5' sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon color='primary' />
          Inventory Analytics
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Comprehensive insights into your inventory performance and health
        </Typography>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title='Total Products'
            value={analytics.totalProducts}
            icon={InventoryIcon}
            color={theme.palette.primary.main}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title='Stock Health'
            value={`${stockHealthPercentage.toFixed(1)}%`}
            subtitle={`${analytics.totalProducts - analytics.outOfStockProducts - analytics.lowStockProducts} products healthy`}
            icon={Assessment}
            color={
              stockHealthPercentage >= 80
                ? theme.palette.success.main
                : stockHealthPercentage >= 60
                  ? theme.palette.warning.main
                  : theme.palette.error.main
            }
            progress={stockHealthPercentage}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title='Total Stock Value'
            value={`$${analytics.totalStockValue.toLocaleString()}`}
            subtitle='Current inventory worth'
            icon={AttachMoney}
            color={theme.palette.success.main}
            trend='up'
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title='Avg. Selling Price'
            value={`$${analytics.averageSellingPrice.toFixed(2)}`}
            subtitle='Across all products'
            icon={TrendingUp}
            color={theme.palette.info.main}
          />
        </Grid>
      </Grid>

      {/* Alert Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <MetricCard
            title='Out of Stock'
            value={analytics.outOfStockProducts}
            subtitle='Requires immediate attention'
            icon={Warning}
            color={theme.palette.error.main}
            trend={analytics.outOfStockProducts > 0 ? 'down' : 'neutral'}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <MetricCard
            title='Low Stock'
            value={analytics.lowStockProducts}
            subtitle='Below reorder level'
            icon={TrendingDown}
            color={theme.palette.warning.main}
            trend={analytics.lowStockProducts > 0 ? 'down' : 'neutral'}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <MetricCard
            title='Active Products'
            value={analytics.activeProducts}
            subtitle={`${((analytics.activeProducts / analytics.totalProducts) * 100).toFixed(1)}% of total`}
            icon={TrendingUp}
            color={theme.palette.success.main}
            progress={(analytics.activeProducts / analytics.totalProducts) * 100}
          />
        </Grid>
      </Grid>

      {/* Detailed Analytics */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <CategoryBreakdown
            productsByCategory={analytics.productsByCategory}
            totalProducts={analytics.totalProducts}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TopProducts topProducts={analytics.topProductsByValue} />
        </Grid>

        <Grid item xs={12}>
          <StatusBreakdown productsByStatus={analytics.productsByStatus} totalProducts={analytics.totalProducts} />
        </Grid>
      </Grid>
    </motion.div>
  );
};
