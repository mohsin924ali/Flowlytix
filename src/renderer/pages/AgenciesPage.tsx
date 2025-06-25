/**
 * Agencies Management Page
 *
 * Professional UI for agency management with comprehensive functionality.
 * Features filtering, search, pagination, creation, and status management.
 * Follows Material-UI design patterns and accessibility best practices.
 *
 * @domain Agency Management
 * @architecture Clean Architecture - Presentation Layer
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
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
  Divider,
  CircularProgress,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Storage as DatabaseIcon,
} from '@mui/icons-material';
import { useAgencies } from '../hooks/useAgencies';
import { Agency, CreateAgencyParams, AgencyService } from '../services/AgencyService';

/**
 * Agencies Page Component
 *
 * Main page component for agency management with full CRUD operations,
 * filtering, search, and professional UI design.
 */
export function AgenciesPage(): JSX.Element {
  // Hook for agency management
  const {
    agencies,
    totalCount,
    page,
    pageSize,
    loading,
    error,
    creating,
    updating,
    hasMore,
    isEmpty,
    isFiltered,
    loadAgencies,
    createAgency,
    updateAgency,
    refreshAgencies,
    clearError,
    setPage,
    setPageSize,
    setSearch,
    setStatusFilter,
  } = useAgencies({
    autoLoad: true,
    initialPageSize: 25,
  });

  // Local state for UI
  const [searchValue, setSearchValue] = useState('');
  const [statusFilterValue, setStatusFilterValue] = useState<Agency['status'] | ''>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);

  // Create agency form state
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
   * Handle search input change
   */
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchValue(value);
      setSearch(value);
    },
    [setSearch]
  );

  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = useCallback(
    (event: any) => {
      const value = event.target.value as Agency['status'] | '';
      setStatusFilterValue(value);
      setStatusFilter(value || undefined);
    },
    [setStatusFilter]
  );

  /**
   * Handle clear filters
   */
  const handleClearFilters = useCallback(() => {
    setSearchValue('');
    setStatusFilterValue('');
    setSearch('');
    setStatusFilter(undefined);
  }, [setSearch, setStatusFilter]);

  /**
   * Handle page change
   */
  const handlePageChange = useCallback(
    (_: unknown, newPage: number) => {
      setPage(newPage + 1); // Material-UI uses 0-based indexing
    },
    [setPage]
  );

  /**
   * Handle page size change
   */
  const handlePageSizeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPageSize(parseInt(event.target.value, 10));
    },
    [setPageSize]
  );

  /**
   * Handle create agency form change
   */
  const handleCreateFormChange = useCallback(
    (field: keyof CreateAgencyParams) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        event.target.type === 'checkbox'
          ? event.target.checked
          : event.target.type === 'number'
            ? parseFloat(event.target.value)
            : event.target.value;
      setCreateForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  /**
   * Handle create agency submit
   */
  const handleCreateSubmit = useCallback(async () => {
    try {
      await createAgency(createForm);
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
    } catch (error) {
      // Error is handled by the hook
    }
  }, [createAgency, createForm]);

  /**
   * Get status chip color
   */
  const getStatusColor = useCallback((status: Agency['status']) => {
    return AgencyService.getStatusColor(status);
  }, []);

  /**
   * Format date for display
   */
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  /**
   * Render loading skeleton
   */
  const renderLoadingSkeleton = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Agency Name</TableCell>
            <TableCell>Contact Person</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Database</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton variant='text' width='80%' />
              </TableCell>
              <TableCell>
                <Skeleton variant='text' width='60%' />
              </TableCell>
              <TableCell>
                <Skeleton variant='rectangular' width={80} height={24} />
              </TableCell>
              <TableCell>
                <Skeleton variant='text' width='40%' />
              </TableCell>
              <TableCell>
                <Skeleton variant='text' width='50%' />
              </TableCell>
              <TableCell>
                <Skeleton variant='rectangular' width={40} height={40} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 8 }}>
        <BusinessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant='h6' color='text.secondary' gutterBottom>
          {isFiltered ? 'No agencies match your filters' : 'No agencies found'}
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          {isFiltered ? 'Try adjusting your search criteria or filters' : 'Get started by creating your first agency'}
        </Typography>
        {isFiltered ? (
          <Button variant='outlined' onClick={handleClearFilters}>
            Clear Filters
          </Button>
        ) : (
          <Button variant='contained' startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            Create First Agency
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant='h4' component='h1' gutterBottom>
          Agency Management
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          Manage distribution agencies and their dedicated databases
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Fade in={!!error}>
          <Alert severity='error' onClose={clearError} sx={{ mb: 3 }}>
            {error}
          </Alert>
        </Fade>
      )}

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems='center'>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              variant='outlined'
              placeholder='Search agencies...'
              value={searchValue}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status Filter</InputLabel>
              <Select value={statusFilterValue} onChange={handleStatusFilterChange} label='Status Filter'>
                <MenuItem value=''>All Statuses</MenuItem>
                <MenuItem value='active'>Active</MenuItem>
                <MenuItem value='inactive'>Inactive</MenuItem>
                <MenuItem value='suspended'>Suspended</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={12} md={5}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Tooltip title='Clear Filters'>
                <IconButton onClick={handleClearFilters} disabled={!isFiltered}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title='Refresh'>
                <IconButton onClick={refreshAgencies} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Button
                variant='contained'
                startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                disabled={creating}
              >
                Create Agency
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Content */}
      {loading && agencies.length === 0 ? (
        renderLoadingSkeleton()
      ) : isEmpty ? (
        renderEmptyState()
      ) : (
        <Zoom in={!loading}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Agency Name</TableCell>
                  <TableCell>Contact Person</TableCell>
                  <TableCell>Contact Info</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Database</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align='center'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {agencies.map((agency) => (
                  <TableRow key={agency.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant='subtitle2' fontWeight='medium'>
                          {agency.name}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant='body2'>{agency.contactPerson || '—'}</Typography>
                    </TableCell>

                    <TableCell>
                      <Box>
                        {agency.email && (
                          <Typography variant='body2' color='text.secondary'>
                            {agency.email}
                          </Typography>
                        )}
                        {agency.phone && (
                          <Typography variant='body2' color='text.secondary'>
                            {agency.phone}
                          </Typography>
                        )}
                        {!agency.email && !agency.phone && (
                          <Typography variant='body2' color='text.secondary'>
                            —
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={AgencyService.getStatusDisplay(agency.status)}
                        color={getStatusColor(agency.status)}
                        size='small'
                      />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DatabaseIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                        <Typography variant='body2' color='text.secondary'>
                          {agency.databasePath.split('/').pop()?.replace('.db', '') || 'Unknown'}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {formatDate(agency.createdAt)}
                      </Typography>
                    </TableCell>

                    <TableCell align='center'>
                      <Tooltip title='Edit Agency'>
                        <IconButton size='small' onClick={() => setEditingAgency(agency)} disabled={updating}>
                          <EditIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TablePagination
              component='div'
              count={totalCount}
              page={page - 1} // Material-UI uses 0-based indexing
              onPageChange={handlePageChange}
              rowsPerPage={pageSize}
              onRowsPerPageChange={handlePageSizeChange}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </TableContainer>
        </Zoom>
      )}

      {/* Create Agency Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>Create New Agency</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Agency Name *'
                value={createForm.name}
                onChange={handleCreateFormChange('name')}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Contact Person'
                value={createForm.contactPerson}
                onChange={handleCreateFormChange('contactPerson')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Email'
                type='email'
                value={createForm.email}
                onChange={handleCreateFormChange('email')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth label='Phone' value={createForm.phone} onChange={handleCreateFormChange('phone')} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Address'
                multiline
                rows={2}
                value={createForm.address}
                onChange={handleCreateFormChange('address')}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant='h6' gutterBottom>
                Business Settings
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Default Credit Days'
                type='number'
                value={createForm.defaultCreditDays}
                onChange={handleCreateFormChange('defaultCreditDays')}
                inputProps={{ min: 1, max: 365 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Max Credit Limit'
                type='number'
                value={createForm.maxCreditLimit}
                onChange={handleCreateFormChange('maxCreditLimit')}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='Tax Rate (%)'
                type='number'
                value={(createForm.taxRate || 0) * 100}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    taxRate: parseFloat(e.target.value) / 100,
                  }))
                }
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={createForm.currency}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      currency: e.target.value,
                    }))
                  }
                  label='Currency'
                >
                  <MenuItem value='USD'>USD</MenuItem>
                  <MenuItem value='EUR'>EUR</MenuItem>
                  <MenuItem value='GBP'>GBP</MenuItem>
                  <MenuItem value='CAD'>CAD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant='contained'
            disabled={creating || !createForm.name.trim()}
            startIcon={creating ? <CircularProgress size={16} /> : undefined}
          >
            {creating ? 'Creating...' : 'Create Agency'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
