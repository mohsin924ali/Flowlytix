/**
 * Inventory Management Page
 * Comprehensive inventory management with multi-warehouse support
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Inventory Management
 * @architecture Page Layer - Clean Architecture
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Alert,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Stack,
  Divider,
  Badge,
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
import StockMovementModal from '../components/molecules/StockMovementModal/StockMovementModal';

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
 * Inventory status chip component
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
 * Main Inventory Management Page Component
 */
const InventoryPage: React.FC = () => {
  const { currentAgency } = useAgencyStore();

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

  // Filter State
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [productFilters, setProductFilters] = useState<ProductFilters>({});

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'movement' | 'transfer' | 'adjustment' | 'reservation' | 'product'>(
    'movement'
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);
  const [stockMovementOpen, setStockMovementOpen] = useState(false);

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
      ] = await Promise.all([
        InventoryService.getWarehouses(),
        InventoryService.getStockLevels(selectedWarehouse || undefined),
        InventoryService.getStockMovements(filters),
        InventoryService.getStockTransfers(),
        InventoryService.getStockReservations(),
        InventoryService.getInventoryAnalytics(selectedWarehouse || undefined),
        ProductService.getProducts(currentAgency?.id || '', 1, 50, productFilters),
      ]);

      setWarehouses(warehousesData);
      setStockLevels(stockLevelsData);
      setStockMovements(movementsResult.movements);
      setStockTransfers(transfersData);
      setStockReservations(reservationsData);
      setAnalytics(analyticsData);
      setProducts(productsResult.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, filters, productFilters]);

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  }, []);

  /**
   * Handle warehouse selection
   */
  const handleWarehouseChange = useCallback((warehouseId: string) => {
    setSelectedWarehouse(warehouseId);
  }, []);

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

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    loadData();
  }, [loadData]);

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
   * Render products management section
   */
  const renderProductsManagement = () => (
    <Box>
      {/* Products Header */}
      <Box display='flex' alignItems='center' justifyContent='space-between' mb={3}>
        <Typography variant='h6' component='h2'>
          Product Management
        </Typography>
        <Button variant='contained' startIcon={<AddIcon />} onClick={handleCreateProduct}>
          Add Product
        </Button>
      </Box>

      {/* Products Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Cost Price</TableCell>
              <TableCell>Selling Price</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant='body2' fontWeight='bold'>
                      {product.name}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {product.description || 'No description'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant='body2' fontFamily='monospace'>
                    {product.sku}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2'>{product.category.replace('_', ' ')}</Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant='body2' fontWeight='bold'>
                      {product.currentStock} / {product.maxStockLevel}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Reorder at: {product.reorderLevel}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={product.status.replace('_', ' ')}
                    size='small'
                    color={
                      product.status === ProductStatus.ACTIVE
                        ? 'success'
                        : product.status === ProductStatus.INACTIVE
                          ? 'warning'
                          : 'error'
                    }
                    variant='outlined'
                  />
                </TableCell>
                <TableCell>
                  <Typography variant='body2'>${product.costPrice.toFixed(2)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2'>${product.sellingPrice.toFixed(2)}</Typography>
                </TableCell>
                <TableCell>
                  <Box display='flex' gap={1}>
                    <Tooltip title='View Details'>
                      <IconButton size='small' onClick={() => handleViewProduct(product)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Edit Product'>
                      <IconButton size='small' onClick={() => handleEditProduct(product)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Manage Stock'>
                      <IconButton size='small' onClick={() => handleManageStock(product)}>
                        <AdjustIcon />
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
            Get started by adding your first product
          </Typography>
          <Button variant='contained' startIcon={<AddIcon />} onClick={handleCreateProduct}>
            Add First Product
          </Button>
        </Box>
      )}
    </Box>
  );

  /**
   * Render warehouse overview cards
   */
  const renderWarehouseOverview = () => (
    <Grid container spacing={3}>
      {warehouses.map((warehouse) => (
        <Grid item xs={12} md={6} lg={4} key={warehouse.id}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display='flex' alignItems='center' mb={2}>
                  <WarehouseIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant='h6' component='div'>
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
  );

  /**
   * Render stock levels table
   */
  const renderStockLevels = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Product ID</TableCell>
            <TableCell>Warehouse</TableCell>
            <TableCell align='right'>Available</TableCell>
            <TableCell align='right'>Reserved</TableCell>
            <TableCell align='right'>Damaged</TableCell>
            <TableCell align='right'>Total</TableCell>
            <TableCell align='right'>Reorder Level</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
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
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='Adjust Stock'>
                    <IconButton size='small' onClick={() => handleDialogOpen('adjustment')}>
                      <AdjustIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='Reserve Stock'>
                    <IconButton size='small' onClick={() => handleDialogOpen('reservation')}>
                      <ReserveIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  /**
   * Render stock movements table
   */
  const renderStockMovements = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Product</TableCell>
            <TableCell>Warehouse</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell align='right'>Quantity</TableCell>
            <TableCell align='right'>Cost</TableCell>
            <TableCell>Reference</TableCell>
            <TableCell>Performed By</TableCell>
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
  );

  /**
   * Render analytics dashboard
   */
  const renderAnalytics = () => {
    if (!analytics) return null;

    return (
      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display='flex' alignItems='center'>
                    <InventoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant='h4' component='div'>
                        ${analytics.totalValue.toLocaleString()}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Total Inventory Value
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
                    <Badge badgeContent={analytics.lowStockItems} color='warning'>
                      <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                    </Badge>
                    <Box>
                      <Typography variant='h4' component='div'>
                        {analytics.totalItems.toLocaleString()}
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
                      <Typography variant='h4' component='div'>
                        {analytics.turnoverRate.toFixed(1)}x
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Turnover Rate
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
                      <Typography variant='h4' component='div'>
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
              <Typography variant='h6' gutterBottom>
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
              <Typography variant='h6' gutterBottom>
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
    );
  };

  return (
    <DashboardLayout title='Inventory Management'>
      <Box sx={{ width: '100%' }}>
        {/* Header */}
        <Box display='flex' alignItems='center' justifyContent='space-between' mb={3}>
          <Box display='flex' alignItems='center'>
            <InventoryIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
            <Typography variant='h4' component='h1' fontWeight='bold'>
              Inventory Management
            </Typography>
          </Box>

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

            <Button variant='outlined' startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loading}>
              Refresh
            </Button>

            <Button variant='outlined' startIcon={<ExportIcon />} disabled={loading}>
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

        {/* Main Content */}
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange} aria-label='inventory tabs'>
              <Tab label='Products' icon={<InventoryIcon />} />
              <Tab label='Warehouses' icon={<WarehouseIcon />} />
              <Tab label='Stock Levels' icon={<ViewIcon />} />
              <Tab label='Stock Movements' icon={<TransferIcon />} />
              <Tab label='Transfers' icon={<SwapHoriz />} />
              <Tab label='Reservations' icon={<ReserveIcon />} />
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
            {renderAnalytics()}
          </TabPanel>
        </Paper>

        {/* Floating Action Buttons */}
        <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
          <Stack spacing={2}>
            <Fab color='primary' aria-label='add stock movement' onClick={() => handleDialogOpen('movement')}>
              <AddIcon />
            </Fab>
            <Fab color='secondary' aria-label='create transfer' onClick={() => handleDialogOpen('transfer')}>
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
      </Box>
    </DashboardLayout>
  );
};

export default InventoryPage;
