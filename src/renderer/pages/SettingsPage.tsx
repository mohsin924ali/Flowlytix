/**
 * Settings Page - Application Configuration
 *
 * Comprehensive system settings, preferences, and configuration options.
 * Uses simplified approach without heavy services.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimeout } from '../utils/performance.utils';
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
  const { t } = useTranslation();
  const [settings, setSettings] = useState(mockSettings);
  const [activeTab, setActiveTab] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Use performance utility for timeout management
  const { setManagedTimeout } = useTimeout();

  // Automatically hide success message with managed timeout
  useEffect(() => {
    if (showSuccess) {
      setManagedTimeout(() => setShowSuccess(false), 3000);
    }
  }, [showSuccess, setManagedTimeout]);

  const handleSave = () => {
    setShowSuccess(true);
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
    <DashboardLayout title={t('settings.application_settings')}>
      <motion.div variants={containerVariants} initial='hidden' animate='visible'>
        {showSuccess && (
          <motion.div variants={itemVariants}>
            <Alert severity='success' sx={{ mb: 3 }}>
              {t('settings.settings_saved_successfully')}
            </Alert>
          </motion.div>
        )}

        {/* Settings Tabs */}
        <motion.div variants={itemVariants}>
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab icon={<Palette />} label={t('settings.appearance')} />
                <Tab icon={<Notifications />} label={t('settings.notifications')} />
                <Tab icon={<Storage />} label={t('settings.data_sync')} />
                <Tab icon={<Security />} label={t('settings.security')} />
              </Tabs>
            </Box>

            {/* Appearance Tab */}
            <TabPanel value={activeTab} index={0}>
              <CardContent>
                <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Palette color='primary' />
                  {t('settings.appearance_localization')}
                </Typography>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('settings.theme')}</InputLabel>
                      <Select
                        value={settings.appearance.theme}
                        label={t('settings.theme')}
                        onChange={(e) => handleSettingChange('appearance', 'theme', e.target.value)}
                      >
                        <MenuItem value='light'>{t('settings.light')}</MenuItem>
                        <MenuItem value='dark'>{t('settings.dark')}</MenuItem>
                        <MenuItem value='auto'>{t('settings.auto_system')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('settings.language')}</InputLabel>
                      <Select
                        value={settings.appearance.language}
                        label={t('settings.language')}
                        onChange={(e) => handleSettingChange('appearance', 'language', e.target.value)}
                      >
                        <MenuItem value='en'>{t('settings.english')}</MenuItem>
                        <MenuItem value='es'>{t('settings.spanish')}</MenuItem>
                        <MenuItem value='fr'>{t('settings.french')}</MenuItem>
                        <MenuItem value='de'>{t('settings.german')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('settings.timezone')}</InputLabel>
                      <Select
                        value={settings.appearance.timezone}
                        label={t('settings.timezone')}
                        onChange={(e) => handleSettingChange('appearance', 'timezone', e.target.value)}
                      >
                        <MenuItem value='PST'>{t('settings.pacific_time')}</MenuItem>
                        <MenuItem value='EST'>{t('settings.eastern_time')}</MenuItem>
                        <MenuItem value='CST'>{t('settings.central_time')}</MenuItem>
                        <MenuItem value='MST'>{t('settings.mountain_time')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('settings.date_format')}</InputLabel>
                      <Select
                        value={settings.appearance.dateFormat}
                        label={t('settings.date_format')}
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
                      <InputLabel>{t('settings.currency')}</InputLabel>
                      <Select
                        value={settings.appearance.currency}
                        label={t('settings.currency')}
                        onChange={(e) => handleSettingChange('appearance', 'currency', e.target.value)}
                      >
                        <MenuItem value='USD'>{t('settings.usd')}</MenuItem>
                        <MenuItem value='EUR'>{t('settings.eur')}</MenuItem>
                        <MenuItem value='GBP'>{t('settings.gbp')}</MenuItem>
                        <MenuItem value='CAD'>{t('settings.cad')}</MenuItem>
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
                  {t('settings.notification_preferences')}
                </Typography>

                <Box sx={{ mt: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.emailNotifications}
                        onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                      />
                    }
                    label={t('settings.email_notifications')}
                  />
                  <Typography variant='body2' color='text.secondary' sx={{ ml: 4, mb: 2 }}>
                    {t('settings.email_notifications_desc')}
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.pushNotifications}
                        onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                      />
                    }
                    label={t('settings.push_notifications')}
                  />
                  <Typography variant='body2' color='text.secondary' sx={{ ml: 4, mb: 2 }}>
                    {t('settings.push_notifications_desc')}
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.soundNotifications}
                        onChange={(e) => handleSettingChange('notifications', 'soundNotifications', e.target.checked)}
                      />
                    }
                    label={t('settings.sound_notifications')}
                  />
                  <Typography variant='body2' color='text.secondary' sx={{ ml: 4, mb: 3 }}>
                    {t('settings.sound_notifications_desc')}
                  </Typography>

                  <Divider sx={{ my: 3 }} />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.orderAlerts}
                        onChange={(e) => handleSettingChange('notifications', 'orderAlerts', e.target.checked)}
                      />
                    }
                    label={t('settings.order_alerts')}
                  />
                  <Typography variant='body2' color='text.secondary' sx={{ ml: 4, mb: 2 }}>
                    {t('settings.order_alerts_desc')}
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.inventoryAlerts}
                        onChange={(e) => handleSettingChange('notifications', 'inventoryAlerts', e.target.checked)}
                      />
                    }
                    label={t('settings.inventory_alerts')}
                  />
                  <Typography variant='body2' color='text.secondary' sx={{ ml: 4 }}>
                    {t('settings.inventory_alerts_desc')}
                  </Typography>
                </Box>
              </CardContent>
            </TabPanel>

            {/* Data & Sync Tab */}
            <TabPanel value={activeTab} index={2}>
              <CardContent>
                <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Storage color='primary' />
                  {t('settings.data_management')}
                </Typography>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant='subtitle2' gutterBottom>
                        {t('settings.synchronization')}
                      </Typography>

                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.data.autoSync}
                            onChange={(e) => handleSettingChange('data', 'autoSync', e.target.checked)}
                          />
                        }
                        label={t('settings.auto_sync')}
                      />

                      <Button variant='outlined' startIcon={<Sync />} fullWidth sx={{ mt: 2 }}>
                        {t('settings.sync_now')}
                      </Button>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant='subtitle2' gutterBottom>
                        {t('settings.backup')}
                      </Typography>

                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.data.backupEnabled}
                            onChange={(e) => handleSettingChange('data', 'backupEnabled', e.target.checked)}
                          />
                        }
                        label={t('settings.auto_backup')}
                      />

                      <Button variant='outlined' startIcon={<Backup />} fullWidth sx={{ mt: 2 }}>
                        {t('settings.backup_now')}
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
                  {t('settings.security_settings')}
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
                      label={t('settings.two_factor_auth')}
                    />
                    <Typography variant='body2' color='text.secondary' sx={{ ml: 4, mb: 3 }}>
                      {t('settings.two_factor_auth_desc')}
                    </Typography>

                    <FormControl fullWidth>
                      <InputLabel>{t('settings.session_timeout')}</InputLabel>
                      <Select
                        value={settings.security.sessionTimeout}
                        label={t('settings.session_timeout')}
                        onChange={(e) => handleSettingChange('security', 'sessionTimeout', e.target.value)}
                      >
                        <MenuItem value='15'>{t('settings.fifteen_minutes')}</MenuItem>
                        <MenuItem value='30'>{t('settings.thirty_minutes')}</MenuItem>
                        <MenuItem value='60'>{t('settings.one_hour')}</MenuItem>
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
                  {t('settings.reset_to_defaults')}
                </Button>
                <Button variant='contained' startIcon={<Settings />} onClick={handleSave}>
                  {t('settings.save_settings')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};
