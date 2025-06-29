/**
 * Agency Edit Modal Component - Enhanced Version
 *
 * Professional modal for editing agency details with comprehensive settings management.
 * Includes financial and operational settings with proper validation and error handling.
 * Follows Material-UI design patterns and Clean Architecture principles.
 *
 * @domain Agency Management
 * @architecture Clean Architecture - Presentation Layer
 * @version 2.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Close as CloseIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AccountBalance as FinancialIcon,
  Settings as OperationalIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  AttachMoney as CreditIcon,
  Schedule as TimeIcon,
  Notifications as NotificationIcon,
  Inventory as InventoryIcon,
  Percent as TaxIcon,
  AccountBalanceWallet as CurrencyIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Agency } from '../../../services/AgencyService';

/**
 * Enhanced Agency Edit Form Data with comprehensive settings
 */
export interface AgencyEditFormData {
  // Basic Information
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  status: Agency['status'];

  // Financial Settings
  allowCreditSales: boolean;
  defaultCreditDays: number;
  maxCreditLimit: number;
  requireApprovalForOrders: boolean;
  taxRate: number;
  currency: string;

  // Operational Settings
  enableInventoryTracking: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  businessHoursTimezone: string;

  // Notification Settings
  notificationsLowStock: boolean;
  notificationsOverduePayments: boolean;
  notificationsNewOrders: boolean;
}

/**
 * Agency Edit Modal Props
 */
export interface AgencyEditModalProps {
  /** Whether modal is open */
  open: boolean;
  /** Agency to edit */
  agency: Agency | null;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when form is submitted */
  onSubmit: (agencyId: string, data: any) => Promise<void>;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Enhanced Form validation errors
 */
interface FormErrors {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  defaultCreditDays?: string;
  maxCreditLimit?: string;
  taxRate?: string;
  currency?: string;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  businessHoursTimezone?: string;
}

/**
 * Tab panel interface for settings sections
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * Tab Panel Component
 */
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * Currency options for the dropdown
 */
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'PKR', label: 'PKR - Pakistani Rupee' },
];

/**
 * Timezone options for business hours
 */
const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC - Coordinated Universal Time' },
  { value: 'EST', label: 'EST - Eastern Standard Time' },
  { value: 'PST', label: 'PST - Pacific Standard Time' },
  { value: 'GMT', label: 'GMT - Greenwich Mean Time' },
  { value: 'CET', label: 'CET - Central European Time' },
  { value: 'JST', label: 'JST - Japan Standard Time' },
  { value: 'IST', label: 'IST - India Standard Time' },
  { value: 'PKT', label: 'PKT - Pakistan Standard Time' },
];

/**
 * Enhanced Agency Edit Modal Component
 */
export const AgencyEditModal: React.FC<AgencyEditModalProps> = ({
  open,
  agency,
  loading = false,
  error = null,
  onClose,
  onSubmit,
  'data-testid': testId = 'agency-edit-modal',
}) => {
  const theme = useTheme();

  // Tab state for settings sections
  const [activeTab, setActiveTab] = useState(0);

  // Form state with comprehensive settings
  const [formData, setFormData] = useState<AgencyEditFormData>({
    // Basic Information
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',

    // Financial Settings
    allowCreditSales: true,
    defaultCreditDays: 30,
    maxCreditLimit: 50000,
    requireApprovalForOrders: false,
    taxRate: 0.15,
    currency: 'USD',

    // Operational Settings
    enableInventoryTracking: true,
    businessHoursStart: '09:00',
    businessHoursEnd: '17:00',
    businessHoursTimezone: 'UTC',

    // Notification Settings
    notificationsLowStock: true,
    notificationsOverduePayments: true,
    notificationsNewOrders: false,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  /**
   * Initialize form data when agency changes
   */
  useEffect(() => {
    if (agency) {
      setFormData({
        // Basic Information
        name: agency.name || '',
        contactPerson: agency.contactPerson || '',
        email: agency.email || '',
        phone: agency.phone || '',
        address: agency.address || '',
        status: agency.status || 'active',

        // Financial Settings
        allowCreditSales: agency.settings?.allowCreditSales ?? true,
        defaultCreditDays: agency.settings?.defaultCreditDays ?? 30,
        maxCreditLimit: agency.settings?.maxCreditLimit ?? 50000,
        requireApprovalForOrders: agency.settings?.requireApprovalForOrders ?? false,
        taxRate: agency.settings?.taxRate ?? 0.15,
        currency: agency.settings?.currency ?? 'USD',

        // Operational Settings
        enableInventoryTracking: agency.settings?.enableInventoryTracking ?? true,
        businessHoursStart: agency.settings?.businessHours?.start ?? '09:00',
        businessHoursEnd: agency.settings?.businessHours?.end ?? '17:00',
        businessHoursTimezone: agency.settings?.businessHours?.timezone ?? 'UTC',

        // Notification Settings
        notificationsLowStock: agency.settings?.notifications?.lowStock ?? true,
        notificationsOverduePayments: agency.settings?.notifications?.overduePayments ?? true,
        notificationsNewOrders: agency.settings?.notifications?.newOrders ?? false,
      });
      setFormErrors({});
      setActiveTab(0); // Reset to first tab
    }
  }, [agency]);

  /**
   * Enhanced form validation with comprehensive settings validation
   */
  const validateForm = useCallback((data: AgencyEditFormData): FormErrors => {
    const errors: FormErrors = {};

    // Basic Information Validation
    if (!data.name.trim()) {
      errors.name = 'Agency name is required';
    } else if (data.name.trim().length < 2) {
      errors.name = 'Agency name must be at least 2 characters';
    } else if (data.name.trim().length > 100) {
      errors.name = 'Agency name must be less than 100 characters';
    }

    // Email validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (data.phone && data.phone.trim()) {
      const cleanPhone = data.phone.replace(/[\s\-\(\)\.]/g, '');
      if (!/^[\+]?[\d]{7,15}$/.test(cleanPhone)) {
        errors.phone = 'Please enter a valid phone number (7-15 digits)';
      }
    }

    // Financial Settings Validation
    if (data.defaultCreditDays < 1 || data.defaultCreditDays > 365) {
      errors.defaultCreditDays = 'Credit days must be between 1 and 365';
    }

    if (data.maxCreditLimit < 0 || data.maxCreditLimit > 10000000) {
      errors.maxCreditLimit = 'Credit limit must be between 0 and 10,000,000';
    }

    if (data.taxRate < 0 || data.taxRate > 1) {
      errors.taxRate = 'Tax rate must be between 0% and 100%';
    }

    if (!data.currency || data.currency.length !== 3) {
      errors.currency = 'Please select a valid currency';
    }

    // Business Hours Validation
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.businessHoursStart)) {
      errors.businessHoursStart = 'Please enter a valid time format (HH:MM)';
    }

    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.businessHoursEnd)) {
      errors.businessHoursEnd = 'Please enter a valid time format (HH:MM)';
    }

    // Validate business hours logic
    if (data.businessHoursStart && data.businessHoursEnd) {
      const startTime = new Date(`1970-01-01T${data.businessHoursStart}:00`);
      const endTime = new Date(`1970-01-01T${data.businessHoursEnd}:00`);

      if (startTime >= endTime) {
        errors.businessHoursEnd = 'End time must be after start time';
      }
    }

    if (!data.businessHoursTimezone) {
      errors.businessHoursTimezone = 'Please select a timezone';
    }

    return errors;
  }, []);

  /**
   * Handle form field changes with proper type safety
   */
  const handleFieldChange = useCallback(
    (field: keyof AgencyEditFormData, value: string | number | boolean) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field
      if (formErrors[field as keyof FormErrors]) {
        setFormErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    },
    [formErrors]
  );

  /**
   * Handle form submission with comprehensive data
   */
  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      console.log('🔄 AgencyEditModal: Enhanced form submission started');
      event.preventDefault();

      if (!agency) {
        console.error('❌ AgencyEditModal: No agency provided');
        return;
      }

      console.log('📝 AgencyEditModal: Enhanced form data:', formData);

      // Validate form
      const errors = validateForm(formData);
      console.log('✅ AgencyEditModal: Validation errors:', errors);

      if (Object.keys(errors).length > 0) {
        console.log('❌ AgencyEditModal: Form validation failed');
        setFormErrors(errors);
        return;
      }

      try {
        console.log('🚀 AgencyEditModal: Starting enhanced submission...');
        setSubmitting(true);

        // Prepare comprehensive update data
        const updateData = {
          // Basic Information
          name: formData.name,
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          status: formData.status,

          // Comprehensive Settings
          settings: {
            // Financial Settings
            allowCreditSales: formData.allowCreditSales,
            defaultCreditDays: formData.defaultCreditDays,
            maxCreditLimit: formData.maxCreditLimit,
            requireApprovalForOrders: formData.requireApprovalForOrders,
            taxRate: formData.taxRate,
            currency: formData.currency,

            // Operational Settings
            enableInventoryTracking: formData.enableInventoryTracking,
            businessHours: {
              start: formData.businessHoursStart,
              end: formData.businessHoursEnd,
              timezone: formData.businessHoursTimezone,
            },

            // Notification Settings
            notifications: {
              lowStock: formData.notificationsLowStock,
              overduePayments: formData.notificationsOverduePayments,
              newOrders: formData.notificationsNewOrders,
            },
          },
        };

        console.log('📤 AgencyEditModal: Sending comprehensive update data:', updateData);

        await onSubmit(agency.id, updateData);

        console.log('✅ AgencyEditModal: Enhanced submission successful');
        onClose();
      } catch (error) {
        console.error('❌ AgencyEditModal: Enhanced submission failed:', error);
        setFormErrors({ name: error instanceof Error ? error.message : 'Update failed' });
      } finally {
        setSubmitting(false);
        console.log('🏁 AgencyEditModal: Enhanced submission completed');
      }
    },
    [agency, formData, validateForm, onSubmit, onClose]
  );

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (!submitting) {
      onClose();
    }
  }, [submitting, onClose]);

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  /**
   * Get status color
   */
  const getStatusColor = useCallback(
    (status: Agency['status']) => {
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
    },
    [theme]
  );

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth='lg'
          fullWidth
          data-testid={testId}
          PaperProps={{
            component: motion.div,
            initial: { opacity: 0, scale: 0.9, y: 20 },
            animate: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 0, scale: 0.9, y: 20 },
            transition: { duration: 0.3 },
            sx: {
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              maxHeight: '90vh',
            },
          }}
        >
          {/* Enhanced Header */}
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pb: 2,
              background: 'linear-gradient(135deg, rgba(81, 63, 242, 0.08) 0%, rgba(107, 82, 245, 0.08) 100%)',
              borderBottom: '1px solid rgba(81, 63, 242, 0.12)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BusinessIcon color='primary' sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant='h5' sx={{ fontWeight: 600 }}>
                  Edit Agency Settings
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Manage comprehensive agency configuration and settings
                </Typography>
              </Box>
            </Box>

            <IconButton
              onClick={handleClose}
              disabled={submitting}
              sx={{
                color: 'text.secondary',
                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          {/* Enhanced Content with Tabs */}
          <Box component='form' onSubmit={handleSubmit}>
            <DialogContent sx={{ px: 0, py: 0 }}>
              {error && (
                <Alert severity='error' sx={{ m: 3, mb: 0 }}>
                  {error}
                </Alert>
              )}

              {/* Settings Navigation Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 3 }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  aria-label='agency settings tabs'
                  variant='fullWidth'
                  textColor='primary'
                  indicatorColor='primary'
                >
                  <Tab
                    icon={<InfoIcon />}
                    label='Basic Information'
                    id='settings-tab-0'
                    aria-controls='settings-tabpanel-0'
                  />
                  <Tab
                    icon={<FinancialIcon />}
                    label='Financial Settings'
                    id='settings-tab-1'
                    aria-controls='settings-tabpanel-1'
                  />
                  <Tab
                    icon={<OperationalIcon />}
                    label='Operational Settings'
                    id='settings-tab-2'
                    aria-controls='settings-tabpanel-2'
                  />
                </Tabs>
              </Box>

              {/* Tab Panels */}
              <Box sx={{ px: 3, minHeight: '400px' }}>
                {/* Basic Information Tab */}
                <TabPanel value={activeTab} index={0}>
                  <Grid container spacing={3}>
                    {/* Agency Name */}
                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        label='Agency Name'
                        value={formData.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        error={!!formErrors.name}
                        helperText={formErrors.name}
                        disabled={submitting}
                        required
                        variant='outlined'
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position='start'>
                              <BusinessIcon color='action' />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    {/* Status */}
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth disabled={submitting}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={formData.status}
                          label='Status'
                          onChange={(e) => handleFieldChange('status', e.target.value as Agency['status'])}
                        >
                          <MenuItem value='active'>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: getStatusColor('active'),
                                }}
                              />
                              Active
                            </Box>
                          </MenuItem>
                          <MenuItem value='inactive'>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: getStatusColor('inactive'),
                                }}
                              />
                              Inactive
                            </Box>
                          </MenuItem>
                          <MenuItem value='suspended'>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: getStatusColor('suspended'),
                                }}
                              />
                              Suspended
                            </Box>
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Contact Person */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label='Contact Person'
                        value={formData.contactPerson}
                        onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
                        error={!!formErrors.contactPerson}
                        helperText={formErrors.contactPerson}
                        disabled={submitting}
                        variant='outlined'
                      />
                    </Grid>

                    {/* Email */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label='Email Address'
                        type='email'
                        value={formData.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        error={!!formErrors.email}
                        helperText={formErrors.email}
                        disabled={submitting}
                        variant='outlined'
                      />
                    </Grid>

                    {/* Phone */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label='Phone Number'
                        value={formData.phone}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        error={!!formErrors.phone}
                        helperText={formErrors.phone}
                        disabled={submitting}
                        variant='outlined'
                      />
                    </Grid>

                    {/* Address */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label='Address'
                        value={formData.address}
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                        error={!!formErrors.address}
                        helperText={formErrors.address}
                        disabled={submitting}
                        variant='outlined'
                        multiline
                        rows={2}
                      />
                    </Grid>
                  </Grid>
                </TabPanel>

                {/* Financial Settings Tab */}
                <TabPanel value={activeTab} index={1}>
                  <Grid container spacing={3}>
                    {/* Credit Sales Settings */}
                    <Grid item xs={12}>
                      <Card sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant='h6' sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <CreditIcon color='primary' />
                            Credit Sales Configuration
                          </Typography>

                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={formData.allowCreditSales}
                                    onChange={(e) => handleFieldChange('allowCreditSales', e.target.checked)}
                                    disabled={submitting}
                                    color='primary'
                                  />
                                }
                                label='Allow Credit Sales'
                              />
                              <Typography variant='caption' display='block' color='text.secondary'>
                                Enable customers to purchase on credit
                              </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={formData.requireApprovalForOrders}
                                    onChange={(e) => handleFieldChange('requireApprovalForOrders', e.target.checked)}
                                    disabled={submitting}
                                    color='primary'
                                  />
                                }
                                label='Require Order Approval'
                              />
                              <Typography variant='caption' display='block' color='text.secondary'>
                                Require approval for new orders
                              </Typography>
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <TextField
                                fullWidth
                                label='Default Credit Days'
                                type='number'
                                value={formData.defaultCreditDays}
                                onChange={(e) => handleFieldChange('defaultCreditDays', parseInt(e.target.value))}
                                error={!!formErrors.defaultCreditDays}
                                helperText={formErrors.defaultCreditDays || 'Days customers have to pay'}
                                disabled={submitting || !formData.allowCreditSales}
                                variant='outlined'
                                inputProps={{ min: 1, max: 365 }}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <TextField
                                fullWidth
                                label='Maximum Credit Limit'
                                type='number'
                                value={formData.maxCreditLimit}
                                onChange={(e) => handleFieldChange('maxCreditLimit', parseFloat(e.target.value))}
                                error={!!formErrors.maxCreditLimit}
                                helperText={formErrors.maxCreditLimit || 'Maximum credit amount per customer'}
                                disabled={submitting || !formData.allowCreditSales}
                                variant='outlined'
                                inputProps={{ min: 0, step: 100 }}
                                InputProps={{
                                  startAdornment: <InputAdornment position='start'>$</InputAdornment>,
                                }}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <FormControl fullWidth disabled={submitting}>
                                <InputLabel>Currency</InputLabel>
                                <Select
                                  value={formData.currency}
                                  label='Currency'
                                  onChange={(e) => handleFieldChange('currency', e.target.value)}
                                  error={!!formErrors.currency}
                                >
                                  {CURRENCY_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                      {option.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Tax Configuration */}
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant='h6' sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <TaxIcon color='primary' />
                            Tax Configuration
                          </Typography>

                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label='Tax Rate'
                                type='number'
                                value={(formData.taxRate * 100).toFixed(2)} // Convert to percentage for display
                                onChange={(e) => handleFieldChange('taxRate', parseFloat(e.target.value) / 100)} // Convert back to decimal
                                error={!!formErrors.taxRate}
                                helperText={formErrors.taxRate || 'Tax rate as percentage (e.g., 15 for 15%)'}
                                disabled={submitting}
                                variant='outlined'
                                inputProps={{ min: 0, max: 100, step: 0.01 }}
                                InputProps={{
                                  endAdornment: <InputAdornment position='end'>%</InputAdornment>,
                                }}
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </TabPanel>

                {/* Operational Settings Tab */}
                <TabPanel value={activeTab} index={2}>
                  <Grid container spacing={3}>
                    {/* Inventory Settings */}
                    <Grid item xs={12}>
                      <Card sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant='h6' sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <InventoryIcon color='primary' />
                            Inventory Management
                          </Typography>

                          <FormControlLabel
                            control={
                              <Switch
                                checked={formData.enableInventoryTracking}
                                onChange={(e) => handleFieldChange('enableInventoryTracking', e.target.checked)}
                                disabled={submitting}
                                color='primary'
                              />
                            }
                            label='Enable Inventory Tracking'
                          />
                          <Typography variant='caption' display='block' color='text.secondary'>
                            Track stock levels for products and batches
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Business Hours */}
                    <Grid item xs={12}>
                      <Card sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant='h6' sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <TimeIcon color='primary' />
                            Business Hours
                          </Typography>

                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <TextField
                                fullWidth
                                label='Start Time'
                                type='time'
                                value={formData.businessHoursStart}
                                onChange={(e) => handleFieldChange('businessHoursStart', e.target.value)}
                                error={!!formErrors.businessHoursStart}
                                helperText={formErrors.businessHoursStart}
                                disabled={submitting}
                                variant='outlined'
                                InputLabelProps={{ shrink: true }}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <TextField
                                fullWidth
                                label='End Time'
                                type='time'
                                value={formData.businessHoursEnd}
                                onChange={(e) => handleFieldChange('businessHoursEnd', e.target.value)}
                                error={!!formErrors.businessHoursEnd}
                                helperText={formErrors.businessHoursEnd}
                                disabled={submitting}
                                variant='outlined'
                                InputLabelProps={{ shrink: true }}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <FormControl fullWidth disabled={submitting}>
                                <InputLabel>Timezone</InputLabel>
                                <Select
                                  value={formData.businessHoursTimezone}
                                  label='Timezone'
                                  onChange={(e) => handleFieldChange('businessHoursTimezone', e.target.value)}
                                  error={!!formErrors.businessHoursTimezone}
                                >
                                  {TIMEZONE_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                      {option.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Notification Settings */}
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant='h6' sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <NotificationIcon color='primary' />
                            Notification Preferences
                          </Typography>

                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={formData.notificationsLowStock}
                                    onChange={(e) => handleFieldChange('notificationsLowStock', e.target.checked)}
                                    disabled={submitting}
                                    color='primary'
                                  />
                                }
                                label='Low Stock Alerts'
                              />
                              <Typography variant='caption' display='block' color='text.secondary'>
                                Notify when inventory is running low
                              </Typography>
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={formData.notificationsOverduePayments}
                                    onChange={(e) =>
                                      handleFieldChange('notificationsOverduePayments', e.target.checked)
                                    }
                                    disabled={submitting}
                                    color='primary'
                                  />
                                }
                                label='Overdue Payment Alerts'
                              />
                              <Typography variant='caption' display='block' color='text.secondary'>
                                Notify about overdue customer payments
                              </Typography>
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={formData.notificationsNewOrders}
                                    onChange={(e) => handleFieldChange('notificationsNewOrders', e.target.checked)}
                                    disabled={submitting}
                                    color='primary'
                                  />
                                }
                                label='New Order Notifications'
                              />
                              <Typography variant='caption' display='block' color='text.secondary'>
                                Notify when new orders are received
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </TabPanel>
              </Box>
            </DialogContent>

            {/* Enhanced Actions */}
            <DialogActions
              sx={{
                p: 3,
                pt: 2,
                background: 'rgba(0, 0, 0, 0.02)',
                borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                gap: 2,
              }}
            >
              <Button
                onClick={handleClose}
                disabled={submitting}
                startIcon={<CancelIcon />}
                variant='outlined'
                sx={{ minWidth: 120 }}
              >
                Cancel
              </Button>

              <Button
                type='submit'
                disabled={submitting || loading}
                variant='contained'
                startIcon={submitting ? <CircularProgress size={16} /> : <SaveIcon />}
                sx={{
                  minWidth: 140,
                  background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4338ca 0%, #513ff2 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(81, 63, 242, 0.3)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {submitting ? 'Saving Settings...' : 'Save All Settings'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
