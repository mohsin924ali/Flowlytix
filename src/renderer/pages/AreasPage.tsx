/**
 * Areas Management Page - Clean Version
 *
 * Professional UI for area management with working functionality.
 * Uses direct service calls instead of complex hooks to ensure reliability.
 *
 * @domain Area Management
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
  LocationOn as LocationIcon,
  Clear as ClearIcon,
  Map as MapIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/auth.store';
import { DashboardLayout } from '../components/templates';
import { AreaService, Area, CreateAreaRequest } from '../services/AreaService';
import { AreaFormModal } from '../components/molecules/AreaFormModal';

/**
 * Areas Page Component - Clean Version
 */
export function AreasPage(): JSX.Element {
  const theme = useTheme();
  const { user } = useAuthStore();

  // State management (simplified and working)
  const [areas, setAreas] = useState<Area[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0); // Material-UI uses 0-based indexing
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Filters
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<Area['status'] | ''>('');

  // UI state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState<CreateAreaRequest>({
    agencyId: user?.agencyId || '',
    areaCode: '',
    areaName: '',
    description: '',
    createdBy: user?.id || '',
  });

  /**
   * Load areas from the service
   */
  const loadAreas = useCallback(async () => {
    if (!user?.agencyId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🗺️ AreasPage: Starting to load areas...');
      console.log('🗺️ AreasPage: Current filters:', { searchValue, statusFilter, page, pageSize });

      const result = await AreaService.getAreas({
        agencyId: user.agencyId,
        page: page + 1, // Convert to 1-based for backend
        limit: pageSize,
        includeInactive: true,
        ...(searchValue && { searchText: searchValue }),
        ...(statusFilter && { status: statusFilter }),
        sortBy: 'areaCode',
        sortDirection: 'asc',
      });

      console.log('🗺️ AreasPage: Areas loaded successfully:', result);
      console.log('🗺️ AreasPage: Number of areas received:', result.areas.length);
      console.log('🗺️ AreasPage: Total count:', result.totalCount);

      setAreas(result.areas);
      setTotalCount(result.totalCount);

      if (result.areas.length > 0) {
        console.log('🗺️ AreasPage: Sample area data:', result.areas[0]);
      } else {
        console.warn('⚠️ AreasPage: No areas returned from service');
      }
    } catch (err) {
      console.error('❌ AreasPage: Failed to load areas:', err);
      console.error('❌ AreasPage: Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });
      setError(err instanceof Error ? err.message : 'Failed to load areas');
    } finally {
      setLoading(false);
    }
  }, [user?.agencyId, page, pageSize, searchValue, statusFilter]);

  /**
   * Update createForm when user data becomes available
   */
  useEffect(() => {
    if (user?.agencyId && user?.id) {
      setCreateForm((prev) => ({
        ...prev,
        agencyId: user.agencyId!,
        createdBy: user.id!,
      }));
    }
  }, [user?.agencyId, user?.id]);

  /**
   * Initialize data on component mount
   */
  useEffect(() => {
    console.log('🚀 AreasPage mounted, loading areas...');
    loadAreas();
  }, [loadAreas]);

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
    setStatusFilter(event.target.value as Area['status'] | '');
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
   * Handle edit area
   */
  const handleEditArea = useCallback(async (area: Area) => {
    try {
      console.log('📝 AreasPage: Edit requested for area:', area.id);
      setEditingArea(area);
      setEditModalOpen(true);
    } catch (error) {
      console.error('❌ AreasPage: Error setting up edit:', error);
    }
  }, []);

  /**
   * Handle area update
   */
  const handleAreaUpdate = useCallback(
    async (updatedArea: Area) => {
      try {
        console.log('🔄 AreasPage: Area updated successfully:', updatedArea.id);
        await loadAreas();
        setEditModalOpen(false);
        setEditingArea(null);
      } catch (error) {
        console.error('❌ AreasPage: Failed to update area:', error);
        throw error;
      }
    },
    [loadAreas]
  );

  /**
   * Handle create form change
   */
  const handleCreateFormChange = useCallback(
    (field: keyof CreateAreaRequest) => (event: React.ChangeEvent<HTMLInputElement>) => {
      let value = event.target.value;

      // Format area code to uppercase
      if (field === 'areaCode') {
        value = value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      }

      setCreateForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  /**
   * Handle create area
   */
  const handleCreateArea = useCallback(async () => {
    try {
      setCreating(true);
      setError(null);

      // Debug logging
      console.log('🗺️ AreasPage: Creating area with form data:', createForm);
      console.log('🗺️ AreasPage: User object:', user);
      console.log('🗺️ AreasPage: User agencyId:', user?.agencyId);

      // Client-side validation
      if (!user?.agencyId) {
        throw new Error('User agency information not available. Please refresh the page.');
      }

      if (!user?.id) {
        throw new Error('User information not available. Please refresh the page.');
      }

      if (!createForm.areaCode?.trim()) {
        throw new Error('Area code is required');
      }

      if (!createForm.areaName?.trim()) {
        throw new Error('Area name is required');
      }

      if (createForm.areaCode.trim().length < 2 || createForm.areaCode.trim().length > 20) {
        throw new Error('Area code must be between 2 and 20 characters');
      }

      if (!/^[A-Z0-9_-]+$/.test(createForm.areaCode.trim())) {
        throw new Error('Area code can only contain uppercase letters, numbers, underscore, or dash');
      }

      // Ensure we have the current agency ID
      const formDataWithAgency = {
        ...createForm,
        agencyId: user.agencyId,
        createdBy: user.id,
        areaCode: createForm.areaCode.trim(),
        areaName: createForm.areaName.trim(),
        description: createForm.description?.trim() || '',
      };

      console.log('🗺️ AreasPage: Final form data:', formDataWithAgency);

      await AreaService.createArea(formDataWithAgency);

      setCreateDialogOpen(false);
      setCreateForm({
        agencyId: user.agencyId,
        areaCode: '',
        areaName: '',
        description: '',
        createdBy: user.id,
      });
      await loadAreas();

      console.log('✅ AreasPage: Area created successfully');
    } catch (err) {
      console.error('❌ AreasPage: Create area error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create area');
    } finally {
      setCreating(false);
    }
  }, [createForm, loadAreas, user?.agencyId, user?.id]);

  /**
   * Get status color
   */
  const getStatusColor = useCallback(
    (status: Area['status']) => {
      switch (status) {
        case 'ACTIVE':
          return theme.palette.success.main;
        case 'INACTIVE':
          return theme.palette.warning.main;
        default:
          return theme.palette.grey[500];
      }
    },
    [theme]
  );

  return (
    <DashboardLayout title='Areas'>
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <MapIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
              <Box>
                <Typography variant='h4' component='h1' sx={{ fontWeight: 600 }}>
                  Area Management
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Manage delivery areas and their geographic boundaries
                </Typography>
              </Box>
            </Box>
            <Button
              variant='contained'
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #388E3C 0%, #4CAF50 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              Add Area
            </Button>
          </Box>

          {/* Filters */}
          <Card sx={{ mb: 3, bgcolor: alpha(theme.palette.success.main, 0.02) }}>
            <CardContent>
              <Grid container spacing={2} alignItems='center'>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder='Search areas...'
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
                      <MenuItem value='ACTIVE'>Active</MenuItem>
                      <MenuItem value='INACTIVE'>Inactive</MenuItem>
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
                    onClick={loadAreas}
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

          {/* Areas Table */}
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Area Code</TableCell>
                  <TableCell>Area Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Coordinates</TableCell>
                  <TableCell>Status</TableCell>
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
                        <Skeleton width='70%' />
                      </TableCell>
                      <TableCell>
                        <Skeleton width='50%' />
                      </TableCell>
                      <TableCell>
                        <Skeleton width='40%' />
                      </TableCell>
                      <TableCell>
                        <Skeleton width='30%' />
                      </TableCell>
                    </TableRow>
                  ))
                ) : areas.length > 0 ? (
                  areas.map((area) => (
                    <TableRow key={area.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CodeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                          <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                            {area.areaCode}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{area.areaName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {area.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {area.latitude && area.longitude ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LocationIcon sx={{ fontSize: 14, mr: 0.5, color: 'success.main' }} />
                            <Typography variant='caption' color='text.secondary'>
                              {area.latitude.toFixed(4)}, {area.longitude.toFixed(4)}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant='caption' color='text.secondary'>
                            No coordinates
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={area.status}
                          size='small'
                          sx={{
                            backgroundColor: alpha(getStatusColor(area.status), 0.1),
                            color: getStatusColor(area.status),
                            border: `1px solid ${alpha(getStatusColor(area.status), 0.3)}`,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Tooltip title='Edit Area'>
                          <IconButton
                            size='small'
                            onClick={() => handleEditArea(area)}
                            sx={{
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.success.main, 0.1),
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
                    <TableCell colSpan={6} align='center' sx={{ py: 4 }}>
                      <Typography variant='body1' color='text.secondary'>
                        No areas found
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

          {/* Create Area Dialog */}
          <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth='md' fullWidth>
            <DialogTitle>Create New Area</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Area Code'
                    value={createForm.areaCode}
                    onChange={handleCreateFormChange('areaCode')}
                    required
                    helperText='2-20 characters, uppercase letters, numbers, underscore, or dash'
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Area Name'
                    value={createForm.areaName}
                    onChange={handleCreateFormChange('areaName')}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label='Description'
                    value={createForm.description}
                    onChange={handleCreateFormChange('description')}
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreateArea}
                variant='contained'
                disabled={creating || !createForm.areaCode || !createForm.areaName}
                startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
              >
                {creating ? 'Creating...' : 'Create Area'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit Area Modal */}
          {editingArea && (
            <AreaFormModal
              isOpen={editModalOpen}
              onClose={() => {
                setEditModalOpen(false);
                setEditingArea(null);
              }}
              onSuccess={handleAreaUpdate}
              area={editingArea}
              agencyId={user?.agencyId || ''}
              currentUserId={user?.id || ''}
            />
          )}
        </Paper>
      </Box>
    </DashboardLayout>
  );
}
