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
import { ReportTypeSelector, ReportFormatSelector } from '../../atoms';
import { Input } from '../../atoms/Input/Input';
import { Button } from '../../atoms/Button/Button';
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
    startDate: string;
    endDate: string;
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
  // ==================== STATE ====================

  const [formData, setFormData] = useState<FormData>(() => ({
    reportType: initialReportType || null,
    format: initialFormat || null,
    title: '',
    description: '',
    parameters: {},
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      endDate: new Date().toISOString().split('T')[0], // today
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
    } else if (new Date(formData.dateRange.startDate) > new Date(formData.dateRange.endDate)) {
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

  const handleDateRangeChange = useCallback((field: 'startDate' | 'endDate', value: string): void => {
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

      if (!formData.reportType || !formData.format) {
        return;
      }

      const request: ReportExecutionRequest = {
        reportType: formData.reportType,
        format: formData.format,
        parameters: {
          title: formData.title,
          description: formData.description,
          startDate: formData.dateRange.startDate,
          endDate: formData.dateRange.endDate,
          includeCharts: formData.includeCharts,
          includeImages: formData.includeImages,
          compressOutput: formData.compressOutput,
          ...formData.parameters,
        },
        context: {
          userId: 'current-user', // TODO: Get from auth context
          agencyId: 'current-agency', // TODO: Get from agency context
          timestamp: new Date(),
          userRole: 'user', // TODO: Get from auth context
          permissions: ['REPORT_GENERATE'], // TODO: Get from auth context
        },
      };

      onSubmit(request);
    },
    [formData, validateForm, onSubmit]
  );

  // ==================== RENDER HELPERS ====================

  const renderParameterFields = (): React.ReactNode => {
    if (!requiredParameters.length) return null;

    return (
      <div className='space-y-4'>
        <h4 className='text-sm font-medium text-gray-900'>Report Parameters</h4>

        {requiredParameters.map((param: ReportParameter) => (
          <div key={param.name}>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              {param.displayName || param.name}
              {param.required && <span className='text-red-500 ml-1'>*</span>}
            </label>

            {param.type === 'string' && (
              <Input
                value={(formData.parameters[param.name] as string) || ''}
                onChange={(value) => handleParameterChange(param.name, value)}
                placeholder={param.description}
                required={param.required}
                disabled={disabled}
              />
            )}

            {param.type === 'number' && (
              <Input
                type='number'
                value={(formData.parameters[param.name] as number) || ''}
                onChange={(value) => handleParameterChange(param.name, Number(value))}
                placeholder={param.description}
                required={param.required}
                disabled={disabled}
              />
            )}

            {param.type === 'boolean' && (
              <label className='flex items-center'>
                <input
                  type='checkbox'
                  checked={(formData.parameters[param.name] as boolean) || false}
                  onChange={(e) => handleParameterChange(param.name, e.target.checked)}
                  disabled={disabled}
                  className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                />
                <span className='ml-2 text-sm text-gray-600'>{param.description}</span>
              </label>
            )}

            {errors.parameters?.[param.name] && (
              <p className='mt-1 text-sm text-red-600'>{errors.parameters[param.name]}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderAdvancedOptions = (): React.ReactNode => {
    if (!showAdvancedOptions) return null;

    return (
      <div className='space-y-4 p-4 bg-gray-50 rounded-lg'>
        <h4 className='text-sm font-medium text-gray-900'>Advanced Options</h4>

        {/* Format Features */}
        {formatMetadata && (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <label className='flex items-center'>
              <input
                type='checkbox'
                checked={formData.includeCharts}
                onChange={(e) => handleFieldChange('includeCharts', e.target.checked)}
                disabled={disabled || !ReportFormatValue.from(formData.format!).getFeatures().supportsCharts}
                className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
              />
              <span className='ml-2 text-sm text-gray-700'>Include charts</span>
            </label>

            <label className='flex items-center'>
              <input
                type='checkbox'
                checked={formData.includeImages}
                onChange={(e) => handleFieldChange('includeImages', e.target.checked)}
                disabled={disabled || !ReportFormatValue.from(formData.format!).getFeatures().supportsImages}
                className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
              />
              <span className='ml-2 text-sm text-gray-700'>Include images</span>
            </label>

            <label className='flex items-center'>
              <input
                type='checkbox'
                checked={formData.compressOutput}
                onChange={(e) => handleFieldChange('compressOutput', e.target.checked)}
                disabled={disabled}
                className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
              />
              <span className='ml-2 text-sm text-gray-700'>Compress output</span>
            </label>
          </div>
        )}
      </div>
    );
  };

  // ==================== RENDER ====================

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`} data-testid={dataTestId}>
      {/* Report Type Selection */}
      <div>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          Report Type <span className='text-red-500'>*</span>
        </label>
        <ReportTypeSelector
          value={formData.reportType || undefined}
          onChange={(reportType) => handleFieldChange('reportType', reportType)}
          disabled={disabled}
          error={errors.reportType}
          showDescription={true}
          showEstimatedTime={true}
        />
        {reportTypeMetadata && (
          <p className='mt-2 text-sm text-gray-600'>
            {reportTypeMetadata.description}
            {estimatedTime && <span className='ml-2 text-gray-500'>• Est. {estimatedTime} minutes</span>}
          </p>
        )}
      </div>

      {/* Format Selection */}
      {formData.reportType && (
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Export Format <span className='text-red-500'>*</span>
          </label>
          <ReportFormatSelector
            value={formData.format || undefined}
            onChange={(format) => handleFieldChange('format', format)}
            supportedFormats={supportedFormats}
            disabled={disabled}
            error={errors.format}
            layout='list'
            showFeatures={true}
            showDescription={true}
          />
        </div>
      )}

      {/* Basic Configuration */}
      {formData.format && (
        <>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Report Title <span className='text-red-500'>*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(value) => handleFieldChange('title', value)}
                placeholder='Enter report title...'
                disabled={disabled}
                error={errors.title}
                maxLength={200}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Description</label>
              <Input
                value={formData.description}
                onChange={(value) => handleFieldChange('description', value)}
                placeholder='Optional description...'
                disabled={disabled}
              />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Date Range <span className='text-red-500'>*</span>
            </label>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Start Date</label>
                <input
                  type='date'
                  value={formData.dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                  disabled={disabled}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>End Date</label>
                <input
                  type='date'
                  value={formData.dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                  disabled={disabled}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                />
              </div>
            </div>
            {errors.dateRange && <p className='mt-1 text-sm text-red-600'>{errors.dateRange}</p>}
          </div>

          {/* Parameters */}
          {renderParameterFields()}

          {/* Advanced Options Toggle */}
          <div>
            <button
              type='button'
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className='flex items-center text-sm text-blue-600 hover:text-blue-800'
            >
              <svg
                className={`w-4 h-4 mr-1 transition-transform ${showAdvancedOptions ? 'rotate-90' : ''}`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
              </svg>
              Advanced Options
            </button>
          </div>

          {/* Advanced Options */}
          {renderAdvancedOptions()}

          {/* General Error */}
          {errors.general && (
            <div className='p-4 bg-red-50 border border-red-200 rounded-md'>
              <p className='text-sm text-red-600'>{errors.general}</p>
            </div>
          )}

          {/* Actions */}
          <div className='flex items-center justify-end space-x-4 pt-4 border-t border-gray-200'>
            {onCancel && (
              <Button type='button' variant='outlined' onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}

            <Button type='submit' disabled={!isFormValid || loading || disabled}>
              {loading ? 'Generating Report...' : 'Generate Report'}
            </Button>
          </div>
        </>
      )}
    </form>
  );
};

// ==================== DISPLAY NAME ====================

ReportConfigForm.displayName = 'ReportConfigForm';

// ==================== EXPORTS ====================

export default ReportConfigForm;
