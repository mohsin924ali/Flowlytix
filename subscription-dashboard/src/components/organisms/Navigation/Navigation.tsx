/**
 * Navigation Component
 * Main navigation for the subscription dashboard
 */

'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Button,
  Avatar,
} from '@mui/material';
import { Dashboard, People, VpnKey, Assessment, BugReport, PersonAdd, Logout, Settings } from '@mui/icons-material';
import { useAuth } from '@/components/providers/AuthProvider';
import Link from 'next/link';

const drawerWidth = 280;

interface NavigationItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  description?: string;
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    path: '/',
    icon: <Dashboard />,
    description: 'Overview and analytics',
  },
  {
    title: 'Customers',
    path: '/customers',
    icon: <People />,
    description: 'Customer management',
  },
  {
    title: 'Subscriptions',
    path: '/subscriptions',
    icon: <VpnKey />,
    description: 'License management',
  },
  {
    title: 'Analytics',
    path: '/analytics',
    icon: <Assessment />,
    description: 'Reports and insights',
  },
  {
    title: 'Testing Suite',
    path: '/testing',
    icon: <BugReport />,
    description: 'End-to-end testing',
  },
];

const quickActions: NavigationItem[] = [
  {
    title: 'Add Customer',
    path: '/customers/create',
    icon: <PersonAdd />,
    description: 'Register new customer',
  },
  {
    title: 'Generate License',
    path: '/subscriptions/create',
    icon: <VpnKey />,
    description: 'Create subscription',
  },
];

interface NavigationProps {
  window?: () => Window;
}

export const Navigation: React.FC<NavigationProps> = ({ window }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const isActivePath = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #B4C7E3 0%, #FCF2E8 100%)',
          color: '#1e293b',
        }}
      >
        <Typography variant='h6' component='div' fontWeight='bold'>
          Flowlytix Dashboard
        </Typography>
        <Typography variant='body2' sx={{ opacity: 0.8 }}>
          Subscription Management
        </Typography>
      </Box>

      {/* User Info */}
      {user && (
        <Box
          sx={{
            p: 2,
            background: 'linear-gradient(135deg, #FCF2E8 0%, #B4C7E3 50%)',
            borderBottom: '1px solid rgba(180, 199, 227, 0.3)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                background: 'linear-gradient(135deg, #B4C7E3 0%, #FCF2E8 100%)',
                color: '#1e293b',
                fontWeight: 'bold',
              }}
            >
              {user.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant='subtitle2' fontWeight={600} sx={{ color: '#1e293b' }}>
                {user.name}
              </Typography>
              <Typography variant='body2' sx={{ color: 'rgba(30, 41, 59, 0.7)' }}>
                {user.email}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      <Divider />

      {/* Main Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ px: 1, py: 2 }}>
          {navigationItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <Link href={item.path} style={{ textDecoration: 'none', width: '100%' }}>
                <ListItemButton
                  selected={isActivePath(item.path)}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'white',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActivePath(item.path) ? 'white' : 'action.active',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={item.description}
                    primaryTypographyProps={{
                      fontWeight: isActivePath(item.path) ? 600 : 400,
                    }}
                    secondaryTypographyProps={{
                      sx: {
                        color: isActivePath(item.path) ? 'rgba(255,255,255,0.7)' : 'textSecondary',
                        fontSize: '0.75rem',
                      },
                    }}
                  />
                </ListItemButton>
              </Link>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ mx: 2 }} />

        {/* Quick Actions */}
        <Box sx={{ p: 2 }}>
          <Typography variant='overline' color='textSecondary' fontWeight='bold' sx={{ mb: 1, display: 'block' }}>
            Quick Actions
          </Typography>
          <List sx={{ p: 0 }}>
            {quickActions.map((action) => (
              <ListItem key={action.path} disablePadding sx={{ mb: 0.5 }}>
                <Link href={action.path} style={{ textDecoration: 'none', width: '100%' }}>
                  <ListItemButton
                    sx={{
                      borderRadius: 2,
                      py: 0.5,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{action.icon}</ListItemIcon>
                    <ListItemText
                      primary={action.title}
                      secondary={action.description}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                      }}
                      secondaryTypographyProps={{
                        fontSize: '0.75rem',
                      }}
                    />
                  </ListItemButton>
                </Link>
              </ListItem>
            ))}
          </List>
        </Box>
      </Box>

      <Divider />

      {/* Footer Actions */}
      <Box sx={{ p: 2 }}>
        <Button fullWidth variant='outlined' startIcon={<Logout />} onClick={handleLogout} sx={{ mb: 1 }}>
          Logout
        </Button>
      </Box>
    </Box>
  );

  const container = window !== undefined ? () => window().document.body : undefined;

  return (
    <Box sx={{ display: 'flex' }}>
      <Box component='nav' sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label='navigation'>
        <Drawer
          container={container}
          variant='permanent'
          open
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
    </Box>
  );
};
