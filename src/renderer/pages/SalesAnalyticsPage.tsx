/**
 * Sales Analytics Page - Specialized Sales Insights
 *
 * Detailed sales analytics with trends, forecasting, and performance metrics.
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
  ButtonGroup,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { TrendingUp, TrendingDown, BarChart, Timeline, Assessment, MonetizationOn } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { useSalesAnalytics } from '../hooks/useAnalytics';

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

export const SalesAnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState(0);

  // Mock agency ID
  const agencyId = 'agency-1';

  // Load sales analytics
  const { analytics, loading, error } = useSalesAnalytics(agencyId);

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <DashboardLayout title={t('analytics.sales_analytics')}>
      <Container maxWidth='xl' sx={{ py: 3 }}>
        <motion.div variants={containerVariants} initial='hidden' animate='visible'>
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4 }}>
              <Typography variant='h4' fontWeight='600' color='text.primary' gutterBottom>
                {t('analytics.sales_analytics')}
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                {t('analytics.detailed_sales_analytics')}
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

          {loading && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress />
            </Box>
          )}

          {/* Key Sales Metrics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <MonetizationOn color='success' fontSize='large' />
                      <Chip
                        icon={<TrendingUp />}
                        label={`+${analytics?.growthRate || 0}%`}
                        color='success'
                        size='small'
                      />
                    </Box>
                    <Typography variant='h4' fontWeight='bold' gutterBottom>
                      {formatCurrency(analytics?.totalSales || 0)}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {t('analytics.total_sales_revenue')}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <BarChart color='primary' fontSize='large' />
                      <Chip icon={<TrendingUp />} label='+8.2%' color='success' size='small' />
                    </Box>
                    <Typography variant='h4' fontWeight='bold' gutterBottom>
                      {analytics?.totalOrders?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {t('analytics.total_orders')}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Assessment color='secondary' fontSize='large' />
                      <Chip icon={<TrendingUp />} label='+3.4%' color='success' size='small' />
                    </Box>
                    <Typography variant='h4' fontWeight='bold' gutterBottom>
                      {formatCurrency(analytics?.averageOrderValue || 0)}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {t('analytics.average_order_value')}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Timeline color='warning' fontSize='large' />
                      <Chip icon={<TrendingUp />} label='+5.7%' color='success' size='small' />
                    </Box>
                    <Typography variant='h4' fontWeight='bold' gutterBottom>
                      {analytics?.uniqueCustomers?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {t('analytics.unique_customers')}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>

          {/* Detailed Analytics Tabs */}
          <motion.div variants={itemVariants}>
            <Card>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                  <Tab label='Sales Trends' />
                  <Tab label='Top Products' />
                  <Tab label='Top Customers' />
                  <Tab label='Payment Analysis' />
                </Tabs>
              </Box>

              {/* Sales Trends Tab */}
              <TabPanel value={activeTab} index={0}>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    Sales Performance Over Time
                  </Typography>
                  <Box sx={{ mt: 3 }}>
                    {analytics?.timeSeries?.map((dataPoint, index) => (
                      <Box key={index} sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant='body2'>{new Date(dataPoint.date).toLocaleDateString()}</Typography>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography variant='body2' fontWeight='bold'>
                              {formatCurrency(dataPoint.sales)}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {dataPoint.orders} orders
                            </Typography>
                          </Box>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={(dataPoint.sales / (analytics?.totalSales || 1)) * 100}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </TabPanel>

              {/* Top Products Tab */}
              <TabPanel value={activeTab} index={1}>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    Best Performing Products
                  </Typography>
                  <TableContainer component={Paper} elevation={0}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell align='right'>Sales</TableCell>
                          <TableCell align='right'>Percentage</TableCell>
                          <TableCell align='right'>Growth</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics?.topProducts?.map((product, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant='body2' fontWeight='medium'>
                                {product.name}
                              </Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography variant='body2' fontWeight='bold'>
                                {formatCurrency(product.value)}
                              </Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography variant='body2'>{product.percentage.toFixed(1)}%</Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Chip
                                size='small'
                                icon={product.change >= 0 ? <TrendingUp /> : <TrendingDown />}
                                label={`${product.change >= 0 ? '+' : ''}${product.change}%`}
                                color={product.change >= 0 ? 'success' : 'error'}
                                variant='outlined'
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </TabPanel>

              {/* Top Customers Tab */}
              <TabPanel value={activeTab} index={2}>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    Top Customers by Revenue
                  </Typography>
                  <TableContainer component={Paper} elevation={0}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Customer</TableCell>
                          <TableCell align='right'>Revenue</TableCell>
                          <TableCell align='right'>Percentage</TableCell>
                          <TableCell align='right'>Growth</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics?.topCustomers?.map((customer, index) => (
                          <TableRow key={index}>
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
              </TabPanel>

              {/* Payment Analysis Tab */}
              <TabPanel value={activeTab} index={3}>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    Payment Methods & Regional Analysis
                  </Typography>
                  <Grid container spacing={3} sx={{ mt: 2 }}>
                    <Grid item xs={12} md={6}>
                      <Typography variant='subtitle2' gutterBottom>
                        Payment Methods Distribution
                      </Typography>
                      {analytics?.paymentMethods?.map((method, index) => (
                        <Box key={index} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant='body2'>{method.method}</Typography>
                            <Typography variant='body2' fontWeight='bold'>
                              {formatCurrency(method.value)}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant='determinate'
                            value={method.percentage}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      ))}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant='subtitle2' gutterBottom>
                        Sales by Region
                      </Typography>
                      {analytics?.salesByRegion?.map((region, index) => (
                        <Box key={index} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant='body2'>{region.region}</Typography>
                            <Typography variant='body2' fontWeight='bold'>
                              {formatCurrency(region.sales)}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant='determinate'
                            value={region.percentage}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      ))}
                    </Grid>
                  </Grid>
                </CardContent>
              </TabPanel>
            </Card>
          </motion.div>
        </motion.div>
      </Container>
    </DashboardLayout>
  );
};
