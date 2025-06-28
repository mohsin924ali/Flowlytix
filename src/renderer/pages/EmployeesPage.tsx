/**
 * Employees Management Page - Step 5: Frontend Integration
 *
 * Professional UI for employee management with working functionality.
 * Uses direct service calls following established patterns from AgenciesPage.
 * Implements full CRUD operations with comprehensive validation.
 *
 * @domain Employee Management
 * @architecture Clean Architecture - Presentation Layer
 * @version 1.0.0 - Step 5: Frontend Integration
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
  Delete as DeleteIcon,
  Person as PersonIcon,
  Clear as ClearIcon,
  Work as WorkIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as SalaryIcon,
} from '@mui/icons-material';
import {
  Employee,
  CreateEmployeeParams,
  EmployeeService,
  EmployeeDepartment,
  EmployeeStatus,
} from '../services/EmployeeService';
import { DashboardLayout } from '../components/templates';

/**
 * Employees Page Component - Step 5: Frontend Integration
 *
 * Professional employee management interface following established patterns.
 */
export function EmployeesPage(): JSX.Element {
  const theme = useTheme();

  // State management (simplified and working)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0); // Material-UI uses 0-based indexing
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Filters
  const [searchValue, setSearchValue] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<EmployeeDepartment | ''>('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | ''>('');

  // UI state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState<CreateEmployeeParams>({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    department: EmployeeDepartment.SALES,
    position: '',
    agencyId: 'agency-1', // TODO: Get from current agency context
    status: EmployeeStatus.ACTIVE,
    phoneNumber: '',
    address: '',
    hireDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
  });

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<CreateEmployeeParams>>({});

  /**
   * Load employees from the service
   */
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('👥 Loading employees from EmployeesPage...');
      const result = await EmployeeService.listEmployees({
        page: page + 1, // Convert to 1-based for backend
        pageSize,
        ...(searchValue && { search: searchValue }),
        ...(departmentFilter && { department: departmentFilter }),
        ...(statusFilter && { status: statusFilter }),
      });

      console.log('👥 Employees loaded in EmployeesPage:', result);
      setEmployees(result.employees);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('❌ Failed to load employees in EmployeesPage:', err);
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchValue, departmentFilter, statusFilter]);

  /**
   * Initialize data on component mount
   */
  useEffect(() => {
    console.log('🚀 EmployeesPage mounted, loading employees...');
    loadEmployees();
  }, [loadEmployees]);

  /**
   * Handle search
   */
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
    setPage(0); // Reset to first page
  }, []);

  /**
   * Handle department filter change
   */
  const handleDepartmentFilterChange = useCallback((event: any) => {
    setDepartmentFilter(event.target.value as EmployeeDepartment | '');
    setPage(0); // Reset to first page
  }, []);

  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = useCallback((event: any) => {
    setStatusFilter(event.target.value as EmployeeStatus | '');
    setPage(0); // Reset to first page
  }, []);

  /**
   * Handle clear filters
   */
  const handleClearFilters = useCallback(() => {
    setSearchValue('');
    setDepartmentFilter('');
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
   * Handle create employee form change
   */
  const handleCreateFormChange = useCallback((field: keyof CreateEmployeeParams, value: any) => {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handle edit form change
   */
  const handleEditFormChange = useCallback((field: keyof CreateEmployeeParams, value: any) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handle create employee
   */
  const handleCreateEmployee = useCallback(async () => {
    try {
      setCreating(true);
      setError(null);

      await EmployeeService.createEmployee(createForm);

      // Reset form and close dialog
      setCreateForm({
        employeeId: '',
        firstName: '',
        lastName: '',
        email: '',
        department: EmployeeDepartment.SALES,
        position: '',
        agencyId: 'agency-1',
        status: EmployeeStatus.ACTIVE,
        phoneNumber: '',
        address: '',
        hireDate: new Date().toISOString().split('T')[0],
        salary: undefined,
      });
      setCreateDialogOpen(false);

      // Refresh the list
      await loadEmployees();
    } catch (err) {
      console.error('❌ Failed to create employee:', err);
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    } finally {
      setCreating(false);
    }
  }, [createForm, loadEmployees]);

  /**
   * Handle edit employee
   */
  const handleEditEmployee = useCallback((employee: Employee) => {
    setEditingEmployee(employee);
    setEditForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phoneNumber: employee.phoneNumber,
      address: employee.address,
      department: employee.department,
      position: employee.position,
      salary: employee.salary,
      status: employee.status,
    });
    setEditDialogOpen(true);
  }, []);

  /**
   * Handle update employee
   */
  const handleUpdateEmployee = useCallback(async () => {
    if (!editingEmployee) return;

    try {
      setCreating(true);
      setError(null);

      await EmployeeService.updateEmployee(editingEmployee.id, editForm);

      // Reset form and close dialog
      setEditForm({});
      setEditingEmployee(null);
      setEditDialogOpen(false);

      // Refresh the list
      await loadEmployees();
    } catch (err) {
      console.error('❌ Failed to update employee:', err);
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    } finally {
      setCreating(false);
    }
  }, [editingEmployee, editForm, loadEmployees]);

  /**
   * Handle delete employee confirmation
   */
  const handleDeleteEmployee = useCallback((employee: Employee) => {
    setDeletingEmployee(employee);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Handle confirm delete employee
   */
  const handleConfirmDeleteEmployee = useCallback(async () => {
    if (!deletingEmployee) return;

    try {
      setCreating(true);
      setError(null);

      await EmployeeService.deleteEmployee(deletingEmployee.id);

      // Reset state and close dialog
      setDeletingEmployee(null);
      setDeleteDialogOpen(false);

      // Refresh the list
      await loadEmployees();
    } catch (err) {
      console.error('❌ Failed to delete employee:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete employee');
    } finally {
      setCreating(false);
    }
  }, [deletingEmployee, loadEmployees]);

  /**
   * Format hire date for display
   */
  const formatHireDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  }, []);

  /**
   * Render loading skeleton
   */
  const renderLoadingSkeleton = () => (
    <TableBody>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton variant='text' width='100%' />
          </TableCell>
          <TableCell>
            <Skeleton variant='text' width='100%' />
          </TableCell>
          <TableCell>
            <Skeleton variant='text' width='100%' />
          </TableCell>
          <TableCell>
            <Skeleton variant='text' width='100%' />
          </TableCell>
          <TableCell>
            <Skeleton variant='text' width='100%' />
          </TableCell>
          <TableCell>
            <Skeleton variant='text' width='100%' />
          </TableCell>
          <TableCell>
            <Skeleton variant='text' width='100%' />
          </TableCell>
          <TableCell>
            <Skeleton variant='text' width='100%' />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );

  return (
    <DashboardLayout title='Employees'>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box
          sx={{
            mb: 3,
            p: 3,
            background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
            borderRadius: 2,
            color: 'white',
          }}
        >
          <Typography variant='h4' component='h1' gutterBottom sx={{ color: 'white', fontWeight: 600 }}>
            Employee Management
          </Typography>
          <Typography variant='body1' sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            Manage employees across departments with comprehensive tools
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography color='text.secondary' gutterBottom>
                      Total Employees
                    </Typography>
                    <Typography variant='h5'>{loading ? <Skeleton width={40} /> : totalCount}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <WorkIcon sx={{ mr: 2, color: 'success.main' }} />
                  <Box>
                    <Typography color='text.secondary' gutterBottom>
                      Active Employees
                    </Typography>
                    <Typography variant='h5'>
                      {loading ? (
                        <Skeleton width={40} />
                      ) : (
                        employees.filter((emp) => emp.status === EmployeeStatus.ACTIVE).length
                      )}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BusinessIcon sx={{ mr: 2, color: 'info.main' }} />
                  <Box>
                    <Typography color='text.secondary' gutterBottom>
                      Departments
                    </Typography>
                    <Typography variant='h5'>
                      {loading ? <Skeleton width={40} /> : Object.keys(EmployeeDepartment).length}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SalaryIcon sx={{ mr: 2, color: 'warning.main' }} />
                  <Box>
                    <Typography color='text.secondary' gutterBottom>
                      Avg. Salary
                    </Typography>
                    <Typography variant='h5'>
                      {loading ? (
                        <Skeleton width={40} />
                      ) : (
                        EmployeeService.formatSalary(
                          employees.reduce((sum, emp) => sum + (emp.salary || 0), 0) / employees.length || 0
                        )
                      )}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Controls */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems='center'>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder='Search employees...'
                value={searchValue}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select value={departmentFilter} label='Department' onChange={handleDepartmentFilterChange}>
                  <MenuItem value=''>All Departments</MenuItem>
                  {Object.values(EmployeeDepartment).map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {EmployeeService.getDepartmentDisplay(dept)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label='Status' onChange={handleStatusFilterChange}>
                  <MenuItem value=''>All Statuses</MenuItem>
                  {Object.values(EmployeeStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {EmployeeService.getStatusDisplay(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  startIcon={<ClearIcon />}
                  onClick={handleClearFilters}
                  disabled={!searchValue && !departmentFilter && !statusFilter}
                >
                  Clear Filters
                </Button>
                <Button startIcon={<RefreshIcon />} onClick={loadEmployees} disabled={loading}>
                  Refresh
                </Button>
                <Button variant='contained' startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
                  Add Employee
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Employee Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Hire Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align='right'>Actions</TableCell>
                </TableRow>
              </TableHead>
              {loading ? (
                renderLoadingSkeleton()
              ) : (
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight='medium'>
                          {employee.employeeId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant='body2' fontWeight='medium'>
                              {employee.fullName}
                            </Typography>
                            {employee.phoneNumber && (
                              <Typography variant='caption' color='text.secondary'>
                                {employee.phoneNumber}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <EmailIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                          <Typography variant='body2'>{employee.email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={EmployeeService.getDepartmentDisplay(employee.department)}
                          size='small'
                          variant='outlined'
                          color='primary'
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{employee.position}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                          <Typography variant='body2'>{formatHireDate(employee.hireDate)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={EmployeeService.getStatusDisplay(employee.status)}
                          size='small'
                          color={EmployeeService.getStatusColor(employee.status)}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Tooltip title='Edit Employee'>
                          <IconButton size='small' onClick={() => handleEditEmployee(employee)} disabled={creating}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Delete Employee'>
                          <IconButton
                            size='small'
                            onClick={() => handleDeleteEmployee(employee)}
                            disabled={creating}
                            color='error'
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {employees.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} align='center' sx={{ py: 4 }}>
                        <Typography variant='body2' color='text.secondary'>
                          No employees found. Click "Add Employee" to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              )}
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
            showFirstButton
            showLastButton
          />
        </Paper>

        {/* Create Employee Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth='md' fullWidth>
          <DialogTitle>Create New Employee</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Employee ID'
                  value={createForm.employeeId}
                  onChange={(e) => handleCreateFormChange('employeeId', e.target.value)}
                  placeholder='EMP001'
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={createForm.department}
                    label='Department'
                    onChange={(e) => handleCreateFormChange('department', e.target.value)}
                  >
                    {Object.values(EmployeeDepartment).map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {EmployeeService.getDepartmentDisplay(dept)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='First Name'
                  value={createForm.firstName}
                  onChange={(e) => handleCreateFormChange('firstName', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Last Name'
                  value={createForm.lastName}
                  onChange={(e) => handleCreateFormChange('lastName', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Email'
                  type='email'
                  value={createForm.email}
                  onChange={(e) => handleCreateFormChange('email', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Phone Number'
                  value={createForm.phoneNumber}
                  onChange={(e) => handleCreateFormChange('phoneNumber', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Position'
                  value={createForm.position}
                  onChange={(e) => handleCreateFormChange('position', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Hire Date'
                  type='date'
                  value={createForm.hireDate}
                  onChange={(e) => handleCreateFormChange('hireDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label='Salary'
                  type='number'
                  value={createForm.salary || ''}
                  onChange={(e) =>
                    handleCreateFormChange('salary', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  InputProps={{
                    startAdornment: <InputAdornment position='start'>$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={createForm.status}
                    label='Status'
                    onChange={(e) => handleCreateFormChange('status', e.target.value)}
                  >
                    {Object.values(EmployeeStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {EmployeeService.getStatusDisplay(status)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label='Address'
                  multiline
                  rows={2}
                  value={createForm.address}
                  onChange={(e) => handleCreateFormChange('address', e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateEmployee}
              variant='contained'
              disabled={
                creating ||
                !createForm.employeeId ||
                !createForm.firstName ||
                !createForm.lastName ||
                !createForm.email ||
                !createForm.position
              }
              startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
            >
              {creating ? 'Creating...' : 'Create Employee'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Employee Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth='md' fullWidth>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogContent>
            {editingEmployee && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='First Name'
                    value={editForm.firstName || ''}
                    onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Last Name'
                    value={editForm.lastName || ''}
                    onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Email'
                    type='email'
                    value={editForm.email || ''}
                    onChange={(e) => handleEditFormChange('email', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Phone Number'
                    value={editForm.phoneNumber || ''}
                    onChange={(e) => handleEditFormChange('phoneNumber', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={editForm.department || ''}
                      label='Department'
                      onChange={(e) => handleEditFormChange('department', e.target.value)}
                    >
                      {Object.values(EmployeeDepartment).map((dept) => (
                        <MenuItem key={dept} value={dept}>
                          {EmployeeService.getDepartmentDisplay(dept)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Position'
                    value={editForm.position || ''}
                    onChange={(e) => handleEditFormChange('position', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Salary'
                    type='number'
                    value={editForm.salary || ''}
                    onChange={(e) =>
                      handleEditFormChange('salary', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    InputProps={{
                      startAdornment: <InputAdornment position='start'>$</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={editForm.status || ''}
                      label='Status'
                      onChange={(e) => handleEditFormChange('status', e.target.value)}
                    >
                      {Object.values(EmployeeStatus).map((status) => (
                        <MenuItem key={status} value={status}>
                          {EmployeeService.getStatusDisplay(status)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label='Address'
                    multiline
                    rows={2}
                    value={editForm.address || ''}
                    onChange={(e) => handleEditFormChange('address', e.target.value)}
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateEmployee}
              variant='contained'
              disabled={creating}
              startIcon={creating ? <CircularProgress size={16} /> : <EditIcon />}
            >
              {creating ? 'Updating...' : 'Update Employee'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Employee Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Employee</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the employee "{deletingEmployee?.fullName}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteEmployee}
              variant='contained'
              color='error'
              disabled={creating}
              startIcon={creating ? <CircularProgress size={16} /> : <DeleteIcon />}
            >
              {creating ? 'Deleting...' : 'Delete Employee'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
