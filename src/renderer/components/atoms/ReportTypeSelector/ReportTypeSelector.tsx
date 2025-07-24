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
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Box,
  Typography,
  ListSubheader,
  TextField,
  InputAdornment,
  Icon,
} from '@mui/material';
import {
  Search,
  Schedule,
  Security,
  Payment,
  CreditCard,
  AccountBalance,
  TrendingUp,
  People,
  Assessment,
  LocalShipping,
  Timeline,
  Star,
  Inventory,
  SwapHoriz,
  ShoppingCart,
  Compare,
  Business,
  Dashboard,
  ShowChart,
  CompareArrows,
  Speed,
  Analytics,
  PersonSearch,
  Receipt,
  Gavel,
  VerifiedUser,
  Build,
  Description,
} from '@mui/icons-material';
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

// ==================== ICON MAPPING ====================

const getIconComponent = (iconName: string): React.ReactElement => {
  const iconMap: Record<string, React.ReactElement> = {
    schedule: <Schedule />,
    security: <Security />,
    payment: <Payment />,
    credit_card: <CreditCard />,
    account_balance: <AccountBalance />,
    trending_up: <TrendingUp />,
    people: <People />,
    assessment: <Assessment />,
    local_shipping: <LocalShipping />,
    timeline: <Timeline />,
    star: <Star />,
    inventory: <Inventory />,
    swap_horiz: <SwapHoriz />,
    shopping_cart: <ShoppingCart />,
    compare: <Compare />,
    business: <Business />,
    dashboard: <Dashboard />,
    show_chart: <ShowChart />,
    compare_arrows: <CompareArrows />,
    speed: <Speed />,
    analytics: <Analytics />,
    person_search: <PersonSearch />,
    receipt: <Receipt />,
    gavel: <Gavel />,
    verified_user: <VerifiedUser />,
    build: <Build />,
    description: <Description />,
  };

  return iconMap[iconName] || <Description />;
};

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
    setSearchTerm('');
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(event.target.value);
  };

  // ==================== RENDER HELPERS ====================

  const renderOptionContent = (option: ReportTypeOption): React.ReactNode => (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>{getIconComponent(option.icon)}</Box>
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          {option.label}
        </Typography>
        {showCategory && (
          <Chip
            label={ReportTypeUtils.getCategoryDisplayName(option.category)}
            size='small'
            variant='outlined'
            sx={{ ml: 'auto', fontSize: '0.7rem', height: 20 }}
          />
        )}
      </Box>

      {showDescription && (
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', ml: 3 }}>
          {option.description}
        </Typography>
      )}

      {showEstimatedTime && (
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', ml: 3, mt: 0.5 }}>
          Est. {option.estimatedTime} minutes
        </Typography>
      )}
    </Box>
  );

  const renderMenuItems = (): React.ReactNode[] => {
    const items: React.ReactNode[] = [];

    // Add search field
    items.push(
      <Box key='search' sx={{ p: 1 }}>
        <TextField
          size='small'
          placeholder='Search report types...'
          value={searchTerm}
          onChange={handleSearchChange}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <Search fontSize='small' />
              </InputAdornment>
            ),
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </Box>
    );

    // Add grouped options
    Object.entries(groupedOptions).forEach(([category, options]) => {
      if (showCategory) {
        items.push(
          <ListSubheader key={category} sx={{ bgcolor: 'grey.50', fontWeight: 600 }}>
            {ReportTypeUtils.getCategoryDisplayName(category as ReportCategory)}
          </ListSubheader>
        );
      }

      options.forEach((option) => {
        items.push(
          <MenuItem
            key={option.value}
            value={option.value}
            sx={{
              whiteSpace: 'normal',
              minHeight: showDescription ? 80 : 48,
              alignItems: 'flex-start',
            }}
          >
            {renderOptionContent(option)}
          </MenuItem>
        );
      });
    });

    return items;
  };

  // ==================== RENDER ====================

  return (
    <FormControl fullWidth error={!!error} disabled={disabled} className={className} data-testid={dataTestId}>
      <InputLabel required={required}>{placeholder}</InputLabel>
      <Select
        value={value || ''}
        onChange={(e) => handleOptionSelect(e.target.value as ReportType)}
        label={placeholder}
        renderValue={(selected) => {
          if (!selected) return '';
          const option = selectedOption;
          if (!option) return selected;

          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                {getIconComponent(option.icon)}
              </Box>
              <Typography>{option.label}</Typography>
            </Box>
          );
        }}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 400,
              width: 350,
            },
          },
        }}
      >
        {renderMenuItems()}
      </Select>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
};

// ==================== DISPLAY NAME ====================

ReportTypeSelector.displayName = 'ReportTypeSelector';

// ==================== EXPORTS ====================

export default ReportTypeSelector;
