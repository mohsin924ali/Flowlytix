/**
 * Product Details Modal Component
 * Comprehensive product information and inventory management interface
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Product Management
 * @architecture Molecule Component (Atomic Design)
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Box,
  IconButton,
  Typography,
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
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  SwapHoriz as AdjustIcon,
  Lock as ReserveIcon,
  LockOpen as ReleaseIcon,
  AttachMoney as PriceIcon,
  History as HistoryIcon,
  Inventory as InventoryIcon,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Product,
  ProductService,
  PriceChangeReason,
  StockMovementEntry,
  PriceHistoryEntry,
} from '../../../services/ProductService';
import { useAuthStore } from '../../../store/auth.store';
import { InventoryStatusChip } from '../../atoms';

/**
 * Props interface for ProductDetailsModal
 */
export interface ProductDetailsModalProps {
  readonly open: boolean;
  readonly product: Product | null;
  readonly onClose: () => void;
  readonly onProductUpdated: (product: Product) => void;
}

/**
 * Stock action types
 */
type StockAction = 'ADD' | 'REMOVE' | 'ADJUST' | 'RESERVE' | 'RELEASE';

/**
 * Stock action form data interface
 */
interface StockActionFormData {
  readonly quantity: number;
  readonly reason: string;
  readonly reference?: string;
}

/**
 * Price update form data interface
 */
interface PriceUpdateFormData {
  readonly costPrice?: number;
  readonly sellingPrice?: number;
  readonly reason: PriceChangeReason;
  readonly notes?: string;
}

/**
 * Animation variants
 */
const tabContentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

/**
 * Product info tab component
 */
const ProductInfoTab: React.FC<{ product: Product }> = ({ product }) => {
  const theme = useTheme();

  return (
    <motion.div variants={tabContentVariants} initial='hidden' animate='visible' exit='exit'>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon color='primary' />
                Basic Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant='body2' color='text.secondary'>
                    SKU
                  </Typography>
                  <Typography variant='body1' sx={{ fontWeight: 600 }}>
                    {product.sku}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant='body2' color='text.secondary'>
                    Name
                  </Typography>
                  <Typography variant='body1' sx={{ fontWeight: 600 }}>
                    {product.name}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant='body2' color='text.secondary'>
                    Description
                  </Typography>
                  <Typography variant='body1'>{product.description || 'No description'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Category
                  </Typography>
                  <Typography variant='body1'>{product.category.replace('_', ' ')}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Unit
                  </Typography>
                  <Typography variant='body1'>{product.unitOfMeasure.replace('_', ' ')}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant='body2' color='text.secondary'>
                    Barcode
                  </Typography>
                  <Typography variant='body1'>{product.barcode || 'N/A'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PriceIcon color='primary' />
                Pricing Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Cost Price
                  </Typography>
                  <Typography variant='h6' sx={{ color: 'error.main' }}>
                    ${product.costPrice.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Selling Price
                  </Typography>
                  <Typography variant='h6' sx={{ color: 'success.main' }}>
                    ${product.sellingPrice.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant='body2' color='text.secondary'>
                    Profit Margin
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{
                      color: product.sellingPrice > product.costPrice ? 'success.main' : 'error.main',
                    }}
                  >
                    {product.costPrice > 0
                      ? (((product.sellingPrice - product.costPrice) / product.costPrice) * 100).toFixed(1)
                      : 0}
                    %
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon color='primary' />
                Stock Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant='body2' color='text.secondary'>
                    Current Stock
                  </Typography>
                  <Typography variant='h6'>{product.currentStock}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant='body2' color='text.secondary'>
                    Reserved
                  </Typography>
                  <Typography variant='h6'>{product.reservedStock}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant='body2' color='text.secondary'>
                    Available
                  </Typography>
                  <Typography variant='h6'>{product.availableStock}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant='body2' color='text.secondary'>
                    Min Level
                  </Typography>
                  <Typography variant='body1'>{product.minStockLevel}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant='body2' color='text.secondary'>
                    Max Level
                  </Typography>
                  <Typography variant='body1'>{product.maxStockLevel}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant='body2' color='text.secondary'>
                    Reorder Level
                  </Typography>
                  <Typography variant='body1'>{product.reorderLevel}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <InventoryStatusChip
                    currentStock={product.currentStock}
                    reorderLevel={product.reorderLevel}
                    maxStockLevel={product.maxStockLevel}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </motion.div>
  );
};

/**
 * Price history tab component
 */
const PriceHistoryTab: React.FC<{ product: Product }> = ({ product }) => {
  return (
    <motion.div variants={tabContentVariants} initial='hidden' animate='visible' exit='exit'>
      <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryIcon color='primary' />
        Price Change History
      </Typography>

      {product.priceHistory.length === 0 ? (
        <Alert severity='info'>No price changes recorded for this product.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Previous Price</TableCell>
                <TableCell>New Price</TableCell>
                <TableCell>Change</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Changed By</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {product.priceHistory.map((entry, index) => {
                const change = entry.newPrice - entry.previousPrice;
                const changePercent = entry.previousPrice > 0 ? (change / entry.previousPrice) * 100 : 0;

                return (
                  <TableRow key={index}>
                    <TableCell>{new Date(entry.changedAt).toLocaleDateString()}</TableCell>
                    <TableCell>${entry.previousPrice.toFixed(2)}</TableCell>
                    <TableCell>${entry.newPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(1)}%)`}
                        color={change >= 0 ? 'success' : 'error'}
                        size='small'
                      />
                    </TableCell>
                    <TableCell>{entry.reason.replace('_', ' ')}</TableCell>
                    <TableCell>{entry.changedBy}</TableCell>
                    <TableCell>{entry.notes || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </motion.div>
  );
};

/**
 * Stock movements tab component
 */
const StockMovementsTab: React.FC<{ product: Product }> = ({ product }) => {
  return (
    <motion.div variants={tabContentVariants} initial='hidden' animate='visible' exit='exit'>
      <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <InventoryIcon color='primary' />
        Stock Movement History
      </Typography>

      {product.stockMovements.length === 0 ? (
        <Alert severity='info'>No stock movements recorded for this product.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Previous Stock</TableCell>
                <TableCell>New Stock</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Performed By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {product.stockMovements.map((movement, index) => (
                <TableRow key={index}>
                  <TableCell>{new Date(movement.performedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={movement.movementType}
                      color={
                        movement.movementType === 'IN'
                          ? 'success'
                          : movement.movementType === 'OUT'
                            ? 'error'
                            : 'default'
                      }
                      size='small'
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        color:
                          movement.movementType === 'IN'
                            ? 'success.main'
                            : movement.movementType === 'OUT'
                              ? 'error.main'
                              : 'text.primary',
                      }}
                    >
                      {movement.movementType === 'IN' ? '+' : movement.movementType === 'OUT' ? '-' : '±'}
                      {movement.quantity}
                    </Typography>
                  </TableCell>
                  <TableCell>{movement.previousStock}</TableCell>
                  <TableCell>{movement.newStock}</TableCell>
                  <TableCell>{movement.reason}</TableCell>
                  <TableCell>{movement.reference || '-'}</TableCell>
                  <TableCell>{movement.performedBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </motion.div>
  );
};

/**
 * Stock action dialog component
 */
const StockActionDialog: React.FC<{
  open: boolean;
  action: StockAction;
  product: Product;
  onClose: () => void;
  onConfirm: (data: StockActionFormData) => void;
  loading: boolean;
}> = ({ open, action, product, onClose, onConfirm, loading }) => {
  const [formData, setFormData] = useState<StockActionFormData>({
    quantity: 0,
    reason: '',
    reference: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getActionConfig = (action: StockAction) => {
    switch (action) {
      case 'ADD':
        return { title: 'Add Stock', icon: AddIcon, color: 'success.main' };
      case 'REMOVE':
        return { title: 'Remove Stock', icon: RemoveIcon, color: 'error.main' };
      case 'ADJUST':
        return { title: 'Adjust Stock', icon: AdjustIcon, color: 'warning.main' };
      case 'RESERVE':
        return { title: 'Reserve Stock', icon: ReserveIcon, color: 'info.main' };
      case 'RELEASE':
        return { title: 'Release Reserved Stock', icon: ReleaseIcon, color: 'info.main' };
    }
  };

  const { title, icon: Icon, color } = getActionConfig(action);

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (action === 'REMOVE' && formData.quantity > product.availableStock) {
      newErrors.quantity = 'Cannot remove more than available stock';
    }

    if (action === 'RELEASE' && formData.quantity > product.reservedStock) {
      newErrors.quantity = 'Cannot release more than reserved stock';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onConfirm(formData);
  };

  const resetForm = () => {
    setFormData({ quantity: 0, reason: '', reference: '' });
    setErrors({});
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon sx={{ color }} />
        {title}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label='Quantity'
              type='number'
              value={formData.quantity}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  quantity: parseInt(e.target.value) || 0,
                }))
              }
              error={!!errors.quantity}
              helperText={errors.quantity}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label='Reason'
              multiline
              rows={2}
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reason: e.target.value,
                }))
              }
              error={!!errors.reason}
              helperText={errors.reason}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label='Reference (Optional)'
              value={formData.reference}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reference: e.target.value,
                }))
              }
              placeholder='Order ID, Invoice #, etc.'
            />
          </Grid>

          {/* Stock info display */}
          <Grid item xs={12}>
            <Card variant='outlined'>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant='body2' color='text.secondary'>
                  Current Stock Info
                </Typography>
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                  <Grid item xs={4}>
                    <Typography variant='body2'>Current: {product.currentStock}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant='body2'>Available: {product.availableStock}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant='body2'>Reserved: {product.reservedStock}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={loading} sx={{ bgcolor: color }}>
          {loading ? <CircularProgress size={20} /> : `${title}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Price update dialog component
 */
const PriceUpdateDialog: React.FC<{
  open: boolean;
  product: Product;
  onClose: () => void;
  onConfirm: (data: PriceUpdateFormData) => void;
  loading: boolean;
}> = ({ open, product, onClose, onConfirm, loading }) => {
  const [formData, setFormData] = useState<PriceUpdateFormData>({
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    reason: PriceChangeReason.MANUAL_OVERRIDE,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    if (formData.costPrice !== undefined && formData.costPrice < 0) {
      newErrors.costPrice = 'Cost price cannot be negative';
    }

    if (formData.sellingPrice !== undefined && formData.sellingPrice < 0) {
      newErrors.sellingPrice = 'Selling price cannot be negative';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onConfirm(formData);
  };

  useEffect(() => {
    if (open) {
      setFormData({
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        reason: PriceChangeReason.MANUAL_OVERRIDE,
        notes: '',
      });
      setErrors({});
    }
  }, [open, product]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PriceIcon color='primary' />
        Update Product Prices
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label='Cost Price'
              type='number'
              value={formData.costPrice}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  costPrice: parseFloat(e.target.value) || 0,
                }))
              }
              InputProps={{
                startAdornment: <InputAdornment position='start'>$</InputAdornment>,
              }}
              error={!!errors.costPrice}
              helperText={errors.costPrice}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label='Selling Price'
              type='number'
              value={formData.sellingPrice}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sellingPrice: parseFloat(e.target.value) || 0,
                }))
              }
              InputProps={{
                startAdornment: <InputAdornment position='start'>$</InputAdornment>,
              }}
              error={!!errors.sellingPrice}
              helperText={errors.sellingPrice}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Reason</InputLabel>
              <Select
                value={formData.reason}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    reason: e.target.value as PriceChangeReason,
                  }))
                }
                label='Reason'
              >
                {Object.values(PriceChangeReason).map((reason) => (
                  <MenuItem key={reason} value={reason}>
                    {reason.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label='Notes (Optional)'
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
            />
          </Grid>

          {/* Price comparison */}
          <Grid item xs={12}>
            <Card variant='outlined'>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                  Price Comparison
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant='body2'>
                      Current Profit: ${(product.sellingPrice - product.costPrice).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant='body2'>
                      New Profit: ${((formData.sellingPrice || 0) - (formData.costPrice || 0)).toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Update Prices'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Inventory actions tab component
 */
const InventoryActionsTab: React.FC<{
  product: Product;
  onStockAction: (action: StockAction, data: StockActionFormData) => void;
  onPriceUpdate: (data: PriceUpdateFormData) => void;
  loading: boolean;
}> = ({ product, onStockAction, onPriceUpdate, loading }) => {
  const [stockActionDialog, setStockActionDialog] = useState<{
    open: boolean;
    action: StockAction;
  }>({ open: false, action: 'ADD' });
  const [priceUpdateDialog, setPriceUpdateDialog] = useState(false);

  const handleStockAction = (action: StockAction) => {
    setStockActionDialog({ open: true, action });
  };

  const handleStockActionConfirm = (data: StockActionFormData) => {
    onStockAction(stockActionDialog.action, data);
    setStockActionDialog({ open: false, action: 'ADD' });
  };

  const handlePriceUpdateConfirm = (data: PriceUpdateFormData) => {
    onPriceUpdate(data);
    setPriceUpdateDialog(false);
  };

  return (
    <motion.div variants={tabContentVariants} initial='hidden' animate='visible' exit='exit'>
      <Typography variant='h6' sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <InventoryIcon color='primary' />
        Inventory Actions
      </Typography>

      <Grid container spacing={3}>
        {/* Stock Actions */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>
                Stock Management
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant='outlined'
                    startIcon={<AddIcon />}
                    onClick={() => handleStockAction('ADD')}
                    disabled={loading}
                    sx={{ py: 1.5 }}
                  >
                    Add Stock
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant='outlined'
                    startIcon={<RemoveIcon />}
                    onClick={() => handleStockAction('REMOVE')}
                    disabled={loading || product.availableStock === 0}
                    sx={{ py: 1.5 }}
                  >
                    Remove Stock
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant='outlined'
                    startIcon={<AdjustIcon />}
                    onClick={() => handleStockAction('ADJUST')}
                    disabled={loading}
                    sx={{ py: 1.5 }}
                  >
                    Adjust Stock
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant='outlined'
                    startIcon={<ReserveIcon />}
                    onClick={() => handleStockAction('RESERVE')}
                    disabled={loading || product.availableStock === 0}
                    sx={{ py: 1.5 }}
                  >
                    Reserve Stock
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant='outlined'
                    startIcon={<ReleaseIcon />}
                    onClick={() => handleStockAction('RELEASE')}
                    disabled={loading || product.reservedStock === 0}
                    sx={{ py: 1.5 }}
                  >
                    Release Reserved Stock
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Price Actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>
                Price Management
              </Typography>
              <Button
                fullWidth
                variant='contained'
                startIcon={<PriceIcon />}
                onClick={() => setPriceUpdateDialog(true)}
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                Update Prices
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>
                Quick Stats
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' color='primary.main'>
                      {product.currentStock}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Current Stock
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' color='success.main'>
                      {product.availableStock}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Available
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' color='warning.main'>
                      {product.reservedStock}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Reserved
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' color='info.main'>
                      ${(product.currentStock * product.costPrice).toLocaleString()}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Stock Value
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stock Action Dialog */}
      <StockActionDialog
        open={stockActionDialog.open}
        action={stockActionDialog.action}
        product={product}
        onClose={() => setStockActionDialog({ open: false, action: 'ADD' })}
        onConfirm={handleStockActionConfirm}
        loading={loading}
      />

      {/* Price Update Dialog */}
      <PriceUpdateDialog
        open={priceUpdateDialog}
        product={product}
        onClose={() => setPriceUpdateDialog(false)}
        onConfirm={handlePriceUpdateConfirm}
        loading={loading}
      />
    </motion.div>
  );
};

/**
 * Main ProductDetailsModal component
 */
export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  open,
  product,
  onClose,
  onProductUpdated,
}) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle stock actions
   */
  const handleStockAction = useCallback(
    async (action: StockAction, data: StockActionFormData) => {
      if (!product || !user) return;

      try {
        setLoading(true);
        setError(null);

        let updatedProduct: Product;

        switch (action) {
          case 'ADD':
            updatedProduct = await ProductService.addStock(
              product.id,
              data.quantity,
              data.reason,
              user.id,
              data.reference
            );
            break;
          case 'REMOVE':
            updatedProduct = await ProductService.removeStock(
              product.id,
              data.quantity,
              data.reason,
              user.id,
              data.reference
            );
            break;
          case 'RESERVE':
            updatedProduct = await ProductService.reserveStock(product.id, data.quantity, user.id);
            break;
          case 'RELEASE':
            updatedProduct = await ProductService.releaseReservedStock(product.id, data.quantity, user.id);
            break;
          case 'ADJUST':
            // For adjustment, we calculate the difference and use add/remove accordingly
            const difference = data.quantity - product.currentStock;
            if (difference > 0) {
              updatedProduct = await ProductService.addStock(
                product.id,
                difference,
                data.reason,
                user.id,
                data.reference
              );
            } else if (difference < 0) {
              updatedProduct = await ProductService.removeStock(
                product.id,
                Math.abs(difference),
                data.reason,
                user.id,
                data.reference
              );
            } else {
              return; // No change needed
            }
            break;
          default:
            throw new Error('Invalid stock action');
        }

        onProductUpdated(updatedProduct);
      } catch (err: any) {
        setError(err.message || 'Failed to perform stock action');
      } finally {
        setLoading(false);
      }
    },
    [product, user, onProductUpdated]
  );

  /**
   * Handle price updates
   */
  const handlePriceUpdate = useCallback(
    async (data: PriceUpdateFormData) => {
      if (!product || !user) return;

      try {
        setLoading(true);
        setError(null);

        const updatedProduct = await ProductService.updateProductPrices(
          product.id,
          data.costPrice,
          data.sellingPrice,
          data.reason,
          user.id,
          data.notes
        );

        onProductUpdated(updatedProduct);
      } catch (err: any) {
        setError(err.message || 'Failed to update prices');
      } finally {
        setLoading(false);
      }
    },
    [product, user, onProductUpdated]
  );

  /**
   * Reset state when modal opens/closes
   */
  useEffect(() => {
    if (open) {
      setActiveTab(0);
      setError(null);
    }
  }, [open]);

  if (!product) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='xl'
      fullWidth
      PaperProps={{
        sx: { height: '90vh' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon color='primary' />
          <Typography variant='h6'>
            {product.name} ({product.sku})
          </Typography>
          <InventoryStatusChip
            currentStock={product.currentStock}
            reorderLevel={product.reorderLevel}
            maxStockLevel={product.maxStockLevel}
          />
        </Box>
        <IconButton onClick={onClose} disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {error && (
          <Alert severity='error' sx={{ m: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label='Product Info' />
          <Tab label='Price History' />
          <Tab label='Stock Movements' />
          <Tab label='Inventory Actions' />
        </Tabs>

        <Box sx={{ p: 3, minHeight: 400 }}>
          <AnimatePresence mode='wait'>
            {activeTab === 0 && <ProductInfoTab key='info' product={product} />}
            {activeTab === 1 && <PriceHistoryTab key='price-history' product={product} />}
            {activeTab === 2 && <StockMovementsTab key='stock-movements' product={product} />}
            {activeTab === 3 && (
              <InventoryActionsTab
                key='inventory-actions'
                product={product}
                onStockAction={handleStockAction}
                onPriceUpdate={handlePriceUpdate}
                loading={loading}
              />
            )}
          </AnimatePresence>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
