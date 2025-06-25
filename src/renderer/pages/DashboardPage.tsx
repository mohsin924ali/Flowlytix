import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import { ExitToApp, Add, Business, Storage, CheckCircle, Error } from '@mui/icons-material';

/**
 * Agency creation form schema
 */
const agencySchema = z.object({
  name: z
    .string()
    .min(2, 'Agency name must be at least 2 characters')
    .max(100, 'Agency name cannot exceed 100 characters'),
  contactPerson: z.string().optional(),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  allowCreditSales: z.boolean().default(false),
  defaultCreditDays: z.number().min(1).max(180).default(30),
  maxCreditLimit: z.number().min(0).default(10000),
  currency: z.string().default('USD'),
  taxRate: z.number().min(0).max(1).default(0.08),
});

type AgencyFormData = z.infer<typeof agencySchema>;

interface DashboardPageProps {
  user: any;
  onLogout: () => void;
}

interface AgencyCreationResult {
  success: boolean;
  agencyId?: string;
  databasePath?: string;
  error?: string;
}

/**
 * Dashboard Page Component
 * Main interface for testing agency creation
 */
const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creationResult, setCreationResult] = useState<AgencyCreationResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<AgencyFormData>({
    resolver: zodResolver(agencySchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      allowCreditSales: false,
      defaultCreditDays: 30,
      maxCreditLimit: 10000,
      currency: 'USD',
      taxRate: 0.08,
    },
  });

  const allowCreditSales = watch('allowCreditSales');

  /**
   * Handle agency creation
   */
  const onSubmit = async (data: AgencyFormData) => {
    try {
      setIsCreating(true);
      setCreationResult(null);

      // Generate database path
      const databasePath = `./databases/${data.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.db`;

      // Call agency creation via IPC
      const result = await window.electronAPI.agency.createAgency({
        name: data.name,
        databasePath,
        contactPerson: data.contactPerson || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        createdBy: user.id,
        settings: {
          allowCreditSales: data.allowCreditSales,
          defaultCreditDays: data.defaultCreditDays,
          maxCreditLimit: data.maxCreditLimit,
          requireApprovalForOrders: false,
          enableInventoryTracking: true,
          taxRate: data.taxRate,
          currency: data.currency,
          businessHours: {
            start: '09:00',
            end: '17:00',
            timezone: 'UTC',
          },
        },
      });

      setCreationResult({
        success: result.success,
        agencyId: result.agencyId,
        databasePath: result.databasePath,
        error: result.error,
      });

      if (result.success) {
        reset(); // Clear form on success
      }
    } catch (error) {
      console.error('Agency creation error:', error);
      setCreationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create agency',
      });
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    setCreationResult(null);
    reset();
  };

  return (
    <>
      {/* App Bar */}
      <AppBar position='static'>
        <Toolbar>
          <Business sx={{ mr: 2 }} />
          <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
            Flowlytix Dashboard
          </Typography>
          <Chip label={`${user.firstName} ${user.lastName}`} color='secondary' size='small' sx={{ mr: 2 }} />
          <IconButton color='inherit' onClick={onLogout}>
            <ExitToApp />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth='lg' sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Welcome Card */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant='h4' gutterBottom>
                  Welcome to Flowlytix Distribution System
                </Typography>
                <Typography variant='body1' color='text.secondary'>
                  Multi-tenant distribution management system. Test agency creation below.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Agency Creation Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Business sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant='h6'>Agency Management</Typography>
                </Box>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                  Create new agencies with dedicated databases for multi-tenant operations.
                </Typography>
                <Button variant='contained' startIcon={<Add />} onClick={() => setCreateDialogOpen(true)} fullWidth>
                  Create New Agency
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* System Info Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Storage sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant='h6'>System Information</Typography>
                </Box>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                  User: {user.email}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                  Role: {user.role}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Permissions: {user.permissions?.length || 0} active
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Creation Result Display */}
          {creationResult && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                {creationResult.success ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CheckCircle color='success' sx={{ mr: 1 }} />
                    <Typography variant='h6' color='success.main'>
                      Agency Created Successfully!
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Error color='error' sx={{ mr: 1 }} />
                    <Typography variant='h6' color='error.main'>
                      Agency Creation Failed
                    </Typography>
                  </Box>
                )}

                {creationResult.success && (
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Agency ID: {creationResult.agencyId}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Database Path: {creationResult.databasePath}
                    </Typography>
                    <Alert severity='success' sx={{ mt: 2 }}>
                      ✅ Agency successfully created
                      <br />✅ Dedicated database created with complete schema replica
                    </Alert>
                  </Box>
                )}

                {!creationResult.success && (
                  <Alert severity='error' sx={{ mt: 2 }}>
                    {creationResult.error}
                  </Alert>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Create Agency Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCloseDialog} maxWidth='md' fullWidth>
        <DialogTitle>Create New Agency</DialogTitle>
        <DialogContent>
          <Box component='form' sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  {...register('name')}
                  fullWidth
                  label='Agency Name *'
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('contactPerson')}
                  fullWidth
                  label='Contact Person'
                  error={!!errors.contactPerson}
                  helperText={errors.contactPerson?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('email')}
                  fullWidth
                  label='Email'
                  type='email'
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('phone')}
                  fullWidth
                  label='Phone'
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('currency')}
                  fullWidth
                  label='Currency'
                  error={!!errors.currency}
                  helperText={errors.currency?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  {...register('address')}
                  fullWidth
                  label='Address'
                  multiline
                  rows={2}
                  error={!!errors.address}
                  helperText={errors.address?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel control={<Switch {...register('allowCreditSales')} />} label='Allow Credit Sales' />
              </Grid>
              {allowCreditSales && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      {...register('defaultCreditDays', { valueAsNumber: true })}
                      fullWidth
                      label='Default Credit Days'
                      type='number'
                      error={!!errors.defaultCreditDays}
                      helperText={errors.defaultCreditDays?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      {...register('maxCreditLimit', { valueAsNumber: true })}
                      fullWidth
                      label='Max Credit Limit'
                      type='number'
                      error={!!errors.maxCreditLimit}
                      helperText={errors.maxCreditLimit?.message}
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('taxRate', { valueAsNumber: true })}
                  fullWidth
                  label='Tax Rate (0-1)'
                  type='number'
                  step='0.01'
                  error={!!errors.taxRate}
                  helperText={errors.taxRate?.message}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} variant='contained' disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Agency'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DashboardPage;
