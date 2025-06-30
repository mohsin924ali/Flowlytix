/**
 * Customer Analytics Page - Customer Behavior & Insights
 *
 * Detailed customer analytics with segmentation, retention, and lifetime value analysis.
 * Uses simplified hooks approach.
 */

import React, { useState } from 'react';
import {
  Box,
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
} from '@mui/material';
import {
  People,
  PersonAdd,
  TrendingUp,
  TrendingDown,
  Star,
  Timeline,
  PieChart,
  AttachMoney,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { useCustomerAnalytics } from '../hooks/useAnalytics';

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

export const CustomerAnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');

  // Mock agency ID
  const agencyId = 'agency-1';

  // Load customer analytics
  const { analytics, loading, error } = useCustomerAnalytics(agencyId);

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <DashboardLayout title='Customer Analytics'>
      <motion.div variants={containerVariants} initial='hidden' animate='visible'>
        {/* Header */}
        <motion.div variants={itemVariants}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='h5' fontWeight='bold'>
              Customer Behavior Analysis
            </Typography>
            <ButtonGroup size='small'>
              <Button variant={timeRange === '7d' ? 'contained' : 'outlined'} onClick={() => setTimeRange('7d')}>
                7 Days
              </Button>
              <Button variant={timeRange === '30d' ? 'contained' : 'outlined'} onClick={() => setTimeRange('30d')}>
                30 Days
              </Button>
              <Button variant={timeRange === '90d' ? 'contained' : 'outlined'} onClick={() => setTimeRange('90d')}>
                90 Days
              </Button>
            </ButtonGroup>
          </Box>
        </motion.div>

        {/* Key Customer Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title='Total Customers'
              value={analytics?.totalCustomers || 0}
              change={8.5}
              icon={<People fontSize='large' />}
              color='primary'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title='Active Customers'
              value={analytics?.activeCustomers || 0}
              change={5.7}
              icon={<Star fontSize='large' />}
              color='success'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title='New Customers'
              value={analytics?.newCustomers || 0}
              change={12.3}
              icon={<PersonAdd fontSize='large' />}
              color='secondary'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title='Churn Rate'
              value={`${analytics?.churnRate?.toFixed(1) || 0}%`}
              change={-1.2}
              icon={<TrendingDown fontSize='large' />}
              color='error'
            />
          </Grid>
        </Grid>

        {/* Customer Lifetime Value */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoney color='success' />
                    Customer Lifetime Value
                  </Typography>
                  <Box sx={{ mt: 3 }}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      <Typography variant='h3' fontWeight='bold' color='success.main'>
                        {formatCurrency(analytics?.averageLifetimeValue || 0)}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Average Customer Lifetime Value
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant='subtitle2' gutterBottom>
                      Customer Segments by Value
                    </Typography>
                    {analytics?.customerSegments?.map((segment, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant='body2' fontWeight='medium'>
                            {segment.segment}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant='body2'>{segment.count} customers</Typography>
                            <Chip size='small' label={formatCurrency(segment.averageValue)} variant='outlined' />
                          </Box>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={segment.percentage}
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
                  <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Timeline color='primary' />
                    Customer Retention Rates
                  </Typography>
                  <Box sx={{ mt: 3 }}>
                    {analytics?.retentionRates?.map((retention, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant='body2'>{retention.month}</Typography>
                          <Typography variant='body2' fontWeight='bold'>
                            {retention.rate.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={retention.rate}
                          sx={{ height: 8, borderRadius: 4 }}
                          color={retention.rate >= 90 ? 'success' : retention.rate >= 80 ? 'warning' : 'error'}
                        />
                      </Box>
                    ))}
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant='body2' color='text.secondary'>
                        Average retention rate: <strong>91.8%</strong>
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Top Customers */}
        <motion.div variants={itemVariants}>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star color='primary' />
                Top Customers by Revenue
              </Typography>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell align='right'>Total Revenue</TableCell>
                      <TableCell align='right'>Revenue Share</TableCell>
                      <TableCell align='right'>Growth</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics?.topCustomersByValue?.map((customer, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip
                            size='small'
                            label={`#${index + 1}`}
                            color={index === 0 ? 'primary' : index === 1 ? 'secondary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' fontWeight='medium'>
                            {customer.name}
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' fontWeight='bold'>
                            {formatCurrency(customer.value)}
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2'>{customer.percentage.toFixed(1)}%</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Chip
                            size='small'
                            icon={customer.change >= 0 ? <TrendingUp /> : <TrendingDown />}
                            label={`${customer.change >= 0 ? '+' : ''}${customer.change}%`}
                            color={customer.change >= 0 ? 'success' : 'error'}
                            variant='outlined'
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Regional Distribution */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChart color='secondary' />
                Customer Distribution by Region
              </Typography>
              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={8}>
                  <Box>
                    {analytics?.customersByRegion?.map((region, index) => (
                      <Box key={index} sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant='body1' fontWeight='medium'>
                            {region.region}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant='body2'>{region.customers} customers</Typography>
                            <Typography variant='body2' fontWeight='bold'>
                              {region.percentage.toFixed(1)}%
                            </Typography>
                          </Box>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={region.percentage}
                          sx={{ height: 12, borderRadius: 6 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, height: 'fit-content' }}>
                    <Typography variant='subtitle2' gutterBottom>
                      Regional Insights
                    </Typography>
                    <Typography variant='body2' color='text.secondary' paragraph>
                      California leads with the highest customer concentration, representing 40% of our customer base.
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Texas and New York show strong growth potential with expanding market presence.
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};
