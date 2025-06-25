/**
 * Agencies Management Page - Working Version
 *
 * Professional UI for agency management with working functionality.
 * Uses direct service calls instead of complex hooks to ensure reliability.
 *
 * @domain Agency Management
 * @architecture Clean Architecture - Presentation Layer
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
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
} from '@mui/icons-material';
import { Agency, CreateAgencyParams, AgencyService } from '../services/AgencyService';
import { AgencyEditModal } from '../components/molecules/AgencyEditModal';

/**
 * Agencies Page Component - Working Version
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

      console.log('🏢 Loading agencies from AgenciesPage...');
      const result = await AgencyService.listAgencies({
        page: page + 1, // Convert to 1-based for backend
        pageSize,
        ...(searchValue && { search: searchValue }),
        ...(statusFilter && { status: statusFilter }),
      });

      console.log('🏢 Agencies loaded in AgenciesPage:', result);
      setAgencies(result.agencies);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('❌ Failed to load agencies in AgenciesPage:', err);
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
   * Handle edit agency
   */
  const handleEditAgency = useCallback((agency: Agency) => {
    setEditingAgency(agency);
    setEditModalOpen(true);
  }, []);

  /**
   * Handle agency update
   */
  const handleAgencyUpdate = useCallback(
    async (agencyId: string, formData: any) => {
      try {
        await AgencyService.updateAgency(agencyId, {
          name: formData.name,
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
        });

        // Refresh the list
        await loadAgencies();
        setEditModalOpen(false);
        setEditingAgency(null);
      } catch (error) {
        console.error('Failed to update agency:', error);
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
      await AgencyService.createAgency(createForm);
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
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BusinessIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant='h4' component='h1' sx={{ fontWeight: 600 }}>
                Agency Management
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Manage distribution agencies and their settings
              </Typography>
            </Box>
          </Box>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
              },
            }}
          >
            Add Agency
          </Button>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
          <CardContent>
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
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} label='Status' onChange={handleStatusFilterChange}>
                    <MenuItem value=''>All Statuses</MenuItem>
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
                >
                  Clear Filters
                </Button>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant='outlined'
                  startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                  onClick={loadAgencies}
                  disabled={loading}
                  fullWidth
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Agencies Table */}
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Agency</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Database</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                // Loading skeletons
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton width='60%' />
                    </TableCell>
                    <TableCell>
                      <Skeleton width='80%' />
                    </TableCell>
                    <TableCell>
                      <Skeleton width='40%' />
                    </TableCell>
                    <TableCell>
                      <Skeleton width='70%' />
                    </TableCell>
                    <TableCell>
                      <Skeleton width='30%' />
                    </TableCell>
                  </TableRow>
                ))
              ) : agencies.length > 0 ? (
                agencies.map((agency) => (
                  <TableRow key={agency.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                          {agency.name}
                        </Typography>
                        {agency.address && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <LocationIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant='caption' color='text.secondary'>
                              {agency.address}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {agency.contactPerson && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <PersonIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant='body2'>{agency.contactPerson}</Typography>
                          </Box>
                        )}
                        {agency.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <EmailIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant='caption' color='text.secondary'>
                              {agency.email}
                            </Typography>
                          </Box>
                        )}
                        {agency.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PhoneIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant='caption' color='text.secondary'>
                              {agency.phone}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={agency.status.charAt(0).toUpperCase() + agency.status.slice(1)}
                        size='small'
                        sx={{
                          backgroundColor: alpha(getStatusColor(agency.status), 0.1),
                          color: getStatusColor(agency.status),
                          border: `1px solid ${alpha(getStatusColor(agency.status), 0.3)}`,
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DatabaseIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant='caption' color='text.secondary'>
                          {agency.databasePath?.split('/').pop() || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align='right'>
                      <Tooltip title='Edit Agency'>
                        <IconButton
                          size='small'
                          onClick={() => handleEditAgency(agency)}
                          sx={{
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            },
                          }}
                        >
                          <EditIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align='center' sx={{ py: 4 }}>
                    <Typography variant='body1' color='text.secondary'>
                      No agencies found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
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
        />

        {/* Create Agency Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth='md' fullWidth>
          <DialogTitle>Create New Agency</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Agency Name'
                  value={createForm.name}
                  onChange={handleCreateFormChange('name')}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Contact Person'
                  value={createForm.contactPerson}
                  onChange={handleCreateFormChange('contactPerson')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Email'
                  type='email'
                  value={createForm.email}
                  onChange={handleCreateFormChange('email')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Phone'
                  value={createForm.phone}
                  onChange={handleCreateFormChange('phone')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label='Address'
                  value={createForm.address}
                  onChange={handleCreateFormChange('address')}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateAgency}
              variant='contained'
              disabled={creating || !createForm.name}
              startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
            >
              {creating ? 'Creating...' : 'Create Agency'}
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
      </Paper>
    </Box>
  );
}
