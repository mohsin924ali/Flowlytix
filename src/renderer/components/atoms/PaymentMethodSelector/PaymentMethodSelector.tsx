/**
 * Payment Method Selector Component
 * Atomic component for selecting payment methods with proper visual indicators
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
  ListItemIcon,
  ListItemText,
  Chip,
  FormHelperText,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  Payment,
  CreditCard,
  AccountBalance,
  Money,
  Smartphone,
  AccountBalanceWallet,
  Receipt,
  CheckCircle,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { PaymentMethod } from '../../../domains/payment';

/**
 * Props interface for PaymentMethodSelector
 */
export interface PaymentMethodSelectorProps {
  readonly value: PaymentMethod | '';
  readonly onChange: (method: PaymentMethod) => void;
  readonly excludeMethods?: PaymentMethod[];
  readonly showDescriptions?: boolean;
  readonly showIcons?: boolean;
  readonly groupByCategory?: boolean;
  readonly label?: string;
  readonly error?: boolean;
  readonly helperText?: React.ReactNode;
  readonly fullWidth?: boolean;
  readonly disabled?: boolean;
  readonly 'data-testid'?: string;
}

/**
 * Get payment method configuration for display
 */
const getPaymentMethodConfig = (
  method: PaymentMethod,
  t: (key: string) => string
): {
  label: string;
  description: string;
  icon: React.ElementType;
  category: 'digital' | 'physical' | 'credit';
  color: string;
  immediate: boolean;
} => {
  switch (method) {
    case PaymentMethod.CASH:
      return {
        label: t('payment.method.cash'),
        description: t('payment.method.cash_description'),
        icon: Money,
        category: 'physical',
        color: '#4caf50',
        immediate: true,
      };

    case PaymentMethod.CREDIT_CARD:
      return {
        label: t('payment.method.credit_card'),
        description: t('payment.method.credit_card_description'),
        icon: CreditCard,
        category: 'digital',
        color: '#2196f3',
        immediate: true,
      };

    case PaymentMethod.DEBIT_CARD:
      return {
        label: t('payment.method.debit_card'),
        description: t('payment.method.debit_card_description'),
        icon: CreditCard,
        category: 'digital',
        color: '#ff9800',
        immediate: true,
      };

    case PaymentMethod.BANK_TRANSFER:
      return {
        label: t('payment.method.bank_transfer'),
        description: t('payment.method.bank_transfer_description'),
        icon: AccountBalance,
        category: 'digital',
        color: '#9c27b0',
        immediate: false,
      };

    case PaymentMethod.CHECK:
      return {
        label: t('payment.method.check'),
        description: t('payment.method.check_description'),
        icon: Receipt,
        category: 'physical',
        color: '#607d8b',
        immediate: false,
      };

    case PaymentMethod.CREDIT:
      return {
        label: t('payment.method.credit'),
        description: t('payment.method.credit_description'),
        icon: Payment,
        category: 'credit',
        color: '#f44336',
        immediate: true,
      };

    case PaymentMethod.MOBILE_PAYMENT:
      return {
        label: t('payment.method.mobile_payment'),
        description: t('payment.method.mobile_payment_description'),
        icon: Smartphone,
        category: 'digital',
        color: '#e91e63',
        immediate: true,
      };

    case PaymentMethod.DIGITAL_WALLET:
      return {
        label: t('payment.method.digital_wallet'),
        description: t('payment.method.digital_wallet_description'),
        icon: AccountBalanceWallet,
        category: 'digital',
        color: '#673ab7',
        immediate: true,
      };

    default:
      return {
        label: t('payment.method.unknown'),
        description: t('payment.method.unknown_description'),
        icon: Payment,
        category: 'physical',
        color: '#757575',
        immediate: false,
      };
  }
};

/**
 * Group payment methods by category
 */
const groupPaymentMethods = (
  methods: PaymentMethod[],
  t: (key: string) => string
): Array<{
  category: string;
  methods: PaymentMethod[];
}> => {
  const groups: Record<string, PaymentMethod[]> = {
    digital: [],
    physical: [],
    credit: [],
  };

  methods.forEach((method) => {
    const config = getPaymentMethodConfig(method, t);
    groups[config.category].push(method);
  });

  return [
    { category: t('payment.category.digital'), methods: groups.digital },
    { category: t('payment.category.physical'), methods: groups.physical },
    { category: t('payment.category.credit'), methods: groups.credit },
  ].filter((group) => group.methods.length > 0);
};

/**
 * PaymentMethodSelector component
 *
 * Allows users to select payment methods with proper visual indicators,
 * categories, and descriptions. Follows Material-UI design system.
 */
export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  value,
  onChange,
  excludeMethods = [],
  showDescriptions = true,
  showIcons = true,
  groupByCategory = false,
  label = 'Payment Method',
  error = false,
  helperText,
  fullWidth = true,
  disabled = false,
  'data-testid': testId,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Get available payment methods
  const availableMethods = Object.values(PaymentMethod).filter((method) => !excludeMethods.includes(method));

  // Handle selection change
  const handleChange = (event: SelectChangeEvent) => {
    const selectedMethod = event.target.value as PaymentMethod;
    if (selectedMethod && Object.values(PaymentMethod).includes(selectedMethod)) {
      onChange(selectedMethod);
    }
  };

  // Get selected method configuration
  const selectedConfig =
    value && Object.values(PaymentMethod).includes(value as PaymentMethod)
      ? getPaymentMethodConfig(value as PaymentMethod, t)
      : null;

  // Render individual method item
  const renderMethodItem = (method: PaymentMethod) => {
    const config = getPaymentMethodConfig(method, t);

    return (
      <MenuItem
        key={method}
        value={method}
        sx={{
          py: 1.5,
          px: 2,
          '&:hover': {
            backgroundColor: `${config.color}10`,
          },
          '&.Mui-selected': {
            backgroundColor: `${config.color}20`,
            '&:hover': {
              backgroundColor: `${config.color}30`,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {showIcons && (
            <ListItemIcon sx={{ minWidth: 40, color: config.color }}>
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
                <config.icon />
              </motion.div>
            </ListItemIcon>
          )}

          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant='body2' fontWeight={500}>
                  {config.label}
                </Typography>
                {config.immediate && (
                  <Chip
                    label={t('payment.instant')}
                    size='small'
                    color='success'
                    variant='outlined'
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            }
            secondary={
              showDescriptions && (
                <Typography variant='caption' color='text.secondary'>
                  {config.description}
                </Typography>
              )
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
          value={value}
          onChange={handleChange}
          label={label}
          open={isOpen}
          onOpen={() => setIsOpen(true)}
          onClose={() => setIsOpen(false)}
          data-testid={testId}
          renderValue={(selected) => {
            if (!selected || !Object.values(PaymentMethod).includes(selected as PaymentMethod)) {
              return <Typography color='text.secondary'>{t('payment.select_method')}</Typography>;
            }

            const config = getPaymentMethodConfig(selected as PaymentMethod, t);
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {showIcons && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
                    <config.icon sx={{ color: config.color, fontSize: '1.25rem' }} />
                  </motion.div>
                )}
                <Typography variant='body2' fontWeight={500}>
                  {config.label}
                </Typography>
                {config.immediate && <CheckCircle sx={{ color: 'success.main', fontSize: '1rem' }} />}
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
                {availableMethods.map(renderMethodItem)}
              </motion.div>
            )}
          </AnimatePresence>
        </Select>

        {helperText && <FormHelperText>{helperText}</FormHelperText>}

        {selectedConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant='caption' color='text.secondary'>
                {selectedConfig.description}
              </Typography>
            </Box>
          </motion.div>
        )}
      </FormControl>
    </motion.div>
  );
};

export default PaymentMethodSelector;
