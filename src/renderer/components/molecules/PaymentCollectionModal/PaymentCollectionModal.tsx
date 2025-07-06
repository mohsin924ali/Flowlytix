import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  AlertTitle,
} from '@mui/material';
import { Payment, Person, Receipt } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { PaymentMethodSelector } from '../../atoms/PaymentMethodSelector';
import { AmountInput } from '../../atoms/AmountInput';
import { PaymentService } from '../../../services/PaymentService';
import { PaymentMethod } from '../../../domains/payment/valueObjects/PaymentStatus';
import type { PaymentRecord } from '../../../domains/payment/types/PaymentTypes';

// Validation schema following Zod patterns
const PaymentCollectionSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  notes: z.string().optional(),
  checkNumber: z.string().optional(),
  chequeDate: z.string().optional(),
  bankName: z.string().optional(),
});

type PaymentCollectionForm = z.infer<typeof PaymentCollectionSchema>;

// Props interface following TypeScript strict typing
interface PaymentCollectionModalProps {
  open: boolean;
  onClose: () => void;
  customer: {
    id: string;
    fullName: string;
    outstandingBalance: number;
    creditLimit: number;
    availableCredit: number;
  } | null;
  onPaymentRecorded: (payment: any) => void;
}

// Payment collection success result interface
interface PaymentRecordResult {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  receiptNumber: string;
  createdAt: Date;
}

export const PaymentCollectionModal: React.FC<PaymentCollectionModalProps> = ({
  open,
  onClose,
  customer,
  onPaymentRecorded,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<PaymentRecord | null>(null);

  const form = useForm<PaymentCollectionForm>({
    resolver: zodResolver(PaymentCollectionSchema),
    defaultValues: {
      customerId: customer?.id || '',
      customerName: customer?.fullName || '',
      amount: 0,
      paymentMethod: PaymentMethod.CASH,
      reference: '',
      notes: '',
      checkNumber: '',
      bankName: '',
    },
  });

  const selectedPaymentMethod = form.watch('paymentMethod');

  // Handle form submission with proper error handling
  const handleSubmit = async (data: PaymentCollectionForm): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Validate payment method specific fields
      if (data.paymentMethod === PaymentMethod.CHECK) {
        if (!data.checkNumber) {
          throw new Error(t('payment.errors.check_number_required'));
        }
        if (!data.chequeDate) {
          throw new Error(t('payment.errors.check_date_required'));
        }
      }

      const payment = await PaymentService.recordPayment(
        {
          customerId: data.customerId,
          customerName: data.customerName,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          reference: data.reference,
          notes: data.notes,
          checkNumber: data.checkNumber,
          bankAccount: data.bankName,
        },
        'current-user-id', // TODO: Get from auth context
        'current-agency-id' // TODO: Get from agency context
      );

      setSuccess(payment);
      onPaymentRecorded(payment);

      // Show success for 2 seconds then close
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('payment.errors.record_failed');
      setError(errorMessage);
      console.error('Payment recording failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close with cleanup
  const handleClose = (): void => {
    if (loading) return; // Prevent close during loading

    form.reset();
    setError(null);
    setSuccess(null);
    onClose();
  };

  // Calculate suggested payment amount
  const getSuggestedAmount = (): number => {
    if (!customer) return 0;
    return Math.min(customer.outstandingBalance, 1000); // Suggest up to $1000 or outstanding balance
  };

  // Handle quick amount buttons
  const handleQuickAmount = (amount: number): void => {
    form.setValue('amount', amount);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='md'
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' },
      }}
    >
      <DialogTitle>
        <Box display='flex' alignItems='center'>
          <Payment sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant='h6' component='div'>
            {t('payment.record_payment')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Success Message */}
        {success && (
          <Alert severity='success' sx={{ mb: 3 }}>
            <AlertTitle>{t('payment.success.title')}</AlertTitle>
            {t('payment.success.message', {
              amount: success.amount,
              receipt: success.receiptNumber,
            })}
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity='error' sx={{ mb: 3 }}>
            <AlertTitle>{t('payment.error.title')}</AlertTitle>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Customer Information Card */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Box display='flex' alignItems='center' mb={2}>
                  <Person sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant='h6' component='div'>
                    {customer?.fullName || t('payment.no_customer_selected')}
                  </Typography>
                </Box>

                {customer && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography variant='body2' color='text.secondary'>
                        {t('payment.outstanding_balance')}
                      </Typography>
                      <Typography variant='h6' color='error.main'>
                        ${customer.outstandingBalance.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant='body2' color='text.secondary'>
                        {t('payment.credit_limit')}
                      </Typography>
                      <Typography variant='h6'>${customer.creditLimit.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant='body2' color='text.secondary'>
                        {t('payment.available_credit')}
                      </Typography>
                      <Typography variant='h6' color='success.main'>
                        ${customer.availableCredit.toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Amount */}
          <Grid item xs={12} md={6}>
            <Controller
              name='amount'
              control={form.control}
              render={({ field }) => (
                <AmountInput
                  label={t('payment.amount')}
                  value={field.value}
                  onChange={field.onChange}
                  error={!!form.formState.errors.amount}
                  helperText={form.formState.errors.amount?.message}
                  fullWidth
                />
              )}
            />

            {/* Quick Amount Buttons */}
            {customer && (
              <Box mt={2}>
                <Typography variant='body2' color='text.secondary' gutterBottom>
                  {t('payment.quick_amounts')}
                </Typography>
                <Box display='flex' gap={1} flexWrap='wrap'>
                  <Button size='small' variant='outlined' onClick={() => handleQuickAmount(getSuggestedAmount())}>
                    ${getSuggestedAmount().toLocaleString()}
                  </Button>
                  <Button
                    size='small'
                    variant='outlined'
                    onClick={() => handleQuickAmount(customer.outstandingBalance)}
                  >
                    {t('payment.full_balance')}
                  </Button>
                </Box>
              </Box>
            )}
          </Grid>

          {/* Payment Method */}
          <Grid item xs={12} md={6}>
            <Controller
              name='paymentMethod'
              control={form.control}
              render={({ field }) => (
                <PaymentMethodSelector
                  value={field.value}
                  onChange={field.onChange}
                  error={!!form.formState.errors.paymentMethod}
                  helperText={form.formState.errors.paymentMethod?.message}
                />
              )}
            />
          </Grid>

          {/* Cheque Details (shown only for cheque payments) */}
          {selectedPaymentMethod === PaymentMethod.CHEQUE && (
            <>
              <Grid item xs={12} md={6}>
                <Controller
                  name='chequeNumber'
                  control={form.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('payment.cheque_number')}
                      fullWidth
                      required
                      error={!!form.formState.errors.chequeNumber}
                      helperText={form.formState.errors.chequeNumber?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name='chequeDate'
                  control={form.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('payment.cheque_date')}
                      type='date'
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      error={!!form.formState.errors.chequeDate}
                      helperText={form.formState.errors.chequeDate?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name='bankName'
                  control={form.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('payment.bank_name')}
                      fullWidth
                      error={!!form.formState.errors.bankName}
                      helperText={form.formState.errors.bankName?.message}
                    />
                  )}
                />
              </Grid>
            </>
          )}

          {/* Reference */}
          <Grid item xs={12} md={6}>
            <Controller
              name='reference'
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('payment.reference')}
                  fullWidth
                  placeholder={t('payment.reference_placeholder')}
                  error={!!form.formState.errors.reference}
                  helperText={form.formState.errors.reference?.message}
                />
              )}
            />
          </Grid>

          {/* Notes */}
          <Grid item xs={12} md={6}>
            <Controller
              name='notes'
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('payment.notes')}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder={t('payment.notes_placeholder')}
                  error={!!form.formState.errors.notes}
                  helperText={form.formState.errors.notes?.message}
                />
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={loading} variant='outlined'>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={form.handleSubmit(handleSubmit)}
          variant='contained'
          disabled={loading || !customer}
          startIcon={loading ? <CircularProgress size={20} /> : <Receipt />}
          sx={{ minWidth: 160 }}
        >
          {loading ? t('common.processing') : t('payment.record_payment')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
