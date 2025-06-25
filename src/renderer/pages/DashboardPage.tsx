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
} from '@mui/material';
import { TrendingUp, People, Inventory, ShoppingCart, WavingHand } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/templates';

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
          background: `linear-gradient(135deg, rgba(25, 118, 210, ${Math.random() * 0.1 + 0.05}) 0%, rgba(66, 165, 245, ${Math.random() * 0.1 + 0.03}) 100%)`,
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
      color: '#1976d2',
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
          {/* Welcome Section */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4 }}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Typography
                  variant='h3'
                  sx={{
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <motion.div
                    animate={{ rotate: [0, 15, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <WavingHand sx={{ color: '#ffd700' }} />
                  </motion.div>
                  Welcome back!
                </Typography>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Typography variant='h6' color='text.secondary'>
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>
              </motion.div>
            </Box>
          </motion.div>

          {/* Stats Grid */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {dashboardStats.map((stat, index) => (
              <Grid item xs={12} sm={6} lg={3} key={stat.id}>
                <motion.div variants={cardVariants} whileHover='hover' custom={index}>
                  <Card
                    sx={{
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: 3,
                      overflow: 'hidden',
                      position: 'relative',
                      '&:before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: `linear-gradient(90deg, ${stat.color}, ${stat.color}aa)`,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}10)`,
                            mr: 2,
                          }}
                        >
                          <stat.icon sx={{ color: stat.color, fontSize: 24 }} />
                        </Box>
                        <Box>
                          <Typography variant='h4' fontWeight='bold'>
                            {stat.value}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {stat.title}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip
                          label={stat.change}
                          size='small'
                          sx={{
                            backgroundColor: stat.trend === 'up' ? '#e8f5e8' : '#fff3e0',
                            color: stat.trend === 'up' ? '#2e7d32' : '#ed6c02',
                            fontWeight: 'bold',
                          }}
                        />
                        <Typography variant='caption' color='text.secondary' sx={{ ml: 1 }}>
                          vs last month
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Coming Soon Section */}
          <motion.div variants={itemVariants}>
            <Paper
              sx={{
                p: 4,
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 3,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                '&:before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(25, 118, 210, 0.5), transparent)',
                },
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <Typography
                  variant='h4'
                  sx={{
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 2,
                  }}
                >
                  🚀 More Features Coming Soon!
                </Typography>
                <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
                  We're working hard to bring you advanced features including product management, customer management,
                  order processing, analytics, and much more.
                </Typography>
                <LinearProgress
                  variant='determinate'
                  value={75}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                  Development Progress: 75%
                </Typography>
              </motion.div>
            </Paper>
          </motion.div>
        </motion.div>
      </Container>
    </DashboardLayout>
  );
};
