/**
 * PaymentFiltersComponent
 * Provides filtering controls for payment management
 * Following Instructions file standards with molecular design
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import { ExpandMore, FilterList, Clear, Search } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { PaymentFilters, PaymentStatus, PaymentMethod, PaymentType } from '@/types';

// Component props
export interface PaymentFiltersProps {
  filters: PaymentFilters;
  onFiltersChange: (filters: PaymentFilters) => void;
  onClearFilters: () => void;
  loading?: boolean;
  'data-testid'?: string;
}

// Status options
const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially_refunded', label: 'Partially Refunded' },
  { value: 'expired', label: 'Expired' },
];

// Payment method options
const methodOptions = [
  { value: 'manual', label: 'Manual' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'wire_transfer', label: 'Wire Transfer' },
  { value: 'cryptocurrency', label: 'Cryptocurrency' },
  { value: 'other', label: 'Other' },
];

// Payment type options
const typeOptions = [
  { value: 'subscription', label: 'Subscription' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'upgrade', label: 'Upgrade' },
  { value: 'refund', label: 'Refund' },
];

/**
 * PaymentFiltersComponent
 * Provides comprehensive filtering controls for payments
 */
export const PaymentFiltersComponent: React.FC<PaymentFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  loading = false,
  'data-testid': testId,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (field: keyof PaymentFilters, value: any) => {
      const newFilters = { ...filters, [field]: value };
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  // Handle array filter changes (status, method, type)
  const handleArrayFilterChange = useCallback(
    (field: keyof PaymentFilters, value: string) => {
      const currentArray = (filters[field] as string[]) || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value];

      handleFilterChange(field, newArray.length > 0 ? newArray : undefined);
    },
    [filters, handleFilterChange]
  );

  // Get active filter count
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.status?.length) count++;
    if (filters.paymentMethod?.length) count++;
    if (filters.paymentType?.length) count++;
    if (filters.subscriptionId) count++;
    if (filters.adminUserId) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.minAmount !== undefined) count++;
    if (filters.maxAmount !== undefined) count++;
    if (filters.currency) count++;
    return count;
  }, [filters]);

  const activeFilterCount = getActiveFilterCount();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card data-testid={testId}>
        <Accordion expanded={expanded} onChange={(_, isExpanded) => setExpanded(isExpanded)}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display='flex' alignItems='center' gap={1} width='100%'>
              <FilterList />
              <Typography variant='h6'>Filters</Typography>
              {activeFilterCount > 0 && (
                <Chip label={`${activeFilterCount} active`} size='small' color='primary' variant='outlined' />
              )}
              <Box flexGrow={1} />
              {activeFilterCount > 0 && (
                <Button
                  size='small'
                  startIcon={<Clear />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearFilters();
                  }}
                  disabled={loading}
                >
                  Clear All
                </Button>
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Status Filter */}
              <Grid item xs={12} md={6} lg={4}>
                <Typography variant='subtitle2' gutterBottom>
                  Status
                </Typography>
                <Stack direction='row' flexWrap='wrap' gap={1}>
                  {statusOptions.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      clickable
                      variant={filters.status?.includes(option.value as PaymentStatus) ? 'filled' : 'outlined'}
                      color={filters.status?.includes(option.value as PaymentStatus) ? 'primary' : 'default'}
                      onClick={() => handleArrayFilterChange('status', option.value)}
                      size='small'
                    />
                  ))}
                </Stack>
              </Grid>

              {/* Payment Method Filter */}
              <Grid item xs={12} md={6} lg={4}>
                <Typography variant='subtitle2' gutterBottom>
                  Payment Method
                </Typography>
                <Stack direction='row' flexWrap='wrap' gap={1}>
                  {methodOptions.slice(0, 6).map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      clickable
                      variant={filters.paymentMethod?.includes(option.value as PaymentMethod) ? 'filled' : 'outlined'}
                      color={filters.paymentMethod?.includes(option.value as PaymentMethod) ? 'primary' : 'default'}
                      onClick={() => handleArrayFilterChange('paymentMethod', option.value)}
                      size='small'
                    />
                  ))}
                </Stack>
              </Grid>

              {/* Payment Type Filter */}
              <Grid item xs={12} md={6} lg={4}>
                <Typography variant='subtitle2' gutterBottom>
                  Payment Type
                </Typography>
                <Stack direction='row' flexWrap='wrap' gap={1}>
                  {typeOptions.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      clickable
                      variant={filters.paymentType?.includes(option.value as PaymentType) ? 'filled' : 'outlined'}
                      color={filters.paymentType?.includes(option.value as PaymentType) ? 'primary' : 'default'}
                      onClick={() => handleArrayFilterChange('paymentType', option.value)}
                      size='small'
                    />
                  ))}
                </Stack>
              </Grid>

              {/* Date Range */}
              <Grid item xs={12} md={6}>
                <Typography variant='subtitle2' gutterBottom>
                  Date Range
                </Typography>
                <Stack direction='row' spacing={2}>
                  <DatePicker
                    label='Start Date'
                    value={filters.startDate || null}
                    onChange={(date) => handleFilterChange('startDate', date)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                  <DatePicker
                    label='End Date'
                    value={filters.endDate || null}
                    onChange={(date) => handleFilterChange('endDate', date)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </Stack>
              </Grid>

              {/* Amount Range */}
              <Grid item xs={12} md={6}>
                <Typography variant='subtitle2' gutterBottom>
                  Amount Range
                </Typography>
                <Stack direction='row' spacing={2}>
                  <TextField
                    label='Min Amount'
                    type='number'
                    size='small'
                    value={filters.minAmount || ''}
                    onChange={(e) =>
                      handleFilterChange('minAmount', e.target.value ? Number(e.target.value) : undefined)
                    }
                    fullWidth
                  />
                  <TextField
                    label='Max Amount'
                    type='number'
                    size='small'
                    value={filters.maxAmount || ''}
                    onChange={(e) =>
                      handleFilterChange('maxAmount', e.target.value ? Number(e.target.value) : undefined)
                    }
                    fullWidth
                  />
                </Stack>
              </Grid>

              {/* Search Fields */}
              <Grid item xs={12} md={6}>
                <Typography variant='subtitle2' gutterBottom>
                  Search
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label='Subscription ID'
                    size='small'
                    value={filters.subscriptionId || ''}
                    onChange={(e) => handleFilterChange('subscriptionId', e.target.value || undefined)}
                    placeholder='Enter subscription ID...'
                    fullWidth
                  />
                  <TextField
                    label='Admin User ID'
                    size='small'
                    value={filters.adminUserId || ''}
                    onChange={(e) => handleFilterChange('adminUserId', e.target.value || undefined)}
                    placeholder='Enter admin user ID...'
                    fullWidth
                  />
                </Stack>
              </Grid>

              {/* Currency */}
              <Grid item xs={12} md={6}>
                <Typography variant='subtitle2' gutterBottom>
                  Currency
                </Typography>
                <FormControl size='small' fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={filters.currency || ''}
                    label='Currency'
                    onChange={(e) => handleFilterChange('currency', e.target.value || undefined)}
                  >
                    <MenuItem value=''>All Currencies</MenuItem>
                    <MenuItem value='USD'>USD</MenuItem>
                    <MenuItem value='EUR'>EUR</MenuItem>
                    <MenuItem value='GBP'>GBP</MenuItem>
                    <MenuItem value='CAD'>CAD</MenuItem>
                    <MenuItem value='AUD'>AUD</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Card>
    </LocalizationProvider>
  );
};

// Default export
export default PaymentFiltersComponent;
