/**
 * Payment Terms Selector Component
 * Atomic component for selecting payment terms with proper visual indicators
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Payment Management
 * @architecture Atom Component (Atomic Design)
 * @version 1.0.0
 */

import React, { useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  Typography,
  ListItemText,
  Chip,
  FormHelperText,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Payment, Schedule, Today, DateRange, CalendarMonth } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditTerms, CreditTermsUtils } from '../../../domains/payment';

/**
 * Props interface for PaymentTermsSelector
 */
export interface PaymentTermsSelectorProps {
  readonly value: CreditTerms | null;
  readonly onChange: (terms: CreditTerms) => void;
  readonly excludeTerms?: string[];
  readonly showDescriptions?: boolean;
  readonly showDueDates?: boolean;
  readonly showDiscounts?: boolean;
  readonly label?: string;
  readonly error?: boolean;
  readonly helperText?: React.ReactNode;
  readonly fullWidth?: boolean;
  readonly disabled?: boolean;
  readonly 'data-testid'?: string;
}

/**
 * Standard payment terms configurations
 */
const STANDARD_TERMS = [
  {
    id: 'COD',
    label: 'Cash on Delivery',
    netDays: 0,
    discountDays: 0,
    discountPercentage: 0,
    description: 'Payment due upon delivery',
    icon: Payment,
    color: '#4caf50',
    immediate: true,
  },
  {
    id: 'NET_15',
    label: 'Net 15',
    netDays: 15,
    discountDays: 0,
    discountPercentage: 0,
    description: 'Payment due within 15 days',
    icon: Schedule,
    color: '#2196f3',
    immediate: false,
  },
  {
    id: 'NET_30',
    label: 'Net 30',
    netDays: 30,
    discountDays: 0,
    discountPercentage: 0,
    description: 'Payment due within 30 days',
    icon: CalendarMonth,
    color: '#ff9800',
    immediate: false,
  },
  {
    id: 'NET_45',
    label: 'Net 45',
    netDays: 45,
    discountDays: 0,
    discountPercentage: 0,
    description: 'Payment due within 45 days',
    icon: DateRange,
    color: '#f44336',
    immediate: false,
  },
  {
    id: '2_10_NET_30',
    label: '2/10 Net 30',
    netDays: 30,
    discountDays: 10,
    discountPercentage: 2,
    description: '2% discount if paid within 10 days, otherwise due in 30 days',
    icon: Today,
    color: '#9c27b0',
    immediate: false,
  },
  {
    id: '1_15_NET_30',
    label: '1/15 Net 30',
    netDays: 30,
    discountDays: 15,
    discountPercentage: 1,
    description: '1% discount if paid within 15 days, otherwise due in 30 days',
    icon: Today,
    color: '#673ab7',
    immediate: false,
  },
];

/**
 * Create CreditTerms from standard term
 */
const createCreditTerms = (termConfig: (typeof STANDARD_TERMS)[0]): CreditTerms => {
  return CreditTerms.create(
    termConfig.netDays,
    termConfig.description,
    termConfig.discountDays || undefined,
    termConfig.discountPercentage || undefined
  );
};

/**
 * PaymentTermsSelector component
 *
 * Allows users to select payment terms with proper visual indicators,
 * descriptions, and due date calculations. Follows Material-UI design system.
 */
export const PaymentTermsSelector: React.FC<PaymentTermsSelectorProps> = ({
  value,
  onChange,
  excludeTerms = [],
  showDescriptions = true,
  showDueDates = true,
  showDiscounts = true,
  label = 'Payment Terms',
  error = false,
  helperText,
  fullWidth = true,
  disabled = false,
  'data-testid': testId,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Get available terms
  const availableTerms = STANDARD_TERMS.filter((term) => !excludeTerms.includes(term.id));

  // Handle selection change
  const handleChange = (event: SelectChangeEvent) => {
    const selectedTermId = event.target.value as string;
    const selectedTerm = availableTerms.find((term) => term.id === selectedTermId);

    if (selectedTerm) {
      const creditTerms = createCreditTerms(selectedTerm);
      onChange(creditTerms);
    }
  };

  // Find current term configuration
  const currentTermConfig = value
    ? availableTerms.find(
        (term) =>
          term.netDays === value.netDays &&
          term.discountDays === value.discountDays &&
          term.discountPercentage === value.discountPercentage
      )
    : null;

  // Get selected value for display
  const selectedValue = currentTermConfig ? currentTermConfig.id : '';

  // Render individual term item
  const renderTermItem = (term: (typeof STANDARD_TERMS)[0]) => {
    const creditTerms = createCreditTerms(term);
    const dueDate = creditTerms.calculateDueDate();
    const discountDate = creditTerms.calculateDiscountDate();

    return (
      <MenuItem
        key={term.id}
        value={term.id}
        sx={{
          py: 1.5,
          px: 2,
          '&:hover': {
            backgroundColor: `${term.color}10`,
          },
          '&.Mui-selected': {
            backgroundColor: `${term.color}20`,
            '&:hover': {
              backgroundColor: `${term.color}30`,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
            <term.icon sx={{ color: term.color, mr: 1.5 }} />
          </motion.div>

          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant='body2' fontWeight={500}>
                  {term.label}
                </Typography>
                {term.immediate && (
                  <Chip
                    label={t('payment.immediate')}
                    size='small'
                    color='success'
                    variant='outlined'
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
                {showDiscounts && term.discountPercentage > 0 && (
                  <Chip
                    label={`${term.discountPercentage}% off`}
                    size='small'
                    color='primary'
                    variant='outlined'
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            }
            secondary={
              <Box sx={{ mt: 0.5 }}>
                {showDescriptions && (
                  <Typography variant='caption' color='text.secondary'>
                    {term.description}
                  </Typography>
                )}
                {showDueDates && (
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                    <Typography variant='caption' color='text.secondary'>
                      {t('payment.due_date')}: {dueDate.toLocaleDateString()}
                    </Typography>
                    {term.discountPercentage > 0 && (
                      <Typography variant='caption' color='primary.main'>
                        {t('payment.discount_date')}: {discountDate.toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            }
          />
        </Box>
      </MenuItem>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <FormControl fullWidth={fullWidth} error={error} disabled={disabled}>
        <InputLabel
          id={`${testId}-label`}
          sx={{
            '&.Mui-focused': {
              color: 'primary.main',
            },
          }}
        >
          {label}
        </InputLabel>

        <Select
          labelId={`${testId}-label`}
          value={selectedValue}
          onChange={handleChange}
          label={label}
          open={isOpen}
          onOpen={() => setIsOpen(true)}
          onClose={() => setIsOpen(false)}
          data-testid={testId}
          renderValue={(selected) => {
            if (!selected) {
              return <Typography color='text.secondary'>{t('payment.select_terms')}</Typography>;
            }

            const termConfig = availableTerms.find((term) => term.id === selected);
            if (!termConfig) return '';

            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
                  <termConfig.icon sx={{ color: termConfig.color, fontSize: '1.25rem' }} />
                </motion.div>
                <Typography variant='body2' fontWeight={500}>
                  {termConfig.label}
                </Typography>
                {termConfig.immediate && (
                  <Chip
                    label={t('payment.immediate')}
                    size='small'
                    color='success'
                    variant='outlined'
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
                {showDiscounts && termConfig.discountPercentage > 0 && (
                  <Chip
                    label={`${termConfig.discountPercentage}% off`}
                    size='small'
                    color='primary'
                    variant='outlined'
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            );
          }}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': {
              transition: 'all 0.3s ease-in-out',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
              borderWidth: '2px',
              boxShadow: '0 0 0 3px rgba(81, 63, 242, 0.1)',
            },
          }}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {availableTerms.map(renderTermItem)}
              </motion.div>
            )}
          </AnimatePresence>
        </Select>

        {helperText && <FormHelperText>{helperText}</FormHelperText>}

        {currentTermConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant='caption' color='text.secondary'>
                {currentTermConfig.description}
              </Typography>
            </Box>
          </motion.div>
        )}
      </FormControl>
    </motion.div>
  );
};

export default PaymentTermsSelector;
