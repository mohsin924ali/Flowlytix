/**
 * Agency Edit Modal Component
 *
 * Professional modal for editing agency details with form validation,
 * loading states, and error handling. Follows Material-UI design patterns.
 *
 * @domain Agency Management
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
  Chip,
  IconButton,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Agency } from '../../services/AgencyService';

/**
 * Agency Edit Form Data
 */
export interface AgencyEditFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  status: Agency['status'];
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
  onSubmit: (agencyId: string, data: AgencyEditFormData) => Promise<void>;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Form validation errors
 */
interface FormErrors {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

/**
 * Agency Edit Modal Component
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

  // Form state
  const [formData, setFormData] = useState<AgencyEditFormData>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  /**
   * Initialize form data when agency changes
   */
  useEffect(() => {
    if (agency) {
      setFormData({
        name: agency.name || '',
        contactPerson: agency.contactPerson || '',
        email: agency.email || '',
        phone: agency.phone || '',
        address: agency.address || '',
        status: agency.status || 'active',
      });
      setFormErrors({});
    }
  }, [agency]);

  /**
   * Validate form data
   */
  const validateForm = useCallback((data: AgencyEditFormData): FormErrors => {
    const errors: FormErrors = {};

    // Name validation
    if (!data.name.trim()) {
      errors.name = 'Agency name is required';
    } else if (data.name.trim().length < 2) {
      errors.name = 'Agency name must be at least 2 characters';
    }

    // Email validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (data.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(data.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

    return errors;
  }, []);

  /**
   * Handle form field changes
   */
  const handleFieldChange = useCallback(
    (field: keyof AgencyEditFormData, value: string) => {
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
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!agency) return;

      // Validate form
      const errors = validateForm(formData);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      try {
        setSubmitting(true);
        await onSubmit(agency.id, formData);
        onClose();
      } catch (error) {
        console.error('Failed to update agency:', error);
      } finally {
        setSubmitting(false);
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
          maxWidth='md'
          fullWidth
          data-testid={testId}
          PaperProps={{
            component: motion.div,
            initial: { opacity: 0, scale: 0.9, y: 20 },
            animate: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 0, scale: 0.9, y: 20 },
            transition: { duration: 0.2 },
            sx: {
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          {/* Header */}
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pb: 1,
              background: 'linear-gradient(135deg, rgba(81, 63, 242, 0.05) 0%, rgba(107, 82, 245, 0.05) 100%)',
              borderBottom: '1px solid rgba(81, 63, 242, 0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BusinessIcon color='primary' />
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 600 }}>
                  Edit Agency
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Update agency information and settings
                </Typography>
              </Box>
            </Box>

            <IconButton onClick={handleClose} disabled={submitting} sx={{ color: 'text.secondary' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          {/* Content */}
          <DialogContent sx={{ pt: 3 }}>
            {error && (
              <Alert severity='error' sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component='form' onSubmit={handleSubmit}>
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
            </Box>
          </DialogContent>

          {/* Actions */}
          <DialogActions
            sx={{
              p: 3,
              pt: 2,
              background: 'rgba(0, 0, 0, 0.02)',
              borderTop: '1px solid rgba(0, 0, 0, 0.05)',
            }}
          >
            <Button onClick={handleClose} disabled={submitting} startIcon={<CancelIcon />} sx={{ mr: 1 }}>
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={submitting || loading}
              variant='contained'
              startIcon={submitting ? <CircularProgress size={16} /> : <SaveIcon />}
              sx={{
                minWidth: 120,
                background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4338ca 0%, #513ff2 100%)',
                },
              }}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
