/**
 * Order Create Modal Component
 * Comprehensive order creation interface with customer/product search, cart management
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Order Management
 * @architecture Molecule Component
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  TextField,
  Autocomplete,
  Box,
  Card,
  CardContent,
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
  Alert,
  AlertTitle,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close,
  Add,
  Delete,
  ShoppingCart,
  Person,
  Inventory,
  LocalShipping,
  Receipt,
  ExpandMore,
  Search,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Custom hooks for payment and credit integration
import { useCredit } from '../../../hooks/useCredit';
import type { CreditCheckResult } from '../../../domains/payment/types/PaymentTypes';
import { CreditStatus, CreditRiskLevel } from '../../../domains/payment/valueObjects/PaymentStatus';
import { CreditStatusChip } from '../../atoms/CreditStatusChip';
import { CreditLimitDisplay } from '../../atoms/CreditLimitDisplay';

// Types
interface Customer {
  id: string;
  customerCode: string;
  fullName: string;
  companyName?: string;
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  addresses: Array<{
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
    addressType: string;
  }>;
}

enum PaymentMethod {
  CASH = 'CASH',
  CREDIT = 'CREDIT',
  CHEQUE = 'CHEQUE',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

interface MockProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  inStock: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
}

interface MockEmployee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface MockArea {
  id: string;
  areaCode: string;
  areaName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

// Mock data - in a real app, these would come from props or context
const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    customerCode: 'CUST001',
    fullName: 'Robert Johnson',
    companyName: 'Tech Solutions Inc.',
    creditLimit: 50000,
    outstandingBalance: 12500,
    availableCredit: 37500,
    addresses: [
      {
        street: '123 Corporate Blvd',
        city: 'Business City',
        state: 'BC',
        zipCode: '12345',
        country: 'USA',
        isDefault: true,
        addressType: 'BOTH',
      },
    ],
  },
  {
    id: 'cust-2',
    customerCode: 'CUST002',
    fullName: 'Maria Garcia',
    creditLimit: 5000,
    outstandingBalance: 750,
    availableCredit: 4250,
    addresses: [
      {
        street: '456 Residential St',
        city: 'Home Town',
        state: 'HT',
        zipCode: '23456',
        country: 'USA',
        isDefault: true,
        addressType: 'BOTH',
      },
    ],
  },
];

const mockProducts: MockProduct[] = [
  {
    id: 'prod-1',
    sku: 'ELEC001',
    name: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    category: 'Electronics',
    brand: 'TechSound',
    price: 299.99,
    inStock: 45,
    status: 'ACTIVE',
  },
  {
    id: 'prod-2',
    sku: 'FURN001',
    name: 'Ergonomic Office Chair',
    description: 'Comfortable ergonomic office chair with lumbar support',
    category: 'Furniture',
    brand: 'ComfortDesk',
    price: 449.99,
    inStock: 25,
    status: 'ACTIVE',
  },
];

const mockEmployees: MockEmployee[] = [
  {
    id: 'emp-1',
    firstName: 'John',
    lastName: 'Delivery',
    role: 'Delivery Personnel',
    status: 'ACTIVE',
  },
  {
    id: 'emp-2',
    firstName: 'Sarah',
    lastName: 'Driver',
    role: 'Delivery Personnel',
    status: 'ACTIVE',
  },
];

/**
 * Animation variants
 */
const modalVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

/**
 * Cart item interface
 */
interface CartItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  productDetails: string;
  unitPrice: number;
  boxSize: number;
  quantityBoxes: number;
  quantityLoose: number;
  totalUnits: number;
  discount: number;
  discountAmount: number;
  subtotal: number;
  total: number;
  deliveryPersonId: string | undefined;
  deliveryPersonName: string | undefined;
  inventoryAvailable: number;
  notes: string | undefined;
}

/**
 * Order form schema
 */
const OrderFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  deliveryDate: z.date().optional(),
  discountPercentage: z.coerce.number().min(0).max(100, 'Discount must be between 0 and 100'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  creditDays: z.coerce.number().min(0, 'Credit days cannot be negative'),
  customerNotes: z.string().optional(),
  internalNotes: z.string().optional(),
});

type OrderFormData = z.infer<typeof OrderFormSchema>;

/**
 * Product form schema
 */
const ProductFormSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantityBoxes: z.coerce.number().min(0, 'Quantity boxes cannot be negative'),
  quantityLoose: z.coerce.number().min(0, 'Quantity loose cannot be negative'),
  unitPrice: z.coerce.number().min(0.01, 'Unit price must be greater than 0'),
  discount: z.coerce.number().min(0).max(100, 'Discount must be between 0 and 100'),
  deliveryPersonId: z.string().optional(),
  notes: z.string().optional(),
});

type ProductFormData = z.infer<typeof ProductFormSchema>;

/**
 * Props interface
 */
export interface OrderCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (orderData: any) => Promise<void>;
  agencyId: string;
}

/**
 * Order Create Modal Component
 */
export const OrderCreateModal: React.FC<OrderCreateModalProps> = ({ open, onClose, onSubmit, agencyId }) => {
  const theme = useTheme();

  // Custom hooks for credit management
  const {
    performCreditCheck,
    getCreditStatusColor,
    getCreditStatusText,
    getRiskLevelColor,
    getRiskLevelText,
    canExtendCredit,
  } = useCredit();

  // State management
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MockProduct | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credit check state
  const [creditCheckResult, setCreditCheckResult] = useState<CreditCheckResult | null>(null);
  const [creditCheckLoading, setCreditCheckLoading] = useState(false);
  const [showCreditWarning, setShowCreditWarning] = useState(false);

  // Form management
  const orderForm = useForm<OrderFormData>({
    resolver: zodResolver(OrderFormSchema),
    defaultValues: {
      customerId: '',
      discountPercentage: 0,
      paymentMethod: PaymentMethod.CASH,
      creditDays: 0,
      customerNotes: '',
      internalNotes: '',
    },
  });

  const productForm = useForm<ProductFormData>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: {
      productId: '',
      quantityBoxes: 0,
      quantityLoose: 0,
      unitPrice: 0,
      discount: 0,
      deliveryPersonId: '',
      notes: '',
    },
  });

  // Filtered data with incremental search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return mockCustomers.slice(0, 10);
    return mockCustomers.filter(
      (customer) =>
        customer.customerCode.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.companyName?.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [customerSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return mockProducts.slice(0, 10);
    return mockProducts.filter(
      (product) =>
        product.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.category.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [productSearch]);

  // Get delivery persons for customer's area
  const availableDeliveryPersons = useMemo(() => {
    if (!selectedCustomer) return [];
    // Mock: filter employees by area (in real app, this would be based on customer's area)
    return mockEmployees.filter((emp) => emp.status === 'ACTIVE');
  }, [selectedCustomer]);

  // Customer auto-fill effect
  useEffect(() => {
    if (selectedCustomer) {
      orderForm.setValue('customerId', selectedCustomer.id);
    }
  }, [selectedCustomer, orderForm]);

  // Product auto-fill effect
  useEffect(() => {
    if (selectedProduct) {
      productForm.setValue('productId', selectedProduct.id);
      productForm.setValue('unitPrice', selectedProduct.price);
    }
  }, [selectedProduct, productForm]);

  // Calculate totals
  const orderTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDiscount = cart.reduce((sum, item) => sum + item.discountAmount, 0);
    const tax = (subtotal - totalDiscount) * 0.085; // 8.5% tax
    const total = subtotal - totalDiscount + tax;

    return {
      subtotal,
      totalDiscount,
      tax,
      total,
      itemCount: cart.reduce((sum, item) => sum + item.totalUnits, 0),
    };
  }, [cart]);

  /**
   * Add product to cart
   */
  const handleAddToCart = useCallback(async () => {
    try {
      const productData = await productForm.trigger();
      if (!productData || !selectedProduct) return;

      const formValues = productForm.getValues();
      const totalUnits = formValues.quantityBoxes * 12 + formValues.quantityLoose; // Assuming box size 12

      if (totalUnits === 0) {
        setError('Please specify quantity in boxes or loose items');
        return;
      }

      const subtotal = totalUnits * formValues.unitPrice;
      const discountAmount = subtotal * (formValues.discount / 100);
      const total = subtotal - discountAmount;

      const deliveryPerson = availableDeliveryPersons.find((emp) => emp.id === formValues.deliveryPersonId);

      const cartItem: CartItem = {
        id: `cart-${Date.now()}-${selectedProduct.id}`,
        productId: selectedProduct.id,
        productCode: selectedProduct.sku,
        productName: selectedProduct.name,
        productDetails: `${selectedProduct.category} - ${selectedProduct.brand}`,
        unitPrice: formValues.unitPrice,
        boxSize: 12, // Mock box size
        quantityBoxes: formValues.quantityBoxes,
        quantityLoose: formValues.quantityLoose,
        totalUnits,
        discount: formValues.discount,
        discountAmount,
        subtotal,
        total,
        deliveryPersonId: formValues.deliveryPersonId,
        deliveryPersonName: deliveryPerson ? `${deliveryPerson.firstName} ${deliveryPerson.lastName}` : undefined,
        inventoryAvailable: selectedProduct.inStock,
        notes: formValues.notes,
      };

      setCart((prev) => [...prev, cartItem]);

      // Reset product form
      productForm.reset();
      setSelectedProduct(null);
      setProductSearch('');
      setError(null);
    } catch (err) {
      setError('Failed to add product to cart');
    }
  }, [productForm, selectedProduct, availableDeliveryPersons]);

  /**
   * Remove item from cart
   */
  const handleRemoveFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  /**
   * Submit order
   */
  const handleSubmitOrder = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const orderData = await orderForm.trigger();
      if (!orderData || cart.length === 0) {
        setError('Please add at least one product to the cart');
        return;
      }

      const formValues = orderForm.getValues();

      const orderPayload = {
        customerCode: selectedCustomer?.customerCode || '',
        deliveryDate: formValues.deliveryDate,
        areaCode: selectedCustomer?.addresses[0]?.city || '',
        items: cart.map((item) => ({
          productCode: item.productCode,
          quantityBoxes: item.quantityBoxes,
          quantityLoose: item.quantityLoose,
          unitPrice: item.unitPrice,
          discountPercentage: item.discount,
          notes: item.notes,
        })),
        discountPercentage: formValues.discountPercentage,
        paymentMethod: formValues.paymentMethod,
        creditDays: formValues.creditDays,
        customerNotes: formValues.customerNotes,
        internalNotes: formValues.internalNotes,
      };

      await onSubmit(orderPayload);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (!submitting) {
      orderForm.reset({
        customerId: '',
        discountPercentage: 0,
        paymentMethod: PaymentMethod.CASH,
        creditDays: 0,
        customerNotes: '',
        internalNotes: '',
      });
      productForm.reset();
      setSelectedCustomer(null);
      setSelectedProduct(null);
      setCart([]);
      setCustomerSearch('');
      setProductSearch('');
      setError(null);
      onClose();
    }
  }, [submitting, orderForm, productForm, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth='xl'
          fullWidth
          PaperProps={{
            component: motion.div,
            variants: modalVariants,
            initial: 'hidden',
            animate: 'visible',
            exit: 'exit',
            transition: { duration: 0.3 },
            sx: {
              bgcolor: 'background.paper',
              borderRadius: 2,
              minHeight: '80vh',
            },
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ShoppingCart color='primary' />
              <Typography variant='h5' fontWeight={600}>
                Create New Order
              </Typography>
            </Box>
            <IconButton onClick={handleClose} disabled={submitting}>
              <Close />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ p: 3 }}>
              {error && (
                <motion.div variants={itemVariants} initial='hidden' animate='visible'>
                  <Alert severity='error' sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                </motion.div>
              )}

              <Grid container spacing={3}>
                {/* Customer Section */}
                <Grid item xs={12}>
                  <motion.div variants={itemVariants} initial='hidden' animate='visible'>
                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Person color='primary' />
                          <Typography variant='h6' fontWeight={600}>
                            Customer Information
                          </Typography>
                          {selectedCustomer && <CheckCircle color='success' fontSize='small' />}
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <Autocomplete
                              options={filteredCustomers}
                              getOptionLabel={(option) =>
                                `${option.customerCode} - ${option.fullName}${
                                  option.companyName ? ` (${option.companyName})` : ''
                                }`
                              }
                              renderOption={(props, option) => (
                                <Box component='li' {...props}>
                                  <Stack>
                                    <Typography variant='body2' fontWeight={500}>
                                      {option.customerCode} - {option.fullName}
                                    </Typography>
                                    {option.companyName && (
                                      <Typography variant='caption' color='text.secondary'>
                                        {option.companyName}
                                      </Typography>
                                    )}
                                  </Stack>
                                </Box>
                              )}
                              inputValue={customerSearch}
                              onInputChange={(_, value) => setCustomerSearch(value)}
                              value={selectedCustomer}
                              onChange={(_, value) => setSelectedCustomer(value)}
                              renderInput={(params) => {
                                const { size, InputLabelProps, ...safeParams } = params;
                                const safeInputLabelProps = InputLabelProps?.className
                                  ? InputLabelProps
                                  : { ...InputLabelProps, className: '' };
                                return (
                                  <TextField
                                    {...safeParams}
                                    label='Search Customer'
                                    placeholder='Type customer code or name...'
                                    InputProps={{
                                      ...params.InputProps,
                                      startAdornment: <Search color='action' sx={{ mr: 1 }} />,
                                    }}
                                    InputLabelProps={safeInputLabelProps}
                                    fullWidth
                                    size={size === 'small' ? 'small' : 'medium'}
                                  />
                                );
                              }}
                            />
                          </Grid>

                          {selectedCustomer && (
                            <>
                              <Grid item xs={12} md={6}>
                                <Controller
                                  name='deliveryDate'
                                  control={orderForm.control}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      label='Delivery Date'
                                      type='date'
                                      InputLabelProps={{ shrink: true }}
                                      fullWidth
                                      value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                    />
                                  )}
                                />
                              </Grid>

                              <Grid item xs={12}>
                                <Card variant='outlined'>
                                  <CardContent>
                                    <Typography variant='subtitle1' fontWeight={600} gutterBottom>
                                      Customer Details
                                    </Typography>
                                    <Grid container spacing={2}>
                                      <Grid item xs={6} md={3}>
                                        <Typography variant='caption' color='text.secondary'>
                                          Area
                                        </Typography>
                                        <Typography variant='body2'>
                                          {selectedCustomer.addresses[0]?.city || 'N/A'}
                                        </Typography>
                                      </Grid>
                                      <Grid item xs={6} md={3}>
                                        <Typography variant='caption' color='text.secondary'>
                                          Credit Limit
                                        </Typography>
                                        <Typography variant='body2' fontWeight={500}>
                                          ${selectedCustomer.creditLimit.toLocaleString()}
                                        </Typography>
                                      </Grid>
                                      <Grid item xs={6} md={3}>
                                        <Typography variant='caption' color='text.secondary'>
                                          Outstanding Balance
                                        </Typography>
                                        <Typography
                                          variant='body2'
                                          fontWeight={500}
                                          color={
                                            selectedCustomer.outstandingBalance > 0 ? 'warning.main' : 'success.main'
                                          }
                                        >
                                          ${selectedCustomer.outstandingBalance.toLocaleString()}
                                        </Typography>
                                      </Grid>
                                      <Grid item xs={6} md={3}>
                                        <Typography variant='caption' color='text.secondary'>
                                          Available Credit
                                        </Typography>
                                        <Typography variant='body2' fontWeight={500}>
                                          ${selectedCustomer.availableCredit.toLocaleString()}
                                        </Typography>
                                      </Grid>
                                    </Grid>
                                  </CardContent>
                                </Card>
                              </Grid>
                            </>
                          )}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  </motion.div>
                </Grid>

                {/* Product Section */}
                <Grid item xs={12}>
                  <motion.div variants={itemVariants} initial='hidden' animate='visible'>
                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Inventory color='primary' />
                          <Typography variant='h6' fontWeight={600}>
                            Add Products
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <Autocomplete
                              options={filteredProducts}
                              getOptionLabel={(option) => `${option.sku} - ${option.name}`}
                              renderOption={(props, option) => (
                                <Box component='li' {...props}>
                                  <Stack sx={{ width: '100%' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <Typography variant='body2' fontWeight={500}>
                                        {option.sku} - {option.name}
                                      </Typography>
                                      <Chip
                                        size='small'
                                        label={option.inStock > 0 ? 'In Stock' : 'Out of Stock'}
                                        color={option.inStock > 0 ? 'success' : 'error'}
                                      />
                                    </Box>
                                    <Typography variant='caption' color='text.secondary'>
                                      {option.category} • ${option.price} • Stock: {option.inStock}
                                    </Typography>
                                  </Stack>
                                </Box>
                              )}
                              inputValue={productSearch}
                              onInputChange={(_, value) => setProductSearch(value)}
                              value={selectedProduct}
                              onChange={(_, value) => setSelectedProduct(value)}
                              renderInput={(params) => {
                                const { size, ...otherParams } = params;
                                return (
                                  <TextField
                                    {...otherParams}
                                    label='Search Product'
                                    placeholder='Type SKU or product name...'
                                    InputProps={{
                                      ...params.InputProps,
                                      startAdornment: <Search color='action' sx={{ mr: 1 }} />,
                                    }}
                                    fullWidth
                                    size={size === 'small' ? 'small' : 'medium'}
                                  />
                                );
                              }}
                            />
                          </Grid>

                          {selectedProduct && (
                            <>
                              <Grid item xs={12} md={6}>
                                <Card variant='outlined'>
                                  <CardContent>
                                    <Typography variant='subtitle1' fontWeight={600} gutterBottom>
                                      Product Details
                                    </Typography>
                                    <Grid container spacing={2}>
                                      <Grid item xs={6}>
                                        <Typography variant='caption' color='text.secondary'>
                                          Category
                                        </Typography>
                                        <Typography variant='body2'>{selectedProduct.category}</Typography>
                                      </Grid>
                                      <Grid item xs={6}>
                                        <Typography variant='caption' color='text.secondary'>
                                          Available Stock
                                        </Typography>
                                        <Typography
                                          variant='body2'
                                          fontWeight={500}
                                          color={selectedProduct.inStock > 0 ? 'success.main' : 'error.main'}
                                        >
                                          {selectedProduct.inStock} units
                                        </Typography>
                                      </Grid>
                                    </Grid>
                                  </CardContent>
                                </Card>
                              </Grid>

                              <Grid item xs={6} md={3}>
                                <Controller
                                  name='quantityBoxes'
                                  control={productForm.control}
                                  render={({ field, fieldState }) => (
                                    <TextField
                                      {...field}
                                      label='Quantity (Boxes)'
                                      type='number'
                                      inputProps={{ min: 0 }}
                                      error={!!fieldState.error}
                                      helperText={fieldState.error?.message || 'Units per box: 12'}
                                      fullWidth
                                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                    />
                                  )}
                                />
                              </Grid>

                              <Grid item xs={6} md={3}>
                                <Controller
                                  name='quantityLoose'
                                  control={productForm.control}
                                  render={({ field, fieldState }) => (
                                    <TextField
                                      {...field}
                                      label='Quantity (Loose)'
                                      type='number'
                                      inputProps={{ min: 0 }}
                                      error={!!fieldState.error}
                                      helperText={fieldState.error?.message || 'Individual units'}
                                      fullWidth
                                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                    />
                                  )}
                                />
                              </Grid>

                              <Grid item xs={6} md={3}>
                                <Controller
                                  name='unitPrice'
                                  control={productForm.control}
                                  render={({ field, fieldState }) => (
                                    <TextField
                                      {...field}
                                      label='Unit Price ($)'
                                      type='number'
                                      inputProps={{ min: 0.01, step: 0.01 }}
                                      error={!!fieldState.error}
                                      helperText={fieldState.error?.message || 'Editable price'}
                                      fullWidth
                                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                    />
                                  )}
                                />
                              </Grid>

                              <Grid item xs={6} md={3}>
                                <Controller
                                  name='discount'
                                  control={productForm.control}
                                  render={({ field, fieldState }) => (
                                    <TextField
                                      {...field}
                                      label='Discount (%)'
                                      type='number'
                                      inputProps={{ min: 0, max: 100 }}
                                      error={!!fieldState.error}
                                      helperText={fieldState.error?.message || 'Percentage discount'}
                                      fullWidth
                                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                    />
                                  )}
                                />
                              </Grid>

                              {selectedCustomer && availableDeliveryPersons.length > 0 && (
                                <Grid item xs={12} md={6}>
                                  <Controller
                                    name='deliveryPersonId'
                                    control={productForm.control}
                                    render={({ field }) => (
                                      <FormControl fullWidth>
                                        <InputLabel>Delivery Person</InputLabel>
                                        <Select {...field} label='Delivery Person'>
                                          <MenuItem value=''>
                                            <em>Select delivery person</em>
                                          </MenuItem>
                                          {availableDeliveryPersons.map((person) => (
                                            <MenuItem key={person.id} value={person.id}>
                                              {person.firstName} {person.lastName} - {person.role}
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>
                                    )}
                                  />
                                </Grid>
                              )}

                              <Grid item xs={12} md={6}>
                                <Controller
                                  name='notes'
                                  control={productForm.control}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      label='Item Notes'
                                      multiline
                                      rows={2}
                                      placeholder='Special instructions for this item...'
                                      fullWidth
                                    />
                                  )}
                                />
                              </Grid>

                              <Grid item xs={12}>
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                  <Button
                                    variant='contained'
                                    startIcon={<Add />}
                                    onClick={handleAddToCart}
                                    size='large'
                                    sx={{ minWidth: 200 }}
                                  >
                                    Add to Cart
                                  </Button>
                                </Box>
                              </Grid>
                            </>
                          )}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  </motion.div>
                </Grid>

                {/* Cart Section */}
                {cart.length > 0 && (
                  <Grid item xs={12}>
                    <motion.div variants={itemVariants} initial='hidden' animate='visible'>
                      <Card>
                        <CardContent>
                          <Typography variant='h6' fontWeight={600} gutterBottom>
                            Order Cart ({cart.length} items)
                          </Typography>

                          <TableContainer component={Paper} variant='outlined'>
                            <Table size='small'>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Product</TableCell>
                                  <TableCell align='center'>Qty (Box/Loose)</TableCell>
                                  <TableCell align='center'>Unit Price</TableCell>
                                  <TableCell align='center'>Discount</TableCell>
                                  <TableCell align='center'>Subtotal</TableCell>
                                  <TableCell align='center'>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {cart.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <Box>
                                        <Typography variant='body2' fontWeight={500}>
                                          {item.productCode} - {item.productName}
                                        </Typography>
                                        <Typography variant='caption' color='text.secondary'>
                                          {item.productDetails}
                                        </Typography>
                                        {item.deliveryPersonName && (
                                          <Chip
                                            size='small'
                                            icon={<LocalShipping />}
                                            label={item.deliveryPersonName}
                                            variant='outlined'
                                            sx={{ mt: 0.5 }}
                                          />
                                        )}
                                      </Box>
                                    </TableCell>
                                    <TableCell align='center'>
                                      <Typography variant='body2'>
                                        {item.quantityBoxes}B + {item.quantityLoose}L
                                      </Typography>
                                      <Typography variant='caption' color='text.secondary'>
                                        = {item.totalUnits} units
                                      </Typography>
                                    </TableCell>
                                    <TableCell align='center'>
                                      <Typography variant='body2'>${item.unitPrice.toFixed(2)}</Typography>
                                    </TableCell>
                                    <TableCell align='center'>
                                      <Typography variant='body2'>{item.discount}%</Typography>
                                      {item.discountAmount > 0 && (
                                        <Typography variant='caption' color='success.main'>
                                          -${item.discountAmount.toFixed(2)}
                                        </Typography>
                                      )}
                                    </TableCell>
                                    <TableCell align='center'>
                                      <Typography variant='body2' fontWeight={500}>
                                        ${item.total.toFixed(2)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align='center'>
                                      <IconButton
                                        color='error'
                                        size='small'
                                        onClick={() => handleRemoveFromCart(item.id)}
                                      >
                                        <Delete fontSize='small' />
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>

                          <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
                            <Grid container spacing={2}>
                              <Grid item xs={6} sm={3}>
                                <Typography variant='caption' color='text.secondary'>
                                  Total Items
                                </Typography>
                                <Typography variant='h6' fontWeight={600}>
                                  {orderTotals.itemCount}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant='caption' color='text.secondary'>
                                  Subtotal
                                </Typography>
                                <Typography variant='h6' fontWeight={600}>
                                  ${orderTotals.subtotal.toFixed(2)}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant='caption' color='text.secondary'>
                                  Total Discount
                                </Typography>
                                <Typography variant='h6' fontWeight={600} color='success.main'>
                                  -${orderTotals.totalDiscount.toFixed(2)}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant='caption' color='text.secondary'>
                                  Total Amount
                                </Typography>
                                <Typography variant='h5' fontWeight={700} color='primary.main'>
                                  ${orderTotals.total.toFixed(2)}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                )}

                {/* Order Settings Section */}
                <Grid item xs={12}>
                  <motion.div variants={itemVariants} initial='hidden' animate='visible'>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Receipt color='primary' />
                          <Typography variant='h6' fontWeight={600}>
                            Order Settings
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={4}>
                            <Controller
                              name='discountPercentage'
                              control={orderForm.control}
                              render={({ field, fieldState }) => (
                                <TextField
                                  {...field}
                                  label='Order Discount (%)'
                                  type='number'
                                  inputProps={{ min: 0, max: 100 }}
                                  error={!!fieldState.error}
                                  helperText={fieldState.error?.message || 'Overall order discount'}
                                  fullWidth
                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                />
                              )}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Controller
                              name='paymentMethod'
                              control={orderForm.control}
                              render={({ field, fieldState }) => (
                                <FormControl fullWidth error={!!fieldState.error}>
                                  <InputLabel>Payment Method</InputLabel>
                                  <Select {...field} label='Payment Method'>
                                    {Object.values(PaymentMethod).map((method) => (
                                      <MenuItem key={method} value={method}>
                                        {method.replace('_', ' ')}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                  {fieldState.error && (
                                    <Typography variant='caption' color='error' sx={{ mt: 0.5 }}>
                                      {fieldState.error.message}
                                    </Typography>
                                  )}
                                </FormControl>
                              )}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Controller
                              name='creditDays'
                              control={orderForm.control}
                              render={({ field, fieldState }) => (
                                <TextField
                                  {...field}
                                  label='Credit Days'
                                  type='number'
                                  inputProps={{ min: 0 }}
                                  error={!!fieldState.error}
                                  helperText={fieldState.error?.message || 'Days for payment (0 for immediate)'}
                                  fullWidth
                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                />
                              )}
                            />
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  </motion.div>
                </Grid>

                {/* Notes Section */}
                <Grid item xs={12}>
                  <motion.div variants={itemVariants} initial='hidden' animate='visible'>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Controller
                          name='customerNotes'
                          control={orderForm.control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label='Customer Notes'
                              multiline
                              rows={3}
                              placeholder='Special delivery instructions, customer preferences...'
                              fullWidth
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Controller
                          name='internalNotes'
                          control={orderForm.control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label='Internal Notes'
                              multiline
                              rows={3}
                              placeholder='Internal notes for staff, special handling...'
                              fullWidth
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </motion.div>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>

          <DialogActions
            sx={{
              p: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderTop: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Button onClick={handleClose} disabled={submitting} size='large'>
              Cancel
            </Button>
            <Button
              variant='contained'
              onClick={handleSubmitOrder}
              disabled={submitting || cart.length === 0 || !selectedCustomer}
              startIcon={submitting ? <CircularProgress size={20} /> : <Receipt />}
              size='large'
              sx={{ minWidth: 150 }}
            >
              {submitting ? 'Creating...' : 'Submit Order'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default OrderCreateModal;
