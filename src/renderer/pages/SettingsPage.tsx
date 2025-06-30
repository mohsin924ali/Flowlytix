/**
 * Settings Page - Application Configuration
 *
 * Comprehensive system settings, preferences, and configuration options.
 * Uses simplified approach without heavy services.
 */

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Divider,
  Alert,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { Settings, Palette, Notifications, Security, Storage, Sync, Backup, Refresh } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/templates';

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

// Mock settings data
const mockSettings = {
  appearance: {
    theme: 'light',
    language: 'en',
    timezone: 'PST',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: false,
    soundNotifications: true,
    orderAlerts: true,
    inventoryAlerts: true,
    customerAlerts: false,
  },
  data: {
    autoSync: true,
    syncInterval: '15',
    backupEnabled: true,
    backupFrequency: 'daily',
    dataRetention: '365',
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordComplexity: 'medium',
    loginAttempts: '5',
  },
};

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState(mockSettings);
  const [activeTab, setActiveTab] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSettingChange = (section: string, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value,
      },
    }));
  };

  return (
    <DashboardLayout title='Application Settings'>
      <motion.div variants={containerVariants} initial='hidden' animate='visible'>
        {showSuccess && (
          <motion.div variants={itemVariants}>
            <Alert severity='success' sx={{ mb: 3 }}>
              Settings saved successfully!
            </Alert>
          </motion.div>
        )}

        {/* Settings Tabs */}
        <motion.div variants={itemVariants}>
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab icon={<Palette />} label='Appearance' />
                <Tab icon={<Notifications />} label='Notifications' />
                <Tab icon={<Storage />} label='Data & Sync' />
                <Tab icon={<Security />} label='Security' />
              </Tabs>
            </Box>

            {/* Appearance Tab */}
            <TabPanel value={activeTab} index={0}>
              <CardContent>
                <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Palette color='primary' />
                  Appearance & Localization
                </Typography>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Theme</InputLabel>
                      <Select
                        value={settings.appearance.theme}
                        label='Theme'
                        onChange={(e) => handleSettingChange('appearance', 'theme', e.target.value)}
                      >
                        <MenuItem value='light'>Light</MenuItem>
                        <MenuItem value='dark'>Dark</MenuItem>
                        <MenuItem value='auto'>Auto (System)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={settings.appearance.language}
                        label='Language'
                        onChange={(e) => handleSettingChange('appearance', 'language', e.target.value)}
                      >
                        <MenuItem value='en'>English</MenuItem>
                        <MenuItem value='es'>Español</MenuItem>
                        <MenuItem value='fr'>Français</MenuItem>
                        <MenuItem value='de'>Deutsch</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        value={settings.appearance.timezone}
                        label='Timezone'
                        onChange={(e) => handleSettingChange('appearance', 'timezone', e.target.value)}
                      >
                        <MenuItem value='PST'>Pacific Standard Time (PST)</MenuItem>
                        <MenuItem value='EST'>Eastern Standard Time (EST)</MenuItem>
                        <MenuItem value='CST'>Central Standard Time (CST)</MenuItem>
                        <MenuItem value='MST'>Mountain Standard Time (MST)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Date Format</InputLabel>
                      <Select
                        value={settings.appearance.dateFormat}
                        label='Date Format'
                        onChange={(e) => handleSettingChange('appearance', 'dateFormat', e.target.value)}
                      >
                        <MenuItem value='MM/DD/YYYY'>MM/DD/YYYY</MenuItem>
                        <MenuItem value='DD/MM/YYYY'>DD/MM/YYYY</MenuItem>
                        <MenuItem value='YYYY-MM-DD'>YYYY-MM-DD</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        value={settings.appearance.currency}
                        label='Currency'
                        onChange={(e) => handleSettingChange('appearance', 'currency', e.target.value)}
                      >
                        <MenuItem value='USD'>USD ($)</MenuItem>
                        <MenuItem value='EUR'>EUR (€)</MenuItem>
                        <MenuItem value='GBP'>GBP (£)</MenuItem>
                        <MenuItem value='CAD'>CAD (C$)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </TabPanel>

            {/* Notifications Tab */}
            <TabPanel value={activeTab} index={1}>
              <CardContent>
                <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Notifications color='primary' />
                  Notification Preferences
                </Typography>

                <Box sx={{ mt: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.emailNotifications}
                        onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                      />
                    }
                    label='Email Notifications'
                  />
                  <Typography variant='body2' color='text.secondary' sx={{ ml: 4, mb: 2 }}>
                    Receive notifications via email
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.pushNotifications}
                        onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                      />
                    }
                    label='Push Notifications'
                  />
                  <Typography variant='body2' color='text.secondary' sx={{ ml: 4, mb: 2 }}>
                    Browser push notifications
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.soundNotifications}
                        onChange={(e) => handleSettingChange('notifications', 'soundNotifications', e.target.checked)}
                      />
                    }
                    label='Sound Notifications'
                  />
                  <Typography variant='body2' color='text.secondary' sx={{ ml: 4, mb: 3 }}>
                    Play sounds for important alerts
                  </Typography>

                  <Divider sx={{ my: 3 }} />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.orderAlerts}
                        onChange={(e) => handleSettingChange('notifications', 'orderAlerts', e.target.checked)}
                      />
                    }
                    label='Order Alerts'
                  />
                  <Typography variant='body2' color='text.secondary' sx={{ ml: 4, mb: 2 }}>
                    New orders and status changes
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.inventoryAlerts}
                        onChange={(e) => handleSettingChange('notifications', 'inventoryAlerts', e.target.checked)}
                      />
                    }
                    label='Inventory Alerts'
                  />
                  <Typography variant='body2' color='text.secondary' sx={{ ml: 4 }}>
                    Low stock warnings
                  </Typography>
                </Box>
              </CardContent>
            </TabPanel>

            {/* Data & Sync Tab */}
            <TabPanel value={activeTab} index={2}>
              <CardContent>
                <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Storage color='primary' />
                  Data Management
                </Typography>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant='subtitle2' gutterBottom>
                        Synchronization
                      </Typography>

                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.data.autoSync}
                            onChange={(e) => handleSettingChange('data', 'autoSync', e.target.checked)}
                          />
                        }
                        label='Auto Sync'
                      />

                      <Button variant='outlined' startIcon={<Sync />} fullWidth sx={{ mt: 2 }}>
                        Sync Now
                      </Button>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant='subtitle2' gutterBottom>
                        Backup
                      </Typography>

                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.data.backupEnabled}
                            onChange={(e) => handleSettingChange('data', 'backupEnabled', e.target.checked)}
                          />
                        }
                        label='Auto Backup'
                      />

                      <Button variant='outlined' startIcon={<Backup />} fullWidth sx={{ mt: 2 }}>
                        Backup Now
                      </Button>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </TabPanel>

            {/* Security Tab */}
            <TabPanel value={activeTab} index={3}>
              <CardContent>
                <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Security color='primary' />
                  Security Settings
                </Typography>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.security.twoFactorAuth}
                          onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                        />
                      }
                      label='Two-Factor Authentication'
                    />
                    <Typography variant='body2' color='text.secondary' sx={{ ml: 4, mb: 3 }}>
                      Additional security layer
                    </Typography>

                    <FormControl fullWidth>
                      <InputLabel>Session Timeout</InputLabel>
                      <Select
                        value={settings.security.sessionTimeout}
                        label='Session Timeout'
                        onChange={(e) => handleSettingChange('security', 'sessionTimeout', e.target.value)}
                      >
                        <MenuItem value='15'>15 minutes</MenuItem>
                        <MenuItem value='30'>30 minutes</MenuItem>
                        <MenuItem value='60'>1 hour</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </TabPanel>

            {/* Save Button */}
            <CardContent>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button variant='outlined' startIcon={<Refresh />}>
                  Reset to Defaults
                </Button>
                <Button variant='contained' startIcon={<Settings />} onClick={handleSave}>
                  Save Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};
