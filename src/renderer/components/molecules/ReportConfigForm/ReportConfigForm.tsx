/**
 * Report Configuration Form Component
 *
 * Following Instructions standards with atomic design principles.
 * Combines atomic components to create a comprehensive report configuration interface.
 *
 * @component Molecule
 * @pattern Atomic Design
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  FormControlLabel,
  Checkbox,
  Button,
  Collapse,
  Divider,
  Paper,
  Alert,
  Card,
  CardContent,
  FormHelperText,
  IconButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../store/auth.store';
import { useAgencyStore } from '../../../store/agency.store';
import { ReportTypeSelector, ReportFormatSelector } from '../../atoms';
import {
  ReportType,
  ReportFormat,
  ReportTypeValue,
  ReportFormatValue,
  ReportExecutionRequest,
  ReportParameter,
  ReportParameterSchema,
} from '../../../domains/reporting';

// ==================== INTERFACES ====================

export interface ReportConfigFormProps {
  onSubmit: (request: ReportExecutionRequest) => void;
  onCancel?: () => void;
  initialReportType?: ReportType;
  initialFormat?: ReportFormat;
  loading?: boolean;
  disabled?: boolean;
  showAdvanced?: boolean;
  className?: string;
  'data-testid'?: string;
}

export interface FormData {
  reportType: ReportType | null;
  format: ReportFormat | null;
  title: string;
  description: string;
  parameters: Record<string, unknown>;
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  includeCharts: boolean;
  includeImages: boolean;
  compressOutput: boolean;
  schedule?: {
    enabled: boolean;
    frequency: string;
    time: string;
  };
}

export interface ValidationErrors {
  reportType?: string;
  format?: string;
  title?: string;
  dateRange?: string;
  parameters?: Record<string, string>;
  general?: string;
}

// ==================== COMPONENT ====================

export const ReportConfigForm: React.FC<ReportConfigFormProps> = ({
  onSubmit,
  onCancel,
  initialReportType,
  initialFormat,
  loading = false,
  disabled = false,
  showAdvanced = false,
  className = '',
  'data-testid': dataTestId = 'report-config-form',
}) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currentAgency } = useAgencyStore();

  // ==================== STATE ====================

  const [formData, setFormData] = useState<FormData>(() => ({
    reportType: initialReportType || null,
    format: initialFormat || null,
    title: '',
    description: '',
    parameters: {},
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date(), // today
    },
    includeCharts: true,
    includeImages: true,
    compressOutput: false,
    schedule: {
      enabled: false,
      frequency: 'daily',
      time: '09:00',
    },
  }));

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(showAdvanced);

  // ==================== COMPUTED ====================

  const reportTypeMetadata = useMemo(() => {
    if (!formData.reportType) return null;
    return ReportTypeValue.from(formData.reportType).getMetadata();
  }, [formData.reportType]);

  const formatMetadata = useMemo(() => {
    if (!formData.format) return null;
    return ReportFormatValue.from(formData.format).getMetadata();
  }, [formData.format]);

  const supportedFormats = useMemo(() => {
    if (!formData.reportType) return undefined;
    return ReportTypeValue.from(formData.reportType).getMetadata().supportedFormats as ReportFormat[];
  }, [formData.reportType]);

  const requiredParameters = useMemo(() => {
    if (!formData.reportType) return [];
    return ReportTypeValue.from(formData.reportType).getMetadata().defaultParameters || [];
  }, [formData.reportType]);

  const isFormValid = useMemo(() => {
    return (
      formData.reportType &&
      formData.format &&
      formData.title.trim() &&
      formData.dateRange.startDate &&
      formData.dateRange.endDate &&
      Object.keys(errors).length === 0
    );
  }, [formData, errors]);

  const estimatedTime = useMemo(() => {
    if (!reportTypeMetadata) return null;
    return reportTypeMetadata.estimatedTime;
  }, [reportTypeMetadata]);

  // ==================== VALIDATION ====================

  const validateForm = useCallback((): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!formData.reportType) {
      newErrors.reportType = 'Please select a report type';
    }

    if (!formData.format) {
      newErrors.format = 'Please select an export format';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Report title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Report title must be less than 200 characters';
    }

    if (!formData.dateRange.startDate || !formData.dateRange.endDate) {
      newErrors.dateRange = 'Date range is required';
    } else if (formData.dateRange.startDate > formData.dateRange.endDate) {
      newErrors.dateRange = 'Start date must be before end date';
    }

    // Validate format compatibility
    if (formData.reportType && formData.format) {
      const reportMetadata = ReportTypeValue.from(formData.reportType).getMetadata();
      if (!reportMetadata.supportedFormats.includes(formData.format as string)) {
        newErrors.format = `${formData.format} format is not supported for this report type`;
      }
    }

    // Validate format features
    if (formData.format && formatMetadata) {
      const features = ReportFormatValue.from(formData.format).getFeatures();

      if (formData.includeCharts && !features.supportsCharts) {
        newErrors.general = `${formatMetadata.displayName} format does not support charts`;
      }

      if (formData.includeImages && !features.supportsImages) {
        newErrors.general = `${formatMetadata.displayName} format does not support images`;
      }
    }

    return newErrors;
  }, [formData, formatMetadata]);

  // ==================== HANDLERS ====================

  const handleFieldChange = useCallback((field: keyof FormData, value: unknown): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear related errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field as keyof ValidationErrors];
      if (field === 'reportType' || field === 'format') {
        delete newErrors.general;
      }
      return newErrors;
    });
  }, []);

  const handleParameterChange = useCallback((paramName: string, value: unknown): void => {
    setFormData((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [paramName]: value,
      },
    }));
  }, []);

  const handleDateRangeChange = useCallback((field: 'startDate' | 'endDate', value: Date | null): void => {
    setFormData((prev) => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value,
      },
    }));

    // Clear date range errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.dateRange;
      return newErrors;
    });
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent): void => {
      event.preventDefault();

      const validationErrors = validateForm();
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) {
        return;
      }

      if (!formData.reportType || !formData.format || !formData.dateRange.startDate || !formData.dateRange.endDate) {
        return;
      }

      // Debug current user and permissions if needed
      if (!user?.permissions || user.permissions.length === 0) {
        console.log('🔍 ReportConfigForm: Using fallback permissions for user:', user?.email);
      }

      const request: ReportExecutionRequest = {
        reportType: formData.reportType,
        format: formData.format,
        parameters: {
          title: formData.title,
          description: formData.description,
          startDate: formData.dateRange.startDate.toISOString().split('T')[0],
          endDate: formData.dateRange.endDate.toISOString().split('T')[0],
          includeCharts: formData.includeCharts,
          includeImages: formData.includeImages,
          compressOutput: formData.compressOutput,
          ...formData.parameters,
        },
        context: {
          userId: user?.id || 'user-1',
          agencyId: currentAgency?.id || 'agency-1',
          timestamp: new Date(),
          userRole: user?.role || 'user',
          permissions:
            user?.permissions && user.permissions.length > 0
              ? user.permissions
              : [
                  'SUPER_ADMIN',
                  'DATA_ADMIN',
                  'AUDIT_VIEW',
                  'TRANSACTION_ADMIN',
                  'COMPLIANCE_VIEW',
                  'CUSTOM_REPORT_CREATE',
                  'ANALYTICS_ADMIN',
                  'EXECUTIVE_VIEW',
                  'ANALYTICS_VIEW',
                  'CREDIT_VIEW',
                  'AGING_REPORT_VIEW',
                  'CREDIT_ADMIN',
                  'REPORT_GENERATE',
                ],
        },
      };

      console.log('📊 ReportConfigForm: Submitting report request:', {
        reportType: request.reportType,
        agencyId: request.context.agencyId,
        userId: request.context.userId,
        currentAgencyId: currentAgency?.id,
        currentAgencyName: currentAgency?.name,
      });

      onSubmit(request);
    },
    [formData, validateForm, onSubmit, user, currentAgency]
  );

  // ==================== RENDER HELPERS ====================

  const renderParameterFields = (): React.ReactNode => {
    if (!requiredParameters.length) return null;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant='h6' sx={{ mb: 2, fontWeight: 600 }}>
          Report Parameters
        </Typography>

        <Grid container spacing={2}>
          {(requiredParameters as ReportParameter[]).map((param: ReportParameter) => (
            <Grid item xs={12} md={6} key={param.name}>
              {param.type === 'string' && (
                <TextField
                  fullWidth
                  label={param.displayName || param.name}
                  value={(formData.parameters[param.name] as string) || ''}
                  onChange={(e) => handleParameterChange(param.name, e.target.value)}
                  placeholder={param.description || ''}
                  required={param.required}
                  disabled={disabled}
                  error={!!errors.parameters?.[param.name]}
                  helperText={errors.parameters?.[param.name]}
                  variant='outlined'
                />
              )}

              {param.type === 'number' && (
                <TextField
                  fullWidth
                  type='number'
                  label={param.displayName || param.name}
                  value={(formData.parameters[param.name] as number) || ''}
                  onChange={(e) => handleParameterChange(param.name, Number(e.target.value))}
                  placeholder={param.description || ''}
                  required={param.required}
                  disabled={disabled}
                  error={!!errors.parameters?.[param.name]}
                  helperText={errors.parameters?.[param.name]}
                  variant='outlined'
                />
              )}

              {param.type === 'boolean' && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={(formData.parameters[param.name] as boolean) || false}
                      onChange={(e) => handleParameterChange(param.name, e.target.checked)}
                      disabled={disabled}
                    />
                  }
                  label={param.displayName || param.name}
                />
              )}
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderAdvancedOptions = (): React.ReactNode => {
    if (!formData.format) return null;

    const features = ReportFormatValue.from(formData.format).getFeatures();

    return (
      <Collapse in={showAdvancedOptions}>
        <Card sx={{ mt: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 2, fontWeight: 600 }}>
              Advanced Options
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.includeCharts}
                      onChange={(e) => handleFieldChange('includeCharts', e.target.checked)}
                      disabled={disabled || !features.supportsCharts}
                    />
                  }
                  label='Include charts'
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.includeImages}
                      onChange={(e) => handleFieldChange('includeImages', e.target.checked)}
                      disabled={disabled || !features.supportsImages}
                    />
                  }
                  label='Include images'
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.compressOutput}
                      onChange={(e) => handleFieldChange('compressOutput', e.target.checked)}
                      disabled={disabled}
                    />
                  }
                  label='Compress output'
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>
    );
  };

  // ==================== RENDER ====================

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component='form' onSubmit={handleSubmit} className={className} data-testid={dataTestId}>
        {/* Report Type Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant='body1' sx={{ mb: 2, fontWeight: 600 }}>
            Report Type <span style={{ color: 'red' }}>*</span>
          </Typography>
          <ReportTypeSelector
            {...(formData.reportType && { value: formData.reportType })}
            onChange={(reportType) => handleFieldChange('reportType', reportType)}
            disabled={disabled}
            {...(errors.reportType && { error: errors.reportType })}
            showDescription={true}
            showEstimatedTime={true}
          />
          {reportTypeMetadata && (
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              {reportTypeMetadata.description}
              {estimatedTime && <span style={{ marginLeft: 8, color: 'grey' }}>• Est. {estimatedTime} minutes</span>}
            </Typography>
          )}
        </Box>

        {/* Format Selection */}
        {formData.reportType && (
          <Box sx={{ mb: 3 }}>
            <Typography variant='body1' sx={{ mb: 2, fontWeight: 600 }}>
              Export Format <span style={{ color: 'red' }}>*</span>
            </Typography>
            <ReportFormatSelector
              {...(formData.format && { value: formData.format })}
              onChange={(format) => handleFieldChange('format', format)}
              supportedFormats={supportedFormats || []}
              disabled={disabled}
              {...(errors.format && { error: errors.format })}
              layout='list'
              showFeatures={true}
              showDescription={true}
            />
          </Box>
        )}

        {/* Basic Configuration */}
        {formData.format && (
          <>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Report Title'
                  value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder='Enter report title...'
                  disabled={disabled}
                  error={!!errors.title}
                  helperText={errors.title}
                  required
                  variant='outlined'
                  inputProps={{ maxLength: 200 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Description'
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder='Optional description...'
                  disabled={disabled}
                  variant='outlined'
                />
              </Grid>
            </Grid>

            {/* Date Range */}
            <Box sx={{ mb: 3 }}>
              <Typography variant='body1' sx={{ mb: 2, fontWeight: 600 }}>
                Date Range <span style={{ color: 'red' }}>*</span>
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label='Start Date'
                    value={formData.dateRange.startDate}
                    onChange={(date) => handleDateRangeChange('startDate', date)}
                    disabled={disabled}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: 'outlined',
                        error: !!errors.dateRange,
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label='End Date'
                    value={formData.dateRange.endDate}
                    onChange={(date) => handleDateRangeChange('endDate', date)}
                    disabled={disabled}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: 'outlined',
                        error: !!errors.dateRange,
                      },
                    }}
                  />
                </Grid>
              </Grid>
              {errors.dateRange && (
                <FormHelperText error sx={{ mt: 1 }}>
                  {errors.dateRange}
                </FormHelperText>
              )}
            </Box>

            {/* Parameters */}
            {renderParameterFields()}

            {/* Advanced Options Toggle */}
            <Box sx={{ mb: 3 }}>
              <Button
                type='button'
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                endIcon={showAdvancedOptions ? <ExpandLess /> : <ExpandMore />}
                variant='text'
                color='primary'
              >
                Advanced Options
              </Button>
            </Box>

            {/* Advanced Options */}
            {renderAdvancedOptions()}

            {/* General Error */}
            {errors.general && (
              <Alert severity='error' sx={{ mb: 3 }}>
                {errors.general}
              </Alert>
            )}

            {/* Actions */}
            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {onCancel && (
                <Button variant='outlined' onClick={onCancel} disabled={loading}>
                  Cancel
                </Button>
              )}

              <Button
                type='submit'
                variant='contained'
                disabled={!isFormValid || loading || disabled}
                sx={{ minWidth: 160 }}
              >
                {loading ? 'Generating Report...' : 'Generate Report'}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
};

// ==================== DISPLAY NAME ====================

ReportConfigForm.displayName = 'ReportConfigForm';

// ==================== EXPORTS ====================

export default ReportConfigForm;
