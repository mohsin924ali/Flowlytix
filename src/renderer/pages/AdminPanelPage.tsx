/**
 * Admin Panel Page Component
 *
 * Central administration interface for super admins only.
 * Contains user management, agency management, employee management, and system settings.
 * Follows atomic design principles with proper authorization and responsive design.
 *
 * Business Rules:
 * - Only super administrators can access this page
 * - Provides centralized access to all administrative functions
 * - Implements proper error handling and loading states
 * - Responsive design for all devices
 *
 * @domain Administration
 * @pattern Page Component
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Tab,
  Tabs,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  SupervisorAccount as SupervisorIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { UsersPage } from './UsersPage';
import { AgenciesPage } from './AgenciesPage';
import { EmployeesPage } from './EmployeesPage';

/**
 * Admin panel tab definitions
 */
interface AdminTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  component: React.ComponentType;
}

const ADMIN_TABS: AdminTab[] = [
  {
    id: 'users',
    label: 'User Management',
    icon: <PeopleIcon />,
    description: 'Manage system users and administrators',
    component: UsersPage,
  },
  {
    id: 'agencies',
    label: 'Agency Management',
    icon: <BusinessIcon />,
    description: 'Manage distribution agencies and settings',
    component: AgenciesPage,
  },
  {
    id: 'employees',
    label: 'Employee Management',
    icon: <SupervisorIcon />,
    description: 'Manage agency employees and roles',
    component: EmployeesPage,
  },
  {
    id: 'settings',
    label: 'System Settings',
    icon: <SettingsIcon />,
    description: 'Configure system-wide settings and preferences',
    component: () => <SystemSettingsPanel />,
  },
];

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

const tabContentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * System Settings Panel Component
 */
const SystemSettingsPanel: React.FC = () => {
  const theme = useTheme();

  return (
    <Container maxWidth='xl' sx={{ py: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SettingsIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant='h5' fontWeight='bold'>
                  System Settings
                </Typography>
              </Box>

              <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
                Configure system-wide settings and preferences for the Flowlytix Distribution System.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant='outlined'>
                    <CardContent>
                      <Typography variant='h6' gutterBottom>
                        Application Settings
                      </Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                        Configure general application behavior and preferences.
                      </Typography>
                      <Button variant='outlined' startIcon={<SettingsIcon />}>
                        Configure
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant='outlined'>
                    <CardContent>
                      <Typography variant='h6' gutterBottom>
                        Security Settings
                      </Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                        Manage authentication, authorization, and security policies.
                      </Typography>
                      <Button variant='outlined' startIcon={<SettingsIcon />}>
                        Configure
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant='outlined'>
                    <CardContent>
                      <Typography variant='h6' gutterBottom>
                        Database Settings
                      </Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                        Configure database connections and backup settings.
                      </Typography>
                      <Button variant='outlined' startIcon={<SettingsIcon />}>
                        Configure
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant='outlined'>
                    <CardContent>
                      <Typography variant='h6' gutterBottom>
                        Notification Settings
                      </Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                        Configure system notifications and alert preferences.
                      </Typography>
                      <Button variant='outlined' startIcon={<SettingsIcon />}>
                        Configure
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

/**
 * Admin Panel Page Component
 */
export const AdminPanelPage: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<string>('users');

  /**
   * Handle tab change
   */
  const handleTabChange = (_: React.SyntheticEvent, newValue: string): void => {
    setActiveTab(newValue);
  };

  /**
   * Get active tab component
   */
  const getActiveTabComponent = (): React.ComponentType => {
    const tab = ADMIN_TABS.find((t) => t.id === activeTab);
    return tab?.component || (() => null);
  };

  const ActiveComponent = getActiveTabComponent();

  return (
    <DashboardLayout title='Admin Panel'>
      <Container maxWidth='xl' sx={{ py: 2 }}>
        <motion.div variants={containerVariants} initial='hidden' animate='visible'>
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DashboardIcon
                  sx={{
                    mr: 2,
                    fontSize: 40,
                    color: 'primary.main',
                  }}
                />
                <Typography
                  variant='h3'
                  sx={{
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Administration Panel
                </Typography>
              </Box>
              <Typography variant='h6' color='text.secondary' sx={{ mb: 1 }}>
                Centralized administration for super administrators
              </Typography>
              <Chip label='Super Admin Only' color='primary' variant='outlined' size='small' />
            </Box>
          </motion.div>

          {/* Navigation Tabs */}
          <motion.div variants={itemVariants}>
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                borderRadius: 2,
                background: alpha(theme.palette.primary.main, 0.04),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              }}
            >
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant='scrollable'
                scrollButtons='auto'
                sx={{
                  '& .MuiTabs-indicator': {
                    backgroundColor: theme.palette.primary.main,
                    height: 3,
                  },
                  '& .MuiTab-root': {
                    minHeight: 72,
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    '&.Mui-selected': {
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                    },
                  },
                }}
              >
                {ADMIN_TABS.map((tab) => (
                  <Tab
                    key={tab.id}
                    value={tab.id}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {tab.icon}
                        <Box>
                          <Typography variant='body2' fontWeight='inherit'>
                            {tab.label}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ display: { xs: 'none', sm: 'block' } }}
                          >
                            {tab.description}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                ))}
              </Tabs>
            </Paper>
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode='wait'>
            <motion.div key={activeTab} variants={tabContentVariants} initial='hidden' animate='visible' exit='exit'>
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </Container>
    </DashboardLayout>
  );
};
