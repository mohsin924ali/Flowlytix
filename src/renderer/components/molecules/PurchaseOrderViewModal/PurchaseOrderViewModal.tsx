/**
 * Purchase Order View Modal Component
 * Displays complete purchase order details in a professional read-only format
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Purchase Order Management
 * @architecture Molecule Component (Atomic Design)
 * @version 1.0.0
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  useTheme,
  Avatar,
  Card,
  CardContent,
} from '@mui/material';
import {
  Close as CloseIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  LocalShipping as ShippingIcon,
  CalendarToday as CalendarIcon,
  Inventory as InventoryIcon,
  ShoppingCart as PurchaseOrderIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { PurchaseOrder, PurchaseOrderStatus } from '../../../services/InventoryService';

/**
 * Component Props
 */
export interface PurchaseOrderViewModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Purchase order to display */
  purchaseOrder: PurchaseOrder | null;
  /** Called when modal should close */
  onClose: () => void;
  /** Called when edit is requested */
  onEdit?: (purchaseOrder: PurchaseOrder) => void;
  /** Called when print is requested */
  onPrint?: (purchaseOrder: PurchaseOrder) => void;
  /** Test ID for testing purposes */
  'data-testid'?: string;
}

/**
 * Format currency value
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Format date value
 */
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

/**
 * Get status color based on purchase order status
 */
const getStatusColor = (status: PurchaseOrderStatus): string => {
  switch (status) {
    case PurchaseOrderStatus.DRAFT:
      return '#ff9800';
    case PurchaseOrderStatus.PENDING:
      return '#2196f3';
    case PurchaseOrderStatus.APPROVED:
      return '#00bcd4';
    case PurchaseOrderStatus.ORDERED:
      return '#9c27b0';
    case PurchaseOrderStatus.RECEIVED:
      return '#4caf50';
    case PurchaseOrderStatus.CANCELLED:
      return '#f44336';
    default:
      return '#757575';
  }
};

/**
 * Purchase Order View Modal Component
 */
export const PurchaseOrderViewModal: React.FC<PurchaseOrderViewModalProps> = ({
  open,
  purchaseOrder,
  onClose,
  onEdit,
  onPrint,
  'data-testid': testId = 'purchase-order-view-modal',
}) => {
  const theme = useTheme();

  // Don't render if no purchase order
  if (!purchaseOrder) return null;

  /**
   * Handle print purchase order
   */
  const handlePrint = (): void => {
    if (onPrint && purchaseOrder) {
      onPrint(purchaseOrder);
    }
  };

  /**
   * Handle edit purchase order
   */
  const handleEdit = (): void => {
    if (onEdit && purchaseOrder) {
      onEdit(purchaseOrder);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={onClose}
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
                <Avatar
                  sx={{
                    bgcolor: theme.palette.success.main,
                    width: 48,
                    height: 48,
                  }}
                >
                  <PurchaseOrderIcon />
                </Avatar>
                <Box>
                  <Typography variant='h5' sx={{ fontWeight: 700, mb: 0.5 }}>
                    Purchase Order Details
                  </Typography>
                  <Typography variant='body1' color='text.secondary'>
                    {purchaseOrder.orderNumber}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {onEdit && (
                  <IconButton onClick={handleEdit} color='primary' sx={{ mr: 1 }}>
                    <EditIcon />
                  </IconButton>
                )}
                {onPrint && (
                  <IconButton onClick={handlePrint} color='primary' sx={{ mr: 1 }}>
                    <PrintIcon />
                  </IconButton>
                )}
                <IconButton onClick={onClose} color='inherit'>
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
          </DialogTitle>

          {/* Content */}
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ p: 3 }}>
              {/* Purchase Order Summary */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                    <CardContent>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <BusinessIcon color='primary' />
                        Supplier Information
                      </Typography>
                      <Box sx={{ space: 1.5 }}>
                        <Typography variant='body1' sx={{ fontWeight: 600, mb: 0.5 }}>
                          {purchaseOrder.supplierName}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant='body2' color='text.secondary'>
                            Supplier ID: {purchaseOrder.supplierId}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                    <CardContent>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <InventoryIcon color='primary' />
                        Order Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant='body2' color='text.secondary' gutterBottom>
                            Status
                          </Typography>
                          <Chip
                            label={purchaseOrder.status.replace('_', ' ')}
                            size='small'
                            sx={{
                              backgroundColor: `${getStatusColor(purchaseOrder.status)}20`,
                              color: getStatusColor(purchaseOrder.status),
                              fontWeight: 600,
                            }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant='body2' color='text.secondary' gutterBottom>
                            Warehouse
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ShippingIcon fontSize='small' color='action' />
                            <Typography variant='body2'>{purchaseOrder.warehouseId}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant='body2' color='text.secondary' gutterBottom>
                            Order Date
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarIcon fontSize='small' color='action' />
                            <Typography variant='body2'>{formatDate(purchaseOrder.orderDate)}</Typography>
                          </Box>
                        </Grid>
                        {purchaseOrder.expectedDeliveryDate && (
                          <Grid item xs={6}>
                            <Typography variant='body2' color='text.secondary' gutterBottom>
                              Expected Delivery
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CalendarIcon fontSize='small' color='action' />
                              <Typography variant='body2'>{formatDate(purchaseOrder.expectedDeliveryDate)}</Typography>
                            </Box>
                          </Grid>
                        )}
                        <Grid item xs={12}>
                          <Typography variant='body2' color='text.secondary' gutterBottom>
                            Created By
                          </Typography>
                          <Typography variant='body2'>{purchaseOrder.createdBy}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Purchase Order Items */}
              <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
                Order Items
              </Typography>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 600 }}>
                        Code
                      </TableCell>
                      <TableCell align='center' sx={{ fontWeight: 600 }}>
                        Quantity
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600 }}>
                        Unit Cost
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600 }}>
                        Total Cost
                      </TableCell>
                      <TableCell align='center' sx={{ fontWeight: 600 }}>
                        Received
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchaseOrder.items.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {item.productName}
                          </Typography>
                          {item.notes && (
                            <Typography variant='caption' color='text.secondary'>
                              {item.notes}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align='center'>
                          <Typography variant='body2' color='text.secondary'>
                            {item.productCode}
                          </Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {item.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2'>{formatCurrency(item.unitCost)}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {formatCurrency(item.totalCost)}
                          </Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <Typography
                            variant='body2'
                            color={item.receivedQuantity === item.quantity ? 'success.main' : 'warning.main'}
                            sx={{ fontWeight: 600 }}
                          >
                            {item.receivedQuantity} / {item.quantity}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 3 }} />

              {/* Order Summary */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  {purchaseOrder.notes && (
                    <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                      <CardContent>
                        <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
                          Notes
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {purchaseOrder.notes}
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                    <CardContent>
                      <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
                        Order Summary
                      </Typography>
                      <Box sx={{ space: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant='body2'>Subtotal:</Typography>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {formatCurrency(purchaseOrder.subtotalAmount)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant='body2'>Tax:</Typography>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {formatCurrency(purchaseOrder.taxAmount)}
                          </Typography>
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant='h6' sx={{ fontWeight: 700 }}>
                            Total:
                          </Typography>
                          <Typography variant='h6' sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {formatCurrency(purchaseOrder.totalAmount)}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>

          {/* Actions */}
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <Button onClick={onClose} variant='outlined'>
              Close
            </Button>
            {onPrint && (
              <Button onClick={handlePrint} variant='outlined' startIcon={<PrintIcon />}>
                Print Purchase Order
              </Button>
            )}
            {onEdit && (
              <Button onClick={handleEdit} variant='contained' startIcon={<EditIcon />}>
                Edit Purchase Order
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default PurchaseOrderViewModal;
