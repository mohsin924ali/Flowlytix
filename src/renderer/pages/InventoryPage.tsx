/**
 * Inventory Management Page Component
 * Comprehensive inventory and product management interface
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Inventory Management
 * @architecture Page Component (Atomic Design - Page Level)
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
  Fab,
  Stack,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Warehouse as WarehouseIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as TransferIcon,
  SwapHoriz,
  Adjust as AdjustIcon,
  BookmarkBorder as ReserveIcon,
  Analytics as AnalyticsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Search,
  ShoppingCart,
  Print as PrintIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

import { DashboardLayout } from '../components/templates';
import { useAgencyStore } from '../store/agency.store';
import InventoryService, {
  Warehouse,
  StockLevel,
  StockMovement,
  StockTransfer,
  StockReservation,
  InventoryAnalytics,
  WarehouseLocation,
  StockMovementType,
  StockMovementReason,
  InventoryFilters,
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderFilters,
} from '../services/InventoryService';
import ProductService, {
  Product,
  ProductStatus,
  ProductCategory,
  UnitOfMeasure,
  ProductFilters,
  CreateProductData,
} from '../services/ProductService';
import { ProductDetailsModal } from '../components/molecules/ProductDetailsModal';
import { PurchaseOrderCreateModal, PurchaseOrderViewModal, PurchaseOrderPrintModal } from '../components/molecules';
import StockMovementModal from '../components/molecules/StockMovementModal/StockMovementModal';
import { Header } from '../components/organisms';

/**
 * Animation variants following Instructions file standards
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
 * Tab panel interface
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * Tab panel component
 */
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role='tabpanel'
    hidden={value !== index}
    id={`inventory-tabpanel-${index}`}
    aria-labelledby={`inventory-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

/**
 * Inventory status chip component following design system
 */
const InventoryStatusChip: React.FC<{
  available: number;
  reserved: number;
  damaged: number;
  reorderLevel: number;
}> = ({ available, reserved, damaged, reorderLevel }) => {
  const isLowStock = available <= reorderLevel;
  const isOutOfStock = available === 0;

  if (isOutOfStock) {
    return <Chip label='Out of Stock' color='error' size='small' icon={<ErrorIcon />} />;
  }
  if (isLowStock) {
    return <Chip label='Low Stock' color='warning' size='small' icon={<WarningIcon />} />;
  }
  return <Chip label='In Stock' color='success' size='small' icon={<CheckCircleIcon />} />;
};

/**
 * Movement type chip component
 */
const MovementTypeChip: React.FC<{ type: StockMovementType }> = ({ type }) => {
  const getColor = () => {
    switch (type) {
      case StockMovementType.STOCK_IN:
        return 'success';
      case StockMovementType.STOCK_OUT:
        return 'error';
      case StockMovementType.ADJUSTMENT:
        return 'warning';
      case StockMovementType.TRANSFER:
        return 'info';
      default:
        return 'default';
    }
  };

  const getIcon = () => {
    switch (type) {
      case StockMovementType.STOCK_IN:
        return <TrendingUpIcon />;
      case StockMovementType.STOCK_OUT:
        return <TrendingDownIcon />;
      case StockMovementType.ADJUSTMENT:
        return <AdjustIcon />;
      case StockMovementType.TRANSFER:
        return <TransferIcon />;
      default:
        return <InfoIcon />;
    }
  };

  return <Chip label={type.replace('_', ' ')} color={getColor() as any} size='small' icon={getIcon()} />;
};

/**
 * Product status component following design system
 */
const ProductStatusChip: React.FC<{ status: ProductStatus }> = ({ status }) => {
  const theme = useTheme();

  const getStatusConfig = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return { icon: CheckCircleIcon, color: 'success' };
      case ProductStatus.INACTIVE:
        return { icon: WarningIcon, color: 'warning' };
      case ProductStatus.DISCONTINUED:
        return { icon: ErrorIcon, color: 'error' };
      case ProductStatus.PENDING_APPROVAL:
        return { icon: InfoIcon, color: 'info' };
      case ProductStatus.OUT_OF_STOCK:
        return { icon: WarningIcon, color: 'error' };
      default:
        return { icon: InfoIcon, color: 'default' };
    }
  };

  const { icon: Icon, color } = getStatusConfig(status);
  return (
    <Chip
      icon={<Icon sx={{ fontSize: 16 }} />}
      label={status.replace('_', ' ')}
      size='small'
      color={color as any}
      variant='outlined'
      sx={{ textTransform: 'capitalize' }}
    />
  );
};

/**
 * Main Inventory Management Page Component
 */
const InventoryPage: React.FC = () => {
  const { currentAgency } = useAgencyStore();
  const theme = useTheme();

  // State Management
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [stockReservations, setStockReservations] = useState<StockReservation[]>([]);
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // Filter State
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [productFilters, setProductFilters] = useState<ProductFilters>({});
  const [purchaseOrderFilters, setPurchaseOrderFilters] = useState<PurchaseOrderFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<
    'movement' | 'transfer' | 'adjustment' | 'reservation' | 'product' | 'purchase_order'
  >('movement');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);
  const [stockMovementOpen, setStockMovementOpen] = useState(false);
  const [purchaseOrderCreateOpen, setPurchaseOrderCreateOpen] = useState(false);
  const [purchaseOrderViewOpen, setPurchaseOrderViewOpen] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [purchaseOrderPrintOpen, setPurchaseOrderPrintOpen] = useState(false);
  const [purchaseOrderToPrint, setPurchaseOrderToPrint] = useState<PurchaseOrder | null>(null);

  /**
   * Load initial data
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        warehousesData,
        stockLevelsData,
        movementsResult,
        transfersData,
        reservationsData,
        analyticsData,
        productsResult,
        purchaseOrdersResult,
      ] = await Promise.all([
        InventoryService.getWarehouses(),
        InventoryService.getStockLevels(selectedWarehouse || undefined),
        InventoryService.getStockMovements(filters),
        InventoryService.getStockTransfers(),
        InventoryService.getStockReservations(),
        InventoryService.getInventoryAnalytics(selectedWarehouse || undefined),
        ProductService.getProducts(currentAgency?.id || '', 1, 50, productFilters),
        InventoryService.getPurchaseOrders(purchaseOrderFilters, 1, 50),
      ]);

      setWarehouses(warehousesData);
      setStockLevels(stockLevelsData);
      setStockMovements(movementsResult.movements);
      setStockTransfers(transfersData);
      setStockReservations(reservationsData);
      setAnalytics(analyticsData);
      setProducts(productsResult.products);
      setPurchaseOrders(purchaseOrdersResult.purchaseOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, filters, productFilters, purchaseOrderFilters, currentAgency?.id]);

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  }, []);

  /**
   * Handle warehouse selection change
   */
  const handleWarehouseChange = useCallback((warehouseId: string) => {
    setSelectedWarehouse(warehouseId);
  }, []);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    loadData();
  }, [loadData]);

  /**
   * Handle dialog operations
   */
  const handleDialogOpen = useCallback((type: typeof dialogType) => {
    setDialogType(type);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
  }, []);

  // Load data on component mount and dependency changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Handle product management actions
   */
  const handleCreateProduct = useCallback(() => {
    setSelectedProduct(null);
    setDialogType('product');
    setDialogOpen(true);
  }, []);

  const handleEditProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setDialogType('product');
    setDialogOpen(true);
  }, []);

  const handleViewProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setProductDetailsOpen(true);
  }, []);

  const handleManageStock = useCallback((product: Product) => {
    setSelectedProduct(product);
    setStockMovementOpen(true);
  }, []);

  /**
   * Handle search functionality
   */
  const handleSearch = useCallback((searchTerm: string) => {
    setSearchTerm(searchTerm);
    setProductFilters((prev) => ({ ...prev, search: searchTerm }));
  }, []);

  /**
   * Handle purchase order operations
   */
  const handleViewPurchaseOrder = useCallback((purchaseOrder: PurchaseOrder) => {
    setSelectedPurchaseOrder(purchaseOrder);
    setPurchaseOrderViewOpen(true);
  }, []);

  const handlePrintPurchaseOrder = useCallback((purchaseOrder: PurchaseOrder) => {
    setPurchaseOrderToPrint(purchaseOrder);
    setPurchaseOrderPrintOpen(true);
  }, []);

  /**
   * Render products management section
   */
  const renderProductsManagement = () => (
    <motion.div variants={containerVariants} initial='hidden' animate='visible'>
      {/* Products Header */}
      <Box sx={{ mb: 3 }}>
        <Box display='flex' alignItems='center' justifyContent='space-between' mb={2}>
          <Typography variant='h5' component='h2' sx={{ fontWeight: 600 }}>
            Product Catalog
          </Typography>
          <Button variant='contained' startIcon={<AddIcon />} onClick={handleCreateProduct}>
            Add Product
          </Button>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems='center'>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder='Search products...'
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search />
                    </InputAdornment>
                  ),
                }}
                size='small'
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display='flex' gap={1}>
                <Button variant='outlined' startIcon={<FilterIcon />} size='small'>
                  Filters
                </Button>
                <Button variant='outlined' startIcon={<ExportIcon />} size='small'>
                  Export
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Products Table */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Stock</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Cost Price</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Selling Price</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                <TableCell>
                  <Box>
                    <Typography variant='body2' sx={{ fontWeight: 600, mb: 0.5 }}>
                      {product.name}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {product.description || 'No description'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {product.sku}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2'>{product.category.replace('_', ' ')}</Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant='body2' sx={{ fontWeight: 600, mb: 0.5 }}>
                      {product.currentStock} / {product.maxStockLevel}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                      Reorder at: {product.reorderLevel}
                    </Typography>
                    <InventoryStatusChip
                      available={product.currentStock}
                      reserved={product.reservedStock}
                      damaged={0}
                      reorderLevel={product.reorderLevel}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <ProductStatusChip status={product.status} />
                </TableCell>
                <TableCell>
                  <Typography variant='body2' sx={{ color: 'error.main' }}>
                    ${product.costPrice.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2' sx={{ color: 'success.main' }}>
                    ${product.sellingPrice.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display='flex' gap={1} alignItems='center'>
                    <Tooltip title='View Details'>
                      <IconButton size='small' onClick={() => handleViewProduct(product)} color='primary'>
                        <ViewIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Edit Product'>
                      <IconButton size='small' onClick={() => handleEditProduct(product)} color='info'>
                        <EditIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Manage Stock'>
                      <IconButton size='small' onClick={() => handleManageStock(product)} color='secondary'>
                        <AdjustIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Empty State */}
      {products.length === 0 && !loading && (
        <Box textAlign='center' py={8}>
          <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant='h6' gutterBottom>
            No products found
          </Typography>
          <Typography variant='body2' color='text.secondary' mb={3}>
            Get started by adding your first product to the catalog
          </Typography>
          <Button variant='contained' startIcon={<AddIcon />} onClick={handleCreateProduct}>
            Add First Product
          </Button>
        </Box>
      )}
    </motion.div>
  );

  /**
   * Render warehouse overview cards
   */
  const renderWarehouseOverview = () => (
    <motion.div variants={containerVariants} initial='hidden' animate='visible'>
      <Typography variant='h5' component='h2' sx={{ fontWeight: 600, mb: 3 }}>
        Warehouse Overview
      </Typography>

      <Grid container spacing={3}>
        {warehouses.map((warehouse) => (
          <Grid item xs={12} md={6} lg={4} key={warehouse.id}>
            <motion.div variants={itemVariants}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[8],
                  },
                }}
              >
                <CardContent>
                  <Box display='flex' alignItems='center' mb={2}>
                    <WarehouseIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant='h6' component='div' sx={{ fontWeight: 600 }}>
                      {warehouse.name}
                    </Typography>
                    <Chip label={warehouse.code} size='small' sx={{ ml: 'auto' }} />
                  </Box>

                  <Typography variant='body2' color='text.secondary' gutterBottom>
                    {warehouse.location.replace('_', ' ')}
                  </Typography>

                  <Typography variant='body2' gutterBottom>
                    Manager: {warehouse.manager}
                  </Typography>

                  <Box mt={2}>
                    <Typography variant='body2' gutterBottom>
                      Utilization: {Math.round((warehouse.currentUtilization / warehouse.capacity) * 100)}%
                    </Typography>
                    <LinearProgress
                      variant='determinate'
                      value={(warehouse.currentUtilization / warehouse.capacity) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Box mt={2} display='flex' justifyContent='space-between'>
                    <Typography variant='caption'>
                      {warehouse.currentUtilization.toLocaleString()} / {warehouse.capacity.toLocaleString()}
                    </Typography>
                    <Chip
                      label={warehouse.isActive ? 'Active' : 'Inactive'}
                      color={warehouse.isActive ? 'success' : 'default'}
                      size='small'
                    />
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </motion.div>
  );

  /**
   * Render stock levels table
   */
  const renderStockLevels = () => (
    <motion.div variants={containerVariants} initial='hidden' animate='visible'>
      <Typography variant='h5' component='h2' sx={{ fontWeight: 600, mb: 3 }}>
        Current Stock Levels
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Product ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
              <TableCell align='right' sx={{ fontWeight: 600 }}>
                Available
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 600 }}>
                Reserved
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 600 }}>
                Damaged
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 600 }}>
                Total
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 600 }}>
                Reorder Level
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockLevels.map((level) => (
              <TableRow key={level.id} hover>
                <TableCell>{level.productId}</TableCell>
                <TableCell>{warehouses.find((w) => w.id === level.warehouseId)?.name || level.warehouseId}</TableCell>
                <TableCell align='right'>{level.availableStock.toLocaleString()}</TableCell>
                <TableCell align='right'>{level.reservedStock.toLocaleString()}</TableCell>
                <TableCell align='right'>{level.damagedStock.toLocaleString()}</TableCell>
                <TableCell align='right'>{level.totalStock.toLocaleString()}</TableCell>
                <TableCell align='right'>{level.reorderLevel.toLocaleString()}</TableCell>
                <TableCell>
                  <InventoryStatusChip
                    available={level.availableStock}
                    reserved={level.reservedStock}
                    damaged={level.damagedStock}
                    reorderLevel={level.reorderLevel}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction='row' spacing={1}>
                    <Tooltip title='View Details'>
                      <IconButton size='small'>
                        <ViewIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Adjust Stock'>
                      <IconButton size='small' onClick={() => handleDialogOpen('adjustment')}>
                        <AdjustIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Reserve Stock'>
                      <IconButton size='small' onClick={() => handleDialogOpen('reservation')}>
                        <ReserveIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </motion.div>
  );

  /**
   * Render stock movements table
   */
  const renderStockMovements = () => (
    <motion.div variants={containerVariants} initial='hidden' animate='visible'>
      <Typography variant='h5' component='h2' sx={{ fontWeight: 600, mb: 3 }}>
        Stock Movement History
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
              <TableCell align='right' sx={{ fontWeight: 600 }}>
                Quantity
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 600 }}>
                Cost
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Reference</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Performed By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockMovements.map((movement) => (
              <TableRow key={movement.id} hover>
                <TableCell>{movement.performedAt.toLocaleDateString()}</TableCell>
                <TableCell>{movement.productId}</TableCell>
                <TableCell>
                  {warehouses.find((w) => w.id === movement.warehouseId)?.name || movement.warehouseId}
                </TableCell>
                <TableCell>
                  <MovementTypeChip type={movement.movementType} />
                </TableCell>
                <TableCell>
                  <Chip label={movement.reason.replace('_', ' ')} size='small' variant='outlined' />
                </TableCell>
                <TableCell align='right'>
                  <Typography color={movement.quantity > 0 ? 'success.main' : 'error.main'} fontWeight='bold'>
                    {movement.quantity > 0 ? '+' : ''}
                    {movement.quantity.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align='right'>
                  {movement.totalCost ? `$${movement.totalCost.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell>{movement.referenceNumber || '-'}</TableCell>
                <TableCell>{movement.performedBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </motion.div>
  );

  /**
   * Render purchase orders table
   */
  const renderPurchaseOrders = () => (
    <motion.div variants={containerVariants} initial='hidden' animate='visible'>
      <Box sx={{ mb: 3 }}>
        <Box display='flex' alignItems='center' justifyContent='space-between' mb={2}>
          <Typography variant='h5' component='h2' sx={{ fontWeight: 600 }}>
            Purchase Orders
          </Typography>
          <Button variant='contained' startIcon={<AddIcon />} onClick={() => setPurchaseOrderCreateOpen(true)}>
            Create Purchase Order
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Order Number</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Order Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Total Amount</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchaseOrders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell>{order.orderNumber}</TableCell>
                <TableCell>{order.supplierName}</TableCell>
                <TableCell>
                  <Chip
                    label={order.status}
                    size='small'
                    color={order.status === 'RECEIVED' ? 'success' : order.status === 'CANCELLED' ? 'error' : 'primary'}
                  />
                </TableCell>
                <TableCell>{order.orderDate.toLocaleDateString()}</TableCell>
                <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                <TableCell>
                  <Stack direction='row' spacing={1}>
                    <Tooltip title='View Details'>
                      <IconButton size='small' onClick={() => handleViewPurchaseOrder(order)}>
                        <ViewIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Print Purchase Order'>
                      <IconButton size='small' color='primary' onClick={() => handlePrintPurchaseOrder(order)}>
                        <PrintIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Empty State */}
      {purchaseOrders.length === 0 && !loading && (
        <Box textAlign='center' py={8}>
          <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant='h6' gutterBottom>
            No purchase orders found
          </Typography>
          <Typography variant='body2' color='text.secondary' mb={3}>
            Create your first purchase order to manage inventory restocking
          </Typography>
          <Button variant='contained' startIcon={<AddIcon />} onClick={() => setPurchaseOrderCreateOpen(true)}>
            Create First Purchase Order
          </Button>
        </Box>
      )}
    </motion.div>
  );

  /**
   * Render analytics dashboard
   */
  const renderAnalytics = () => {
    if (!analytics) return null;

    return (
      <motion.div variants={containerVariants} initial='hidden' animate='visible'>
        <Typography variant='h5' component='h2' sx={{ fontWeight: 600, mb: 3 }}>
          Inventory Analytics
        </Typography>

        <Grid container spacing={3}>
          {/* Key Metrics */}
          <Grid item xs={12}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display='flex' alignItems='center'>
                      <InventoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant='h4' component='div' sx={{ fontWeight: 600 }}>
                          {analytics.totalItems}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          Total Items
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display='flex' alignItems='center'>
                      <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
                      <Box>
                        <Typography variant='h4' component='div' sx={{ fontWeight: 600 }}>
                          ${analytics.totalValue.toLocaleString()}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          Total Stock Value
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display='flex' alignItems='center'>
                      <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                      <Box>
                        <Typography variant='h4' component='div' sx={{ fontWeight: 600 }}>
                          {analytics.lowStockItems}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          Low Stock Items
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display='flex' alignItems='center'>
                      <AnalyticsIcon sx={{ mr: 1, color: 'info.main' }} />
                      <Box>
                        <Typography variant='h4' component='div' sx={{ fontWeight: 600 }}>
                          {analytics.averageDaysOnHand}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          Avg Days on Hand
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Top Moving Products */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom sx={{ fontWeight: 600 }}>
                  Top Moving Products
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {analytics.topMovingProducts.map((product, index) => (
                  <Box key={product.productId} display='flex' alignItems='center' mb={1}>
                    <Chip label={`#${index + 1}`} size='small' sx={{ mr: 2 }} />
                    <Box flexGrow={1}>
                      <Typography variant='body2' fontWeight='bold'>
                        {product.productName}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {product.totalQuantity.toLocaleString()} units moved
                      </Typography>
                    </Box>
                    <Chip label={`${product.movementCount} movements`} size='small' color='primary' />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Slow Moving Products */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom sx={{ fontWeight: 600 }}>
                  Slow Moving Products
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {analytics.slowMovingProducts.map((product) => (
                  <Box key={product.productId} display='flex' alignItems='center' mb={1}>
                    <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                    <Box flexGrow={1}>
                      <Typography variant='body2' fontWeight='bold'>
                        {product.productName}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {product.currentStock} units in stock
                      </Typography>
                    </Box>
                    <Chip label={`${product.daysSinceLastMovement} days`} size='small' color='warning' />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>
    );
  };

  return (
    <DashboardLayout title='Inventory Management'>
      <Container maxWidth={false} sx={{ py: 3 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant='h4' fontWeight='600' color='text.primary' gutterBottom>
            Inventory Management
          </Typography>
          <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
            Comprehensive inventory and product management system
          </Typography>

          <Box display='flex' alignItems='center' justifyContent='space-between' mb={2}>
            <Box />
            <Stack direction='row' spacing={2}>
              <FormControl size='small' sx={{ minWidth: 200 }}>
                <InputLabel>Warehouse</InputLabel>
                <Select
                  value={selectedWarehouse}
                  onChange={(e) => handleWarehouseChange(e.target.value)}
                  label='Warehouse'
                >
                  <MenuItem value=''>All Warehouses</MenuItem>
                  {warehouses.map((warehouse) => (
                    <MenuItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant='outlined'
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
                size='small'
              >
                Refresh
              </Button>

              <Button variant='outlined' startIcon={<ExportIcon />} disabled={loading} size='small'>
                Export
              </Button>
            </Stack>
          </Box>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Progress */}
          {loading && <LinearProgress sx={{ mb: 3 }} />}
        </Box>

        {/* Main Content */}
        <Paper sx={{ width: '100%', borderRadius: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange} aria-label='inventory tabs'>
              <Tab label='Products' icon={<InventoryIcon />} />
              <Tab label='Warehouses' icon={<WarehouseIcon />} />
              <Tab label='Stock Levels' icon={<ViewIcon />} />
              <Tab label='Stock Movements' icon={<TransferIcon />} />
              <Tab label='Transfers' icon={<SwapHoriz />} />
              <Tab label='Reservations' icon={<ReserveIcon />} />
              <Tab label='Purchase Orders' icon={<ShoppingCart />} />
              <Tab label='Analytics' icon={<AnalyticsIcon />} />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            {renderProductsManagement()}
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            {renderWarehouseOverview()}
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            {renderStockLevels()}
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            {renderStockMovements()}
          </TabPanel>

          <TabPanel value={currentTab} index={4}>
            <Typography variant='h6' gutterBottom>
              Stock Transfers
            </Typography>
            {/* Stock transfers table would go here */}
          </TabPanel>

          <TabPanel value={currentTab} index={5}>
            <Typography variant='h6' gutterBottom>
              Stock Reservations
            </Typography>
            {/* Stock reservations table would go here */}
          </TabPanel>

          <TabPanel value={currentTab} index={6}>
            {renderPurchaseOrders()}
          </TabPanel>

          <TabPanel value={currentTab} index={7}>
            {renderAnalytics()}
          </TabPanel>
        </Paper>

        {/* Floating Action Buttons */}
        <Box sx={{ position: 'fixed', bottom: 24, right: 24 }}>
          <Stack spacing={2}>
            <Fab
              color='primary'
              aria-label='add stock movement'
              onClick={() => handleDialogOpen('movement')}
              size='medium'
            >
              <AddIcon />
            </Fab>
            <Fab
              color='secondary'
              aria-label='create transfer'
              onClick={() => handleDialogOpen('transfer')}
              size='medium'
            >
              <TransferIcon />
            </Fab>
          </Stack>
        </Box>

        {/* Action Dialogs */}
        <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth='md' fullWidth>
          <DialogTitle>
            {dialogType === 'movement' && 'Create Stock Movement'}
            {dialogType === 'transfer' && 'Create Stock Transfer'}
            {dialogType === 'adjustment' && 'Inventory Adjustment'}
            {dialogType === 'reservation' && 'Reserve Stock'}
            {dialogType === 'product' && 'Product Management'}
            {dialogType === 'purchase_order' && 'Purchase Order Management'}
          </DialogTitle>
          <DialogContent>
            <Typography>{dialogType} form would be implemented here with proper validation and submission.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button variant='contained' onClick={handleDialogClose}>
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Product Details Modal */}
        <ProductDetailsModal
          open={productDetailsOpen}
          product={selectedProduct}
          onClose={() => setProductDetailsOpen(false)}
          onProductUpdated={loadData}
        />

        {/* Stock Movement Modal */}
        <StockMovementModal
          open={stockMovementOpen}
          productId={selectedProduct?.id || ''}
          onClose={() => setStockMovementOpen(false)}
          onSuccess={loadData}
        />

        {/* Purchase Order Create Modal */}
        <PurchaseOrderCreateModal
          open={purchaseOrderCreateOpen}
          onClose={() => setPurchaseOrderCreateOpen(false)}
          onSuccess={loadData}
        />

        {/* Purchase Order View Modal */}
        <PurchaseOrderViewModal
          open={purchaseOrderViewOpen}
          purchaseOrder={selectedPurchaseOrder}
          onClose={() => setPurchaseOrderViewOpen(false)}
          onPrint={handlePrintPurchaseOrder}
        />

        {/* Purchase Order Print Modal */}
        <PurchaseOrderPrintModal
          open={purchaseOrderPrintOpen}
          purchaseOrder={purchaseOrderToPrint}
          onClose={() => setPurchaseOrderPrintOpen(false)}
          onPrintSuccess={() => {
            setPurchaseOrderPrintOpen(false);
            // Optionally show success message
          }}
        />
      </Container>
    </DashboardLayout>
  );
};

export default InventoryPage;
