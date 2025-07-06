/**
 * Dashboard Page Component
 * Main dashboard after successful authentication
 * Following Atomic Design principles with professional styling
 * Enhanced with comprehensive analytics and real-time insights
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Grid,
  Typography,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  useTheme,
  Box,
  Paper,
  Avatar,
  Divider,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Inventory,
  ShoppingCart,
  WavingHand,
  Business,
  LocationOn,
  Phone,
  Email,
  Add,
  Analytics,
  Assignment,
  Settings,
  AttachMoney,
  Warning,
  CheckCircle,
  AccessTime,
  Person,
  Store,
  Assessment,
  Timeline,
  PieChart,
  BarChart,
  Refresh,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { DigitalClock, InventoryHealthCard } from '../components/atoms';
import { useAuthStore } from '../store/auth.store';
import { useAgencyStore } from '../store/agency.store';
import { useSalesAnalytics, useCustomerAnalytics, useProductAnalytics } from '../hooks/useAnalytics';

/**
 * Dashboard stats interface
 */
interface DashboardStat {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
}

/**
 * Recent activity interface
 */
interface RecentActivity {
  id: string;
  type: 'ORDER' | 'CUSTOMER' | 'PRODUCT' | 'PAYMENT';
  title: string;
  description: string;
  timestamp: Date;
  user: string;
  status: 'SUCCESS' | 'PENDING' | 'ERROR';
}

/**
 * Dashboard constants following Instructions naming conventions
 */
const DASHBOARD_REFRESH_INTERVAL = 300000; // 5 minutes (reduced from 30 seconds)
const ANIMATION_DURATION = 0.3;
const STAGGER_DELAY = 0.1;

/**
 * Animation variants
 */
const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION,
      staggerChildren: STAGGER_DELAY,
    },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Welcome Clock Component
 * Beautiful digital clock for the welcome banner
 */
const WelcomeClock: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1,
      }}
    >
      <DigitalClock size='small' color='primary' />
    </Box>
  );
};

/**
 * Professional Welcome Component
 * Following Instructions file standards with proper internationalization
 */
const WelcomeSection: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuthStore();
  const { currentAgency } = useAgencyStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('time.morning');
    if (hour < 17) return t('time.afternoon');
    return t('time.evening');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'inactive':
        return theme.palette.warning.main;
      case 'suspended':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 3,
        background: 'linear-gradient(135deg, rgba(81, 63, 242, 0.08) 0%, rgba(107, 82, 245, 0.06) 100%)',
        border: '1px solid rgba(81, 63, 242, 0.15)',
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <WelcomeClock />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, position: 'relative', zIndex: 1 }}>
        <Avatar
          sx={{
            bgcolor: theme.palette.primary.main,
            width: 48,
            height: 48,
            fontSize: '1.25rem',
            fontWeight: 600,
          }}
        >
          {user?.firstName?.charAt(0) || 'U'}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant='h5'
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5,
            }}
          >
            {getGreeting()}, {user?.firstName || 'User'}! <WavingHand sx={{ color: '#ffa726', ml: 1 }} />
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {t('dashboard.welcome')}
          </Typography>
        </Box>
      </Box>

      {currentAgency && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Business color='primary' fontSize='small' />
              <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                {currentAgency.name}
              </Typography>
              <Chip
                label={currentAgency.status}
                size='small'
                sx={{
                  height: 20,
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  backgroundColor: `${getStatusColor(currentAgency.status)}20`,
                  color: getStatusColor(currentAgency.status),
                  border: `1px solid ${getStatusColor(currentAgency.status)}40`,
                }}
              />
            </Box>
          </Box>

          {currentAgency.contactPerson && (
            <Box sx={{ mt: 1, position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People fontSize='small' color='action' />
                <Typography variant='body2' color='text.secondary'>
                  {t('common.contact')}: {currentAgency.contactPerson}
                </Typography>
              </Box>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

/**
 * Quick Actions Component
 * Following Instructions file standards with proper internationalization
 */
const QuickActions: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const actions = [
    { label: t('dashboard.create_order'), icon: Add, color: theme.palette.primary.main },
    { label: t('navigation.analytics'), icon: Analytics, color: theme.palette.success.main },
    { label: t('dashboard.view_reports'), icon: Assignment, color: theme.palette.warning.main },
    { label: t('navigation.settings'), icon: Settings, color: theme.palette.info.main },
  ];

  return (
    <motion.div variants={ITEM_VARIANTS}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: 2,
        }}
      >
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 2, color: '#374151' }}>
          {t('dashboard.quick_actions')}
        </Typography>
        <Grid container spacing={1.5}>
          {actions.map((action, index) => (
            <Grid item xs={6} key={index}>
              <Button
                fullWidth
                variant='outlined'
                startIcon={<action.icon />}
                sx={{
                  py: 1,
                  borderColor: `${action.color}30`,
                  color: action.color,
                  '&:hover': {
                    borderColor: action.color,
                    backgroundColor: `${action.color}10`,
                  },
                  textTransform: 'none',
                  fontSize: '0.875rem',
                }}
              >
                {action.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </motion.div>
  );
};

/**
 * Simple KPI Cards Component - Restored to original state
 */
const KPISection: React.FC = () => {
  const theme = useTheme();
  const { currentAgency } = useAgencyStore();
  const { analytics: salesAnalytics } = useSalesAnalytics(currentAgency?.id || 'default');

  const stats = [
    {
      title: 'Total Orders',
      value: salesAnalytics?.totalOrders?.toLocaleString() || '1,234',
      change: '+12.5%',
      color: theme.palette.primary.main,
      icon: ShoppingCart,
    },
    {
      title: 'Revenue',
      value: salesAnalytics?.totalSales ? `$${salesAnalytics.totalSales.toLocaleString()}` : '$45,678',
      change: `+${salesAnalytics?.growthRate?.toFixed(1) || '22.1'}%`,
      color: theme.palette.success.main,
      icon: TrendingUp,
    },
    {
      title: 'Customers',
      value: salesAnalytics?.uniqueCustomers?.toLocaleString() || '856',
      change: '+8.2%',
      color: theme.palette.warning.main,
      icon: People,
    },
    {
      title: 'Products',
      value: '5,678',
      change: '+15.3%',
      color: theme.palette.info.main,
      icon: Inventory,
    },
  ];

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant='h6' sx={{ mb: 2, fontWeight: 600 }}>
        Overview
      </Typography>
      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={6} md={6} key={index}>
            <Box
              sx={{
                p: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                backgroundColor: 'background.paper',
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <stat.icon sx={{ color: stat.color, fontSize: 24 }} />
                <Typography variant='body1' color='text.secondary' sx={{ fontWeight: 500 }}>
                  {stat.title}
                </Typography>
              </Box>
              <Typography variant='h4' sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                {stat.value}
              </Typography>
              <Typography variant='body2' sx={{ color: stat.color, fontWeight: 600 }}>
                {stat.change}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

/**
 * Sales Trend Component
 */
const SalesTrendChart: React.FC = () => {
  const theme = useTheme();
  const { currentAgency } = useAgencyStore();
  const { analytics: salesAnalytics, loading } = useSalesAnalytics(currentAgency?.id || 'default');

  if (loading) {
    return (
      <Card sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant='body2' sx={{ mt: 2 }}>
          Loading sales data...
        </Typography>
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={{ p: 2.5, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant='h6' sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Timeline color='primary' />
          Sales Trend (Last 7 Days)
        </Typography>
        <Chip
          label={`${salesAnalytics?.growthRate?.toFixed(1) || '0.0'}% Growth`}
          size='small'
          color='success'
          variant='outlined'
        />
      </Box>

      <Box sx={{ height: 200, display: 'flex', alignItems: 'end', gap: 1 }}>
        {[100, 80, 120, 90, 110, 95, 130].map((value, index) => (
          <Box key={index} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              sx={{
                width: '100%',
                height: `${(value / 130) * 160}px`,
                backgroundColor: theme.palette.primary.main,
                borderRadius: 1,
                mb: 1,
              }}
            />
            <Typography variant='caption' color='text.secondary'>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
            </Typography>
            <Typography variant='caption' sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
              ${(value * 100).toLocaleString()}
            </Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
};

/**
 * Top Products Component
 */
const TopProducts: React.FC = () => {
  const theme = useTheme();

  const topProducts = [
    { name: 'Premium Organic Almonds', sales: 12450, percentage: 32.5 },
    { name: 'Artisan Coffee Beans', sales: 9780, percentage: 25.6 },
    { name: 'Dried Fruits Mix', sales: 7320, percentage: 19.1 },
    { name: 'Whole Grain Pasta', sales: 5890, percentage: 15.4 },
    { name: 'Organic Honey', sales: 2890, percentage: 7.5 },
  ];

  return (
    <Card elevation={0} sx={{ p: 2.5, height: '100%' }}>
      <Typography variant='h6' sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PieChart color='primary' />
        Top Products
      </Typography>

      <List dense>
        {topProducts.map((product, index) => (
          <ListItem key={index} sx={{ px: 0 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: [
                    theme.palette.primary.main,
                    theme.palette.success.main,
                    theme.palette.warning.main,
                    theme.palette.info.main,
                    theme.palette.error.main,
                  ][index],
                }}
              />
            </ListItemIcon>
            <ListItemText
              primary={product.name}
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <LinearProgress
                    variant='determinate'
                    value={product.percentage}
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'grey.200',
                    }}
                  />
                  <Typography variant='caption' sx={{ minWidth: 60 }}>
                    {product.percentage}%
                  </Typography>
                </Box>
              }
            />
            <Typography variant='body2' sx={{ fontWeight: 600, color: theme.palette.success.main }}>
              ${product.sales.toLocaleString()}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Card>
  );
};

/**
 * Recent Activity Component
 */
const RecentActivityFeed: React.FC = () => {
  const theme = useTheme();
  const [activities, setActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    // Mock recent activities
    const mockActivities: RecentActivity[] = [
      {
        id: '1',
        type: 'ORDER',
        title: 'New Order #ORD-2024-001',
        description: 'Premium Organic Almonds - $450.00',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        user: 'John Smith',
        status: 'SUCCESS',
      },
      {
        id: '2',
        type: 'CUSTOMER',
        title: 'New Customer Added',
        description: 'Metro Supermarket - Premium Tier',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        user: 'Sarah Johnson',
        status: 'SUCCESS',
      },
      {
        id: '4',
        type: 'PAYMENT',
        title: 'Payment Received',
        description: 'Invoice #INV-2024-089 - $1,250.00',
        timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        user: 'Lisa Davis',
        status: 'SUCCESS',
      },
      {
        id: '5',
        type: 'PRODUCT',
        title: 'Low Stock Alert',
        description: 'Artisan Coffee Beans - 15 units remaining',
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        user: 'System',
        status: 'PENDING',
      },
    ];

    setActivities(mockActivities);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ORDER':
        return <ShoppingCart sx={{ color: theme.palette.primary.main }} />;
      case 'CUSTOMER':
        return <Person sx={{ color: theme.palette.success.main }} />;
      case 'PAYMENT':
        return <AttachMoney sx={{ color: theme.palette.warning.main }} />;
      case 'PRODUCT':
        return <Inventory sx={{ color: theme.palette.error.main }} />;
      default:
        return <AccessTime sx={{ color: theme.palette.grey[500] }} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle sx={{ color: theme.palette.success.main, fontSize: 16 }} />;
      case 'PENDING':
        return <Warning sx={{ color: theme.palette.warning.main, fontSize: 16 }} />;
      case 'ERROR':
        return <Warning sx={{ color: theme.palette.error.main, fontSize: 16 }} />;
      default:
        return <AccessTime sx={{ color: theme.palette.grey[500], fontSize: 16 }} />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card elevation={0} sx={{ p: 2.5, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant='h6' sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment color='primary' />
          Recent Activity
        </Typography>
        <Button size='small' variant='outlined' color='primary'>
          View All
        </Button>
      </Box>

      <List dense>
        {activities.map((activity) => (
          <ListItem key={activity.id} sx={{ px: 0, py: 1 }}>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: 'transparent', width: 36, height: 36 }}>{getActivityIcon(activity.type)}</Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {activity.title}
                  </Typography>
                  {getStatusIcon(activity.status)}
                </Box>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant='caption' color='text.secondary'>
                    {activity.description}
                  </Typography>
                  <Typography variant='caption' sx={{ display: 'block', mt: 0.5, color: theme.palette.primary.main }}>
                    {activity.user} • {formatTimestamp(activity.timestamp)}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Card>
  );
};

/**
 * Regional Performance Component
 * Following Instructions file standards with proper internationalization
 */
const RegionalPerformance: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { currentAgency } = useAgencyStore();
  const { analytics: salesAnalytics, loading } = useSalesAnalytics(currentAgency?.id || 'default');

  if (loading) {
    return (
      <Card sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={40} />
      </Card>
    );
  }

  const staticRegions = [
    { region: t('dashboard.north'), sales: 45000, percentage: 35.2 },
    { region: t('dashboard.south'), sales: 32000, percentage: 25.1 },
    { region: t('dashboard.east'), sales: 28000, percentage: 21.9 },
    { region: t('dashboard.west'), sales: 22700, percentage: 17.8 },
  ];

  return (
    <Card elevation={0} sx={{ p: 2.5, height: '100%' }}>
      <Typography variant='h6' sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BarChart color='primary' />
        {t('dashboard.regional_performance')}
      </Typography>

      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>{t('dashboard.region')}</TableCell>
              <TableCell align='right'>{t('dashboard.sales')}</TableCell>
              <TableCell align='right'>{t('dashboard.share')}</TableCell>
              <TableCell align='right'>{t('dashboard.performance')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {staticRegions.map((region, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn sx={{ color: theme.palette.primary.main, fontSize: 16 }} />
                    {region.region}
                  </Box>
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                  ${region.sales.toLocaleString()}
                </TableCell>
                <TableCell align='right'>
                  <Chip
                    label={`${region.percentage}%`}
                    size='small'
                    color={region.percentage >= 30 ? 'success' : region.percentage >= 20 ? 'warning' : 'default'}
                  />
                </TableCell>
                <TableCell align='right'>
                  <LinearProgress
                    variant='determinate'
                    value={region.percentage}
                    sx={{
                      width: 60,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'grey.200',
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

/**
 * Inventory Health Section Component
 */
const InventoryHealthSection: React.FC = () => {
  const { currentAgency } = useAgencyStore();
  const { analytics: productAnalytics, loading } = useProductAnalytics(currentAgency?.id || 'default');

  // Calculate inventory health metrics
  const totalProducts = productAnalytics?.totalProducts || 1247;
  const activeProducts = productAnalytics?.activeProducts || 1085;
  const lowStockProducts = productAnalytics?.lowStockProducts || 42;
  const outOfStockProducts = productAnalytics?.outOfStockProducts || 8;
  const totalValue = productAnalytics?.totalInventoryValue || 485600;

  // Calculate health percentage
  const criticalIssues = lowStockProducts + outOfStockProducts;
  const healthPercentage = totalProducts > 0 ? ((totalProducts - criticalIssues) / totalProducts) * 100 : 0;

  return (
    <InventoryHealthCard
      totalProducts={totalProducts}
      activeProducts={activeProducts}
      lowStockProducts={lowStockProducts}
      outOfStockProducts={outOfStockProducts}
      totalValue={totalValue}
      healthPercentage={healthPercentage}
      loading={loading}
    />
  );
};

/**
 * Dashboard Page Component
 */
export const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { currentAgency } = useAgencyStore();

  // Disabled auto-refresh to prevent flickering
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setRefreshKey((prev) => prev + 1);
  //   }, DASHBOARD_REFRESH_INTERVAL);

  //   return () => clearInterval(interval);
  // }, []);

  return (
    <DashboardLayout>
      <Container maxWidth='xl' sx={{ py: 3 }}>
        <Grid container spacing={3}>
          {/* Welcome Section */}
          <Grid item xs={12} md={8}>
            <WelcomeSection />
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <QuickActions />
          </Grid>

          {/* KPI Section - 2x2 Design beside Recent Activity */}
          <Grid item xs={12} md={8}>
            <KPISection />
          </Grid>

          {/* Recent Activity - Beside KPI */}
          <Grid item xs={12} md={4}>
            <RecentActivityFeed />
          </Grid>

          {/* Sales Trend Chart */}
          <Grid item xs={12} md={6}>
            <SalesTrendChart />
          </Grid>

          {/* Top Products */}
          <Grid item xs={12} md={6}>
            <TopProducts />
          </Grid>

          {/* Regional Performance */}
          <Grid item xs={12} md={4}>
            <RegionalPerformance />
          </Grid>

          {/* Inventory Health */}
          <Grid item xs={12} md={4}>
            <InventoryHealthSection />
          </Grid>
        </Grid>
      </Container>
    </DashboardLayout>
  );
};
