/**
 * Order View Modal Component
 * Displays complete order details in a professional read-only format
 * Following Instructions file standards with strict TypeScript compliance
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
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentIcon,
  LocalShipping as ShippingIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Order, OrderStatus, OrderPaymentStatus, PaymentMethod } from '../../../services/OrderService';

/**
 * Component Props
 */
export interface OrderViewModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Order to display */
  order: Order | null;
  /** Called when modal should close */
  onClose: () => void;
  /** Called when edit is requested */
  onEdit?: (order: Order) => void;
  /** Called when print is requested */
  onPrint?: (order: Order) => void;
  /** Test ID for testing purposes */
  'data-testid'?: string;
}

/**
 * Status Color Helper
 */
const getStatusColor = (status: OrderStatus): string => {
  const statusColors = {
    [OrderStatus.PENDING]: '#ff9800',
    [OrderStatus.CONFIRMED]: '#2196f3',
    [OrderStatus.PROCESSING]: '#9c27b0',
    [OrderStatus.SHIPPED]: '#3f51b5',
    [OrderStatus.DELIVERED]: '#4caf50',
    [OrderStatus.CANCELLED]: '#f44336',
    [OrderStatus.RETURNED]: '#9e9e9e',
  };
  return statusColors[status] || '#757575';
};

/**
 * Payment Status Color Helper
 */
const getPaymentStatusColor = (status: OrderPaymentStatus): string => {
  const statusColors = {
    [OrderPaymentStatus.PENDING]: '#ff9800',
    [OrderPaymentStatus.PAID]: '#4caf50',
    [OrderPaymentStatus.PARTIAL]: '#2196f3',
    [OrderPaymentStatus.OVERDUE]: '#f44336',
    [OrderPaymentStatus.CANCELLED]: '#9e9e9e',
  };
  return statusColors[status] || '#757575';
};

/**
 * Format Currency Helper
 */
const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format Date Helper
 */
const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Order View Modal Component
 */
export const OrderViewModal: React.FC<OrderViewModalProps> = ({
  open,
  order,
  onClose,
  onEdit,
  onPrint,
  'data-testid': testId = 'order-view-modal',
}) => {
  const theme = useTheme();

  // Don't render if no order
  if (!order) return null;

  /**
   * Handle print order
   */
  const handlePrint = (): void => {
    if (onPrint && order) {
      onPrint(order);
    }
  };

  /**
   * Handle edit order
   */
  const handleEdit = (): void => {
    if (onEdit && order) {
      onEdit(order);
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
              background: 'linear-gradient(135deg, rgba(81, 63, 242, 0.1) 0%, rgba(107, 82, 245, 0.08) 100%)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    width: 48,
                    height: 48,
                  }}
                >
                  <ReceiptIcon />
                </Avatar>
                <Box>
                  <Typography variant='h5' sx={{ fontWeight: 700, mb: 0.5 }}>
                    Order Details
                  </Typography>
                  <Typography variant='body1' color='text.secondary'>
                    {order.orderNumber}
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
              {/* Order Summary */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                    <CardContent>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <PersonIcon color='primary' />
                        Customer Information
                      </Typography>
                      <Box sx={{ space: 1.5 }}>
                        <Typography variant='body1' sx={{ fontWeight: 600, mb: 0.5 }}>
                          {order.customerName}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant='body2' color='text.secondary'>
                            Code: {order.customerCode}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant='body2' color='text.secondary'>
                            Credit Limit: {formatCurrency(order.customerCreditLimit)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationIcon fontSize='small' color='action' />
                          <Typography variant='body2' color='text.secondary'>
                            {order.areaName}
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
                        <BusinessIcon color='primary' />
                        Order Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant='body2' color='text.secondary' gutterBottom>
                            Status
                          </Typography>
                          <Chip
                            label={order.status.replace('_', ' ')}
                            size='small'
                            sx={{
                              backgroundColor: `${getStatusColor(order.status)}20`,
                              color: getStatusColor(order.status),
                              fontWeight: 600,
                            }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant='body2' color='text.secondary' gutterBottom>
                            Payment Status
                          </Typography>
                          <Chip
                            label={order.paymentStatus.replace('_', ' ')}
                            size='small'
                            sx={{
                              backgroundColor: `${getPaymentStatusColor(order.paymentStatus)}20`,
                              color: getPaymentStatusColor(order.paymentStatus),
                              fontWeight: 600,
                            }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant='body2' color='text.secondary' gutterBottom>
                            Order Date
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarIcon fontSize='small' color='action' />
                            <Typography variant='body2'>{formatDate(order.orderDate)}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant='body2' color='text.secondary' gutterBottom>
                            Payment Method
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PaymentIcon fontSize='small' color='action' />
                            <Typography variant='body2'>{order.paymentMethod.replace('_', ' ')}</Typography>
                          </Box>
                        </Grid>
                        {order.workerName && (
                          <Grid item xs={12}>
                            <Typography variant='body2' color='text.secondary' gutterBottom>
                              Worker
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ShippingIcon fontSize='small' color='action' />
                              <Typography variant='body2'>{order.workerName}</Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Order Items */}
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
                        Unit Price
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600 }}>
                        Discount
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600 }}>
                        Total
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {item.productName}
                          </Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <Typography variant='body2' color='text.secondary'>
                            {item.productCode}
                          </Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {item.quantityBoxes}B + {item.quantityLoose}L = {item.totalUnits}U
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2'>{formatCurrency(item.unitPrice)}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' color='error.main'>
                            {item.discountPercentage > 0 ? `${item.discountPercentage}%` : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {formatCurrency(item.itemTotal)}
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
                  {(order.customerNotes || order.internalNotes) && (
                    <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                      <CardContent>
                        <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
                          Notes
                        </Typography>
                        {order.customerNotes && (
                          <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                            <strong>Customer:</strong> {order.customerNotes}
                          </Typography>
                        )}
                        {order.internalNotes && (
                          <Typography variant='body2' color='text.secondary'>
                            <strong>Internal:</strong> {order.internalNotes}
                          </Typography>
                        )}
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
                            {formatCurrency(order.subtotalAmount)}
                          </Typography>
                        </Box>
                        {order.discountAmount > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant='body2' color='error.main'>
                              Discount ({order.discountPercentage}%):
                            </Typography>
                            <Typography variant='body2' color='error.main' sx={{ fontWeight: 600 }}>
                              -{formatCurrency(order.discountAmount)}
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant='body2'>Tax:</Typography>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {formatCurrency(order.taxAmount)}
                          </Typography>
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant='h6' sx={{ fontWeight: 700 }}>
                            Total:
                          </Typography>
                          <Typography variant='h6' sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {formatCurrency(order.totalAmount)}
                          </Typography>
                        </Box>
                        {order.creditDays && (
                          <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                            Credit Terms: {order.creditDays} days
                          </Typography>
                        )}
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
                Print Order
              </Button>
            )}
            {onEdit && (
              <Button onClick={handleEdit} variant='contained' startIcon={<EditIcon />}>
                Edit Order
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default OrderViewModal;
