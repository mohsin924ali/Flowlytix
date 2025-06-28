/**
 * Users Page Component
 *
 * User management interface with listing, filtering, and pagination.
 * Follows atomic design principles with proper error handling and loading states.
 *
 * Business Rules:
 * - Only authenticated users with proper permissions can access
 * - Implements pagination for performance
 * - Provides search and filtering capabilities
 * - Responsive design for all devices
 *
 * @domain User Management
 * @pattern Page Component
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  IconButton,
  Tooltip,
  Button,
  Fab,
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { UserCreateModal, type UserCreateFormData } from '../components/molecules';
import { UserEditModal } from '../components/molecules/UserEditModal/UserEditModal';
import { useUsers } from '../hooks/useUsers';
import type { UserListItem } from '../services/UsersService';

/**
 * Animation variants
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

/**
 * Get status chip color
 */
const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'warning';
    case 'suspended':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * Get role chip color - updated for simplified role system
 */
const getRoleColor = (role: string): 'primary' | 'secondary' | 'default' => {
  switch (role.toLowerCase()) {
    case 'super_admin':
      return 'primary';
    case 'admin':
      return 'secondary';
    default:
      return 'default';
  }
};

/**
 * Get role display name - updated for simplified role system
 */
const getRoleDisplayName = (role: string): string => {
  switch (role.toLowerCase()) {
    case 'super_admin':
      return 'Super Administrator';
    case 'admin':
      return 'Agency Administrator';
    default:
      return role;
  }
};

/**
 * Format date for display
 */
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Users table component
 */
const UsersTable: React.FC<{
  users: readonly UserListItem[];
  isLoading: boolean;
  onEditUser: (userId: string) => void;
}> = ({ users, isLoading, onEditUser }) => {
  if (isLoading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight={200}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (users.length === 0) {
    return (
      <Box display='flex' flexDirection='column' alignItems='center' py={4}>
        <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant='h6' color='text.secondary'>
          No users found
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Try adjusting your search filters
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Agency</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              hover
              component={motion.tr}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TableCell>
                <Box>
                  <Typography variant='subtitle2' fontWeight='medium'>
                    {user.fullName}
                  </Typography>
                  {user.isAccountLocked && (
                    <Chip label='Locked' size='small' color='error' variant='outlined' sx={{ mt: 0.5 }} />
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant='body2' color='text.secondary'>
                  {user.email}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={getRoleDisplayName(user.role)}
                  size='small'
                  color={getRoleColor(user.role)}
                  variant='outlined'
                />
              </TableCell>
              <TableCell>
                {user.agencyName ? (
                  <Box display='flex' alignItems='center' gap={1}>
                    <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant='body2'>{user.agencyName}</Typography>
                  </Box>
                ) : (
                  <Typography variant='body2' color='text.secondary' fontStyle='italic'>
                    No agency
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip label={user.status} size='small' color={getStatusColor(user.status)} variant='filled' />
              </TableCell>
              <TableCell>
                <Typography variant='body2' color='text.secondary'>
                  {formatDate(user.createdAt)}
                </Typography>
              </TableCell>
              <TableCell>
                <Box display='flex' gap={1}>
                  <Tooltip title='Edit User'>
                    <IconButton size='small' onClick={() => onEditUser(user.id)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/**
 * Users Page Component
 */
export const UsersPage: React.FC = () => {
  const {
    users,
    total,
    isLoading,
    error,
    isInitialized,
    pagination,
    setPagination,
    filters,
    setFilters,
    refetch,
    clearError,
    resetFilters,
  } = useUsers();

  // Create user modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Edit user modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);

  /**
   * Handle search input change
   */
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const searchValue = event.target.value.trim();
    setFilters(searchValue ? { search: searchValue } : {});
  };

  /**
   * Handle role filter change
   */
  const handleRoleChange = (event: any): void => {
    setFilters({ role: event.target.value || undefined });
  };

  /**
   * Handle status filter change
   */
  const handleStatusChange = (event: any): void => {
    setFilters({ status: event.target.value || undefined });
  };

  /**
   * Handle page change
   */
  const handlePageChange = (_: unknown, newPage: number): void => {
    setPagination({ page: newPage + 1 });
  };

  /**
   * Handle rows per page change
   */
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setPagination({ limit: parseInt(event.target.value, 10), page: 1 });
  };

  /**
   * Handle create user
   */
  const handleCreateUser = useCallback(
    async (userData: UserCreateFormData): Promise<void> => {
      try {
        setCreating(true);
        setCreateError(null);

        // Call the Electron API to create user
        if (window.electronAPI?.auth?.createUser) {
          await window.electronAPI.auth.createUser({
            email: userData.email,
            password: userData.password,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            agencyId: userData.agencyId,
            createdBy: '1', // Current user ID - should come from auth context
          });

          // Refresh the users list
          await refetch();
          setCreateModalOpen(false);
        } else {
          throw new Error('User creation API not available');
        }
      } catch (error) {
        console.error('Failed to create user:', error);
        setCreateError(error instanceof Error ? error.message : 'Failed to create user');
      } finally {
        setCreating(false);
      }
    },
    [refetch]
  );

  /**
   * Handle open create modal
   */
  const handleOpenCreateModal = useCallback(() => {
    setCreateError(null);
    setCreateModalOpen(true);
  }, []);

  /**
   * Handle close create modal
   */
  const handleCloseCreateModal = useCallback(() => {
    if (!creating) {
      setCreateModalOpen(false);
      setCreateError(null);
    }
  }, [creating]);

  /**
   * Handle edit user
   */
  const handleEditUser = useCallback((userId: string) => {
    setEditUserId(userId);
    setEditModalOpen(true);
  }, []);

  /**
   * Handle close edit modal
   */
  const handleCloseEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditUserId(null);
  }, []);

  /**
   * Handle user updated
   */
  const handleUserUpdated = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <DashboardLayout title='Users'>
      <Container maxWidth='xl' sx={{ py: 2 }}>
        <motion.div variants={containerVariants} initial='hidden' animate='visible'>
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography
                  variant='h4'
                  sx={{
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1,
                  }}
                >
                  User Management
                </Typography>
                <Typography variant='body1' color='text.secondary'>
                  Manage and monitor user accounts across your organization
                </Typography>
              </Box>
              <Button
                variant='contained'
                startIcon={<PersonAddIcon />}
                onClick={handleOpenCreateModal}
                sx={{
                  background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4c38e8 0%, #5f47f0 100%)',
                  },
                }}
              >
                Create User
              </Button>
            </Box>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div variants={itemVariants}>
              <Alert severity='error' onClose={clearError} sx={{ mb: 3 }}>
                {error}
              </Alert>
            </motion.div>
          )}

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={3} alignItems='center'>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      placeholder='Search users...'
                      value={filters.search || ''}
                      onChange={handleSearchChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start'>
                            <SearchIcon color='action' />
                          </InputAdornment>
                        ),
                      }}
                      variant='outlined'
                      size='small'
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth size='small'>
                      <InputLabel>Role</InputLabel>
                      <Select value={filters.role || ''} onChange={handleRoleChange} label='Role'>
                        <MenuItem value=''>All Roles</MenuItem>
                        <MenuItem value='super_admin'>Super Administrator</MenuItem>
                        <MenuItem value='admin'>Agency Administrator</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth size='small'>
                      <InputLabel>Status</InputLabel>
                      <Select value={filters.status || ''} onChange={handleStatusChange} label='Status'>
                        <MenuItem value=''>All Statuses</MenuItem>
                        <MenuItem value='active'>Active</MenuItem>
                        <MenuItem value='inactive'>Inactive</MenuItem>
                        <MenuItem value='suspended'>Suspended</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Box display='flex' gap={1}>
                      <Tooltip title='Refresh'>
                        <IconButton onClick={refetch} disabled={isLoading}>
                          <RefreshIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='Reset Filters'>
                        <IconButton onClick={resetFilters}>
                          <FilterIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>

          {/* Users Table */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent sx={{ p: 0 }}>
                <UsersTable users={users} isLoading={isLoading && !isInitialized} onEditUser={handleEditUser} />

                {/* Pagination */}
                {isInitialized && (
                  <TablePagination
                    component='div'
                    count={total}
                    page={pagination.page - 1}
                    onPageChange={handlePageChange}
                    rowsPerPage={pagination.limit}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    rowsPerPageOptions={[25, 50, 100]}
                    sx={{ borderTop: 1, borderColor: 'divider' }}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Create User Modal */}
          <UserCreateModal
            open={createModalOpen}
            loading={creating}
            error={createError}
            onClose={handleCloseCreateModal}
            onSubmit={handleCreateUser}
          />

          {/* Edit User Modal */}
          <UserEditModal
            open={editModalOpen}
            userId={editUserId}
            onClose={handleCloseEditModal}
            onUserUpdated={handleUserUpdated}
          />
        </motion.div>
      </Container>
    </DashboardLayout>
  );
};
