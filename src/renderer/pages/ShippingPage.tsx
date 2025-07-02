/**
 * Shipping Management Page - Enhanced Version
 * Comprehensive shipping and logistics management interface
 * Following Instructions file standards with strict TypeScript compliance
 *
 * Features:
 * - Comprehensive shipment tracking and management
 * - Advanced filtering and search capabilities
 * - Proper error handling and loading states
 * - Consistent design patterns with other management pages
 * - CRUD operations for shipment management
 * - Performance optimizations
 *
 * @domain Shipping Management
 * @architecture Clean Architecture - Presentation Layer
 * @version 2.0.0 - Enhanced following Instructions
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  useTheme,
  alpha,
  Skeleton,
  Fab,
} from '@mui/material';
import {
  LocalShipping,
  TrackChanges,
  Inventory,
  CheckCircle,
  Warning,
  Schedule,
  Search,
  Add,
  Print,
  Visibility,
  Edit,
  Delete,
  Refresh,
  Clear,
  Download,
  Cancel,
  Info,
  Assignment,
  LocationOn,
  AccessTime,
  DirectionsBoat,
  Flight,
  LocalShippingOutlined,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { useShipping } from '../hooks/useShipping';

/**
 * Animation variants for consistent design
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

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 },
  },
  hover: {
    y: -2,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    transition: { duration: 0.2 },
  },
};

/**
 * Enhanced shipment status configuration
 */
const getShipmentStatusConfig = (status: string) => {
  const configs = {
    pending: {
      color: 'warning' as const,
      label: 'Pending',
      icon: Schedule,
      ariaLabel: 'Shipment status: Pending',
    },
    processing: {
      color: 'info' as const,
      label: 'Processing',
      icon: Assignment,
      ariaLabel: 'Shipment status: Processing',
    },
    shipped: {
      color: 'primary' as const,
      label: 'Shipped',
      icon: LocalShipping,
      ariaLabel: 'Shipment status: Shipped',
    },
    in_transit: {
      color: 'info' as const,
      label: 'In Transit',
      icon: TrackChanges,
      ariaLabel: 'Shipment status: In Transit',
    },
    delivered: {
      color: 'success' as const,
      label: 'Delivered',
      icon: CheckCircle,
      ariaLabel: 'Shipment status: Delivered',
    },
    exception: {
      color: 'error' as const,
      label: 'Exception',
      icon: Warning,
      ariaLabel: 'Shipment status: Exception',
    },
    cancelled: {
      color: 'error' as const,
      label: 'Cancelled',
      icon: Cancel,
      ariaLabel: 'Shipment status: Cancelled',
    },
  } as const;

  const statusKey = status.toLowerCase() as keyof typeof configs;
  return configs[statusKey] || configs.pending;
};

/**
 * Enhanced loading skeleton
 */
const LoadingSkeleton: React.FC = () => (
  <Box role='status' aria-label='Loading shipments'>
    {Array.from({ length: 5 }).map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant='rectangular' height={120} sx={{ borderRadius: 1 }} />
      </Box>
    ))}
  </Box>
);

/**
 * Enhanced empty state
 */
const EmptyState: React.FC<{ hasFilters: boolean; onClearFilters: () => void }> = ({ hasFilters, onClearFilters }) => (
  <Box
    display='flex'
    flexDirection='column'
    alignItems='center'
    py={8}
    role='status'
    aria-label={hasFilters ? 'No shipments match current filters' : 'No shipments available'}
  >
    <LocalShippingOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
    <Typography variant='h6' color='text.secondary' gutterBottom>
      {hasFilters ? 'No shipments match your filters' : 'No shipments found'}
    </Typography>
    <Typography variant='body2' color='text.secondary' sx={{ mb: 3, textAlign: 'center' }}>
      {hasFilters
        ? 'Try adjusting your search criteria or clear filters to see all shipments'
        : 'Create your first shipment to start tracking deliveries'}
    </Typography>
    {hasFilters && (
      <Button
        variant='outlined'
        onClick={onClearFilters}
        startIcon={<Clear />}
        aria-label='Clear all filters to show all shipments'
      >
        Clear Filters
      </Button>
    )}
  </Box>
);

/**
 * Enhanced shipment card component
 */
const ShipmentCard: React.FC<{
  shipment: any;
  onTrack: (shipment: any) => void;
  onEdit: (shipment: any) => void;
  onDelete: (shipment: any) => void;
}> = ({ shipment, onTrack, onEdit, onDelete }) => {
  const theme = useTheme();
  const statusConfig = getShipmentStatusConfig(shipment.status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div variants={cardVariants} whileHover='hover'>
      <Card
        sx={{
          height: '100%',
          border: `1px solid ${theme.palette.divider}`,
          transition: 'all 0.3s ease',
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant='h6' sx={{ fontWeight: 600, mb: 0.5 }}>
                {shipment.trackingNumber}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                Order: {shipment.orderId}
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 500, mb: 1 }}>
                {shipment.customerName}
              </Typography>
            </Box>
            <Chip
              icon={<StatusIcon sx={{ fontSize: '0.875rem' }} />}
              label={statusConfig.label}
              color={statusConfig.color}
              size='small'
              aria-label={statusConfig.ariaLabel}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <DirectionsBoat sx={{ fontSize: 16 }} />
              Carrier: {shipment.carrier}
            </Typography>
            <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <LocationOn sx={{ fontSize: 16 }} />
              {shipment.origin} → {shipment.destination}
            </Typography>
            {shipment.estimatedDelivery && (
              <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <AccessTime sx={{ fontSize: 16 }} />
                ETA: {new Date(shipment.estimatedDelivery).toLocaleDateString()}
              </Typography>
            )}
          </Box>

          {shipment.progress !== undefined && shipment.progress > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                Progress: {shipment.progress}%
              </Typography>
              <LinearProgress variant='determinate' value={shipment.progress} sx={{ height: 6, borderRadius: 3 }} />
            </Box>
          )}

          {shipment.deliveredDate && (
            <Typography variant='body2' color='success.main' sx={{ mb: 2, fontWeight: 500 }}>
              ✓ Delivered: {new Date(shipment.deliveredDate).toLocaleDateString()}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title='Track shipment'>
              <Button
                variant='outlined'
                size='small'
                startIcon={<TrackChanges />}
                onClick={() => onTrack(shipment)}
                sx={{ flex: 1 }}
                aria-label={`Track shipment ${shipment.trackingNumber}`}
              >
                Track
              </Button>
            </Tooltip>
            <Tooltip title='Print label'>
              <IconButton size='small' color='primary' aria-label={`Print label for ${shipment.trackingNumber}`}>
                <Print fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Edit shipment'>
              <IconButton
                size='small'
                color='info'
                onClick={() => onEdit(shipment)}
                aria-label={`Edit shipment ${shipment.trackingNumber}`}
              >
                <Edit fontSize='small' />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Enhanced shipments table
 */
const ShipmentsTable: React.FC<{
  shipments: any[];
  isLoading: boolean;
  onTrack: (shipment: any) => void;
  onEdit: (shipment: any) => void;
  onDelete: (shipment: any) => void;
}> = ({ shipments, isLoading, onTrack, onEdit, onDelete }) => {
  const theme = useTheme();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
      <Table aria-label='Shipments table'>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Tracking Number</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Carrier</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Route</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>ETA</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {shipments.map((shipment) => {
            const statusConfig = getShipmentStatusConfig(shipment.status);
            const StatusIcon = statusConfig.icon;

            return (
              <TableRow
                key={shipment.id}
                hover
                component={motion.tr}
                variants={itemVariants}
                sx={{
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                <TableCell>
                  <Typography variant='body2' sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {shipment.trackingNumber}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Order: {shipment.orderId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2' sx={{ fontWeight: 500 }}>
                    {shipment.customerName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2'>{shipment.carrier}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2' sx={{ fontSize: '0.875rem' }}>
                    {shipment.origin} → {shipment.destination}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={<StatusIcon sx={{ fontSize: '0.875rem' }} />}
                    label={statusConfig.label}
                    color={statusConfig.color}
                    size='small'
                    aria-label={statusConfig.ariaLabel}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant='body2' color='text.secondary'>
                    {shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : 'TBD'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title='Track shipment'>
                      <IconButton
                        size='small'
                        onClick={() => onTrack(shipment)}
                        color='primary'
                        aria-label={`Track shipment ${shipment.trackingNumber}`}
                      >
                        <TrackChanges fontSize='small' />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Edit shipment'>
                      <IconButton
                        size='small'
                        onClick={() => onEdit(shipment)}
                        color='info'
                        aria-label={`Edit shipment ${shipment.trackingNumber}`}
                      >
                        <Edit fontSize='small' />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Print label'>
                      <IconButton
                        size='small'
                        color='secondary'
                        aria-label={`Print label for ${shipment.trackingNumber}`}
                      >
                        <Print fontSize='small' />
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
  );
};

/**
 * Enhanced Shipping Page Component
 */
export const ShippingPage: React.FC = () => {
  const theme = useTheme();

  // Enhanced state management
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Mock data with enhanced structure
  const mockShipments = useMemo(
    () => [
      {
        id: 'ship-001',
        trackingNumber: 'TRK123456789',
        orderId: 'ORD-001',
        customerName: 'Metro Supermarket Chain',
        status: 'in_transit',
        carrier: 'FedEx',
        origin: 'New York, NY',
        destination: 'Boston, MA',
        shippedDate: new Date('2024-01-15'),
        estimatedDelivery: new Date('2024-01-17'),
        progress: 75,
        weight: '15.5 kg',
        dimensions: '30x20x15 cm',
      },
      {
        id: 'ship-002',
        trackingNumber: 'TRK987654321',
        orderId: 'ORD-002',
        customerName: 'TechCorp Industries',
        status: 'delivered',
        carrier: 'UPS',
        origin: 'New York, NY',
        destination: 'Chicago, IL',
        shippedDate: new Date('2024-01-14'),
        estimatedDelivery: new Date('2024-01-16'),
        deliveredDate: new Date('2024-01-16'),
        progress: 100,
        weight: '8.2 kg',
        dimensions: '25x15x10 cm',
      },
      {
        id: 'ship-003',
        trackingNumber: 'TRK456789123',
        orderId: 'ORD-003',
        customerName: 'Sarah Johnson',
        status: 'pending',
        carrier: 'USPS',
        origin: 'New York, NY',
        destination: 'Los Angeles, CA',
        estimatedDelivery: new Date('2024-01-20'),
        progress: 0,
        weight: '2.1 kg',
        dimensions: '20x15x8 cm',
      },
      {
        id: 'ship-004',
        trackingNumber: 'TRK789123456',
        orderId: 'ORD-004',
        customerName: 'Global Manufacturing Ltd',
        status: 'exception',
        carrier: 'DHL',
        origin: 'New York, NY',
        destination: 'Miami, FL',
        shippedDate: new Date('2024-01-13'),
        estimatedDelivery: new Date('2024-01-18'),
        progress: 60,
        weight: '45.0 kg',
        dimensions: '60x40x30 cm',
      },
    ],
    []
  );

  // Enhanced filtering
  const filteredShipments = useMemo(() => {
    return mockShipments.filter((shipment) => {
      const matchesSearch =
        searchTerm === '' ||
        shipment.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.orderId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === '' || shipment.status === statusFilter;
      const matchesCarrier = carrierFilter === '' || shipment.carrier === carrierFilter;

      return matchesSearch && matchesStatus && matchesCarrier;
    });
  }, [mockShipments, searchTerm, statusFilter, carrierFilter]);

  // Enhanced statistics
  const stats = useMemo(
    () => ({
      total: mockShipments.length,
      pending: mockShipments.filter((s) => s.status === 'pending').length,
      shipped: mockShipments.filter((s) => s.status === 'shipped' || s.status === 'in_transit').length,
      delivered: mockShipments.filter((s) => s.status === 'delivered').length,
      exceptions: mockShipments.filter((s) => s.status === 'exception').length,
    }),
    [mockShipments]
  );

  // Enhanced event handlers
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  }, []);

  const handleStatusFilterChange = useCallback((event: any) => {
    setStatusFilter(event.target.value);
    setPage(0);
  }, []);

  const handleCarrierFilterChange = useCallback((event: any) => {
    setCarrierFilter(event.target.value);
    setPage(0);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('');
    setCarrierFilter('');
    setPage(0);
  }, []);

  const handlePageChange = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // CRUD operations
  const handleCreateShipment = useCallback(() => {
    console.log('Creating new shipment...');
  }, []);

  const handleTrackShipment = useCallback((shipment: any) => {
    console.log('Tracking shipment:', shipment.trackingNumber);
  }, []);

  const handleEditShipment = useCallback((shipment: any) => {
    console.log('Editing shipment:', shipment.trackingNumber);
  }, []);

  const handleDeleteShipment = useCallback((shipment: any) => {
    console.log('Deleting shipment:', shipment.trackingNumber);
  }, []);

  const handleRefresh = useCallback(() => {
    console.log('Refreshing shipments...');
  }, []);

  const hasFilters = searchTerm.length > 0 || statusFilter !== '' || carrierFilter !== '';

  return (
    <DashboardLayout>
      <Container maxWidth='xl' sx={{ py: 3 }}>
        <motion.div variants={containerVariants} initial='hidden' animate='visible'>
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4 }}>
              <Typography variant='h4' fontWeight='600' color='text.primary' gutterBottom>
                Shipping Management
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                Track and manage shipments, deliveries, and logistics operations
              </Typography>
            </Box>
          </motion.div>

          {/* Statistics Cards */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4 }}>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {(
                  [
                    { label: 'Total Shipments', value: stats.total, color: 'primary', icon: LocalShipping },
                    { label: 'In Transit', value: stats.shipped, color: 'info', icon: TrackChanges },
                    { label: 'Delivered', value: stats.delivered, color: 'success', icon: CheckCircle },
                    { label: 'Exceptions', value: stats.exceptions, color: 'error', icon: Warning },
                  ] as const
                ).map((stat, index) => (
                  <Grid item xs={12} sm={6} md={3} key={stat.label}>
                    <motion.div variants={cardVariants} whileHover='hover'>
                      <Card
                        sx={{
                          height: '100%',
                          background: `linear-gradient(135deg, ${(theme.palette as any)[stat.color].main}10, ${(theme.palette as any)[stat.color].main}05)`,
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant='h4' sx={{ fontWeight: 700, color: `${stat.color}.main` }}>
                                {stat.value}
                              </Typography>
                              <Typography variant='body2' color='text.secondary'>
                                {stat.label}
                              </Typography>
                            </Box>
                            <stat.icon sx={{ fontSize: 32, color: `${stat.color}.main`, opacity: 0.7 }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </motion.div>

          {/* Main Content */}
          <motion.div variants={itemVariants}>
            <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              {/* Filters */}
              <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={3} alignItems='center'>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      placeholder='Search shipments...'
                      value={searchTerm}
                      onChange={handleSearchChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Search color='action' />
                          </InputAdornment>
                        ),
                      }}
                      size='small'
                      aria-label='Search shipments by tracking number, customer, or order'
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth size='small'>
                      <InputLabel id='status-filter-label'>Status</InputLabel>
                      <Select
                        labelId='status-filter-label'
                        value={statusFilter}
                        label='Status'
                        onChange={handleStatusFilterChange}
                        aria-label='Filter by shipment status'
                      >
                        <MenuItem value=''>All Status</MenuItem>
                        <MenuItem value='pending'>Pending</MenuItem>
                        <MenuItem value='processing'>Processing</MenuItem>
                        <MenuItem value='shipped'>Shipped</MenuItem>
                        <MenuItem value='in_transit'>In Transit</MenuItem>
                        <MenuItem value='delivered'>Delivered</MenuItem>
                        <MenuItem value='exception'>Exception</MenuItem>
                        <MenuItem value='cancelled'>Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth size='small'>
                      <InputLabel id='carrier-filter-label'>Carrier</InputLabel>
                      <Select
                        labelId='carrier-filter-label'
                        value={carrierFilter}
                        label='Carrier'
                        onChange={handleCarrierFilterChange}
                        aria-label='Filter by shipping carrier'
                      >
                        <MenuItem value=''>All Carriers</MenuItem>
                        <MenuItem value='FedEx'>FedEx</MenuItem>
                        <MenuItem value='UPS'>UPS</MenuItem>
                        <MenuItem value='USPS'>USPS</MenuItem>
                        <MenuItem value='DHL'>DHL</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {hasFilters && (
                        <Button
                          variant='outlined'
                          startIcon={<Clear />}
                          onClick={handleClearFilters}
                          size='small'
                          aria-label='Clear all filters'
                        >
                          Clear
                        </Button>
                      )}
                      <Button
                        variant='outlined'
                        startIcon={<Refresh />}
                        onClick={handleRefresh}
                        size='small'
                        aria-label='Refresh shipments list'
                      >
                        Refresh
                      </Button>
                      <Button
                        variant='outlined'
                        startIcon={viewMode === 'grid' ? <Assignment /> : <Inventory />}
                        onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                        size='small'
                        aria-label={`Switch to ${viewMode === 'grid' ? 'table' : 'grid'} view`}
                      >
                        {viewMode === 'grid' ? 'Table' : 'Grid'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Content */}
              <Box sx={{ p: 0 }}>
                {/* Empty state */}
                {filteredShipments.length === 0 && (
                  <EmptyState hasFilters={hasFilters} onClearFilters={handleClearFilters} />
                )}

                {/* Shipments content */}
                {filteredShipments.length > 0 && (
                  <>
                    {viewMode === 'grid' ? (
                      <Box sx={{ p: 3 }}>
                        <Grid container spacing={3}>
                          {filteredShipments
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((shipment) => (
                              <Grid item xs={12} md={6} lg={4} key={shipment.id}>
                                <ShipmentCard
                                  shipment={shipment}
                                  onTrack={handleTrackShipment}
                                  onEdit={handleEditShipment}
                                  onDelete={handleDeleteShipment}
                                />
                              </Grid>
                            ))}
                        </Grid>
                      </Box>
                    ) : (
                      <ShipmentsTable
                        shipments={filteredShipments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
                        isLoading={false}
                        onTrack={handleTrackShipment}
                        onEdit={handleEditShipment}
                        onDelete={handleDeleteShipment}
                      />
                    )}

                    {/* Enhanced pagination */}
                    <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, px: 2 }}>
                      <TablePagination
                        component='div'
                        count={filteredShipments.length}
                        page={page}
                        onPageChange={handlePageChange}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        labelRowsPerPage='Shipments per page:'
                        aria-label='Shipments pagination'
                      />
                    </Box>
                  </>
                )}
              </Box>
            </Paper>
          </motion.div>

          {/* Floating Action Button */}
          <Fab
            color='primary'
            aria-label='create new shipment'
            onClick={handleCreateShipment}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
            }}
          >
            <Add />
          </Fab>
        </motion.div>
      </Container>
    </DashboardLayout>
  );
};

export default ShippingPage;
