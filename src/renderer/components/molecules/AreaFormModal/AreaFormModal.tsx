/**
 * Area Form Modal Component
 *
 * Modal component for creating and editing areas.
 * Provides form validation, error handling, and geographic data input
 * with a modern, accessible UI following the application's design system.
 *
 * Features:
 * - Create/Edit area functionality
 * - Form validation with real-time feedback
 * - Geographic coordinates input
 * - Status management
 * - Error handling and loading states
 * - Accessible form controls
 * - Responsive design
 *
 * @domain Area Management
 * @pattern Modal Form Component
 * @architecture React Component
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormHelperText,
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon, Add as AddIcon } from '@mui/icons-material';

/**
 * Area interface (simplified to avoid complex imports)
 */
export interface Area {
  id: string;
  agencyId: string;
  areaCode: string;
  areaName: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Area Form Modal Props
 */
export interface AreaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (area: Area) => void;
  area?: Area | null;
  agencyId: string;
  currentUserId: string;
}

/**
 * Form Data Interface
 */
interface AreaFormData {
  areaCode: string;
  areaName: string;
  description: string;
  latitude: string;
  longitude: string;
  status: 'ACTIVE' | 'INACTIVE';
}

/**
 * Form Errors Interface
 */
interface FormErrors {
  areaCode?: string;
  areaName?: string;
  description?: string;
  latitude?: string;
  longitude?: string;
  status?: string;
  general?: string;
}

/**
 * Area Form Modal Component
 */
export const AreaFormModal: React.FC<AreaFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  area,
  agencyId,
  currentUserId,
}) => {
  // State management
  const [formData, setFormData] = useState<AreaFormData>({
    areaCode: '',
    areaName: '',
    description: '',
    latitude: '',
    longitude: '',
    status: 'ACTIVE',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if this is edit mode
  const isEditMode = Boolean(area);
  const modalTitle = isEditMode ? 'Edit Area' : 'Create New Area';
  const submitButtonText = isEditMode ? 'Update Area' : 'Create Area';

  // Initialize form data when modal opens or area changes
  useEffect(() => {
    if (isOpen) {
      if (area) {
        // Edit mode - populate form with area data
        setFormData({
          areaCode: area.areaCode,
          areaName: area.areaName,
          description: area.description || '',
          latitude: area.latitude?.toString() || '',
          longitude: area.longitude?.toString() || '',
          status: area.status,
        });
      } else {
        // Create mode - reset form
        setFormData({
          areaCode: '',
          areaName: '',
          description: '',
          latitude: '',
          longitude: '',
          status: 'ACTIVE',
        });
      }
      setErrors({});
    }
  }, [isOpen, area]);

  /**
   * Handle form field changes
   */
  const handleFieldChange = (field: keyof AreaFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate area code
    if (!formData.areaCode.trim()) {
      newErrors.areaCode = 'Area code is required';
    } else if (!/^[A-Z0-9_-]{2,20}$/.test(formData.areaCode.trim())) {
      newErrors.areaCode = 'Area code must be 2-20 characters, uppercase letters, numbers, underscore, or dash only';
    }

    // Validate area name
    if (!formData.areaName.trim()) {
      newErrors.areaName = 'Area name is required';
    } else if (formData.areaName.trim().length < 2 || formData.areaName.trim().length > 100) {
      newErrors.areaName = 'Area name must be between 2 and 100 characters';
    }

    // Validate description (optional)
    if (formData.description.trim() && formData.description.trim().length > 500) {
      newErrors.description = 'Description must not exceed 500 characters';
    }

    // Validate coordinates (both or neither)
    const hasLatitude = formData.latitude.trim() !== '';
    const hasLongitude = formData.longitude.trim() !== '';

    if (hasLatitude !== hasLongitude) {
      const message = 'Both latitude and longitude must be provided together';
      newErrors.latitude = message;
      newErrors.longitude = message;
    } else if (hasLatitude && hasLongitude) {
      // Validate latitude
      const lat = parseFloat(formData.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.latitude = 'Latitude must be a number between -90 and 90';
      }

      // Validate longitude
      const lng = parseFloat(formData.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.longitude = 'Longitude must be a number between -180 and 180';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSubmitting) return;

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Use MockAreaService instead of IPC
      const { MockAreaService } = await import('../../../mocks/services/MockAreaService');

      if (isEditMode && area) {
        // Update existing area
        const updateData = {
          areaId: area.id,
          areaName: formData.areaName.trim(),
          description: formData.description.trim() || undefined,
          status: formData.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
          updatedBy: currentUserId,
        };

        const updatedArea = await MockAreaService.updateArea(updateData);
        // Convert MockAreaService Area to component Area format
        const resultArea: Area = {
          id: updatedArea.id,
          agencyId: updatedArea.agencyId,
          areaCode: updatedArea.areaCode,
          areaName: updatedArea.areaName,
          description: updatedArea.description,
          latitude: updatedArea.latitude,
          longitude: updatedArea.longitude,
          status: updatedArea.status as 'ACTIVE' | 'INACTIVE',
          createdAt: updatedArea.createdAt.toISOString(),
          updatedAt: updatedArea.updatedAt?.toISOString() || new Date().toISOString(),
          createdBy: updatedArea.createdBy,
        };
        onSuccess(resultArea);
        onClose();
      } else {
        // Create new area
        const createData = {
          agencyId,
          areaCode: formData.areaCode.trim().toUpperCase(),
          areaName: formData.areaName.trim(),
          description: formData.description.trim() || undefined,
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
          createdBy: currentUserId,
        };

        const createdArea = await MockAreaService.createArea(createData);
        // Convert MockAreaService Area to component Area format
        const resultArea: Area = {
          id: createdArea.id,
          agencyId: createdArea.agencyId,
          areaCode: createdArea.areaCode,
          areaName: createdArea.areaName,
          description: createdArea.description,
          latitude: createdArea.latitude,
          longitude: createdArea.longitude,
          status: createdArea.status as 'ACTIVE' | 'INACTIVE',
          createdAt: createdArea.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: createdArea.createdBy,
        };
        onSuccess(resultArea);
        onClose();
      }
    } catch (error) {
      console.error('Area form submission error:', error);
      setErrors({
        general: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth='md' fullWidth aria-labelledby='area-form-dialog-title'>
      <DialogTitle
        id='area-form-dialog-title'
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isEditMode ? null : <AddIcon color='primary' />}
          <Typography variant='h6' component='span'>
            {modalTitle}
          </Typography>
        </Box>
        <Button
          onClick={handleClose}
          size='small'
          color='inherit'
          disabled={isSubmitting}
          sx={{ minWidth: 'auto', p: 0.5 }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {errors.general && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {errors.general}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Area Code */}
            <Grid item xs={12} sm={6}>
              <TextField
                label='Area Code'
                value={formData.areaCode}
                onChange={(e) => handleFieldChange('areaCode', e.target.value.toUpperCase())}
                error={Boolean(errors.areaCode)}
                helperText={errors.areaCode || 'Required. 2-20 chars, A-Z, 0-9, _, -'}
                fullWidth
                required
                disabled={isEditMode || isSubmitting}
                inputProps={{
                  maxLength: 20,
                  style: { textTransform: 'uppercase' },
                }}
              />
            </Grid>

            {/* Area Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                label='Area Name'
                value={formData.areaName}
                onChange={(e) => handleFieldChange('areaName', e.target.value)}
                error={Boolean(errors.areaName)}
                helperText={errors.areaName || 'Required. 2-100 characters'}
                fullWidth
                required
                disabled={isSubmitting}
                inputProps={{ maxLength: 100 }}
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isSubmitting}>
                <InputLabel id='area-status-label'>Status</InputLabel>
                <Select
                  labelId='area-status-label'
                  value={formData.status}
                  label='Status'
                  onChange={(e) => handleFieldChange('status', e.target.value as 'ACTIVE' | 'INACTIVE')}
                >
                  <MenuItem value='ACTIVE'>Active</MenuItem>
                  <MenuItem value='INACTIVE'>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                label='Description'
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                error={Boolean(errors.description)}
                helperText={errors.description || 'Optional. Max 500 characters'}
                fullWidth
                multiline
                rows={3}
                disabled={isSubmitting}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>

            {/* Geographic Coordinates */}
            <Grid item xs={12}>
              <Typography variant='subtitle2' gutterBottom>
                Geographic Coordinates (Optional)
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label='Latitude'
                value={formData.latitude}
                onChange={(e) => handleFieldChange('latitude', e.target.value)}
                error={Boolean(errors.latitude)}
                helperText={errors.latitude || 'Decimal degrees (-90 to 90)'}
                fullWidth
                type='number'
                disabled={isSubmitting}
                inputProps={{
                  step: 'any',
                  min: -90,
                  max: 90,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label='Longitude'
                value={formData.longitude}
                onChange={(e) => handleFieldChange('longitude', e.target.value)}
                error={Boolean(errors.longitude)}
                helperText={errors.longitude || 'Decimal degrees (-180 to 180)'}
                fullWidth
                type='number'
                disabled={isSubmitting}
                inputProps={{
                  step: 'any',
                  min: -180,
                  max: 180,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={isSubmitting} color='inherit'>
            Cancel
          </Button>
          <Button
            type='submit'
            variant='contained'
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {isSubmitting ? 'Saving...' : submitButtonText}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AreaFormModal;
