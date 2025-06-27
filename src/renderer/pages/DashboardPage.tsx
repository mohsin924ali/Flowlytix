/**
 * Dashboard Page Component
 * Main dashboard after successful authentication
 * Following Atomic Design principles with stunning animations and professional styling
 */

import React, { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { useAuthStore } from '../store/auth.store';
import { useAgencyStore } from '../store/agency.store';

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
 * Animation variants
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
  hover: {
    scale: 1.05,
    y: -5,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Professional Welcome Component
 */
const WelcomeSection: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { currentAgency } = useAgencyStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
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
    <motion.div variants={itemVariants}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          background: 'linear-gradient(135deg, rgba(81, 63, 242, 0.08) 0%, rgba(107, 82, 245, 0.06) 100%)',
          border: '1px solid rgba(81, 63, 242, 0.15)',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: theme.palette.primary.main,
              width: 56,
              height: 56,
              fontSize: '1.5rem',
              fontWeight: 600,
            }}
          >
            {user?.firstName?.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant='h4'
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
            <Typography variant='body1' color='text.secondary'>
              Welcome back to your distribution management dashboard
            </Typography>
          </Box>
        </Box>

        {currentAgency && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business color='primary' />
                <Typography variant='h6' sx={{ fontWeight: 600 }}>
                  {currentAgency.name}
                </Typography>
                <Chip
                  label={currentAgency.status}
                  size='small'
                  sx={{
                    height: 24,
                    fontWeight: 500,
                    textTransform: 'capitalize',
                    backgroundColor: `${getStatusColor(currentAgency.status)}20`,
                    color: getStatusColor(currentAgency.status),
                    border: `1px solid ${getStatusColor(currentAgency.status)}40`,
                  }}
                />
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              {currentAgency.contactPerson && (
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <People fontSize='small' color='action' />
                    <Typography variant='body2' color='text.secondary'>
                      Contact: {currentAgency.contactPerson}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {currentAgency.email && (
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email fontSize='small' color='action' />
                    <Typography variant='body2' color='text.secondary'>
                      {currentAgency.email}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {currentAgency.phone && (
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone fontSize='small' color='action' />
                    <Typography variant='body2' color='text.secondary'>
                      {currentAgency.phone}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {currentAgency.address && (
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn fontSize='small' color='action' />
                    <Typography variant='body2' color='text.secondary'>
                      {currentAgency.address}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </>
        )}
      </Paper>
    </motion.div>
  );
};

/**
 * Floating elements animation
 */
const FloatingElements: React.FC = () => (
  <Box
    sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
    }}
  >
    {[...Array(4)].map((_, i) => (
      <motion.div
        key={i}
        style={{
          position: 'absolute',
          width: Math.random() * 100 + 50,
          height: Math.random() * 100 + 50,
          borderRadius: '50%',
          background: `linear-gradient(135deg, rgba(81, 63, 242, ${Math.random() * 0.1 + 0.05}) 0%, rgba(107, 82, 245, ${Math.random() * 0.1 + 0.03}) 100%)`,
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
        initial={{
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
        }}
        animate={{
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
        }}
        transition={{
          duration: Math.random() * 30 + 20,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'linear',
        }}
      />
    ))}
  </Box>
);

/**
 * Dashboard Page Component
 */
export const DashboardPage: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Mock dashboard stats
  const dashboardStats: DashboardStat[] = [
    {
      id: 'orders',
      title: 'Total Orders',
      value: '1,234',
      change: '+12.5%',
      trend: 'up',
      icon: ShoppingCart,
      color: '#513ff2',
    },
    {
      id: 'customers',
      title: 'Active Customers',
      value: '856',
      change: '+8.2%',
      trend: 'up',
      icon: People,
      color: '#2e7d32',
    },
    {
      id: 'inventory',
      title: 'Inventory Items',
      value: '2,145',
      change: '-3.1%',
      trend: 'down',
      icon: Inventory,
      color: '#ed6c02',
    },
    {
      id: 'revenue',
      title: 'Monthly Revenue',
      value: '$45,678',
      change: '+15.7%',
      trend: 'up',
      icon: TrendingUp,
      color: '#9c27b0',
    },
  ];

  return (
    <DashboardLayout title='Dashboard'>
      <Container maxWidth='xl' sx={{ py: 2 }}>
        <motion.div variants={containerVariants} initial='hidden' animate='visible'>
          {/* Professional Welcome Section with Agency Info */}
          <WelcomeSection />

          {/* Dashboard Stats */}
          <motion.div variants={itemVariants}>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {dashboardStats.map((stat) => {
                const IconComponent = stat.icon;
                return (
                  <Grid item xs={12} sm={6} md={3} key={stat.id}>
                    <motion.div variants={cardVariants} whileHover='hover'>
                      <Card
                        elevation={0}
                        sx={{
                          height: '100%',
                          background: 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: 'rgba(255, 255, 255, 0.9)',
                            borderColor: stat.color,
                            boxShadow: `0 8px 32px ${stat.color}20`,
                          },
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <IconComponent sx={{ fontSize: 40, color: stat.color }} />
                            <Chip
                              label={stat.change}
                              size='small'
                              sx={{
                                backgroundColor:
                                  stat.trend === 'up' ? '#e8f5e8' : stat.trend === 'down' ? '#ffeaea' : '#f0f0f0',
                                color: stat.trend === 'up' ? '#2e7d32' : stat.trend === 'down' ? '#d32f2f' : '#666',
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                          <Typography variant='h4' sx={{ fontWeight: 'bold', color: stat.color, mb: 1 }}>
                            {stat.value}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {stat.title}
                          </Typography>
                          <LinearProgress
                            variant='determinate'
                            value={75}
                            sx={{
                              mt: 2,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: `${stat.color}20`,
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: stat.color,
                              },
                            }}
                          />
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          </motion.div>

          {/* Recent Activity Section */}
          <motion.div variants={itemVariants}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card
                  elevation={0}
                  sx={{
                    height: 400,
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ p: 3, height: '100%' }}>
                    <Typography variant='h6' sx={{ fontWeight: 'bold', mb: 2 }}>
                      Recent Activity
                    </Typography>
                    <Box
                      sx={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                      }}
                    >
                      <Typography>Activity chart will be implemented here</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card
                  elevation={0}
                  sx={{
                    height: 400,
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ p: 3, height: '100%' }}>
                    <Typography variant='h6' sx={{ fontWeight: 'bold', mb: 2 }}>
                      Quick Actions
                    </Typography>
                    <Box
                      sx={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                      }}
                    >
                      <Typography>Quick actions will be implemented here</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </motion.div>
        </motion.div>

        {/* Floating Background Elements */}
        <FloatingElements />
      </Container>
    </DashboardLayout>
  );
};
