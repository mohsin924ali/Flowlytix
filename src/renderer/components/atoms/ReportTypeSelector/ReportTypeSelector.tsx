/**
 * Report Type Selector Component
 *
 * Following Instructions standards with atomic design principles.
 * Provides a categorized selector for different report types.
 *
 * @component Atom
 * @pattern Atomic Design
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { ReportType, ReportCategory, ReportTypeValue, ReportTypeUtils } from '../../../domains/reporting';

// ==================== INTERFACES ====================

export interface ReportTypeSelectorProps {
  value?: ReportType;
  onChange: (reportType: ReportType) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  showCategory?: boolean;
  showDescription?: boolean;
  showEstimatedTime?: boolean;
  filterByCategory?: ReportCategory[];
  filterByComplexity?: string[];
  className?: string;
  'data-testid'?: string;
}

export interface ReportTypeOption {
  value: ReportType;
  label: string;
  category: ReportCategory;
  description: string;
  estimatedTime: number;
  icon: string;
  isSchedulable: boolean;
  complexity: string;
}

// ==================== COMPONENT ====================

export const ReportTypeSelector: React.FC<ReportTypeSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Select report type...',
  disabled = false,
  required = false,
  error,
  showCategory = true,
  showDescription = true,
  showEstimatedTime = true,
  filterByCategory,
  filterByComplexity,
  className = '',
  'data-testid': dataTestId = 'report-type-selector',
}) => {
  // ==================== STATE ====================

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ==================== COMPUTED ====================

  const reportOptions = useMemo((): ReportTypeOption[] => {
    const allTypes = Object.values(ReportType);

    return allTypes
      .map((type) => {
        const typeValue = ReportTypeValue.from(type);
        const metadata = typeValue.getMetadata();

        return {
          value: type,
          label: metadata.displayName,
          category: metadata.category,
          description: metadata.description,
          estimatedTime: metadata.estimatedTime,
          icon: ReportTypeUtils.getReportIcon(type),
          isSchedulable: metadata.isSchedulable,
          complexity: metadata.complexity,
        };
      })
      .filter((option) => {
        // Filter by category if specified
        if (filterByCategory && !filterByCategory.includes(option.category)) {
          return false;
        }

        // Filter by complexity if specified
        if (filterByComplexity && !filterByComplexity.includes(option.complexity)) {
          return false;
        }

        // Filter by search term
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          return (
            option.label.toLowerCase().includes(searchLower) ||
            option.description.toLowerCase().includes(searchLower) ||
            option.category.toLowerCase().includes(searchLower)
          );
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by category first, then by label
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.label.localeCompare(b.label);
      });
  }, [filterByCategory, filterByComplexity, searchTerm]);

  const groupedOptions = useMemo(() => {
    const groups: Record<ReportCategory, ReportTypeOption[]> = {} as Record<ReportCategory, ReportTypeOption[]>;

    reportOptions.forEach((option) => {
      if (!groups[option.category]) {
        groups[option.category] = [];
      }
      groups[option.category].push(option);
    });

    return groups;
  }, [reportOptions]);

  const selectedOption = useMemo(() => {
    return value ? reportOptions.find((option) => option.value === value) : undefined;
  }, [value, reportOptions]);

  // ==================== HANDLERS ====================

  const handleOptionSelect = (reportType: ReportType): void => {
    onChange(reportType);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggleOpen = (): void => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    switch (event.key) {
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'Enter':
        if (reportOptions.length === 1) {
          handleOptionSelect(reportOptions[0].value);
        }
        break;
    }
  };

  // ==================== RENDER HELPERS ====================

  const renderOptionContent = (option: ReportTypeOption): React.ReactNode => (
    <div className='flex items-start space-x-3 p-3'>
      <div className='flex-shrink-0'>
        <span className='text-xl' role='img' aria-label={option.label}>
          {option.icon}
        </span>
      </div>

      <div className='flex-1 min-w-0'>
        <div className='flex items-center space-x-2'>
          <h4 className='text-sm font-medium text-gray-900 truncate'>{option.label}</h4>

          {showCategory && (
            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
              {option.category}
            </span>
          )}

          {option.isSchedulable && (
            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
              Schedulable
            </span>
          )}
        </div>

        {showDescription && <p className='text-sm text-gray-500 mt-1 line-clamp-2'>{option.description}</p>}

        {showEstimatedTime && (
          <div className='flex items-center space-x-4 mt-2 text-xs text-gray-400'>
            <span>Est. {option.estimatedTime} min</span>
            <span className='capitalize'>{option.complexity} complexity</span>
          </div>
        )}
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
        {showCategory && (
          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
            {selectedOption.category}
          </span>
        )}
      </div>
    );
  };

  // ==================== RENDER ====================

  return (
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
        <div className='absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden'>
          {/* Search Input */}
          <div className='p-3 border-b border-gray-100'>
            <input
              type='text'
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder='Search reports...'
              className='w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              autoFocus
            />
          </div>

          {/* Options List */}
          <div className='max-h-80 overflow-y-auto'>
            {Object.entries(groupedOptions).length === 0 ? (
              <div className='p-6 text-center text-gray-500'>
                <p>No reports found matching your criteria.</p>
              </div>
            ) : (
              Object.entries(groupedOptions).map(([category, options]) => (
                <div key={category}>
                  {showCategory && (
                    <div className='px-3 py-2 bg-gray-50 border-b border-gray-100'>
                      <h3 className='text-xs font-semibold text-gray-700 uppercase tracking-wide'>
                        {category.replace('_', ' ')}
                      </h3>
                    </div>
                  )}

                  {options.map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => handleOptionSelect(option.value)}
                      className={`
                        w-full text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50
                        transition-colors duration-150 border-b border-gray-50 last:border-b-0
                        ${selectedOption?.value === option.value ? 'bg-blue-50 hover:bg-blue-100' : ''}
                      `}
                    >
                      {renderOptionContent(option)}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className='mt-2 text-sm text-red-600' role='alert'>
          {error}
        </p>
      )}

      {/* Click Outside Handler */}
      {isOpen && <div className='fixed inset-0 z-40' onClick={() => setIsOpen(false)} aria-hidden='true' />}
    </div>
  );
};

// ==================== DISPLAY NAME ====================

ReportTypeSelector.displayName = 'ReportTypeSelector';

// ==================== EXPORTS ====================

export default ReportTypeSelector;
