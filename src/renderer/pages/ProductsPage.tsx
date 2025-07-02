/**
 * Products Page Component
 * Comprehensive product management interface
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Product Management
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  Inventory,
  TrendingDown,
  TrendingUp,
  Warning,
  CheckCircle,
  Cancel,
  Pending,
  ExpandMore,
  ShoppingCart,
  LocalOffer,
  Category,
  Scale,
  Assessment,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { useAuthStore } from '../store/auth.store';
import { useAgencyStore } from '../store/agency.store';
import ProductService, {
  Product,
  ProductStatus,
  ProductCategory,
  UnitOfMeasure,
  ProductFilters,
  CreateProductData,
  CreateProductSchema,
} from '../services/ProductService';
import { InventoryAnalytics } from '../components/molecules';
import { ProductDetailsModal } from '../components/molecules/ProductDetailsModal';
import StockMovementModal from '../components/molecules/StockMovementModal/StockMovementModal';

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
const StatusIcon: React.FC<{ status: ProductStatus }> = ({ status }) => {
  const getStatusConfig = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return { icon: CheckCircle, color: 'success.main' };
      case ProductStatus.INACTIVE:
        return { icon: Pending, color: 'warning.main' };
      case ProductStatus.DISCONTINUED:
        return { icon: Cancel, color: 'error.main' };
      case ProductStatus.PENDING_APPROVAL:
        return { icon: Pending, color: 'info.main' };
      case ProductStatus.OUT_OF_STOCK:
        return { icon: Warning, color: 'error.main' };
      default:
        return { icon: Pending, color: 'grey.500' };
    }
  };

  const { icon: Icon, color } = getStatusConfig(status);
  return <Icon sx={{ color, fontSize: 16 }} />;
};

/**
 * Stock level indicator
 */
const StockIndicator: React.FC<{ product: Product }> = ({ product }) => {
  const getStockStatus = () => {
    if (product.currentStock === 0) {
      return { color: 'error', label: 'Out of Stock', icon: Warning };
    } else if (product.currentStock <= product.reorderLevel) {
      return { color: 'warning', label: 'Low Stock', icon: TrendingDown };
    } else {
      return { color: 'success', label: 'In Stock', icon: TrendingUp };
    }
  };

  const { color, label, icon: Icon } = getStockStatus();

  return <Chip icon={<Icon />} label={label} size='small' color={color as any} variant='outlined' />;
};

/**
 * Product card component
 */
const ProductCard: React.FC<{
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onView: (product: Product) => void;
}> = ({ product, onEdit, onDelete, onView }) => {
  const theme = useTheme();

  const getStatusColor = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return theme.palette.success.main;
      case ProductStatus.INACTIVE:
        return theme.palette.warning.main;
      case ProductStatus.DISCONTINUED:
        return theme.palette.error.main;
      case ProductStatus.PENDING_APPROVAL:
        return theme.palette.info.main;
      case ProductStatus.OUT_OF_STOCK:
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const stockValue = product.currentStock * product.costPrice;
  const profit = product.sellingPrice - product.costPrice;
  const profitMargin = product.costPrice > 0 ? (profit / product.costPrice) * 100 : 0;

  return (
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
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant='h6' sx={{ fontWeight: 600, mb: 0.5 }}>
                {product.name}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                SKU: {product.sku}
              </Typography>
              <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <Category fontSize='small' color='action' />
                {product.category.replace('_', ' ')}
              </Typography>
            </Box>
            <Chip
              icon={<StatusIcon status={product.status} />}
              label={product.status}
              size='small'
              sx={{
                backgroundColor: `${getStatusColor(product.status)}20`,
                color: getStatusColor(product.status),
                border: `1px solid ${getStatusColor(product.status)}40`,
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <LocalOffer fontSize='small' color='action' />
              Cost: ${product.costPrice.toFixed(2)} | Selling: ${product.sellingPrice.toFixed(2)}
            </Typography>
            <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Scale fontSize='small' color='action' />
              Unit: {product.unitOfMeasure.replace('_', ' ')}
            </Typography>
            <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Inventory fontSize='small' color='action' />
              Stock: {product.currentStock} / {product.maxStockLevel}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <StockIndicator product={product} />
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant='body2' color='text.secondary'>
                Stock Value
              </Typography>
              <Typography variant='h6' sx={{ fontWeight: 600, color: 'primary.main' }}>
                ${stockValue.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant='body2' color='text.secondary'>
                Profit Margin
              </Typography>
              <Typography
                variant='h6'
                sx={{
                  fontWeight: 600,
                  color: profitMargin > 0 ? 'success.main' : 'error.main',
                }}
              >
                {profitMargin.toFixed(1)}%
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Visibility />}
              onClick={() => onView(product)}
              sx={{ flex: 1 }}
            >
              View
            </Button>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Edit />}
              onClick={() => onEdit(product)}
              sx={{ flex: 1 }}
            >
              Edit
            </Button>
            <IconButton size='small' onClick={() => onDelete(product)} sx={{ color: 'error.main' }}>
              <Delete fontSize='small' />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Product creation/edit form component
 */
const ProductFormDialog: React.FC<{
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (data: CreateProductData, isEdit: boolean) => void;
}> = ({ open, product, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<CreateProductData>>({
    sku: '',
    name: '',
    category: ProductCategory.OTHER,
    unitOfMeasure: UnitOfMeasure.PIECE,
    costPrice: 0,
    sellingPrice: 0,
    minStockLevel: 0,
    maxStockLevel: 0,
    reorderLevel: 0,
    currentStock: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        unitOfMeasure: product.unitOfMeasure,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        barcode: product.barcode,
        supplierId: product.supplierId,
        supplierProductCode: product.supplierProductCode,
        minStockLevel: product.minStockLevel,
        maxStockLevel: product.maxStockLevel,
        reorderLevel: product.reorderLevel,
        currentStock: product.currentStock,
        weight: product.weight,
        dimensions: product.dimensions,
        tags: product.tags,
      });
    } else {
      setFormData({
        sku: '',
        name: '',
        category: ProductCategory.OTHER,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: 0,
        sellingPrice: 0,
        minStockLevel: 0,
        maxStockLevel: 0,
        reorderLevel: 0,
        currentStock: 0,
      });
    }
    setErrors({});
  }, [product, open]);

  const handleSubmit = () => {
    try {
      const validatedData = CreateProductSchema.parse(formData);
      onSave(validatedData, !!product);
      onClose();
    } catch (error: any) {
      if (error.errors) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          newErrors[err.path.join('.')] = err.message;
        });
        setErrors(newErrors);
      }
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='SKU'
              value={formData.sku || ''}
              onChange={(e) => updateFormData('sku', e.target.value)}
              error={!!errors.sku}
              helperText={errors.sku}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='Barcode'
              value={formData.barcode || ''}
              onChange={(e) => updateFormData('barcode', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label='Product Name'
              value={formData.name || ''}
              onChange={(e) => updateFormData('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label='Description'
              multiline
              rows={3}
              value={formData.description || ''}
              onChange={(e) => updateFormData('description', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category || ProductCategory.OTHER}
                onChange={(e) => updateFormData('category', e.target.value)}
                label='Category'
              >
                {Object.values(ProductCategory).map((category) => (
                  <MenuItem key={category} value={category}>
                    {category.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Unit of Measure</InputLabel>
              <Select
                value={formData.unitOfMeasure || UnitOfMeasure.PIECE}
                onChange={(e) => updateFormData('unitOfMeasure', e.target.value)}
                label='Unit of Measure'
              >
                {Object.values(UnitOfMeasure).map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='Cost Price'
              type='number'
              value={formData.costPrice || 0}
              onChange={(e) => updateFormData('costPrice', parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <InputAdornment position='start'>$</InputAdornment>,
              }}
              error={!!errors.costPrice}
              helperText={errors.costPrice}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='Selling Price'
              type='number'
              value={formData.sellingPrice || 0}
              onChange={(e) => updateFormData('sellingPrice', parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <InputAdornment position='start'>$</InputAdornment>,
              }}
              error={!!errors.sellingPrice}
              helperText={errors.sellingPrice}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label='Min Stock Level'
              type='number'
              value={formData.minStockLevel || 0}
              onChange={(e) => updateFormData('minStockLevel', parseInt(e.target.value) || 0)}
              error={!!errors.minStockLevel}
              helperText={errors.minStockLevel}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label='Max Stock Level'
              type='number'
              value={formData.maxStockLevel || 0}
              onChange={(e) => updateFormData('maxStockLevel', parseInt(e.target.value) || 0)}
              error={!!errors.maxStockLevel}
              helperText={errors.maxStockLevel}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label='Reorder Level'
              type='number'
              value={formData.reorderLevel || 0}
              onChange={(e) => updateFormData('reorderLevel', parseInt(e.target.value) || 0)}
              error={!!errors.reorderLevel}
              helperText={errors.reorderLevel}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='Current Stock'
              type='number'
              value={formData.currentStock || 0}
              onChange={(e) => updateFormData('currentStock', parseInt(e.target.value) || 0)}
              error={!!errors.currentStock}
              helperText={errors.currentStock}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='Weight (kg)'
              type='number'
              value={formData.weight || ''}
              onChange={(e) => updateFormData('weight', parseFloat(e.target.value) || undefined)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant='contained' onClick={handleSubmit}>
          {product ? 'Update' : 'Create'} Product
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Main Products Page Component
 */
export const ProductsPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { currentAgency } = useAgencyStore();

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsRefreshTrigger, setAnalyticsRefreshTrigger] = useState(0);

  /**
   * Load products data
   */
  const loadProducts = useCallback(async () => {
    if (!currentAgency) return;

    try {
      setLoading(true);
      setError(null);
      const response = await ProductService.getProducts(
        currentAgency.id,
        page,
        12, // Show 12 products per page for card layout
        filters
      );
      setProducts(response.products);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [currentAgency, page, filters]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
  const handleFilterChange = (newFilters: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  /**
   * Handle create product
   */
  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setFormDialogOpen(true);
  };

  /**
   * Handle edit product
   */
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setFormDialogOpen(true);
  };

  /**
   * Handle save product
   */
  const handleSaveProduct = async (data: CreateProductData, isEdit: boolean) => {
    if (!currentAgency || !user) return;

    try {
      setLoading(true);
      if (isEdit && selectedProduct) {
        await ProductService.updateProduct(selectedProduct.id, data, user.id);
      } else {
        await ProductService.createProduct(currentAgency.id, data, user.id);
      }
      await loadProducts();
      setFormDialogOpen(false);
      // Trigger analytics refresh
      setAnalyticsRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle delete product
   */
  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  /**
   * Confirm delete product
   */
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      setLoading(true);
      await ProductService.deleteProduct(productToDelete.id);
      await loadProducts();
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      // Trigger analytics refresh
      setAnalyticsRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle view product
   */
  const handleViewProduct = (product: Product) => {
    setDetailsProduct(product);
    setDetailsModalOpen(true);
  };

  /**
   * Handle product update from details modal
   */
  const handleProductUpdated = useCallback(async (updatedProduct: Product) => {
    // Update the product in the current list
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));

    // Trigger analytics refresh
    setAnalyticsRefreshTrigger((prev) => prev + 1);
  }, []);

  const lowStockProducts = products.filter((p) => p.currentStock <= p.reorderLevel && p.currentStock > 0);
  const outOfStockProducts = products.filter((p) => p.currentStock === 0);
  const totalStockValue = products.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);

  if (loading && products.length === 0) {
    return (
      <DashboardLayout title='Product Management'>
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
    <DashboardLayout title='Product Management'>
      <motion.div variants={containerVariants} initial='hidden' animate='visible'>
        <Container maxWidth='xl' sx={{ py: 3 }}>
          {/* Header Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant='h4' sx={{ fontWeight: 700 }}>
                Product Management
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant='outlined'
                  startIcon={<Assessment />}
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  color='info'
                >
                  {showAnalytics ? 'Hide' : 'Show'} Analytics
                </Button>
                <Button variant='contained' startIcon={<Add />} onClick={handleCreateProduct} sx={{ px: 3 }}>
                  Add Product
                </Button>
              </Box>
            </Box>

            {/* Search and Filters */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems='center'>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    placeholder='Search products...'
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
                    <Button variant='outlined' startIcon={<Upload />}>
                      Import
                    </Button>
                    <Button
                      variant={showAnalytics ? 'contained' : 'outlined'}
                      startIcon={<Assessment />}
                      onClick={() => setShowAnalytics(!showAnalytics)}
                    >
                      Analytics
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Analytics Section */}
            <AnimatePresence>
              {showAnalytics && currentAgency && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  <Box sx={{ mb: 4 }}>
                    <InventoryAnalytics agencyId={currentAgency.id} refreshTrigger={analyticsRefreshTrigger} />
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

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
                            <InputLabel>Category</InputLabel>
                            <Select
                              multiple
                              value={filters.category || []}
                              onChange={(e) =>
                                handleFilterChange({
                                  category: e.target.value as ProductCategory[],
                                })
                              }
                              label='Category'
                            >
                              {Object.values(ProductCategory).map((category) => (
                                <MenuItem key={category} value={category}>
                                  {category.replace('_', ' ')}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                              multiple
                              value={filters.status || []}
                              onChange={(e) =>
                                handleFilterChange({
                                  status: e.target.value as ProductStatus[],
                                })
                              }
                              label='Status'
                            >
                              {Object.values(ProductStatus).map((status) => (
                                <MenuItem key={status} value={status}>
                                  {status.replace('_', ' ')}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth>
                            <InputLabel>Stock Filter</InputLabel>
                            <Select
                              value={filters.outOfStock ? 'outOfStock' : filters.lowStock ? 'lowStock' : ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                handleFilterChange({
                                  outOfStock: value === 'outOfStock',
                                  lowStock: value === 'lowStock',
                                });
                              }}
                              label='Stock Filter'
                            >
                              <MenuItem value=''>All Products</MenuItem>
                              <MenuItem value='lowStock'>Low Stock</MenuItem>
                              <MenuItem value='outOfStock'>Out of Stock</MenuItem>
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
                      Total Products
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Badge badgeContent={lowStockProducts.length} color='warning'>
                      <Typography variant='h4' sx={{ fontWeight: 700, color: 'warning.main' }}>
                        {lowStockProducts.length}
                      </Typography>
                    </Badge>
                    <Typography variant='body2' color='text.secondary'>
                      Low Stock
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Badge badgeContent={outOfStockProducts.length} color='error'>
                      <Typography variant='h4' sx={{ fontWeight: 700, color: 'error.main' }}>
                        {outOfStockProducts.length}
                      </Typography>
                    </Badge>
                    <Typography variant='body2' color='text.secondary'>
                      Out of Stock
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'success.main' }}>
                      ${totalStockValue.toLocaleString()}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Total Stock Value
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

          {/* Inventory Analytics Toggle */}
          {showAnalytics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <InventoryAnalytics agencyId={currentAgency?.id || ''} key={analyticsRefreshTrigger} />
            </motion.div>
          )}

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
                  <TableCell sx={{ fontWeight: 600 }}>Stock Value</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => {
                  const stockValue = product.currentStock * product.costPrice;
                  const profit = product.sellingPrice - product.costPrice;
                  const profitMargin = product.costPrice > 0 ? (profit / product.costPrice) * 100 : 0;

                  return (
                    <TableRow key={product.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                      <TableCell>
                        <Box>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
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
                          <StockIndicator product={product} />
                          {product.reservedStock > 0 && (
                            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                              Reserved: {product.reservedStock}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<StatusIcon status={product.status} />}
                          label={product.status.replace('_', ' ')}
                          size='small'
                          color={
                            product.status === ProductStatus.ACTIVE
                              ? 'success'
                              : product.status === ProductStatus.INACTIVE
                                ? 'warning'
                                : product.status === ProductStatus.DISCONTINUED
                                  ? 'error'
                                  : 'default'
                          }
                          variant='outlined'
                        />
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
                        <Box>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            ${stockValue.toLocaleString()}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {profitMargin.toFixed(1)}% margin
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Tooltip title='View Details & Manage Inventory'>
                            <IconButton size='small' onClick={() => handleViewProduct(product)} color='primary'>
                              <Visibility fontSize='small' />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Edit Product'>
                            <IconButton size='small' onClick={() => handleEditProduct(product)} color='info'>
                              <Edit fontSize='small' />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Delete Product'>
                            <IconButton size='small' onClick={() => handleDeleteProduct(product)} color='error'>
                              <Delete fontSize='small' />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Empty State */}
          {products.length === 0 && !loading && (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
              }}
            >
              <Inventory sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant='h5' sx={{ mb: 1 }}>
                No products found
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                {filters.search || filters.status || filters.category
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding your first product'}
              </Typography>
              {!filters.search && !filters.status && !filters.category && (
                <Button variant='contained' startIcon={<Add />} onClick={handleCreateProduct}>
                  Add First Product
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

        {/* Product Form Dialog */}
        <ProductFormDialog
          open={formDialogOpen}
          product={selectedProduct}
          onClose={() => setFormDialogOpen(false)}
          onSave={handleSaveProduct}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete product "{productToDelete?.name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant='contained' color='error' onClick={confirmDeleteProduct} disabled={loading}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        <ProductDetailsModal
          open={detailsModalOpen}
          product={detailsProduct}
          onClose={() => setDetailsModalOpen(false)}
          onProductUpdated={handleProductUpdated}
        />
      </motion.div>
    </DashboardLayout>
  );
};

export default ProductsPage;
