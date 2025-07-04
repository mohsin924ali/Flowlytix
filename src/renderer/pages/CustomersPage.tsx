/**
 * Customers Page Component
 * Comprehensive customer management interface
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Customer Management
 * @architecture Page Component
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  Tooltip,
  CircularProgress,
  Alert,
  Pagination,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
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
  Person,
  Business,
  Email,
  Phone,
  CreditCard,
  TrendingUp,
  ExpandMore,
  Warning,
  CheckCircle,
  Cancel,
  Pending,
  Block,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { useAuthStore } from '../store/auth.store';
import { useAgencyStore } from '../store/agency.store';
import CustomerService, {
  Customer,
  CustomerStatus,
  CustomerType,
  PaymentTerms,
  CustomerFilters,
  CreateCustomerData,
  CreateCustomerSchema,
} from '../services/CustomerService';

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
const StatusIcon: React.FC<{ status: CustomerStatus }> = ({ status }) => {
  const getStatusConfig = (status: CustomerStatus) => {
    switch (status) {
      case CustomerStatus.ACTIVE:
        return { icon: CheckCircle, color: 'success.main' };
      case CustomerStatus.INACTIVE:
        return { icon: Pending, color: 'warning.main' };
      case CustomerStatus.SUSPENDED:
        return { icon: Cancel, color: 'error.main' };
      case CustomerStatus.PENDING_APPROVAL:
        return { icon: Pending, color: 'info.main' };
      case CustomerStatus.BLACKLISTED:
        return { icon: Block, color: 'error.dark' };
      default:
        return { icon: Pending, color: 'grey.500' };
    }
  };

  const { icon: Icon, color } = getStatusConfig(status);
  return <Icon sx={{ color, fontSize: 16 }} />;
};

/**
 * Customer card component
 */
const CustomerCard: React.FC<{
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onView: (customer: Customer) => void;
}> = ({ customer, onEdit, onDelete, onView }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const getStatusColor = (status: CustomerStatus) => {
    switch (status) {
      case CustomerStatus.ACTIVE:
        return theme.palette.success.main;
      case CustomerStatus.INACTIVE:
        return theme.palette.warning.main;
      case CustomerStatus.SUSPENDED:
        return theme.palette.error.main;
      case CustomerStatus.PENDING_APPROVAL:
        return theme.palette.info.main;
      case CustomerStatus.BLACKLISTED:
        return theme.palette.error.dark;
      default:
        return theme.palette.grey[500];
    }
  };

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
                {customer.fullName}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                {customer.customerCode}
              </Typography>
              {customer.companyName && (
                <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <Business fontSize='small' color='action' />
                  {customer.companyName}
                </Typography>
              )}
            </Box>
            <Chip
              icon={<StatusIcon status={customer.status} />}
              label={customer.status}
              size='small'
              sx={{
                backgroundColor: `${getStatusColor(customer.status)}20`,
                color: getStatusColor(customer.status),
                border: `1px solid ${getStatusColor(customer.status)}40`,
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Email fontSize='small' color='action' />
              {customer.email}
            </Typography>
            {customer.phone && (
              <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Phone fontSize='small' color='action' />
                {customer.phone}
              </Typography>
            )}
            <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Person fontSize='small' color='action' />
              {customer.customerType.replace('_', ' ')}
            </Typography>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant='body2' color='text.secondary'>
                {t('customers.credit_limit')}
              </Typography>
              <Typography variant='h6' sx={{ fontWeight: 600, color: 'primary.main' }}>
                ${customer.creditLimit.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant='body2' color='text.secondary'>
                {t('customers.outstanding_balance')}
              </Typography>
              <Typography
                variant='h6'
                sx={{
                  fontWeight: 600,
                  color: customer.outstandingBalance > 0 ? 'warning.main' : 'success.main',
                }}
              >
                ${customer.outstandingBalance.toLocaleString()}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Visibility />}
              onClick={() => onView(customer)}
              sx={{ flex: 1 }}
            >
              {t('common.view')}
            </Button>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Edit />}
              onClick={() => onEdit(customer)}
              sx={{ flex: 1 }}
            >
              {t('common.edit')}
            </Button>
            <IconButton size='small' onClick={() => onDelete(customer)} sx={{ color: 'error.main' }}>
              <Delete fontSize='small' />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Customer creation/edit form component
 */
const CustomerFormDialog: React.FC<{
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSave: (data: CreateCustomerData, isEdit: boolean) => void;
}> = ({ open, customer, onClose, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<CreateCustomerData>>({
    customerCode: '',
    firstName: '',
    lastName: '',
    email: '',
    customerType: CustomerType.RETAIL,
    addresses: [],
    creditLimit: 0,
    paymentTerms: PaymentTerms.CASH_ON_DELIVERY,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer) {
      setFormData({
        customerCode: customer.customerCode,
        companyName: customer.companyName,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        mobile: customer.mobile,
        customerType: customer.customerType,
        addresses: customer.addresses,
        contacts: customer.contacts,
        creditLimit: customer.creditLimit,
        paymentTerms: customer.paymentTerms,
        taxNumber: customer.taxNumber,
        website: customer.website,
        notes: customer.notes,
      });
    } else {
      setFormData({
        customerCode: '',
        firstName: '',
        lastName: '',
        email: '',
        customerType: CustomerType.RETAIL,
        addresses: [
          {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'USA',
            isDefault: true,
            addressType: 'BOTH' as const,
          },
        ],
        creditLimit: 0,
        paymentTerms: PaymentTerms.CASH_ON_DELIVERY,
      });
    }
    setErrors({});
  }, [customer, open]);

  const handleSubmit = () => {
    try {
      const validatedData = CreateCustomerSchema.parse(formData);
      onSave(validatedData, !!customer);
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

  const updateAddress = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      addresses: [
        {
          ...((prev.addresses as any)?.[0] || {}),
          [field]: value,
        },
      ],
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>{customer ? t('customers.edit_customer') : t('customers.add_customer')}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('customers.customer_code')}
              value={formData.customerCode || ''}
              onChange={(e) => updateFormData('customerCode', e.target.value)}
              error={!!errors.customerCode}
              helperText={errors.customerCode}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>{t('customers.customer_type')}</InputLabel>
              <Select
                value={formData.customerType || CustomerType.RETAIL}
                onChange={(e) => updateFormData('customerType', e.target.value)}
                label='Customer Type'
              >
                {Object.values(CustomerType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='First Name'
              value={formData.firstName || ''}
              onChange={(e) => updateFormData('firstName', e.target.value)}
              error={!!errors.firstName}
              helperText={errors.firstName}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='Last Name'
              value={formData.lastName || ''}
              onChange={(e) => updateFormData('lastName', e.target.value)}
              error={!!errors.lastName}
              helperText={errors.lastName}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label='Company Name'
              value={formData.companyName || ''}
              onChange={(e) => updateFormData('companyName', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='Email'
              type='email'
              value={formData.email || ''}
              onChange={(e) => updateFormData('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='Phone'
              value={formData.phone || ''}
              onChange={(e) => updateFormData('phone', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='Credit Limit'
              type='number'
              value={formData.creditLimit || 0}
              onChange={(e) => updateFormData('creditLimit', parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <InputAdornment position='start'>$</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Payment Terms</InputLabel>
              <Select
                value={formData.paymentTerms || PaymentTerms.CASH_ON_DELIVERY}
                onChange={(e) => updateFormData('paymentTerms', e.target.value)}
                label='Payment Terms'
              >
                {Object.values(PaymentTerms).map((term) => (
                  <MenuItem key={term} value={term}>
                    {term.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Address Section */}
          <Grid item xs={12}>
            <Typography variant='h6' sx={{ mb: 2 }}>
              Address Information
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('common.address')}
              value={(formData.addresses as any)?.[0]?.street || ''}
              onChange={(e) => updateAddress('street', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('common.city')}
              value={(formData.addresses as any)?.[0]?.city || ''}
              onChange={(e) => updateAddress('city', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label={t('common.state')}
              value={(formData.addresses as any)?.[0]?.state || ''}
              onChange={(e) => updateAddress('state', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label={t('common.zip_code')}
              value={(formData.addresses as any)?.[0]?.zipCode || ''}
              onChange={(e) => updateAddress('zipCode', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('common.notes')}
              multiline
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => updateFormData('notes', e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant='contained' onClick={handleSubmit}>
          {customer ? t('common.update') : t('common.create')} {t('customers.customer')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Main Customers Page Component
 */
export const CustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuthStore();
  const { currentAgency } = useAgencyStore();

  // State management
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<CustomerFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  /**
   * Load customers data
   */
  const loadCustomers = useCallback(async () => {
    if (!currentAgency) return;

    try {
      setLoading(true);
      setError(null);
      const response = await CustomerService.getCustomers(
        currentAgency.id,
        page,
        12, // Show 12 customers per page for card layout
        filters
      );
      setCustomers(response.customers);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [currentAgency, page, filters]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

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
  const handleFilterChange = (newFilters: Partial<CustomerFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  /**
   * Handle create customer
   */
  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setFormDialogOpen(true);
  };

  /**
   * Handle edit customer
   */
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormDialogOpen(true);
  };

  /**
   * Handle save customer
   */
  const handleSaveCustomer = async (data: CreateCustomerData, isEdit: boolean) => {
    if (!currentAgency || !user) return;

    try {
      setLoading(true);
      if (isEdit && selectedCustomer) {
        await CustomerService.updateCustomer(selectedCustomer.id, data, user.id);
      } else {
        await CustomerService.createCustomer(currentAgency.id, data, user.id);
      }
      await loadCustomers();
      setFormDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle delete customer
   */
  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  /**
   * Confirm delete customer
   */
  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      setLoading(true);
      await CustomerService.deleteCustomer(customerToDelete.id);
      await loadCustomers();
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete customer');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle view customer
   */
  const handleViewCustomer = (customer: Customer) => {
    // TODO: Navigate to customer details page
    console.log('View customer:', customer);
  };

  if (loading && customers.length === 0) {
    return (
      <DashboardLayout title={t('customers.title')}>
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
    <DashboardLayout title={t('customers.title')}>
      <motion.div variants={containerVariants} initial='hidden' animate='visible'>
        <Container maxWidth='xl' sx={{ py: 3 }}>
          {/* Header Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant='h4' sx={{ fontWeight: 700 }}>
                {t('customers.title')}
              </Typography>
              <Button variant='contained' startIcon={<Add />} onClick={handleCreateCustomer} sx={{ px: 3 }}>
                {t('customers.add_customer')}
              </Button>
            </Box>

            {/* Search and Filters */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems='center'>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    placeholder={t('customers.search_placeholder')}
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
                      {t('common.filters')}
                    </Button>
                    <Button variant='outlined' startIcon={<Download />}>
                      {t('common.export')}
                    </Button>
                    <Button variant='outlined' startIcon={<Upload />}>
                      Import
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>

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
                            <InputLabel>Customer Type</InputLabel>
                            <Select
                              multiple
                              value={filters.customerType || []}
                              onChange={(e) =>
                                handleFilterChange({
                                  customerType: e.target.value as CustomerType[],
                                })
                              }
                              label='Customer Type'
                            >
                              {Object.values(CustomerType).map((type) => (
                                <MenuItem key={type} value={type}>
                                  {type.replace('_', ' ')}
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
                                  status: e.target.value as CustomerStatus[],
                                })
                              }
                              label='Status'
                            >
                              {Object.values(CustomerStatus).map((status) => (
                                <MenuItem key={status} value={status}>
                                  {status.replace('_', ' ')}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <TextField
                            fullWidth
                            label='Min Credit Limit'
                            type='number'
                            value={filters.creditLimitMin || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              const newFilters = { ...filters };
                              if (isNaN(value)) {
                                delete newFilters.creditLimitMin;
                              } else {
                                newFilters.creditLimitMin = value;
                              }
                              handleFilterChange(newFilters);
                            }}
                            InputProps={{
                              startAdornment: <InputAdornment position='start'>$</InputAdornment>,
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <TextField
                            fullWidth
                            label='Max Credit Limit'
                            type='number'
                            value={filters.creditLimitMax || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              const newFilters = { ...filters };
                              if (isNaN(value)) {
                                delete newFilters.creditLimitMax;
                              } else {
                                newFilters.creditLimitMax = value;
                              }
                              handleFilterChange(newFilters);
                            }}
                            InputProps={{
                              startAdornment: <InputAdornment position='start'>$</InputAdornment>,
                            }}
                          />
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
                      {t('customers.total_customers')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'success.main' }}>
                      {customers.filter((c) => c.status === CustomerStatus.ACTIVE).length}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {t('customers.active_customers')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {customers.filter((c) => c.outstandingBalance > 0).length}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {t('customers.with_outstanding')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'info.main' }}>
                      ${customers.reduce((sum, c) => sum + c.creditLimit, 0).toLocaleString()}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {t('customers.total_credit_limit')}
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

          {/* Customers Table */}
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('customers.customer')}</TableCell>
                  <TableCell>{t('customers.customer_code')}</TableCell>
                  <TableCell>{t('customers.customer_type')}</TableCell>
                  <TableCell>{t('common.contact')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell>{t('customers.credit_limit')}</TableCell>
                  <TableCell>{t('customers.outstanding_balance')}</TableCell>
                  <TableCell>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell>
                      <Box>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {customer.fullName}
                        </Typography>
                        {customer.companyName && (
                          <Typography variant='caption' color='text.secondary'>
                            {customer.companyName}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {customer.customerCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={customer.customerType.replace('_', ' ')}
                        size='small'
                        variant='outlined'
                        color={customer.customerType === 'CORPORATE' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email fontSize='small' />
                          {customer.email}
                        </Typography>
                        {customer.phone && (
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                          >
                            <Phone fontSize='small' />
                            {customer.phone}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<StatusIcon status={customer.status} />}
                        label={customer.status.replace('_', ' ')}
                        size='small'
                        color={
                          customer.status === 'ACTIVE'
                            ? 'success'
                            : customer.status === 'INACTIVE'
                              ? 'warning'
                              : customer.status === 'SUSPENDED'
                                ? 'error'
                                : 'default'
                        }
                        variant='outlined'
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' sx={{ color: 'info.main' }}>
                        ${customer.creditLimit.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant='body2'
                        sx={{
                          color: customer.outstandingBalance > 0 ? 'error.main' : 'success.main',
                          fontWeight: customer.outstandingBalance > 0 ? 600 : 400,
                        }}
                      >
                        ${customer.outstandingBalance.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title={t('common.view_details')}>
                          <IconButton size='small' onClick={() => handleViewCustomer(customer)} color='primary'>
                            <Visibility fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('customers.edit_customer')}>
                          <IconButton size='small' onClick={() => handleEditCustomer(customer)} color='info'>
                            <Edit fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('customers.delete_customer')}>
                          <IconButton size='small' onClick={() => handleDeleteCustomer(customer)} color='error'>
                            <Delete fontSize='small' />
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
          {customers.length === 0 && !loading && (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
              }}
            >
              <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant='h5' sx={{ mb: 1 }}>
                {t('customers.no_customers_found')}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                {filters.search || filters.status || filters.customerType
                  ? t('customers.try_adjusting_search')
                  : t('customers.get_started_message')}
              </Typography>
              {!filters.search && !filters.status && !filters.customerType && (
                <Button variant='contained' startIcon={<Add />} onClick={handleCreateCustomer}>
                  {t('customers.add_first_customer')}
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

        {/* Customer Form Dialog */}
        <CustomerFormDialog
          open={formDialogOpen}
          customer={selectedCustomer}
          onClose={() => setFormDialogOpen(false)}
          onSave={handleSaveCustomer}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>{t('common.confirm_deletion')}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('customers.delete_confirmation_message', { customerName: customerToDelete?.fullName })}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button variant='contained' color='error' onClick={confirmDeleteCustomer} disabled={loading}>
              {t('common.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
};

export default CustomersPage;
