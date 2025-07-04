/**
 * Product Analytics Page - Product Performance & Inventory Insights
 *
 * Detailed product analytics with inventory management, performance metrics, and optimization insights.
 * Uses simplified hooks approach.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  ButtonGroup,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Inventory,
  TrendingUp,
  TrendingDown,
  Assessment,
  MonetizationOn,
  Warning,
  Category,
  Speed,
  PriceChange,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { useProductAnalytics } from '../hooks/useAnalytics';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role='tabpanel' hidden={value !== index} style={{ paddingTop: '24px' }}>
    {value === index && children}
  </div>
);

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, color = 'primary' }) => (
  <motion.div variants={itemVariants}>
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ color: `${color}.main` }}>{icon}</Box>
          {change !== undefined && (
            <Chip
              size='small'
              icon={change >= 0 ? <TrendingUp /> : <TrendingDown />}
              label={`${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
              color={change >= 0 ? 'success' : 'error'}
              variant='outlined'
            />
          )}
        </Box>
        <Typography variant='h4' fontWeight='bold' gutterBottom>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          {title}
        </Typography>
      </CardContent>
    </Card>
  </motion.div>
);

export const ProductAnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState(0);

  // Mock agency ID
  const agencyId = 'agency-1';

  // Load product analytics
  const { analytics, loading, error } = useProductAnalytics(agencyId);

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <DashboardLayout title={t('analytics.product_analytics')}>
      <Container maxWidth='xl' sx={{ py: 3 }}>
        <motion.div variants={containerVariants} initial='hidden' animate='visible'>
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4 }}>
              <Typography variant='h4' fontWeight='600' color='text.primary' gutterBottom>
                {t('analytics.product_analytics')}
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                {t('analytics.product_performance_insights')}
              </Typography>
            </Box>
          </motion.div>

          {/* Header Controls */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box />
              <ButtonGroup size='small'>
                <Button variant={timeRange === '7d' ? 'contained' : 'outlined'} onClick={() => setTimeRange('7d')}>
                  {t('analytics.last_7_days')}
                </Button>
                <Button variant={timeRange === '30d' ? 'contained' : 'outlined'} onClick={() => setTimeRange('30d')}>
                  {t('analytics.last_30_days')}
                </Button>
                <Button variant={timeRange === '90d' ? 'contained' : 'outlined'} onClick={() => setTimeRange('90d')}>
                  {t('analytics.last_90_days')}
                </Button>
              </ButtonGroup>
            </Box>
          </motion.div>

          {/* Key Product Metrics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title={t('analytics.total_products')}
                value={analytics?.totalProducts || 0}
                change={2.4}
                icon={<Inventory fontSize='large' />}
                color='primary'
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title={t('analytics.active_products')}
                value={analytics?.activeProducts || 0}
                change={1.8}
                icon={<Assessment fontSize='large' />}
                color='success'
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title={t('analytics.low_stock_products')}
                value={analytics?.lowStockProducts || 0}
                change={-12.3}
                icon={<Warning fontSize='large' />}
                color='warning'
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title={t('analytics.out_of_stock')}
                value={analytics?.outOfStockProducts || 0}
                change={-8.7}
                icon={<TrendingDown fontSize='large' />}
                color='error'
              />
            </Grid>
          </Grid>

          {/* Inventory Value */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MonetizationOn color='success' />
                      Inventory Value
                    </Typography>
                    <Box sx={{ textAlign: 'center', mt: 3 }}>
                      <Typography variant='h3' fontWeight='bold' color='success.main'>
                        {formatCurrency(analytics?.totalInventoryValue || 0)}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Total Inventory Value
                      </Typography>
                      <Chip
                        icon={<TrendingUp />}
                        label='+6.3% vs last month'
                        color='success'
                        size='small'
                        sx={{ mt: 2 }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={8}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Category color='primary' />
                      Category Performance
                    </Typography>
                    <Box sx={{ mt: 3 }}>
                      {analytics?.categoryPerformance?.slice(0, 5).map((category, index) => (
                        <Box key={index} sx={{ mb: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant='body2' fontWeight='medium'>
                              {category.category}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography variant='body2'>{formatCurrency(category.sales)}</Typography>
                              <Chip
                                size='small'
                                label={`${category.margin.toFixed(1)}% margin`}
                                variant='outlined'
                                color='secondary'
                              />
                            </Box>
                          </Box>
                          <LinearProgress
                            variant='determinate'
                            value={(category.sales / (analytics?.categoryPerformance?.[0]?.sales || 1)) * 100}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>

          {/* Top Products Summary */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom>
                  Top Performing Products
                </Typography>
                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant='subtitle2' gutterBottom>
                      Top Products by Sales
                    </Typography>
                    {analytics?.topProductsBySales?.slice(0, 5).map((product, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant='body2' fontWeight='medium'>
                            {product.name}
                          </Typography>
                          <Typography variant='body2' fontWeight='bold'>
                            {formatCurrency(product.value)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={product.percentage}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    ))}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant='subtitle2' gutterBottom>
                      Inventory Insights
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                      <Typography variant='body2' color='text.secondary'>
                        <strong>{analytics?.lowStockProducts || 0}</strong> products need restocking
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'error.50', borderRadius: 1, mb: 2 }}>
                      <Typography variant='body2' color='error.dark'>
                        <strong>{analytics?.outOfStockProducts || 0}</strong> products out of stock
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                      <Typography variant='body2' color='success.dark'>
                        <strong>
                          {(((analytics?.activeProducts || 0) / (analytics?.totalProducts || 1)) * 100).toFixed(1)}%
                        </strong>{' '}
                        products actively selling
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </Container>
    </DashboardLayout>
  );
};
