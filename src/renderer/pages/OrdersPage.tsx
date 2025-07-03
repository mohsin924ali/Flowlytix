/**
 * Orders Page Component
 * Comprehensive order management interface
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Order Management
 * @architecture Page Component
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Assignment,
  DoneAll,
  MonetizationOn,
  ErrorOutline,
  ListAlt,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { OrderCreateModal, OrderViewModal } from '../components/molecules';
import { PrintOptionsModal } from '../components/molecules/PrintOptionsModal';
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
 * Tab panel interface following Instructions file standards
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * Tab panel component with optimized rendering
 * Performance optimizations:
 * - Only renders content when tab is active (value === index)
 * - Uses hidden attribute for accessibility
 * - Memoized filtering prevents unnecessary re-calculations
 */
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role='tabpanel'
    hidden={value !== index}
    id={`order-tabpanel-${index}`}
    aria-labelledby={`order-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

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
              <Typography variant='h6' sx={{ fontWeight: 700, color: 'primary.main' }}>
                ${order.totalAmount.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Tooltip title='View Order'>
              <IconButton size='small' onClick={() => onView(order)} color='primary'>
                <Visibility fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Edit Order'>
              <IconButton size='small' onClick={() => onEdit(order)} color='secondary'>
                <Edit fontSize='small' />
              </IconButton>
            </Tooltip>
            <FormControl size='small' sx={{ minWidth: 100 }}>
              <Select
                value={order.status}
                onChange={(e) => onUpdateStatus(order, e.target.value as OrderStatus)}
                size='small'
                variant='outlined'
              >
                {Object.values(OrderStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Orders table component
 */
const OrderTable: React.FC<{
  orders: Order[];
  onEdit: (order: Order) => void;
  onView: (order: Order) => void;
  onUpdateStatus: (order: Order, status: OrderStatus) => void;
}> = ({ orders, onEdit, onView, onUpdateStatus }) => {
  const theme = useTheme();

  const getStatusColor = (status: OrderStatus | OrderPaymentStatus) => {
    switch (status) {
      case OrderStatus.DELIVERED:
      case OrderPaymentStatus.PAID:
        return theme.palette.success.main;
      case OrderStatus.PENDING:
      case OrderPaymentStatus.PENDING:
        return theme.palette.warning.main;
      case OrderStatus.CANCELLED:
      case OrderPaymentStatus.CANCELLED:
        return theme.palette.error.main;
      case OrderStatus.SHIPPED:
        return theme.palette.info.main;
      case OrderPaymentStatus.OVERDUE:
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <TableContainer component={Paper} elevation={1}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
            <TableCell sx={{ fontWeight: 600 }}>Order #</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
            <TableCell align='center' sx={{ fontWeight: 600 }}>
              Status
            </TableCell>
            <TableCell align='center' sx={{ fontWeight: 600 }}>
              Payment
            </TableCell>
            <TableCell align='right' sx={{ fontWeight: 600 }}>
              Total
            </TableCell>
            <TableCell align='center' sx={{ fontWeight: 600 }}>
              Actions
            </TableCell>
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
                {order.deliveryDate && (
                  <Typography variant='caption' color='text.secondary'>
                    Delivery: {order.deliveryDate.toLocaleDateString()}
                  </Typography>
                )}
              </TableCell>
              <TableCell align='center'>
                <Chip
                  icon={<StatusIcon status={order.status} />}
                  label={order.status.replace('_', ' ')}
                  size='small'
                  sx={{
                    backgroundColor: `${getStatusColor(order.status)}20`,
                    color: getStatusColor(order.status),
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                />
              </TableCell>
              <TableCell align='center'>
                <Chip
                  icon={<StatusIcon status={order.paymentStatus} />}
                  label={order.paymentStatus.replace('_', ' ')}
                  size='small'
                  sx={{
                    backgroundColor: `${getStatusColor(order.paymentStatus)}20`,
                    color: getStatusColor(order.paymentStatus),
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                />
              </TableCell>
              <TableCell align='right'>
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                  ${order.totalAmount.toFixed(2)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {order.items.length} items
                </Typography>
              </TableCell>
              <TableCell align='center'>
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                  <Tooltip title='View Order'>
                    <IconButton size='small' onClick={() => onView(order)} color='primary'>
                      <Visibility fontSize='small' />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='Edit Order'>
                    <IconButton size='small' onClick={() => onEdit(order)} color='secondary'>
                      <Edit fontSize='small' />
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
  const [filters, setFilters] = useState<OrderFilters>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const [viewOrderModalOpen, setViewOrderModalOpen] = useState(false);
  const [printOptionsModalOpen, setPrintOptionsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);

  /**
   * Load orders from service
   */
  const loadOrders = useCallback(async () => {
    if (!currentAgency) return;

    try {
      setLoading(true);
      setError(null);
      const response = await OrderService.getOrders(currentAgency.id, page, 10, filters);
      setOrders(response.orders);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [currentAgency, filters, page]);

  // Load orders on mount and when dependencies change
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
    setCreateOrderModalOpen(true);
  };

  /**
   * Handle create order submit
   */
  const handleCreateOrderSubmit = async (orderData: any) => {
    if (!user || !currentAgency) return;

    try {
      setLoading(true);
      await OrderService.createOrder(currentAgency.id, orderData, user.id);
      setCreateOrderModalOpen(false);
      await loadOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle edit order - Simple status update approach
   */
  const handleEditOrder = (order: Order) => {
    const statusOptions = Object.values(OrderStatus);
    const currentIndex = statusOptions.indexOf(order.status);
    const nextIndex = (currentIndex + 1) % statusOptions.length;
    const newStatus = statusOptions[nextIndex];

    const confirmed = confirm(`Change order ${order.orderNumber} status from "${order.status}" to "${newStatus}"?`);
    if (confirmed) {
      handleUpdateOrderStatus(order, newStatus);
    }
  };

  /**
   * Handle view order
   */
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setViewOrderModalOpen(true);
  };

  /**
   * Handle print order - Opens print options modal
   */
  const handlePrintOrder = useCallback((order: Order) => {
    setOrderToPrint(order);
    setPrintOptionsModalOpen(true);
  }, []);

  /**
   * Handle close create modal
   */
  const handleCloseCreateModal = () => {
    setCreateOrderModalOpen(false);
  };

  /**
   * Handle close view modal
   */
  const handleCloseViewModal = () => {
    setViewOrderModalOpen(false);
    setSelectedOrder(null);
  };

  /**
   * Handle close print options modal
   */
  const handleClosePrintModal = useCallback(() => {
    setPrintOptionsModalOpen(false);
    setOrderToPrint(null);
  }, []);

  /**
   * Handle print success
   */
  const handlePrintSuccess = useCallback(() => {
    // Could show a success message here if needed
  }, []);

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
   * Handle tab change with performance optimization
   * Uses client-side filtering for instant tab switching
   */
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  // Memoized filtered orders for performance optimization
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === OrderStatus.PENDING), [orders]);
  const inProgressOrders = useMemo(
    () => orders.filter((o) => [OrderStatus.CONFIRMED, OrderStatus.PROCESSING].includes(o.status)),
    [orders]
  );
  const shippedOrders = useMemo(() => orders.filter((o) => o.status === OrderStatus.SHIPPED), [orders]);
  const deliveredOrders = useMemo(() => orders.filter((o) => o.status === OrderStatus.DELIVERED), [orders]);
  const overdueOrders = useMemo(() => orders.filter((o) => o.paymentStatus === OrderPaymentStatus.OVERDUE), [orders]);
  const totalSales = useMemo(() => orders.reduce((sum, o) => sum + o.totalAmount, 0), [orders]);

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

          {/* Order Management Tabs */}
          <Paper sx={{ width: '100%', borderRadius: 2, mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label='order management tabs'
                variant='scrollable'
                scrollButtons='auto'
                sx={{
                  '& .MuiTabs-indicator': {
                    height: 3,
                  },
                  '& .MuiTab-root': {
                    minHeight: 60,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&.Mui-selected': {
                      fontWeight: 600,
                    },
                  },
                }}
              >
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      All Orders
                      <Chip label={orders.length} size='small' variant='outlined' />
                    </Box>
                  }
                  icon={<ListAlt />}
                  iconPosition='start'
                  sx={{ gap: 1 }}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Pending
                      <Chip
                        label={pendingOrders.length}
                        size='small'
                        variant='outlined'
                        color={pendingOrders.length > 0 ? 'warning' : 'default'}
                      />
                    </Box>
                  }
                  icon={<Pending />}
                  iconPosition='start'
                  sx={{ gap: 1 }}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      In Progress
                      <Chip
                        label={inProgressOrders.length}
                        size='small'
                        variant='outlined'
                        color={inProgressOrders.length > 0 ? 'info' : 'default'}
                      />
                    </Box>
                  }
                  icon={<Assignment />}
                  iconPosition='start'
                  sx={{ gap: 1 }}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Shipped
                      <Chip
                        label={shippedOrders.length}
                        size='small'
                        variant='outlined'
                        color={shippedOrders.length > 0 ? 'primary' : 'default'}
                      />
                    </Box>
                  }
                  icon={<LocalShipping />}
                  iconPosition='start'
                  sx={{ gap: 1 }}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Delivered
                      <Chip
                        label={deliveredOrders.length}
                        size='small'
                        variant='outlined'
                        color={deliveredOrders.length > 0 ? 'success' : 'default'}
                      />
                    </Box>
                  }
                  icon={<DoneAll />}
                  iconPosition='start'
                  sx={{ gap: 1 }}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Payment Issues
                      <Chip
                        label={overdueOrders.length}
                        size='small'
                        variant='outlined'
                        color={overdueOrders.length > 0 ? 'error' : 'default'}
                      />
                    </Box>
                  }
                  icon={<ErrorOutline />}
                  iconPosition='start'
                  sx={{ gap: 1 }}
                />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <OrderTable
                orders={orders}
                onEdit={handleEditOrder}
                onView={handleViewOrder}
                onUpdateStatus={handleUpdateOrderStatus}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <OrderTable
                orders={pendingOrders}
                onEdit={handleEditOrder}
                onView={handleViewOrder}
                onUpdateStatus={handleUpdateOrderStatus}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <OrderTable
                orders={inProgressOrders}
                onEdit={handleEditOrder}
                onView={handleViewOrder}
                onUpdateStatus={handleUpdateOrderStatus}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <OrderTable
                orders={shippedOrders}
                onEdit={handleEditOrder}
                onView={handleViewOrder}
                onUpdateStatus={handleUpdateOrderStatus}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
              <OrderTable
                orders={deliveredOrders}
                onEdit={handleEditOrder}
                onView={handleViewOrder}
                onUpdateStatus={handleUpdateOrderStatus}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={5}>
              <OrderTable
                orders={overdueOrders}
                onEdit={handleEditOrder}
                onView={handleViewOrder}
                onUpdateStatus={handleUpdateOrderStatus}
              />
            </TabPanel>
          </Paper>

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
                Get started by creating your first order
              </Typography>
              <Button variant='contained' startIcon={<Add />} onClick={handleCreateOrder}>
                Create First Order
              </Button>
            </Box>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination count={totalPages} page={page} onChange={(_, newPage) => setPage(newPage)} color='primary' />
            </Box>
          )}

          {/* Create Order Modal */}
          <OrderCreateModal
            open={createOrderModalOpen}
            onClose={handleCloseCreateModal}
            onSubmit={handleCreateOrderSubmit}
            agencyId={currentAgency?.id || ''}
          />

          {/* View Order Modal */}
          <OrderViewModal
            open={viewOrderModalOpen}
            order={selectedOrder}
            onClose={handleCloseViewModal}
            onEdit={handleEditOrder}
            onPrint={handlePrintOrder}
          />

          {/* Print Options Modal */}
          <PrintOptionsModal
            open={printOptionsModalOpen}
            order={orderToPrint}
            onClose={handleClosePrintModal}
            onPrintSuccess={handlePrintSuccess}
          />
        </Container>
      </motion.div>
    </DashboardLayout>
  );
};

export default OrdersPage;
