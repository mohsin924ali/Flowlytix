/**
 * Analytics Dashboard Page - Simplified Approach
 *
 * Main analytics dashboard with comprehensive business insights.
 * Uses simplified hooks instead of heavy services.
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ButtonGroup,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  People,
  Inventory,
  AttachMoney,
  Refresh,
  DateRange,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { useSalesAnalytics, useCustomerAnalytics, useProductAnalytics } from '../hooks/useAnalytics';

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

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, color = 'primary' }) => {
  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div variants={itemVariants}>
      <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ color: `${color}.main` }}>{icon}</Box>
            {change !== undefined && (
              <Chip
                size='small'
                icon={isPositive ? <TrendingUp /> : <TrendingDown />}
                label={`${isPositive ? '+' : ''}${change.toFixed(1)}%`}
                color={isPositive ? 'success' : 'error'}
                variant='outlined'
              />
            )}
          </Box>
          <Typography variant='h4' fontWeight='bold' color='text.primary' gutterBottom>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {title}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Top Performers Component
interface TopPerformersProps {
  title: string;
  data: Array<{ name: string; value: number; percentage: number; change: number }>;
  valuePrefix?: string;
}

const TopPerformers: React.FC<TopPerformersProps> = ({ title, data, valuePrefix = '' }) => (
  <motion.div variants={itemVariants}>
    <Card>
      <CardContent>
        <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShowChart color='primary' />
          {title}
        </Typography>
        <Box sx={{ mt: 2 }}>
          {data.slice(0, 5).map((item, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant='body2' fontWeight='medium'>
                  {item.name}
                </Typography>
                <Typography variant='body2' fontWeight='bold'>
                  {valuePrefix}
                  {item.value.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress
                  variant='determinate'
                  value={item.percentage}
                  sx={{ flex: 1, height: 8, borderRadius: 4 }}
                />
                <Chip
                  size='small'
                  label={`${item.change >= 0 ? '+' : ''}${item.change}%`}
                  color={item.change >= 0 ? 'success' : 'error'}
                  variant='outlined'
                />
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  </motion.div>
);

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  // Mock agency ID - in real app, get from auth context
  const agencyId = 'agency-1';

  // Load analytics data
  const { analytics: salesAnalytics, loading: salesLoading } = useSalesAnalytics(agencyId);
  const { analytics: customerAnalytics, loading: customersLoading } = useCustomerAnalytics(agencyId);
  const { analytics: productAnalytics, loading: productsLoading } = useProductAnalytics(agencyId);

  const isLoading = salesLoading || customersLoading || productsLoading;

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <DashboardLayout title='Analytics Dashboard'>
      <Container maxWidth='xl' sx={{ py: 3 }}>
        <motion.div variants={containerVariants} initial='hidden' animate='visible'>
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4 }}>
              <Typography variant='h4' fontWeight='600' color='text.primary' gutterBottom>
                Analytics Overview
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                Comprehensive business insights and performance metrics
              </Typography>
            </Box>
          </motion.div>

          {/* Header Controls */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size='small' sx={{ minWidth: 120 }}>
                  <InputLabel>Time Range</InputLabel>
                  <Select value={timeRange} label='Time Range' onChange={(e) => setTimeRange(e.target.value)}>
                    <MenuItem value='7d'>Last 7 days</MenuItem>
                    <MenuItem value='30d'>Last 30 days</MenuItem>
                    <MenuItem value='90d'>Last 3 months</MenuItem>
                    <MenuItem value='1y'>Last year</MenuItem>
                  </Select>
                </FormControl>

                <ButtonGroup size='small'>
                  <Button startIcon={<DateRange />}>Custom Range</Button>
                </ButtonGroup>
              </Box>

              <IconButton onClick={handleRefresh} disabled={refreshing || isLoading} color='primary'>
                <Refresh sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </Box>
          </motion.div>

          {isLoading ? (
            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress />
            </Box>
          ) : null}

          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title='Total Sales'
                value={formatCurrency(salesAnalytics?.totalSales || 0)}
                change={salesAnalytics?.growthRate || 0}
                icon={<AttachMoney fontSize='large' />}
                color='success'
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title='Total Orders'
                value={salesAnalytics?.totalOrders || 0}
                change={8.2}
                icon={<ShowChart fontSize='large' />}
                color='primary'
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title='Active Customers'
                value={customerAnalytics?.activeCustomers || 0}
                change={5.7}
                icon={<People fontSize='large' />}
                color='secondary'
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title='Products in Stock'
                value={productAnalytics?.activeProducts || 0}
                change={-2.1}
                icon={<Inventory fontSize='large' />}
                color='warning'
              />
            </Grid>
          </Grid>

          {/* Secondary Metrics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title='Average Order Value'
                value={formatCurrency(salesAnalytics?.averageOrderValue || 0)}
                change={3.4}
                icon={<TrendingUp fontSize='large' />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title='Customer Lifetime Value'
                value={formatCurrency(customerAnalytics?.averageLifetimeValue || 0)}
                change={12.8}
                icon={<People fontSize='large' />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title='Inventory Value'
                value={formatCurrency(productAnalytics?.totalInventoryValue || 0)}
                change={6.3}
                icon={<Inventory fontSize='large' />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title='Churn Rate'
                value={`${customerAnalytics?.churnRate?.toFixed(1) || 0}%`}
                change={-1.2}
                icon={<TrendingDown fontSize='large' />}
                color='error'
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          {/* Top Performers */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TopPerformers title='Top Products by Sales' data={salesAnalytics?.topProducts || []} valuePrefix='$' />
            </Grid>
            <Grid item xs={12} md={4}>
              <TopPerformers title='Top Customers by Value' data={salesAnalytics?.topCustomers || []} valuePrefix='$' />
            </Grid>
            <Grid item xs={12} md={4}>
              <TopPerformers
                title='Top Products by Margin'
                data={productAnalytics?.topProductsByMargin || []}
                valuePrefix=''
              />
            </Grid>
          </Grid>

          {/* Payment Methods & Regions */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>
                      Payment Methods Distribution
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {salesAnalytics?.paymentMethods?.map((method, index) => (
                        <Box key={index} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant='body2'>{method.method}</Typography>
                            <Typography variant='body2' fontWeight='bold'>
                              {method.percentage.toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant='determinate'
                            value={method.percentage}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={6}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>
                      Sales by Region
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {salesAnalytics?.salesByRegion?.map((region, index) => (
                        <Box key={index} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant='body2'>{region.region}</Typography>
                            <Typography variant='body2' fontWeight='bold'>
                              ${region.sales.toLocaleString()}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant='determinate'
                            value={region.percentage}
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
        </motion.div>

        <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      </Container>
    </DashboardLayout>
  );
};
