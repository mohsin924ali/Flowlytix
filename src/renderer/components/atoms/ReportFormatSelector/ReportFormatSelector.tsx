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
  // ==================== STATE ====================

  const [isOpen, setIsOpen] = useState(false);

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
    setIsOpen(false);
  };

  const handleToggleOpen = (): void => {
    if (!disabled && layout === 'dropdown') {
      setIsOpen(!isOpen);
    }
  };

  // ==================== RENDER HELPERS ====================

  const renderFeatureBadges = (features: FormatOption['features']): React.ReactNode => {
    const enabledFeatures = Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .map(([feature]) => feature);

    if (enabledFeatures.length === 0) return null;

    return (
      <div className='flex flex-wrap gap-1 mt-2'>
        {enabledFeatures.slice(0, 3).map((feature) => (
          <span
            key={feature}
            className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'
          >
            {feature.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
          </span>
        ))}
        {enabledFeatures.length > 3 && (
          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700'>
            +{enabledFeatures.length - 3} more
          </span>
        )}
      </div>
    );
  };

  const renderLimitations = (limitations: FormatOption['limitations']): React.ReactNode => (
    <div className='flex items-center space-x-4 mt-2 text-xs text-gray-500'>
      <span>Max: {limitations.maxFileSize}MB</span>
      <span>Records: {limitations.maxRecords.toLocaleString()}</span>
    </div>
  );

  const renderFormatOption = (option: FormatOption, isSelected = false): React.ReactNode => (
    <div className='flex items-start space-x-3 p-3'>
      <div className='flex-shrink-0'>
        <div className='flex items-center space-x-2'>
          <span className='text-xl' role='img' aria-label={option.label}>
            {option.icon}
          </span>
          <span className='text-xs font-mono text-gray-500 uppercase'>{option.fileExtension}</span>
        </div>
      </div>

      <div className='flex-1 min-w-0'>
        <div className='flex items-center space-x-2'>
          <h4 className='text-sm font-medium text-gray-900 truncate'>{option.label}</h4>

          {option.isDefault && (
            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
              Default
            </span>
          )}

          {option.isRecommended && !option.isDefault && (
            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800'>
              Recommended
            </span>
          )}
        </div>

        {showDescription && <p className='text-sm text-gray-500 mt-1 line-clamp-2'>{option.description}</p>}

        {showFeatures && renderFeatureBadges(option.features)}

        {showLimitations && renderLimitations(option.limitations)}
      </div>
    </div>
  );

  const renderSelectedDisplay = (): React.ReactNode => {
    if (!selectedOption) {
      return <span className='text-gray-400 truncate'>{placeholder}</span>;
    }

    return (
      <div className='flex items-center space-x-2 truncate'>
        <span className='text-lg' role='img' aria-label={selectedOption.label}>
          {selectedOption.icon}
        </span>
        <span className='text-gray-900 truncate'>{selectedOption.label}</span>
        <span className='text-xs font-mono text-gray-500 uppercase'>{selectedOption.fileExtension}</span>
        {selectedOption.isDefault && (
          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
            Default
          </span>
        )}
      </div>
    );
  };

  // ==================== RENDER LAYOUTS ====================

  const renderDropdownLayout = (): React.ReactNode => (
    <div className={`relative ${className}`} data-testid={dataTestId}>
      {/* Selector Button */}
      <button
        type='button'
        onClick={handleToggleOpen}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left bg-white border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors duration-200
          ${
            disabled
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
              : 'hover:border-gray-400 border-gray-300'
          }
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
        aria-expanded={isOpen}
        aria-haspopup='listbox'
        aria-required={required}
        aria-invalid={!!error}
      >
        <div className='flex items-center justify-between'>
          <div className='flex-1 min-w-0'>{renderSelectedDisplay()}</div>

          <div className='flex-shrink-0 ml-2'>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'transform rotate-180' : ''
              }`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
            </svg>
          </div>
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className='absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden'>
          <div className='max-h-80 overflow-y-auto'>
            {formatOptions.map((option) => (
              <button
                key={option.value}
                type='button'
                onClick={() => handleFormatSelect(option.value)}
                className={`
                  w-full text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50
                  transition-colors duration-150 border-b border-gray-50 last:border-b-0
                  ${selectedOption?.value === option.value ? 'bg-blue-50 hover:bg-blue-100' : ''}
                `}
              >
                {renderFormatOption(option, selectedOption?.value === option.value)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click Outside Handler */}
      {isOpen && <div className='fixed inset-0 z-40' onClick={() => setIsOpen(false)} aria-hidden='true' />}
    </div>
  );

  const renderGridLayout = (): React.ReactNode => (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${className}`} data-testid={dataTestId}>
      {formatOptions.map((option) => (
        <button
          key={option.value}
          type='button'
          onClick={() => handleFormatSelect(option.value)}
          disabled={disabled}
          className={`
            p-4 text-left bg-white border rounded-lg shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-colors duration-200
            ${
              disabled
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                : 'hover:border-gray-400 hover:shadow-md border-gray-300'
            }
            ${selectedOption?.value === option.value ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : ''}
          `}
        >
          {renderFormatOption(option, selectedOption?.value === option.value)}
        </button>
      ))}
    </div>
  );

  const renderListLayout = (): React.ReactNode => (
    <div className={`space-y-2 ${className}`} data-testid={dataTestId}>
      {formatOptions.map((option) => (
        <button
          key={option.value}
          type='button'
          onClick={() => handleFormatSelect(option.value)}
          disabled={disabled}
          className={`
            w-full p-3 text-left bg-white border rounded-lg shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-colors duration-200
            ${
              disabled
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                : 'hover:border-gray-400 hover:shadow-md border-gray-300'
            }
            ${selectedOption?.value === option.value ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : ''}
          `}
        >
          {renderFormatOption(option, selectedOption?.value === option.value)}
        </button>
      ))}
    </div>
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

  return (
    <div>
      {renderContent()}

      {/* Error Message */}
      {error && (
        <p className='mt-2 text-sm text-red-600' role='alert'>
          {error}
        </p>
      )}
    </div>
  );
};

// ==================== DISPLAY NAME ====================

ReportFormatSelector.displayName = 'ReportFormatSelector';

// ==================== EXPORTS ====================

export default ReportFormatSelector;
