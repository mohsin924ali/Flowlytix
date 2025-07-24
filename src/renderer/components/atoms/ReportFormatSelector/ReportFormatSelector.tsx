/**
 * Report Format Selector Component
 *
 * Following Instructions standards with atomic design principles.
 * Provides a selector for different export formats with capability information.
 *
 * @component Atom
 * @pattern Atomic Design
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { ReportFormat, ReportFormatValue, ReportFormatUtils } from '../../../domains/reporting';

// ==================== INTERFACES ====================

export interface ReportFormatSelectorProps {
  value?: ReportFormat;
  onChange: (format: ReportFormat) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  showFeatures?: boolean;
  showDescription?: boolean;
  showLimitations?: boolean;
  supportedFormats?: ReportFormat[];
  layout?: 'dropdown' | 'grid' | 'list';
  className?: string;
  'data-testid'?: string;
}

export interface FormatOption {
  value: ReportFormat;
  label: string;
  description: string;
  icon: string;
  fileExtension: string;
  mimeType: string;
  features: {
    supportsCharts: boolean;
    supportsImages: boolean;
    supportsMultipleSheets: boolean;
    supportsFormulas: boolean;
    supportsFormatting: boolean;
    supportsPagination: boolean;
    supportsLargeDatasets: boolean;
    isHumanReadable: boolean;
  };
  limitations: {
    maxFileSize: number;
    maxRecords: number;
  };
  isDefault: boolean;
  isRecommended: boolean;
}

// ==================== COMPONENT ====================

export const ReportFormatSelector: React.FC<ReportFormatSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Select format...',
  disabled = false,
  required = false,
  error,
  showFeatures = true,
  showDescription = true,
  showLimitations = false,
  supportedFormats,
  layout = 'dropdown',
  className = '',
  'data-testid': dataTestId = 'report-format-selector',
}) => {
  // ==================== COMPUTED ====================

  const formatOptions = useMemo((): FormatOption[] => {
    const allFormats = supportedFormats || Object.values(ReportFormat);

    return allFormats
      .map((format) => {
        const formatValue = ReportFormatValue.from(format);
        const metadata = formatValue.getMetadata();
        const features = formatValue.getFeatures();

        return {
          value: format,
          label: metadata.displayName,
          description: metadata.description,
          icon: ReportFormatUtils.getFormatIcon(format),
          fileExtension: metadata.fileExtension,
          mimeType: metadata.mimeType,
          features: {
            supportsCharts: features.supportsCharts,
            supportsImages: features.supportsImages,
            supportsMultipleSheets: features.supportsMultipleSheets,
            supportsFormulas: features.supportsFormulas,
            supportsFormatting: features.supportsFormatting,
            supportsPagination: features.supportsPagination,
            supportsLargeDatasets: features.supportsLargeDatasets,
            isHumanReadable: features.isHumanReadable,
          },
          limitations: {
            maxFileSize: metadata.maxFileSize,
            maxRecords: metadata.maxRecords,
          },
          isDefault: metadata.isDefault,
          isRecommended: format === ReportFormat.PDF || format === ReportFormat.EXCEL,
        };
      })
      .sort((a, b) => {
        // Sort by: default first, then recommended, then alphabetical
        if (a.isDefault !== b.isDefault) {
          return a.isDefault ? -1 : 1;
        }
        if (a.isRecommended !== b.isRecommended) {
          return a.isRecommended ? -1 : 1;
        }
        return a.label.localeCompare(b.label);
      });
  }, [supportedFormats]);

  const selectedOption = useMemo(() => {
    return value ? formatOptions.find((option) => option.value === value) : undefined;
  }, [value, formatOptions]);

  // ==================== HANDLERS ====================

  const handleFormatSelect = (format: ReportFormat): void => {
    onChange(format);
  };

  // ==================== RENDER HELPERS ====================

  const renderFeatureBadges = (features: FormatOption['features']): React.ReactNode => {
    const enabledFeatures = Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .map(([feature]) => feature);

    if (enabledFeatures.length === 0) return null;

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
        {enabledFeatures.slice(0, 3).map((feature) => (
          <Chip
            key={feature}
            label={feature.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
            size='small'
            variant='outlined'
            color='success'
            sx={{ fontSize: '0.6rem', height: 18 }}
          />
        ))}
        {enabledFeatures.length > 3 && (
          <Chip
            label={`+${enabledFeatures.length - 3} more`}
            size='small'
            variant='outlined'
            sx={{ fontSize: '0.6rem', height: 18 }}
          />
        )}
      </Box>
    );
  };

  const renderLimitations = (limitations: FormatOption['limitations']): React.ReactNode => (
    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
      <Typography variant='caption' color='text.secondary'>
        Max: {limitations.maxFileSize}MB
      </Typography>
      <Typography variant='caption' color='text.secondary'>
        Records: {limitations.maxRecords.toLocaleString()}
      </Typography>
    </Box>
  );

  const renderFormatOption = (option: FormatOption, isSelected = false): React.ReactNode => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 80 }}>
        <Typography component='span' sx={{ fontSize: '1.2em' }}>
          {option.icon}
        </Typography>
        <Chip
          label={option.fileExtension}
          size='small'
          variant='outlined'
          sx={{ fontSize: '0.6rem', height: 18, fontFamily: 'monospace' }}
        />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {option.label}
          </Typography>

          {option.isDefault && (
            <Chip label='Default' size='small' color='primary' sx={{ fontSize: '0.6rem', height: 18 }} />
          )}

          {option.isRecommended && !option.isDefault && (
            <Chip label='Recommended' size='small' color='warning' sx={{ fontSize: '0.6rem', height: 18 }} />
          )}
        </Box>

        {showDescription && (
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
            {option.description}
          </Typography>
        )}

        {showFeatures && renderFeatureBadges(option.features)}

        {showLimitations && renderLimitations(option.limitations)}
      </Box>
    </Box>
  );

  // ==================== RENDER LAYOUTS ====================

  const renderDropdownLayout = (): React.ReactNode => (
    <FormControl fullWidth error={!!error} disabled={disabled} className={className} data-testid={dataTestId}>
      <InputLabel required={required}>{placeholder}</InputLabel>
      <Select
        value={value || ''}
        onChange={(e) => handleFormatSelect(e.target.value as ReportFormat)}
        label={placeholder}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 400,
              width: 400,
            },
          },
        }}
      >
        {formatOptions.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            sx={{
              whiteSpace: 'normal',
              minHeight: showDescription ? 80 : 48,
              alignItems: 'flex-start',
            }}
          >
            {renderFormatOption(option, selectedOption?.value === option.value)}
          </MenuItem>
        ))}
      </Select>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );

  const renderGridLayout = (): React.ReactNode => (
    <Box className={className} data-testid={dataTestId}>
      <Grid container spacing={2}>
        {formatOptions.map((option) => (
          <Grid item xs={12} md={6} lg={4} key={option.value}>
            <Card
              variant={selectedOption?.value === option.value ? 'outlined' : 'elevation'}
              sx={{
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: selectedOption?.value === option.value ? 2 : 1,
                borderColor: selectedOption?.value === option.value ? 'primary.main' : 'divider',
                '&:hover': disabled
                  ? {}
                  : {
                      boxShadow: 2,
                    },
              }}
              onClick={() => !disabled && handleFormatSelect(option.value)}
            >
              <CardContent sx={{ p: 2 }}>
                {renderFormatOption(option, selectedOption?.value === option.value)}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {error && (
        <Typography variant='caption' color='error' sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );

  const renderListLayout = (): React.ReactNode => (
    <Box className={className} data-testid={dataTestId}>
      <RadioGroup value={value || ''} onChange={(e) => handleFormatSelect(e.target.value as ReportFormat)}>
        {formatOptions.map((option) => (
          <Card
            key={option.value}
            variant='outlined'
            sx={{
              mb: 1,
              border: selectedOption?.value === option.value ? 2 : 1,
              borderColor: selectedOption?.value === option.value ? 'primary.main' : 'divider',
              cursor: disabled ? 'not-allowed' : 'pointer',
              '&:hover': disabled
                ? {}
                : {
                    boxShadow: 1,
                  },
            }}
            onClick={() => !disabled && handleFormatSelect(option.value)}
          >
            <CardContent sx={{ p: 2 }}>
              <FormControlLabel
                value={option.value}
                control={<Radio disabled={disabled} />}
                label={
                  <Box sx={{ width: '100%' }}>{renderFormatOption(option, selectedOption?.value === option.value)}</Box>
                }
                sx={{ margin: 0, width: '100%' }}
                disabled={disabled}
              />
            </CardContent>
          </Card>
        ))}
      </RadioGroup>
      {error && (
        <Typography variant='caption' color='error' sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );

  // ==================== RENDER ====================

  const renderContent = (): React.ReactNode => {
    switch (layout) {
      case 'grid':
        return renderGridLayout();
      case 'list':
        return renderListLayout();
      case 'dropdown':
      default:
        return renderDropdownLayout();
    }
  };

  return renderContent();
};

// ==================== DISPLAY NAME ====================

ReportFormatSelector.displayName = 'ReportFormatSelector';

// ==================== EXPORTS ====================

export default ReportFormatSelector;
