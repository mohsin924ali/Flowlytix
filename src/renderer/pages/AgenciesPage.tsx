/**
 * Agencies Management Page - Working Version
 *
 * Professional UI for agency management with working functionality.
 * Uses direct service calls instead of complex hooks to ensure reliability.
 * Following Instructions file standards with consistent design patterns.
 *
 * @domain Agency Management
 * @architecture Clean Architecture - Presentation Layer
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  useTheme,
  alpha,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  Clear as ClearIcon,
  Storage as DatabaseIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Agency, CreateAgencyParams, UpdateAgencyParams } from '../services/AgencyService';
import { MockAgencyService } from '../mocks/services/MockAgencyService';
import { AgencyEditModal } from '../components/molecules/AgencyEditModal';
import { DashboardLayout } from '../components/templates';

/**
 * Standard animation variants following Instructions file standards
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
 * Status chip component with consistent design
 */
const StatusChip: React.FC<{ status: Agency['status'] }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return { color: 'success' as const, label: 'Active' };
      case 'inactive':
        return { color: 'warning' as const, label: 'Inactive' };
      case 'suspended':
        return { color: 'error' as const, label: 'Suspended' };
      default:
        return { color: 'default' as const, label: status };
    }
  };

  const { color, label } = getStatusConfig();
  return <Chip label={label} color={color} size='small' sx={{ textTransform: 'capitalize' }} />;
};

/**
 * Agencies Page Component - Following Standards
 */
export function AgenciesPage(): JSX.Element {
  const theme = useTheme();

  // State management (simplified and working)
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0); // Material-UI uses 0-based indexing
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Filters
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<Agency['status'] | ''>('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // UI state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState<CreateAgencyParams>({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    allowCreditSales: true,
    defaultCreditDays: 30,
    maxCreditLimit: 50000,
    requireApprovalForOrders: false,
    enableInventoryTracking: true,
    taxRate: 0.15,
    currency: 'USD',
  });

  /**
   * Load agencies from the service
   */
  const loadAgencies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏢 AgenciesPage: Starting to load agencies...');
      console.log('🏢 AgenciesPage: Current filters:', { searchValue, statusFilter, page, pageSize });

      const result = await MockAgencyService.listAgencies({
        page: page + 1, // Convert to 1-based for backend
        pageSize,
        ...(searchValue && { search: searchValue }),
        ...(statusFilter && { status: statusFilter }),
      });

      console.log('🏢 AgenciesPage: Agencies loaded successfully:', result);
      console.log('🏢 AgenciesPage: Number of agencies received:', result.agencies.length);
      console.log('🏢 AgenciesPage: Total count:', result.totalCount);

      setAgencies(result.agencies);
      setTotalCount(result.totalCount);

      if (result.agencies.length > 0) {
        console.log('🏢 AgenciesPage: Sample agency data:', result.agencies[0]);
      } else {
        console.warn('⚠️ AgenciesPage: No agencies returned from service');
      }
    } catch (err) {
      console.error('❌ AgenciesPage: Failed to load agencies:', err);
      console.error('❌ AgenciesPage: Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });
      setError(err instanceof Error ? err.message : 'Failed to load agencies');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchValue, statusFilter]);

  /**
   * Initialize data on component mount
   */
  useEffect(() => {
    console.log('🚀 AgenciesPage mounted, loading agencies...');
    loadAgencies();
  }, [loadAgencies]);

  /**
   * Handle search
   */
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
    setPage(0); // Reset to first page
  }, []);

  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = useCallback((event: any) => {
    setStatusFilter(event.target.value as Agency['status'] | '');
    setPage(0); // Reset to first page
  }, []);

  /**
   * Handle clear filters
   */
  const handleClearFilters = useCallback(() => {
    setSearchValue('');
    setStatusFilter('');
    setPage(0);
  }, []);

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  /**
   * Handle page size change
   */
  const handlePageSizeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  /**
   * Handle edit agency - force fresh data reload
   */
  const handleEditAgency = useCallback(
    async (agency: Agency) => {
      try {
        // Force reload fresh data from backend to get complete settings
        await loadAgencies();

        // Use React's state update mechanism instead of setTimeout
        // This prevents memory leaks and is more React-appropriate
        const freshAgency = agencies.find((a) => a.id === agency.id);
        if (freshAgency) {
          setEditingAgency(freshAgency);
        } else {
          setEditingAgency(agency);
        }
        setEditModalOpen(true);
      } catch (error) {
        console.error('❌ AgenciesPage: Error reloading data for edit:', error);
        // Fallback to using the passed agency if reload fails
        setEditingAgency(agency);
        setEditModalOpen(true);
      }
    },
    [agencies, loadAgencies]
  );

  /**
   * Handle comprehensive agency update with settings
   */
  const handleAgencyUpdate = useCallback(
    async (agencyId: string, formData: any) => {
      try {
        console.log('🔄 AgenciesPage: Handling comprehensive agency update for:', agencyId);
        console.log('📝 AgenciesPage: Update data received:', formData);

        // Build comprehensive update object
        const updateData: UpdateAgencyParams = {
          // Basic Information
          name: formData.name,
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          status: formData.status,

          // Comprehensive Settings (if provided)
          ...(formData.settings && { settings: formData.settings }),
        };

        console.log('📤 AgenciesPage: Sending comprehensive update to service:', updateData);

        await MockAgencyService.updateAgency(agencyId, updateData);

        console.log('✅ AgenciesPage: Agency updated successfully');

        // Refresh the list to show updated data
        await loadAgencies();
        setEditModalOpen(false);
        setEditingAgency(null);
      } catch (error) {
        console.error('❌ AgenciesPage: Failed to update agency:', error);
        throw error;
      }
    },
    [loadAgencies]
  );

  /**
   * Handle create agency form change
   */
  const handleCreateFormChange = useCallback(
    (field: keyof CreateAgencyParams) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
      setCreateForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  /**
   * Handle create agency
   */
  const handleCreateAgency = useCallback(async () => {
    try {
      setCreating(true);
      await MockAgencyService.createAgency(createForm);
      setCreateDialogOpen(false);
      setCreateForm({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        allowCreditSales: true,
        defaultCreditDays: 30,
        maxCreditLimit: 50000,
        requireApprovalForOrders: false,
        enableInventoryTracking: true,
        taxRate: 0.15,
        currency: 'USD',
      });
      await loadAgencies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agency');
    } finally {
      setCreating(false);
    }
  }, [createForm, loadAgencies]);

  /**
   * Get status color
   */
  const getStatusColor = useCallback(
    (status: Agency['status']) => {
      switch (status) {
        case 'active':
          return theme.palette.success.main;
        case 'inactive':
          return theme.palette.warning.main;
        case 'suspended':
          return theme.palette.error.main;
        default:
          return theme.palette.grey[500];
      }
    },
    [theme]
  );

  return (
    <DashboardLayout>
      <Container maxWidth='xl' sx={{ py: 3 }}>
        <motion.div variants={containerVariants} initial='hidden' animate='visible'>
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4 }}>
              <Typography variant='h4' fontWeight='600' color='text.primary' gutterBottom>
                Agencies Management
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                Manage distribution agencies and their settings
              </Typography>
            </Box>
          </motion.div>

          {/* Main Content */}
          <motion.div variants={itemVariants}>
            <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              {/* Filters */}
              <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2} alignItems='center'>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      placeholder='Search agencies...'
                      value={searchValue}
                      onChange={handleSearchChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start'>
                            <SearchIcon color='action' />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2 },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={statusFilter}
                        label='Status'
                        onChange={handleStatusFilterChange}
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value=''>All Status</MenuItem>
                        <MenuItem value='active'>Active</MenuItem>
                        <MenuItem value='inactive'>Inactive</MenuItem>
                        <MenuItem value='suspended'>Suspended</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      variant='outlined'
                      startIcon={<ClearIcon />}
                      onClick={handleClearFilters}
                      disabled={!searchValue && !statusFilter}
                      sx={{ borderRadius: 2, height: 56 }}
                    >
                      Clear Filters
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Button
                      variant='outlined'
                      startIcon={<RefreshIcon />}
                      onClick={loadAgencies}
                      disabled={loading}
                      sx={{ borderRadius: 2, height: 56 }}
                    >
                      Refresh
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {/* Error Display */}
              {error && (
                <Alert severity='error' sx={{ m: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Content */}
              <Box sx={{ p: 3 }}>
                {loading ? (
                  <Box sx={{ width: '100%' }}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Skeleton variant='rectangular' height={60} sx={{ borderRadius: 1 }} />
                      </Box>
                    ))}
                  </Box>
                ) : agencies.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 8,
                      textAlign: 'center',
                    }}
                  >
                    <BusinessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant='h6' color='text.secondary' gutterBottom>
                      No Agencies Found
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                      {searchValue || statusFilter
                        ? 'Try adjusting your search filters'
                        : 'Start by creating your first agency'}
                    </Typography>
                    <Button
                      variant='contained'
                      startIcon={<AddIcon />}
                      onClick={() => setCreateDialogOpen(true)}
                      sx={{ borderRadius: 2 }}
                    >
                      Create Agency
                    </Button>
                  </Box>
                ) : (
                  <>
                    {/* Agencies Table */}
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                    >
                      <Table>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                            <TableCell sx={{ fontWeight: 600 }}>Agency</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Contact Person</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Contact Info</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Settings</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {agencies.map((agency) => (
                            <TableRow
                              key={agency.id}
                              component={motion.tr}
                              variants={itemVariants}
                              initial='hidden'
                              animate='visible'
                              hover
                              sx={{
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.02),
                                },
                              }}
                            >
                              <TableCell>
                                <Box>
                                  <Typography variant='subtitle2' fontWeight='600'>
                                    {agency.name}
                                  </Typography>
                                  <Typography variant='body2' color='text.secondary'>
                                    ID: {agency.id}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <PersonIcon fontSize='small' color='action' />
                                  <Typography variant='body2'>{agency.contactPerson}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PhoneIcon fontSize='small' color='action' />
                                    <Typography variant='body2'>{agency.phone}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <EmailIcon fontSize='small' color='action' />
                                    <Typography variant='body2'>{agency.email}</Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <StatusChip status={agency.status} />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Chip
                                    label={agency.settings?.allowCreditSales ? 'Credit Sales' : 'No Credit'}
                                    size='small'
                                    variant='outlined'
                                    color={agency.settings?.allowCreditSales ? 'success' : 'default'}
                                  />
                                  <Chip
                                    label={
                                      agency.settings?.enableInventoryTracking ? 'Inventory Tracking' : 'No Tracking'
                                    }
                                    size='small'
                                    variant='outlined'
                                    color={agency.settings?.enableInventoryTracking ? 'info' : 'default'}
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Tooltip title='Edit Agency'>
                                  <IconButton
                                    size='small'
                                    onClick={() => handleEditAgency(agency)}
                                    sx={{
                                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                      '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                      },
                                    }}
                                  >
                                    <EditIcon fontSize='small' />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Pagination */}
                    <TablePagination
                      component='div'
                      count={totalCount}
                      page={page}
                      onPageChange={handlePageChange}
                      rowsPerPage={pageSize}
                      onRowsPerPageChange={handlePageSizeChange}
                      rowsPerPageOptions={[10, 25, 50, 100]}
                      sx={{
                        mt: 2,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        pt: 2,
                      }}
                    />
                  </>
                )}
              </Box>
            </Paper>
          </motion.div>

          {/* Floating Action Button */}
          <Fab
            color='primary'
            aria-label='add agency'
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              boxShadow: theme.shadows[8],
            }}
          >
            <AddIcon />
          </Fab>

          {/* Create Agency Dialog */}
          <Dialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            maxWidth='md'
            fullWidth
            PaperProps={{
              sx: { borderRadius: 2 },
            }}
          >
            <DialogTitle>
              <Typography variant='h6' fontWeight='600'>
                Create New Agency
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Agency Name'
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Contact Person'
                    value={createForm.contactPerson}
                    onChange={(e) => setCreateForm({ ...createForm, contactPerson: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Phone'
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Email'
                    type='email'
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label='Address'
                    multiline
                    rows={3}
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    required
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3, gap: 1 }}>
              <Button onClick={() => setCreateDialogOpen(false)} variant='outlined' sx={{ borderRadius: 2 }}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateAgency}
                variant='contained'
                disabled={creating || !createForm.name || !createForm.contactPerson}
                sx={{ borderRadius: 2 }}
              >
                {creating ? <CircularProgress size={20} /> : 'Create Agency'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit Agency Modal */}
          <AgencyEditModal
            open={editModalOpen}
            agency={editingAgency}
            onClose={() => {
              setEditModalOpen(false);
              setEditingAgency(null);
            }}
            onSubmit={handleAgencyUpdate}
          />
        </motion.div>
      </Container>
    </DashboardLayout>
  );
}
