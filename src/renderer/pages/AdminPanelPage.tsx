/**
 * Admin Panel Page Component - SIMPLIFIED VERSION THAT WORKS
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Typography, Box, Card, CardContent, Grid, Tab, Tabs, Paper, useTheme, alpha } from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  SupervisorAccount as SupervisorIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { UsersPage } from './UsersPage';
import { AgenciesPage } from './AgenciesPage';
import { AreasPage } from './AreasPage';
import { EmployeesPage } from './EmployeesPage';

/**
 * System Settings Component
 */
const SystemSettingsComponent: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Container maxWidth='xl' sx={{ py: 2 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <SettingsIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant='h5' fontWeight='bold'>
              {t('admin.system_settings')}
            </Typography>
          </Box>
          <Typography variant='body1' color='text.secondary'>
            {t('admin.system_configuration_description')}
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

/**
 * SIMPLIFIED Admin Panel - NO COMPLEX FILTERING
 */
export const AdminPanelPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<string>('users'); // DEFAULT TO USERS

  // DEBUG: Log when AdminPanelPage renders
  console.log('🎯 DEBUG: AdminPanelPage is rendering!');
  console.log('🎯 DEBUG: Active tab:', activeTab);

  // SIMPLE TAB DEFINITIONS - NO FILTERING
  const tabs = [
    {
      id: 'users',
      label: t('admin.user_management'),
      icon: <PeopleIcon />,
      description: t('admin.manage_system_users'),
      component: UsersPage,
    },
    {
      id: 'areas',
      label: t('admin.area_management'),
      icon: <MapIcon />,
      description: t('admin.manage_areas_territories'),
      component: AreasPage,
    },
    {
      id: 'agencies',
      label: t('admin.agency_management'),
      icon: <BusinessIcon />,
      description: t('admin.manage_agencies'),
      component: AgenciesPage,
    },
    {
      id: 'employees',
      label: t('admin.employee_management'),
      icon: <SupervisorIcon />,
      description: t('admin.manage_employees'),
      component: EmployeesPage,
    },
    {
      id: 'settings',
      label: t('admin.system_settings'),
      icon: <SettingsIcon />,
      description: t('admin.system_configuration'),
      component: SystemSettingsComponent,
    },
  ];

  // DEBUG: Log tabs
  console.log(
    '🎯 DEBUG: All tabs:',
    tabs.map((t) => ({ id: t.id, label: t.label }))
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: string): void => {
    console.log('🎯 DEBUG: Tab changed to:', newValue);
    setActiveTab(newValue);
  };

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || UsersPage;
  console.log('🎯 DEBUG: Active component found:', !!ActiveComponent);

  return (
    <DashboardLayout title={t('admin.admin_panel')}>
      <Container maxWidth='xl' sx={{ py: 2 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {/* Header */}
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
                {t('admin.administration_panel')}
              </Typography>
            </Box>
            <Typography variant='h6' color='text.secondary'>
              {t('admin.complete_administrative_control')}
            </Typography>
          </Box>

          {/* Navigation Tabs */}
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
              {tabs.map((tab) => (
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

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ActiveComponent />
          </motion.div>
        </motion.div>
      </Container>
    </DashboardLayout>
  );
};
