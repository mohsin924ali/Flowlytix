/**
 * Orders Page Component
 * Comprehensive order management interface
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Order Management
 * @architecture Page Component
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Pagination,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Badge,
  Tooltip,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  FilterList,
  Download,
  Upload,
  ShoppingCart,
  LocalShipping,
  Payment,
  CheckCircle,
  Warning,
  Cancel,
  Pending,
  ExpandMore,
  Receipt,
  Schedule,
  AccountBalance,
  Print,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { useAuthStore } from '../store/auth.store';
import { useAgencyStore } from '../store/agency.store';
import OrderService, {
  Order,
  OrderStatus,
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  PaymentMethod,
  OrderFilters,
  CreateOrderData,
  CreateOrderSchema,
} from '../services/OrderService';

/**
 * Animation variants
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Status icon mapping
 */
const StatusIcon: React.FC<{ status: OrderStatus | OrderFulfillmentStatus | OrderPaymentStatus }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case OrderStatus.DELIVERED:
      case OrderFulfillmentStatus.DELIVERED:
      case OrderPaymentStatus.PAID:
        return { icon: CheckCircle, color: 'success.main' };
      case OrderStatus.PENDING:
      case OrderFulfillmentStatus.PENDING:
      case OrderPaymentStatus.PENDING:
        return { icon: Pending, color: 'warning.main' };
      case OrderStatus.CANCELLED:
      case OrderPaymentStatus.CANCELLED:
        return { icon: Cancel, color: 'error.main' };
      case OrderStatus.SHIPPED:
      case OrderFulfillmentStatus.SHIPPED:
        return { icon: LocalShipping, color: 'info.main' };
      case OrderPaymentStatus.OVERDUE:
        return { icon: Warning, color: 'error.main' };
      default:
        return { icon: Pending, color: 'grey.500' };
    }
  };

  const { icon: Icon, color } = getStatusConfig(status);
  return <Icon sx={{ color, fontSize: 16 }} />;
};

/**
 * Order card component
 */
const OrderCard: React.FC<{
  order: Order;
  onEdit: (order: Order) => void;
  onView: (order: Order) => void;
  onUpdateStatus: (order: Order, status: OrderStatus) => void;
}> = ({ order, onEdit, onView, onUpdateStatus }) => {
  const theme = useTheme();

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DELIVERED:
        return theme.palette.success.main;
      case OrderStatus.PENDING:
      case OrderStatus.CONFIRMED:
        return theme.palette.warning.main;
      case OrderStatus.CANCELLED:
      case OrderStatus.RETURNED:
        return theme.palette.error.main;
      case OrderStatus.SHIPPED:
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getPaymentStatusColor = (status: OrderPaymentStatus) => {
    switch (status) {
      case OrderPaymentStatus.PAID:
        return theme.palette.success.main;
      case OrderPaymentStatus.PENDING:
        return theme.palette.warning.main;
      case OrderPaymentStatus.OVERDUE:
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card
        sx={{
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[8],
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant='h6' sx={{ fontWeight: 600, mb: 0.5 }}>
                {order.orderNumber}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                {order.customerName}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                {order.orderDate.toLocaleDateString()}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
              <Chip
                icon={<StatusIcon status={order.status} />}
                label={order.status}
                size='small'
                sx={{
                  backgroundColor: `${getStatusColor(order.status)}20`,
                  color: getStatusColor(order.status),
                  border: `1px solid ${getStatusColor(order.status)}40`,
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              />
              <Chip
                icon={<StatusIcon status={order.paymentStatus} />}
                label={order.paymentStatus}
                size='small'
                sx={{
                  backgroundColor: `${getPaymentStatusColor(order.paymentStatus)}20`,
                  color: getPaymentStatusColor(order.paymentStatus),
                  border: `1px solid ${getPaymentStatusColor(order.paymentStatus)}40`,
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              />
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Receipt fontSize='small' color='action' />
              Items: {order.items.length}
            </Typography>
            <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Payment fontSize='small' color='action' />
              {order.paymentMethod.replace('_', ' ')}
            </Typography>
            {order.deliveryDate && (
              <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Schedule fontSize='small' color='action' />
                Delivery: {order.deliveryDate.toLocaleDateString()}
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant='body2' color='text.secondary'>
                Subtotal
              </Typography>
              <Typography variant='h6' sx={{ fontWeight: 600 }}>
                ${order.subtotalAmount.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant='body2' color='text.secondary'>
                Total
              </Typography>
              <Typography variant='h6' sx={{ fontWeight: 600, color: 'primary.main' }}>
                ${order.totalAmount.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Visibility />}
              onClick={() => onView(order)}
              sx={{ flex: 1 }}
            >
              View
            </Button>
            <Button variant='outlined' size='small' startIcon={<Edit />} onClick={() => onEdit(order)} sx={{ flex: 1 }}>
              Edit
            </Button>
            <Tooltip title='Print'>
              <IconButton size='small' sx={{ color: 'primary.main' }}>
                <Print fontSize='small' />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Order table component
 */
const OrderTable: React.FC<{
  orders: Order[];
  onEdit: (order: Order) => void;
  onView: (order: Order) => void;
  onUpdateStatus: (order: Order, status: OrderStatus) => void;
}> = ({ orders, onEdit, onView, onUpdateStatus }) => {
  const theme = useTheme();

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Order #</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Items</TableCell>
            <TableCell>Total</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Payment</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} hover>
              <TableCell>
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                  {order.orderNumber}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant='body2'>{order.customerName}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {order.customerCode}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant='body2'>{order.orderDate.toLocaleDateString()}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant='body2'>{order.items.length}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                  ${order.totalAmount.toFixed(2)}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  icon={<StatusIcon status={order.status} />}
                  label={order.status}
                  size='small'
                  variant='outlined'
                />
              </TableCell>
              <TableCell>
                <Chip
                  icon={<StatusIcon status={order.paymentStatus} />}
                  label={order.paymentStatus}
                  size='small'
                  variant='outlined'
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title='View Order'>
                    <IconButton size='small' onClick={() => onView(order)}>
                      <Visibility fontSize='small' />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='Edit Order'>
                    <IconButton size='small' onClick={() => onEdit(order)}>
                      <Edit fontSize='small' />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='Print Order'>
                    <IconButton size='small'>
                      <Print fontSize='small' />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/**
 * Main Orders Page Component
 */
export const OrdersPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { currentAgency } = useAgencyStore();

  // State management
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const [tabValue, setTabValue] = useState(0);

  /**
   * Load orders data
   */
  const loadOrders = useCallback(async () => {
    if (!currentAgency) return;

    try {
      setLoading(true);
      setError(null);
      const response = await OrderService.getOrders(currentAgency.id, page, 20, filters);
      setOrders(response.orders);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [currentAgency, page, filters]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /**
   * Handle search
   */
  const handleSearch = (searchTerm: string) => {
    setFilters((prev) => ({ ...prev, search: searchTerm }));
    setPage(1);
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (newFilters: Partial<OrderFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  /**
   * Handle create order
   */
  const handleCreateOrder = () => {
    // TODO: Navigate to create order page
    console.log('Create new order');
  };

  /**
   * Handle edit order
   */
  const handleEditOrder = (order: Order) => {
    // TODO: Navigate to edit order page
    console.log('Edit order:', order);
  };

  /**
   * Handle view order
   */
  const handleViewOrder = (order: Order) => {
    // TODO: Navigate to order details page
    console.log('View order:', order);
  };

  /**
   * Handle update order status
   */
  const handleUpdateOrderStatus = async (order: Order, status: OrderStatus) => {
    if (!user) return;

    try {
      setLoading(true);
      await OrderService.updateOrderStatus(order.id, status, user.id);
      await loadOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const statusFilters = [
      {}, // All orders
      { status: [OrderStatus.PENDING] },
      { status: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING] },
      { status: [OrderStatus.SHIPPED] },
      { status: [OrderStatus.DELIVERED] },
      { paymentStatus: [OrderPaymentStatus.OVERDUE] },
    ];
    setFilters((prev) => ({ ...prev, ...statusFilters[newValue] }));
    setPage(1);
  };

  const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING);
  const shippedOrders = orders.filter((o) => o.status === OrderStatus.SHIPPED);
  const overdueOrders = orders.filter((o) => o.paymentStatus === OrderPaymentStatus.OVERDUE);
  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  if (loading && orders.length === 0) {
    return (
      <DashboardLayout title='Order Management'>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title='Order Management'>
      <motion.div variants={containerVariants} initial='hidden' animate='visible'>
        <Container maxWidth='xl' sx={{ py: 3 }}>
          {/* Header Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant='h4' sx={{ fontWeight: 700 }}>
                Order Management
              </Typography>
              <Button variant='contained' startIcon={<Add />} onClick={handleCreateOrder} sx={{ px: 3 }}>
                Create Order
              </Button>
            </Box>

            {/* Tabs for order filtering */}
            <Box sx={{ mb: 3 }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label={`All Orders (${total})`} />
                <Tab
                  label={
                    <Badge badgeContent={pendingOrders.length} color='warning'>
                      Pending
                    </Badge>
                  }
                />
                <Tab label='In Progress' />
                <Tab
                  label={
                    <Badge badgeContent={shippedOrders.length} color='info'>
                      Shipped
                    </Badge>
                  }
                />
                <Tab label='Delivered' />
                <Tab
                  label={
                    <Badge badgeContent={overdueOrders.length} color='error'>
                      Overdue
                    </Badge>
                  }
                />
              </Tabs>
            </Box>

            {/* Search and Filters */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems='center'>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    placeholder='Search orders...'
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position='start'>
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button variant='outlined' startIcon={<FilterList />} onClick={() => setShowFilters(!showFilters)}>
                      Filters
                    </Button>
                    <Button variant='outlined' startIcon={<Download />}>
                      Export
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Accordion expanded sx={{ mb: 3 }}>
                    <AccordionSummary>
                      <Typography variant='h6'>Filter Options</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth>
                            <InputLabel>Order Status</InputLabel>
                            <Select
                              multiple
                              value={filters.status || []}
                              onChange={(e) =>
                                handleFilterChange({
                                  status: e.target.value as OrderStatus[],
                                })
                              }
                              label='Order Status'
                            >
                              {Object.values(OrderStatus).map((status) => (
                                <MenuItem key={status} value={status}>
                                  {status.replace('_', ' ')}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth>
                            <InputLabel>Payment Status</InputLabel>
                            <Select
                              multiple
                              value={filters.paymentStatus || []}
                              onChange={(e) =>
                                handleFilterChange({
                                  paymentStatus: e.target.value as OrderPaymentStatus[],
                                })
                              }
                              label='Payment Status'
                            >
                              {Object.values(OrderPaymentStatus).map((status) => (
                                <MenuItem key={status} value={status}>
                                  {status.replace('_', ' ')}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth>
                            <InputLabel>Payment Method</InputLabel>
                            <Select
                              multiple
                              value={filters.paymentMethod || []}
                              onChange={(e) =>
                                handleFilterChange({
                                  paymentMethod: e.target.value as PaymentMethod[],
                                })
                              }
                              label='Payment Method'
                            >
                              {Object.values(PaymentMethod).map((method) => (
                                <MenuItem key={method} value={method}>
                                  {method.replace('_', ' ')}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Summary Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {total}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Total Orders
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Badge badgeContent={pendingOrders.length} color='warning'>
                      <Typography variant='h4' sx={{ fontWeight: 700, color: 'warning.main' }}>
                        {pendingOrders.length}
                      </Typography>
                    </Badge>
                    <Typography variant='body2' color='text.secondary'>
                      Pending Orders
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Badge badgeContent={overdueOrders.length} color='error'>
                      <Typography variant='h4' sx={{ fontWeight: 700, color: 'error.main' }}>
                        {overdueOrders.length}
                      </Typography>
                    </Badge>
                    <Typography variant='body2' color='text.secondary'>
                      Overdue Payments
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'success.main' }}>
                      ${totalSales.toLocaleString()}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Total Sales Value
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          {/* Error Display */}
          {error && (
            <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Orders Table */}
          <OrderTable
            orders={orders}
            onEdit={handleEditOrder}
            onView={handleViewOrder}
            onUpdateStatus={handleUpdateOrderStatus}
          />

          {/* Empty State */}
          {orders.length === 0 && !loading && (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
              }}
            >
              <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant='h5' sx={{ mb: 1 }}>
                No orders found
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                {filters.search || filters.status || filters.paymentStatus
                  ? 'Try adjusting your search criteria'
                  : 'Get started by creating your first order'}
              </Typography>
              {!filters.search && !filters.status && !filters.paymentStatus && (
                <Button variant='contained' startIcon={<Add />} onClick={handleCreateOrder}>
                  Create First Order
                </Button>
              )}
            </Box>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination count={totalPages} page={page} onChange={(_, newPage) => setPage(newPage)} color='primary' />
            </Box>
          )}
        </Container>
      </motion.div>
    </DashboardLayout>
  );
};

export default OrdersPage;
