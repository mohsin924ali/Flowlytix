import React, { useState, useEffect } from 'react';
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
  Alert,
  AlertTitle,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Receipt,
  Person,
  Add,
  Delete,
  Edit,
  Print,
  Email,
  Preview,
  Save,
  Calculate,
  ExpandMore,
  AttachMoney,
  CalendarToday,
  Business,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { AmountInput } from '../../atoms/AmountInput';
import { PaymentTermsSelector } from '../../atoms/PaymentTermsSelector';
import { InvoiceStatus } from '../../../domains/payment/valueObjects/PaymentStatus';
import type { Invoice, InvoiceItem } from '../../../domains/payment/types/PaymentTypes';

// Validation schema for invoice generation
const InvoiceItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  productName: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  discountPercentage: z.number().min(0).max(100, 'Discount cannot exceed 100%').optional(),
  taxRate: z.number().min(0).max(100, 'Tax rate cannot exceed 100%').optional(),
});

const InvoiceGenerationSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
  issueDate: z.date(),
  dueDate: z.date(),
  paymentTerms: z.string().min(1, 'Payment terms are required'),
  items: z.array(InvoiceItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
  discountPercentage: z.number().min(0).max(100, 'Discount cannot exceed 100%').optional(),
  discountAmount: z.number().min(0, 'Discount amount cannot be negative').optional(),
  taxAmount: z.number().min(0, 'Tax amount cannot be negative').optional(),
  sendToCustomer: z.boolean().optional(),
  saveAsDraft: z.boolean().optional(),
});

type InvoiceGenerationForm = z.infer<typeof InvoiceGenerationSchema>;

// Props interface
interface InvoiceGenerationModalProps {
  open: boolean;
  onClose: () => void;
  customer: {
    id: string;
    fullName: string;
    email?: string;
    address?: string;
    phone?: string;
    creditLimit: number;
    outstandingBalance: number;
  } | null;
  orderId?: string;
  orderItems?: any[];
  onInvoiceGenerated: (invoice: Invoice) => void;
}

// Invoice calculation interface
interface InvoiceCalculation {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  itemTotals: number[];
}

export const InvoiceGenerationModal: React.FC<InvoiceGenerationModalProps> = ({
  open,
  onClose,
  customer,
  orderId,
  orderItems,
  onInvoiceGenerated,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<InvoiceCalculation>({
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
    itemTotals: [],
  });
  const [previewMode, setPreviewMode] = useState(false);

  const form = useForm<InvoiceGenerationForm>({
    resolver: zodResolver(InvoiceGenerationSchema),
    defaultValues: {
      customerId: customer?.id || '',
      customerName: customer?.fullName || '',
      orderId: orderId || '',
      orderNumber: '',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      paymentTerms: 'NET_30',
      items: orderItems?.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: 0,
        taxRate: 10, // Default tax rate
      })) || [
        {
          productId: '',
          productName: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          discountPercentage: 0,
          taxRate: 10,
        },
      ],
      notes: '',
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      sendToCustomer: true,
      saveAsDraft: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');
  const watchedDiscountPercentage = form.watch('discountPercentage');
  const watchedDiscountAmount = form.watch('discountAmount');

  // Calculate invoice totals when items change
  useEffect(() => {
    calculateInvoiceTotals();
  }, [watchedItems, watchedDiscountPercentage, watchedDiscountAmount]);

  // Calculate invoice totals
  const calculateInvoiceTotals = (): void => {
    const items = form.getValues('items');
    const discountPercentage = form.getValues('discountPercentage') || 0;
    const discountAmount = form.getValues('discountAmount') || 0;

    // Calculate line totals
    const itemTotals = items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const itemDiscount = (lineTotal * (item.discountPercentage || 0)) / 100;
      return lineTotal - itemDiscount;
    });

    // Calculate subtotal
    const subtotal = itemTotals.reduce((sum, total) => sum + total, 0);

    // Calculate discount
    const percentageDiscount = (subtotal * discountPercentage) / 100;
    const finalDiscountAmount = Math.max(percentageDiscount, discountAmount);

    // Calculate tax
    const taxableAmount = subtotal - finalDiscountAmount;
    const taxAmount = items.reduce((sum, item, index) => {
      const itemTaxable = itemTotals[index] * (taxableAmount / subtotal);
      return sum + (itemTaxable * (item.taxRate || 0)) / 100;
    }, 0);

    // Calculate total
    const totalAmount = taxableAmount + taxAmount;

    const newCalculation: InvoiceCalculation = {
      subtotal,
      discountAmount: finalDiscountAmount,
      taxAmount,
      totalAmount,
      itemTotals,
    };

    setCalculation(newCalculation);
    form.setValue('taxAmount', taxAmount);
    form.setValue('discountAmount', finalDiscountAmount);
  };

  // Add new item
  const addNewItem = (): void => {
    append({
      productId: '',
      productName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discountPercentage: 0,
      taxRate: 10,
    });
  };

  // Remove item
  const removeItem = (index: number): void => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Handle form submission
  const handleSubmit = async (data: InvoiceGenerationForm): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (!customer) {
        throw new Error(t('invoice.error.no_customer'));
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      // Create invoice object
      const invoice: Invoice = {
        id: `invoice_${Date.now()}`,
        invoiceNumber,
        customerId: data.customerId,
        customerName: data.customerName,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        subtotal: calculation.subtotal,
        taxAmount: calculation.taxAmount,
        discountAmount: calculation.discountAmount,
        totalAmount: calculation.totalAmount,
        status: data.saveAsDraft ? InvoiceStatus.DRAFT : InvoiceStatus.SENT,
        paymentTerms: data.paymentTerms,
        paymentTermsDays: getPaymentTermsDays(data.paymentTerms),
        paidAmount: 0,
        outstandingAmount: calculation.totalAmount,
        overdueDays: 0,
        items: data.items.map((item, index) => ({
          id: `item_${index}`,
          productId: item.productId,
          productCode: item.productId,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          taxRate: item.taxRate || 0,
          taxAmount: (calculation.itemTotals[index] * (item.taxRate || 0)) / 100,
          discountPercentage: item.discountPercentage || 0,
          discountAmount: (item.quantity * item.unitPrice * (item.discountPercentage || 0)) / 100,
          finalAmount: calculation.itemTotals[index],
        })),
        payments: [],
        agencyId: 'current-agency-id', // TODO: Get from agency context
        createdBy: 'current-user-id', // TODO: Get from auth context
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Send email if requested
      if (data.sendToCustomer && customer.email) {
        // TODO: Implement email sending
        console.log('Sending invoice to:', customer.email);
      }

      onInvoiceGenerated(invoice);
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('invoice.error.generation_failed');
      setError(errorMessage);
      console.error('Invoice generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get payment terms days
  const getPaymentTermsDays = (terms: string): number => {
    switch (terms) {
      case 'NET_15':
        return 15;
      case 'NET_30':
        return 30;
      case 'NET_45':
        return 45;
      case 'NET_60':
        return 60;
      default:
        return 0;
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth='xl'
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' },
        }}
      >
        <DialogTitle>
          <Box display='flex' alignItems='center' justifyContent='space-between'>
            <Box display='flex' alignItems='center'>
              <Receipt sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant='h6' component='div'>
                {t('invoice.generation.title')}
              </Typography>
            </Box>
            <Box>
              <Button
                variant='outlined'
                size='small'
                onClick={() => setPreviewMode(!previewMode)}
                startIcon={<Preview />}
              >
                {previewMode ? t('invoice.edit') : t('invoice.preview')}
              </Button>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity='error' sx={{ mb: 3 }}>
              <AlertTitle>{t('invoice.error.title')}</AlertTitle>
              {error}
            </Alert>
          )}

          {!previewMode ? (
            <Grid container spacing={3}>
              {/* Customer Information */}
              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardContent>
                    <Box display='flex' alignItems='center' mb={2}>
                      <Person sx={{ mr: 2, color: 'primary.main' }} />
                      <Typography variant='h6'>{t('invoice.customer_info')}</Typography>
                    </Box>

                    {customer && (
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant='body1' fontWeight='bold'>
                            {customer.fullName}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {customer.email}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {customer.address}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {customer.phone}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Chip
                            label={`${t('invoice.credit_limit')}: ${formatCurrency(customer.creditLimit)}`}
                            color='primary'
                            size='small'
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            label={`${t('invoice.outstanding')}: ${formatCurrency(customer.outstandingBalance)}`}
                            color='warning'
                            size='small'
                          />
                        </Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Invoice Details */}
              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardContent>
                    <Box display='flex' alignItems='center' mb={2}>
                      <CalendarToday sx={{ mr: 2, color: 'primary.main' }} />
                      <Typography variant='h6'>{t('invoice.details')}</Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Controller
                          name='issueDate'
                          control={form.control}
                          render={({ field }) => (
                            <DatePicker
                              label={t('invoice.issue_date')}
                              value={field.value}
                              onChange={field.onChange}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  error: !!form.formState.errors.issueDate,
                                  helperText: form.formState.errors.issueDate?.message,
                                },
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Controller
                          name='dueDate'
                          control={form.control}
                          render={({ field }) => (
                            <DatePicker
                              label={t('invoice.due_date')}
                              value={field.value}
                              onChange={field.onChange}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  error: !!form.formState.errors.dueDate,
                                  helperText: form.formState.errors.dueDate?.message,
                                },
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Controller
                          name='paymentTerms'
                          control={form.control}
                          render={({ field }) => (
                            <PaymentTermsSelector
                              value={field.value}
                              onChange={field.onChange}
                              error={!!form.formState.errors.paymentTerms}
                              helperText={form.formState.errors.paymentTerms?.message}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Invoice Items */}
              <Grid item xs={12}>
                <Card elevation={2}>
                  <CardContent>
                    <Box display='flex' alignItems='center' justifyContent='space-between' mb={2}>
                      <Typography variant='h6'>{t('invoice.items')}</Typography>
                      <Button variant='contained' size='small' onClick={addNewItem} startIcon={<Add />}>
                        {t('invoice.add_item')}
                      </Button>
                    </Box>

                    <TableContainer component={Paper} variant='outlined'>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>{t('invoice.product')}</TableCell>
                            <TableCell>{t('invoice.description')}</TableCell>
                            <TableCell align='right'>{t('invoice.quantity')}</TableCell>
                            <TableCell align='right'>{t('invoice.unit_price')}</TableCell>
                            <TableCell align='right'>{t('invoice.discount')}</TableCell>
                            <TableCell align='right'>{t('invoice.tax')}</TableCell>
                            <TableCell align='right'>{t('invoice.total')}</TableCell>
                            <TableCell align='center'>{t('invoice.actions')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {fields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell>
                                <Controller
                                  name={`items.${index}.productName`}
                                  control={form.control}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      size='small'
                                      placeholder={t('invoice.product_name')}
                                      error={!!form.formState.errors.items?.[index]?.productName}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  name={`items.${index}.description`}
                                  control={form.control}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      size='small'
                                      placeholder={t('invoice.description')}
                                      multiline
                                      rows={1}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  name={`items.${index}.quantity`}
                                  control={form.control}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      type='number'
                                      size='small'
                                      inputProps={{ min: 1 }}
                                      error={!!form.formState.errors.items?.[index]?.quantity}
                                      sx={{ width: 80 }}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  name={`items.${index}.unitPrice`}
                                  control={form.control}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      type='number'
                                      size='small'
                                      inputProps={{ min: 0, step: 0.01 }}
                                      error={!!form.formState.errors.items?.[index]?.unitPrice}
                                      sx={{ width: 100 }}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  name={`items.${index}.discountPercentage`}
                                  control={form.control}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      type='number'
                                      size='small'
                                      inputProps={{ min: 0, max: 100 }}
                                      placeholder='0%'
                                      sx={{ width: 70 }}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  name={`items.${index}.taxRate`}
                                  control={form.control}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      type='number'
                                      size='small'
                                      inputProps={{ min: 0, max: 100 }}
                                      placeholder='10%'
                                      sx={{ width: 70 }}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell align='right'>
                                <Typography variant='body2' fontWeight='bold'>
                                  {formatCurrency(calculation.itemTotals[index] || 0)}
                                </Typography>
                              </TableCell>
                              <TableCell align='center'>
                                <IconButton
                                  size='small'
                                  onClick={() => removeItem(index)}
                                  disabled={fields.length === 1}
                                  color='error'
                                >
                                  <Delete />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Invoice Totals */}
              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>
                      {t('invoice.totals')}
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Controller
                          name='discountPercentage'
                          control={form.control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type='number'
                              label={t('invoice.discount_percentage')}
                              fullWidth
                              size='small'
                              inputProps={{ min: 0, max: 100 }}
                              InputProps={{
                                endAdornment: '%',
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Controller
                          name='discountAmount'
                          control={form.control}
                          render={({ field }) => (
                            <AmountInput
                              label={t('invoice.discount_amount')}
                              value={field.value || 0}
                              onChange={field.onChange}
                              size='small'
                              fullWidth
                            />
                          )}
                        />
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Box display='flex' justifyContent='space-between' mb={1}>
                      <Typography variant='body2'>{t('invoice.subtotal')}</Typography>
                      <Typography variant='body2'>{formatCurrency(calculation.subtotal)}</Typography>
                    </Box>
                    <Box display='flex' justifyContent='space-between' mb={1}>
                      <Typography variant='body2'>{t('invoice.discount')}</Typography>
                      <Typography variant='body2'>-{formatCurrency(calculation.discountAmount)}</Typography>
                    </Box>
                    <Box display='flex' justifyContent='space-between' mb={1}>
                      <Typography variant='body2'>{t('invoice.tax')}</Typography>
                      <Typography variant='body2'>{formatCurrency(calculation.taxAmount)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box display='flex' justifyContent='space-between'>
                      <Typography variant='h6'>{t('invoice.total')}</Typography>
                      <Typography variant='h6' color='primary'>
                        {formatCurrency(calculation.totalAmount)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Additional Options */}
              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>
                      {t('invoice.options')}
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Controller
                          name='notes'
                          control={form.control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label={t('invoice.notes')}
                              fullWidth
                              multiline
                              rows={3}
                              placeholder={t('invoice.notes_placeholder')}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Controller
                          name='sendToCustomer'
                          control={form.control}
                          render={({ field }) => (
                            <FormControlLabel
                              control={<Switch checked={field.value} onChange={field.onChange} />}
                              label={t('invoice.send_to_customer')}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Controller
                          name='saveAsDraft'
                          control={form.control}
                          render={({ field }) => (
                            <FormControlLabel
                              control={<Switch checked={field.value} onChange={field.onChange} />}
                              label={t('invoice.save_as_draft')}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            // Preview Mode
            <Card elevation={2}>
              <CardContent>
                <Typography variant='h4' gutterBottom align='center'>
                  {t('invoice.preview')}
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant='h6' gutterBottom>
                      {t('invoice.bill_to')}
                    </Typography>
                    <Typography variant='body1'>{customer?.fullName}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {customer?.address}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {customer?.email}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {customer?.phone}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant='h6' gutterBottom>
                      {t('invoice.invoice_details')}
                    </Typography>
                    <Typography variant='body2'>
                      {t('invoice.issue_date')}: {form.getValues('issueDate')?.toLocaleDateString()}
                    </Typography>
                    <Typography variant='body2'>
                      {t('invoice.due_date')}: {form.getValues('dueDate')?.toLocaleDateString()}
                    </Typography>
                    <Typography variant='body2'>
                      {t('invoice.payment_terms')}: {form.getValues('paymentTerms')}
                    </Typography>
                  </Grid>
                </Grid>

                <TableContainer component={Paper} variant='outlined' sx={{ mt: 3 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('invoice.description')}</TableCell>
                        <TableCell align='right'>{t('invoice.quantity')}</TableCell>
                        <TableCell align='right'>{t('invoice.unit_price')}</TableCell>
                        <TableCell align='right'>{t('invoice.total')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {watchedItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant='body2' fontWeight='bold'>
                              {item.productName}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {item.description}
                            </Typography>
                          </TableCell>
                          <TableCell align='right'>{item.quantity}</TableCell>
                          <TableCell align='right'>{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell align='right'>{formatCurrency(calculation.itemTotals[index] || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box mt={3} display='flex' justifyContent='flex-end'>
                  <Box minWidth={300}>
                    <Box display='flex' justifyContent='space-between' mb={1}>
                      <Typography variant='body2'>{t('invoice.subtotal')}</Typography>
                      <Typography variant='body2'>{formatCurrency(calculation.subtotal)}</Typography>
                    </Box>
                    <Box display='flex' justifyContent='space-between' mb={1}>
                      <Typography variant='body2'>{t('invoice.discount')}</Typography>
                      <Typography variant='body2'>-{formatCurrency(calculation.discountAmount)}</Typography>
                    </Box>
                    <Box display='flex' justifyContent='space-between' mb={1}>
                      <Typography variant='body2'>{t('invoice.tax')}</Typography>
                      <Typography variant='body2'>{formatCurrency(calculation.taxAmount)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box display='flex' justifyContent='space-between'>
                      <Typography variant='h6'>{t('invoice.total')}</Typography>
                      <Typography variant='h6' color='primary'>
                        {formatCurrency(calculation.totalAmount)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {form.getValues('notes') && (
                  <Box mt={3}>
                    <Typography variant='h6' gutterBottom>
                      {t('invoice.notes')}
                    </Typography>
                    <Typography variant='body2'>{form.getValues('notes')}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={loading} variant='outlined'>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            variant='contained'
            disabled={loading || !customer}
            startIcon={loading ? null : <Save />}
            sx={{ minWidth: 160 }}
          >
            {loading ? t('common.processing') : t('invoice.generate')}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};
