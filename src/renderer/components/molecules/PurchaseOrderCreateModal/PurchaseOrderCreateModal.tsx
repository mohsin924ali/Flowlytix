/**
 * Purchase Order Create Modal Component
 * Modal for creating new purchase orders
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Purchase Order Management
 * @architecture Molecule Component (Atomic Design)
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Save as SaveIcon,
  ShoppingCart as PurchaseOrderIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import InventoryService, {
  CreatePurchaseOrderData,
  CreatePurchaseOrderSchema,
  Warehouse,
} from '../../../services/InventoryService';
import ProductService, { Product } from '../../../services/ProductService';
import { useAuthStore } from '../../../store/auth.store';
import { useAgencyStore } from '../../../store/agency.store';

/**
 * Component Props
 */
export interface PurchaseOrderCreateModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when modal should close */
  onClose: () => void;
  /** Called when purchase order is created successfully */
  onSuccess?: () => void;
  /** Test ID for testing purposes */
  'data-testid'?: string;
}

/**
 * Form data type
 */
type FormData = z.infer<typeof CreatePurchaseOrderSchema>;

/**
 * Purchase Order Create Modal Component
 */
export const PurchaseOrderCreateModal: React.FC<PurchaseOrderCreateModalProps> = ({
  open,
  onClose,
  onSuccess,
  'data-testid': testId = 'purchase-order-create-modal',
}) => {
  const { user } = useAuthStore();
  const { currentAgency } = useAgencyStore();

  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers] = useState([
    { id: 'sup-001', name: 'ABC Electronics Supply' },
    { id: 'sup-002', name: 'XYZ Manufacturing' },
    { id: 'sup-003', name: 'Global Parts Inc' },
    { id: 'sup-004', name: 'Tech Components Ltd' },
  ]);

  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(CreatePurchaseOrderSchema),
    defaultValues: {
      supplierName: '',
      supplierId: '',
      warehouseId: '',
      items: [{ productId: '', quantity: 1, unitCost: 0.0, notes: '' }],
      notes: '',
    },
    mode: 'onChange', // Enable real-time validation
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');

  // Load data on mount and when agency changes
  React.useEffect(() => {
    if (open && currentAgency) {
      loadData();
    }
  }, [open, currentAgency]);

  /**
   * Load warehouses and products
   */
  const loadData = async () => {
    try {
      console.log('🔄 PurchaseOrderCreateModal: Loading data...');
      console.log('🏢 PurchaseOrderCreateModal: Current agency:', currentAgency);

      // Ensure we have an agency
      if (!currentAgency?.id) {
        console.log('❌ PurchaseOrderCreateModal: No current agency found');
        setError('No agency selected. Please select an agency first.');
        return;
      }

      const [warehousesData, productsResult] = await Promise.all([
        InventoryService.getWarehouses(),
        ProductService.getProducts(currentAgency.id, 1, 100),
      ]);

      console.log('✅ PurchaseOrderCreateModal: Warehouses loaded:', warehousesData.length);
      console.log('✅ PurchaseOrderCreateModal: Products loaded:', productsResult.products.length);

      setWarehouses(warehousesData);
      setProducts(productsResult.products);
    } catch (err) {
      console.log('❌ PurchaseOrderCreateModal: Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  /**
   * Calculate totals
   */
  const calculateTotals = () => {
    const subtotal = watchedItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const tax = subtotal * 0.13; // 13% tax
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  /**
   * Handle form submission
   */
  const handleCreate = useCallback(
    async (data: FormData) => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Ensure expectedDeliveryDate is handled properly
        const createData: CreatePurchaseOrderData = {
          supplierName: data.supplierName,
          supplierId: data.supplierId,
          warehouseId: data.warehouseId,
          items: data.items,
          notes: data.notes,
          ...(data.expectedDeliveryDate && { expectedDeliveryDate: data.expectedDeliveryDate }),
        };

        await InventoryService.createPurchaseOrder(createData, user.id);

        onSuccess?.();
        onClose();
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create purchase order');
      } finally {
        setLoading(false);
      }
    },
    [user, onSuccess, onClose, reset]
  );

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (!loading) {
      onClose();
      reset();
      setError(null);
    }
  }, [loading, onClose, reset]);

  /**
   * Add item to purchase order
   */
  const handleAddItem = useCallback(() => {
    append({ productId: '', quantity: 1, unitCost: 0.0, notes: '' });
  }, [append]);

  /**
   * Remove item from purchase order
   */
  const handleRemoveItem = useCallback(
    (index: number) => {
      if (fields.length > 1) {
        remove(index);
      }
    },
    [fields.length, remove]
  );

  const { subtotal, tax, total } = calculateTotals();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatePresence>
        {open && (
          <Dialog
            open={open}
            onClose={handleClose}
            maxWidth='lg'
            fullWidth
            data-testid={testId}
            PaperProps={{
              component: motion.div,
              initial: { opacity: 0, scale: 0.9 },
              animate: { opacity: 1, scale: 1 },
              exit: { opacity: 0, scale: 0.9 },
              transition: { duration: 0.3 },
              sx: {
                borderRadius: 2,
                maxHeight: '90vh',
              },
            }}
          >
            {/* Header */}
            <DialogTitle
              sx={{
                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(129, 199, 132, 0.08) 100%)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                p: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PurchaseOrderIcon color='success' sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant='h5' sx={{ fontWeight: 700, mb: 0.5 }}>
                      Create Purchase Order
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Create a new purchase order for inventory restocking
                    </Typography>
                  </Box>
                </Box>
                <IconButton onClick={handleClose} disabled={loading}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>

            {/* Content */}
            <DialogContent sx={{ p: 3 }}>
              {error && (
                <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit(handleCreate)}>
                {/* Basic Information */}
                <Typography variant='h6' sx={{ mb: 2, fontWeight: 600 }}>
                  Order Information
                </Typography>

                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name='supplierId'
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.supplierId}>
                          <InputLabel>Supplier</InputLabel>
                          <Select
                            {...field}
                            label='Supplier'
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              const supplier = suppliers.find((s) => s.id === e.target.value);
                              if (supplier) {
                                // Update supplier name in form using setValue
                                setValue('supplierName', supplier.name);
                              }
                            }}
                          >
                            {suppliers.map((supplier) => (
                              <MenuItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.supplierId && (
                            <Typography variant='caption' color='error'>
                              {errors.supplierId.message}
                            </Typography>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name='warehouseId'
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.warehouseId}>
                          <InputLabel>Warehouse</InputLabel>
                          <Select {...field} label='Warehouse'>
                            {warehouses.map((warehouse) => (
                              <MenuItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.warehouseId && (
                            <Typography variant='caption' color='error'>
                              {errors.warehouseId.message}
                            </Typography>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name='expectedDeliveryDate'
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          label='Expected Delivery Date'
                          value={field.value || null}
                          onChange={field.onChange}
                          slots={{
                            textField: TextField,
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              error: !!errors.expectedDeliveryDate,
                              helperText: errors.expectedDeliveryDate?.message,
                            },
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name='notes'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label='Notes'
                          multiline
                          rows={2}
                          error={!!errors.notes}
                          helperText={errors.notes?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>

                {/* Items Section */}
                <Typography variant='h6' sx={{ mb: 2, fontWeight: 600 }}>
                  Order Items
                </Typography>

                <Table size='small' sx={{ mb: 3 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Unit Cost</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell width={50}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Controller
                            name={`items.${index}.productId`}
                            control={control}
                            render={({ field }) => (
                              <Autocomplete
                                {...field}
                                options={products}
                                getOptionLabel={(option) =>
                                  typeof option === 'string' ? option : `${option.name} (${option.sku})`
                                }
                                renderInput={(params) => (
                                  <TextField {...params} size='small' error={!!errors.items?.[index]?.productId} />
                                )}
                                onChange={(_, value) => field.onChange(value?.id || '')}
                                value={products.find((p) => p.id === field.value) || null}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`items.${index}.quantity`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                size='small'
                                type='number'
                                inputProps={{ min: 1 }}
                                error={!!errors.items?.[index]?.quantity}
                                onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                                value={field.value || 1}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`items.${index}.unitCost`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                size='small'
                                type='number'
                                inputProps={{ min: 0, step: 0.01 }}
                                error={!!errors.items?.[index]?.unitCost}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                value={field.value || 0}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          ${((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitCost || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size='small'
                            onClick={() => handleRemoveItem(index)}
                            disabled={fields.length === 1}
                          >
                            <RemoveIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Button variant='outlined' startIcon={<AddIcon />} onClick={handleAddItem} size='small'>
                    Add Item
                  </Button>

                  <Box>
                    <Typography variant='body2'>
                      Subtotal: <strong>${subtotal.toFixed(2)}</strong>
                    </Typography>
                    <Typography variant='body2'>
                      Tax (13%): <strong>${tax.toFixed(2)}</strong>
                    </Typography>
                    <Typography variant='h6' color='primary'>
                      Total: <strong>${total.toFixed(2)}</strong>
                    </Typography>
                  </Box>
                </Box>
              </form>
            </DialogContent>

            {/* Actions */}
            <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
              <Button onClick={handleClose} disabled={loading} variant='outlined'>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(handleCreate)}
                disabled={loading}
                variant='contained'
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {loading ? 'Creating...' : 'Create Purchase Order'}
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </AnimatePresence>
    </LocalizationProvider>
  );
};
