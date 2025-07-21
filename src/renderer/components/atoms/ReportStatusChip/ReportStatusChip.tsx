/**
 * Report Status Chip Component
 *
 * Following Instructions standards with atomic design principles.
 * Displays report execution status with appropriate visual indicators.
 *
 * @component Atom
 * @pattern Atomic Design
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import React from 'react';
import { ReportStatus, ReportStatusValue, ReportStatusUtils } from '../../../domains/reporting';

// ==================== INTERFACES ====================

export interface ReportStatusChipProps {
  status: ReportStatus;
  showIcon?: boolean;
  showText?: boolean;
  showProgress?: boolean;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'outlined';
  animated?: boolean;
  className?: string;
  onClick?: () => void;
  'data-testid'?: string;
}

export interface StatusConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: string;
  animated: boolean;
}

// ==================== COMPONENT ====================

export const ReportStatusChip: React.FC<ReportStatusChipProps> = ({
  status,
  showIcon = true,
  showText = true,
  showProgress = false,
  progress = 0,
  size = 'md',
  variant = 'default',
  animated = true,
  className = '',
  onClick,
  'data-testid': dataTestId = 'report-status-chip',
}) => {
  // ==================== COMPUTED ====================

  const statusValue = ReportStatusValue.from(status);
  const statusMetadata = statusValue.getMetadata();
  const statusColor = ReportStatusUtils.getStatusColor(status);
  const statusIcon = ReportStatusUtils.getStatusIcon(status);

  const statusConfig: StatusConfig = {
    color: statusColor,
    bgColor: getBackgroundColor(statusColor),
    borderColor: getBorderColor(statusColor),
    textColor: getTextColor(statusColor),
    icon: statusIcon,
    animated: animated && statusMetadata.progressIndicator,
  };

  // ==================== HELPERS ====================

  function getBackgroundColor(color: string): string {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100',
      green: 'bg-green-100',
      yellow: 'bg-yellow-100',
      red: 'bg-red-100',
      gray: 'bg-gray-100',
      orange: 'bg-orange-100',
      purple: 'bg-purple-100',
    };
    return colorMap[color] || 'bg-gray-100';
  }

  function getBorderColor(color: string): string {
    const colorMap: Record<string, string> = {
      blue: 'border-blue-200',
      green: 'border-green-200',
      yellow: 'border-yellow-200',
      red: 'border-red-200',
      gray: 'border-gray-200',
      orange: 'border-orange-200',
      purple: 'border-purple-200',
    };
    return colorMap[color] || 'border-gray-200';
  }

  function getTextColor(color: string): string {
    const colorMap: Record<string, string> = {
      blue: 'text-blue-800',
      green: 'text-green-800',
      yellow: 'text-yellow-800',
      red: 'text-red-800',
      gray: 'text-gray-800',
      orange: 'text-orange-800',
      purple: 'text-purple-800',
    };
    return colorMap[color] || 'text-gray-800';
  }

  function getSizeClasses(): string {
    const sizeMap: Record<string, string> = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base',
    };
    return sizeMap[size] || sizeMap.md;
  }

  function getVariantClasses(): string {
    switch (variant) {
      case 'minimal':
        return `${statusConfig.textColor}`;
      case 'outlined':
        return `border ${statusConfig.borderColor} ${statusConfig.textColor} bg-white`;
      case 'default':
      default:
        return `${statusConfig.bgColor} ${statusConfig.textColor}`;
    }
  }

  // ==================== RENDER HELPERS ====================

  const renderIcon = (): React.ReactNode => {
    if (!showIcon) return null;

    const iconClasses = `
      ${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}
      ${statusConfig.animated ? 'animate-pulse' : ''}
    `;

    // For running status, show a spinning icon
    if (status === ReportStatus.RUNNING && statusConfig.animated) {
      return (
        <svg className={`${iconClasses} animate-spin`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
          />
        </svg>
      );
    }

    // For other statuses, show the appropriate icon
    return (
      <span className={iconClasses} role='img' aria-label={statusMetadata.displayName}>
        {statusConfig.icon}
      </span>
    );
  };

  const renderProgress = (): React.ReactNode => {
    if (!showProgress || !statusMetadata.progressIndicator) return null;

    const progressValue = Math.min(100, Math.max(0, progress));

    return (
      <div className='flex items-center space-x-2 mt-1'>
        <div className='flex-1 bg-gray-200 rounded-full h-1.5'>
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              statusConfig.color === 'blue'
                ? 'bg-blue-600'
                : statusConfig.color === 'green'
                  ? 'bg-green-600'
                  : 'bg-gray-400'
            }`}
            style={{ width: `${progressValue}%` }}
          />
        </div>
        <span className='text-xs font-medium min-w-[3rem] text-right'>{progressValue}%</span>
      </div>
    );
  };

  const renderText = (): React.ReactNode => {
    if (!showText) return null;

    return <span className='font-medium'>{statusMetadata.displayName}</span>;
  };

  // ==================== RENDER ====================

  const chipClasses = `
    inline-flex items-center space-x-2 rounded-full font-medium
    transition-colors duration-200
    ${getSizeClasses()}
    ${getVariantClasses()}
    ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
    ${className}
  `;

  const chipContent = (
    <>
      {renderIcon()}
      {renderText()}
    </>
  );

  if (onClick) {
    return (
      <button
        type='button'
        onClick={onClick}
        className={chipClasses}
        data-testid={dataTestId}
        aria-label={`${statusMetadata.displayName} - Click for details`}
      >
        <div className='flex items-center space-x-2'>{chipContent}</div>
        {renderProgress()}
      </button>
    );
  }

  return (
    <div className={chipClasses} data-testid={dataTestId}>
      <div className='flex items-center space-x-2'>{chipContent}</div>
      {renderProgress()}
    </div>
  );
};

// ==================== DISPLAY NAME ====================

ReportStatusChip.displayName = 'ReportStatusChip';

// ==================== EXPORTS ====================

export default ReportStatusChip;
