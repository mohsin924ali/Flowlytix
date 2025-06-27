/**
 * User Create Modal Component
 *
 * Professional modal for creating new users with form validation,
 * role assignment, agency assignment, and proper error handling.
 * Only accessible to super administrators.
 *
 * @domain User Management
 * @architecture Clean Architecture - Presentation Layer
 * @version 1.0.0
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
  IconButton,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgencies } from '../../../hooks/useAgencies';

/**
 * User Create Form Data
 */
export interface UserCreateFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin';
  agencyId?: string;
}

/**
 * User Create Modal Props
 */
export interface UserCreateModalProps {
  /** Whether modal is open */
  open: boolean;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when form is submitted */
  onSubmit: (data: UserCreateFormData) => Promise<void>;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Form validation errors
 */
interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  agencyId?: string;
}

/**
 * User Create Modal Component
 */
export const UserCreateModal: React.FC<UserCreateModalProps> = ({
  open,
  loading = false,
  error = null,
  onClose,
  onSubmit,
  'data-testid': testId = 'user-create-modal',
}) => {
  const theme = useTheme();
  const { agencies, loading: agenciesLoading } = useAgencies({
    autoLoad: true,
    initialPageSize: 100,
  });

  // Form state
  const [formData, setFormData] = useState<UserCreateFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'super_admin',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  /**
   * Validate form data
   */
  const validateForm = useCallback((data: UserCreateFormData): FormErrors => {
    const errors: FormErrors = {};

    // Email validation
    if (!data.email || !data.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!data.password || data.password.length === 0) {
      errors.password = 'Password is required';
    } else if (data.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!data.confirmPassword || data.confirmPassword.length === 0) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (data.password !== data.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // First name validation
    if (!data.firstName || !data.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (data.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!data.lastName || !data.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (data.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    // Role validation
    if (!data.role || data.role.trim() === '') {
      errors.role = 'Role is required';
    }

    // Agency validation for admin users only
    if (data.role === 'admin' && (!data.agencyId || data.agencyId.trim() === '')) {
      errors.agencyId = 'Agency assignment is required for admin users';
    }

    return errors;
  }, []);

  /**
   * Reset form when modal opens/closes
   */
  useEffect(() => {
    if (open) {
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        role: 'super_admin',
      });
      setFormErrors({});
      setShowPassword(false);
      setShowConfirmPassword(false);
      setIsFormValid(false);
    }
  }, [open]);

  /**
   * Validate form whenever form data changes
   */
  useEffect(() => {
    const errors = validateForm(formData);
    const hasErrors = Object.keys(errors).length > 0;

    // Debug logging - always log for debugging
    console.log('=== FORM VALIDATION DEBUG ===');
    console.log('Form data:', formData);
    console.log('Validation errors:', errors);
    console.log('Has errors:', hasErrors);
    console.log('Form valid:', !hasErrors);
    console.log('==============================');

    setIsFormValid(!hasErrors);
  }, [formData, validateForm]);

  /**
   * Handle form field changes
   */
  const handleFieldChange = useCallback(
    (field: keyof UserCreateFormData, value: string) => {
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

      // Clear agency assignment when role changes to super_admin
      if (field === 'role' && value === 'super_admin') {
        setFormData((prev) => {
          const newData = { ...prev };
          delete newData.agencyId;
          return newData;
        });
      }
    },
    [formErrors]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      // Validate form
      const errors = validateForm(formData);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      try {
        setSubmitting(true);
        await onSubmit(formData);
        onClose();
      } catch (error) {
        console.error('Failed to create user:', error);
      } finally {
        setSubmitting(false);
      }
    },
    [formData, validateForm, onSubmit, onClose]
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
   * Toggle password visibility
   */
  const handleTogglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleToggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  /**
   * Get role display name
   */
  const getRoleDisplayName = useCallback((role: string): string => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrator';
      case 'admin':
        return 'Agency Administrator';
      default:
        return role;
    }
  }, []);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='md'
      fullWidth
      data-testid={testId}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: theme.shadows[24],
        },
      }}
    >
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(
            theme.palette.primary.main,
            0.05
          )} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PersonIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Box>
              <Typography variant='h5' fontWeight='bold' color='primary.main'>
                Create New User
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Add a new administrator to the system
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={handleClose}
            disabled={submitting}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                color: 'error.main',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity='error' sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component='form' onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Email */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Email Address'
                type='email'
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                error={!!formErrors.email}
                helperText={formErrors.email}
                disabled={submitting}
                required
                variant='outlined'
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <EmailIcon color='action' />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* First Name & Last Name */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label='First Name'
                value={formData.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                error={!!formErrors.firstName}
                helperText={formErrors.firstName}
                disabled={submitting}
                required
                variant='outlined'
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label='Last Name'
                value={formData.lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                error={!!formErrors.lastName}
                helperText={formErrors.lastName}
                disabled={submitting}
                required
                variant='outlined'
              />
            </Grid>

            {/* Password */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label='Password'
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                error={!!formErrors.password}
                helperText={formErrors.password}
                disabled={submitting}
                required
                variant='outlined'
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <LockIcon color='action' />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton onClick={handleTogglePasswordVisibility} edge='end' disabled={submitting}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Confirm Password */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label='Confirm Password'
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                error={!!formErrors.confirmPassword}
                helperText={formErrors.confirmPassword}
                disabled={submitting}
                required
                variant='outlined'
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <LockIcon color='action' />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton onClick={handleToggleConfirmPasswordVisibility} edge='end' disabled={submitting}>
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Role */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!formErrors.role}>
                <InputLabel>User Role</InputLabel>
                <Select
                  value={formData.role}
                  label='User Role'
                  onChange={(e) => handleFieldChange('role', e.target.value)}
                  disabled={submitting}
                >
                  <MenuItem value='admin'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon fontSize='small' />
                      Agency Administrator
                    </Box>
                  </MenuItem>
                  <MenuItem value='super_admin'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon fontSize='small' />
                      Super Administrator
                    </Box>
                  </MenuItem>
                </Select>
                {formErrors.role && (
                  <Typography variant='caption' color='error' sx={{ mt: 0.5, ml: 1.5 }}>
                    {formErrors.role}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Agency Assignment (only for admin users) */}
            {formData.role === 'admin' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required error={!!formErrors.agencyId}>
                  <InputLabel>Assign to Agency</InputLabel>
                  <Select
                    value={formData.agencyId || ''}
                    label='Assign to Agency'
                    onChange={(e) => handleFieldChange('agencyId', e.target.value)}
                    disabled={submitting || agenciesLoading}
                    startAdornment={
                      <InputAdornment position='start'>
                        <BusinessIcon color='action' />
                      </InputAdornment>
                    }
                  >
                    {agencies.map((agency) => (
                      <MenuItem key={agency.id} value={agency.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BusinessIcon fontSize='small' />
                          <Box>
                            <Typography variant='body2'>{agency.name}</Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {agency.contactPerson || 'No contact person'}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.agencyId && (
                    <Typography variant='caption' color='error' sx={{ mt: 0.5, ml: 1.5 }}>
                      {formErrors.agencyId}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            )}

            {/* Role Information */}
            <Grid item xs={12}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                }}
              >
                <Typography variant='subtitle2' color='info.main' gutterBottom>
                  Role Information
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {formData.role === 'super_admin'
                    ? 'Super Administrators have full system access and can manage all agencies, users, and system settings.'
                    : 'Agency Administrators can manage their assigned agency, including customers, products, orders, and employees.'}
                </Typography>
                {formData.role === 'admin' && (
                  <Chip
                    label='Agency Assignment Required'
                    size='small'
                    color='warning'
                    variant='outlined'
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{
          p: 3,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: alpha(theme.palette.background.default, 0.5),
        }}
      >
        <Button onClick={handleClose} disabled={submitting} startIcon={<CancelIcon />} sx={{ mr: 1 }}>
          Cancel
        </Button>

        {/* Debug button - temporary */}
        <Button onClick={() => setIsFormValid(true)} variant='outlined' color='warning' sx={{ mr: 1 }}>
          Force Enable
        </Button>

        <Button
          onClick={handleSubmit}
          variant='contained'
          disabled={submitting || !isFormValid}
          startIcon={submitting ? <CircularProgress size={16} /> : <SaveIcon />}
          sx={{
            background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4c38e8 0%, #5f47f0 100%)',
            },
            '&:disabled': {
              background: '#e0e0e0',
              color: '#9e9e9e',
            },
          }}
          data-testid='create-user-button'
        >
          {submitting ? 'Creating...' : `Create User ${isFormValid ? '✓' : '✗'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
