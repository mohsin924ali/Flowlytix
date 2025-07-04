/**
 * Profile Page - User Account Management
 *
 * User profile management with account settings, preferences, and security options.
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
  Avatar,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Person,
  Edit,
  Security,
  Notifications,
  Language,
  Palette,
  Save,
  Cancel,
  Phone,
  Email,
  LocationOn,
  Business,
  Shield,
  Key,
} from '@mui/icons-material';
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

// Mock user data
const mockUser = {
  id: 'user-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@flowlytix.com',
  phone: '+1 (555) 123-4567',
  position: 'Sales Manager',
  department: 'Sales',
  agency: 'Metro Distribution Center',
  avatar: '',
  joinDate: '2023-01-15',
  lastLogin: '2024-01-16T10:30:00Z',
  permissions: ['VIEW_CUSTOMERS', 'CREATE_ORDERS', 'VIEW_REPORTS'],
  preferences: {
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: true,
    language: 'en',
    timezone: 'PST',
    theme: 'light',
  },
};

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState(mockUser);
  const [editing, setEditing] = useState(false);
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
    setEditing(false);
    setShowSuccess(true);
  };

  const handlePreferenceChange = (key: string, value: boolean | string) => {
    setUser((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value,
      },
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <DashboardLayout title={t('profile.user_profile')}>
      <motion.div variants={containerVariants} initial='hidden' animate='visible'>
        {showSuccess && (
          <motion.div variants={itemVariants}>
            <Alert severity='success' sx={{ mb: 3 }}>
              {t('profile.profile_updated_successfully')}
            </Alert>
          </motion.div>
        )}

        {/* Profile Header */}
        <motion.div variants={itemVariants}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar sx={{ width: 100, height: 100, bgcolor: 'primary.main', fontSize: '2rem' }}>
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant='h4' fontWeight='bold' gutterBottom>
                    {user.firstName} {user.lastName}
                  </Typography>
                  <Typography variant='h6' color='text.secondary' gutterBottom>
                    {user.position} • {user.department}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {user.agency}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Chip icon={<Person />} label={t('profile.active_user')} color='success' size='small' />
                    <Chip
                      icon={<Shield />}
                      label={t('profile.permissions_count', { count: user.permissions.length })}
                      variant='outlined'
                      size='small'
                    />
                  </Box>
                </Box>
                <Button
                  variant={editing ? 'outlined' : 'contained'}
                  startIcon={editing ? <Cancel /> : <Edit />}
                  onClick={() => (editing ? setEditing(false) : setEditing(true))}
                  color={editing ? 'secondary' : 'primary'}
                >
                  {editing ? t('common.cancel') : t('profile.edit_profile')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        <Grid container spacing={3}>
          {/* Personal Information */}
          <Grid item xs={12} md={8}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person color='primary' />
                    {t('profile.personal_information')}
                  </Typography>
                  <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('profile.first_name')}
                        value={user.firstName}
                        disabled={!editing}
                        onChange={(e) => setUser((prev) => ({ ...prev, firstName: e.target.value }))}
                        variant={editing ? 'outlined' : 'filled'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('profile.last_name')}
                        value={user.lastName}
                        disabled={!editing}
                        onChange={(e) => setUser((prev) => ({ ...prev, lastName: e.target.value }))}
                        variant={editing ? 'outlined' : 'filled'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('profile.email')}
                        value={user.email}
                        disabled={!editing}
                        onChange={(e) => setUser((prev) => ({ ...prev, email: e.target.value }))}
                        variant={editing ? 'outlined' : 'filled'}
                        InputProps={{
                          startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('profile.phone')}
                        value={user.phone}
                        disabled={!editing}
                        onChange={(e) => setUser((prev) => ({ ...prev, phone: e.target.value }))}
                        variant={editing ? 'outlined' : 'filled'}
                        InputProps={{
                          startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('profile.position')}
                        value={user.position}
                        disabled={!editing}
                        onChange={(e) => setUser((prev) => ({ ...prev, position: e.target.value }))}
                        variant={editing ? 'outlined' : 'filled'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('profile.department')}
                        value={user.department}
                        disabled={!editing}
                        onChange={(e) => setUser((prev) => ({ ...prev, department: e.target.value }))}
                        variant={editing ? 'outlined' : 'filled'}
                      />
                    </Grid>
                  </Grid>

                  {editing && (
                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                      <Button variant='contained' startIcon={<Save />} onClick={handleSave}>
                        {t('profile.save_changes')}
                      </Button>
                      <Button variant='outlined' startIcon={<Cancel />} onClick={() => setEditing(false)}>
                        {t('common.cancel')}
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Account Information */}
          <Grid item xs={12} md={4}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Business color='primary' />
                    {t('profile.account_information')}
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <LocationOn />
                      </ListItemIcon>
                      <ListItemText primary={t('profile.agency')} secondary={user.agency} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Person />
                      </ListItemIcon>
                      <ListItemText primary={t('profile.user_id')} secondary={user.id} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Shield />
                      </ListItemIcon>
                      <ListItemText primary={t('profile.join_date')} secondary={formatDate(user.joinDate)} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Key />
                      </ListItemIcon>
                      <ListItemText primary={t('profile.last_login')} secondary={formatDate(user.lastLogin)} />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Preferences */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Notifications color='primary' />
                    {t('profile.notification_preferences')}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={user.preferences.emailNotifications}
                          onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                        />
                      }
                      label={t('profile.email_notifications')}
                    />
                    <Typography variant='body2' color='text.secondary' sx={{ ml: 4, mb: 2 }}>
                      {t('profile.email_notifications_desc')}
                    </Typography>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={user.preferences.pushNotifications}
                          onChange={(e) => handlePreferenceChange('pushNotifications', e.target.checked)}
                        />
                      }
                      label={t('profile.push_notifications')}
                    />
                    <Typography variant='body2' color='text.secondary' sx={{ ml: 4, mb: 2 }}>
                      {t('profile.push_notifications_desc')}
                    </Typography>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={user.preferences.marketingEmails}
                          onChange={(e) => handlePreferenceChange('marketingEmails', e.target.checked)}
                        />
                      }
                      label={t('profile.marketing_emails')}
                    />
                    <Typography variant='body2' color='text.secondary' sx={{ ml: 4 }}>
                      {t('profile.marketing_emails_desc')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Security & Permissions */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Security color='primary' />
                    {t('profile.security_permissions')}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant='subtitle2' gutterBottom>
                      {t('profile.current_permissions')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                      {user.permissions.map((permission, index) => (
                        <Chip
                          key={index}
                          label={permission.replace('_', ' ')}
                          size='small'
                          variant='outlined'
                          color='primary'
                        />
                      ))}
                    </Box>

                    <Button variant='outlined' startIcon={<Key />} fullWidth sx={{ mb: 2 }}>
                      {t('profile.change_password')}
                    </Button>

                    <Button variant='outlined' startIcon={<Security />} fullWidth>
                      {t('profile.two_factor_authentication')}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </DashboardLayout>
  );
};
