/**
 * Dashboard Page Component
 * Main dashboard after successful authentication
 * Following Atomic Design principles with professional styling
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
  Button,
  IconButton,
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
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { DigitalClock } from '../components/atoms';
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
            Welcome back to your distribution management dashboard
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
                  Contact: {currentAgency.contactPerson}
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
 */
const QuickActions: React.FC = () => {
  const theme = useTheme();

  const actions = [
    { label: 'New Order', icon: Add, color: theme.palette.primary.main },
    { label: 'Analytics', icon: Analytics, color: theme.palette.success.main },
    { label: 'Reports', icon: Assignment, color: theme.palette.warning.main },
    { label: 'Settings', icon: Settings, color: theme.palette.info.main },
  ];

  return (
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
        Quick Actions
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
  );
};

/**
 * KPI Cards Component
 */
const KPISection: React.FC = () => {
  const theme = useTheme();

  const stats: DashboardStat[] = [
    {
      id: 'total-orders',
      title: 'Total Orders',
      value: '1,234',
      change: '+12.5%',
      trend: 'up',
      icon: ShoppingCart,
      color: theme.palette.primary.main,
    },
    {
      id: 'active-customers',
      title: 'Active Customers',
      value: '856',
      change: '+8.2%',
      trend: 'up',
      icon: People,
      color: theme.palette.success.main,
    },
    {
      id: 'products-sold',
      title: 'Products Sold',
      value: '5,678',
      change: '+15.3%',
      trend: 'up',
      icon: Inventory,
      color: theme.palette.warning.main,
    },
    {
      id: 'revenue',
      title: 'Revenue',
      value: '$45,678',
      change: '+22.1%',
      trend: 'up',
      icon: TrendingUp,
      color: theme.palette.info.main,
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: 2,
      }}
    >
      <Typography variant='h6' sx={{ fontWeight: 600, mb: 2.5, color: '#374151' }}>
        Key Performance Indicators
      </Typography>
      <Grid container spacing={2}>
        {stats.map((stat) => (
          <Grid item xs={6} key={stat.id}>
            <Card
              elevation={0}
              sx={{
                p: 2,
                background: `linear-gradient(135deg, ${stat.color}08 0%, ${stat.color}04 100%)`,
                border: `1px solid ${stat.color}20`,
                borderRadius: 2,
                height: '100%',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px ${stat.color}20`,
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <stat.icon sx={{ color: stat.color, fontSize: 28 }} />
                <Chip
                  label={stat.change}
                  size='small'
                  sx={{
                    height: 20,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: `${stat.color}15`,
                    color: stat.color,
                    border: `1px solid ${stat.color}30`,
                  }}
                />
              </Box>
              <Typography variant='h4' sx={{ fontWeight: 700, color: stat.color, mb: 0.5 }}>
                {stat.value}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ fontSize: '0.875rem' }}>
                {stat.title}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

/**
 * Dashboard Page Component
 */
export const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { currentAgency } = useAgencyStore();

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

          {/* KPI Section */}
          <Grid item xs={12} md={6}>
            <KPISection />
          </Grid>

          {/* Additional sections can go here */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: 2,
                height: '100%',
              }}
            >
              <Typography variant='h6' sx={{ fontWeight: 600, mb: 2, color: '#374151' }}>
                Recent Activity
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Activity feed will be displayed here...
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </DashboardLayout>
  );
};
