/**
 * Shipping Page Component
 * Comprehensive shipping and logistics management interface
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Shipping Management
 * @architecture Page Component
 * @version 1.0.0
 */

import React, { useState } from 'react';
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
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/templates';

// Mock shipping data
const mockShipments = [
  {
    id: 'ship-001',
    trackingNumber: 'TRK123456789',
    orderId: 'ord-001',
    customerName: 'Metro Supermarket Chain',
    status: 'In Transit',
    carrier: 'FedEx',
    origin: 'New York, NY',
    destination: 'Boston, MA',
    shippedDate: new Date('2024-01-15'),
    estimatedDelivery: new Date('2024-01-17'),
    progress: 75,
  },
  {
    id: 'ship-002',
    trackingNumber: 'TRK987654321',
    orderId: 'ord-002',
    customerName: 'TechCorp Industries',
    status: 'Delivered',
    carrier: 'UPS',
    origin: 'New York, NY',
    destination: 'Chicago, IL',
    shippedDate: new Date('2024-01-14'),
    estimatedDelivery: new Date('2024-01-16'),
    deliveredDate: new Date('2024-01-16'),
    progress: 100,
  },
  {
    id: 'ship-003',
    trackingNumber: 'TRK456789123',
    orderId: 'ord-003',
    customerName: 'Sarah Johnson',
    status: 'Pending',
    carrier: 'USPS',
    origin: 'New York, NY',
    destination: 'Los Angeles, CA',
    estimatedDelivery: new Date('2024-01-20'),
    progress: 0,
  },
];

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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Delivered':
      return 'success';
    case 'In Transit':
      return 'info';
    case 'Pending':
      return 'warning';
    case 'Exception':
      return 'error';
    default:
      return 'default';
  }
};

const ShipmentCard: React.FC<{ shipment: any }> = ({ shipment }) => (
  <motion.div variants={itemVariants}>
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            {shipment.trackingNumber}
          </Typography>
          <Chip label={shipment.status} color={getStatusColor(shipment.status) as any} size='small' />
        </Box>

        <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
          Order: {shipment.orderId}
        </Typography>
        <Typography variant='body2' sx={{ mb: 1 }}>
          Customer: {shipment.customerName}
        </Typography>
        <Typography variant='body2' sx={{ mb: 1 }}>
          Carrier: {shipment.carrier}
        </Typography>
        <Typography variant='body2' sx={{ mb: 2 }}>
          {shipment.origin} → {shipment.destination}
        </Typography>

        {shipment.progress > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
              Progress: {shipment.progress}%
            </Typography>
            <LinearProgress variant='determinate' value={shipment.progress} />
          </Box>
        )}

        <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
          Expected: {shipment.estimatedDelivery.toLocaleDateString()}
        </Typography>

        {shipment.deliveredDate && (
          <Typography variant='body2' color='success.main' sx={{ mb: 2 }}>
            Delivered: {shipment.deliveredDate.toLocaleDateString()}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant='outlined' size='small' startIcon={<Visibility />} sx={{ flex: 1 }}>
            Track
          </Button>
          <Button variant='outlined' size='small' startIcon={<Print />} sx={{ flex: 1 }}>
            Label
          </Button>
        </Box>
      </CardContent>
    </Card>
  </motion.div>
);

export const ShippingPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const filteredShipments = mockShipments.filter(
    (shipment) =>
      shipment.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: mockShipments.length,
    inTransit: mockShipments.filter((s) => s.status === 'In Transit').length,
    delivered: mockShipments.filter((s) => s.status === 'Delivered').length,
    pending: mockShipments.filter((s) => s.status === 'Pending').length,
  };

  return (
    <DashboardLayout title='Shipping Management'>
      <motion.div variants={containerVariants} initial='hidden' animate='visible'>
        <Container maxWidth='xl' sx={{ py: 3 }}>
          {/* Header Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant='h4' sx={{ fontWeight: 700 }}>
                Shipping & Logistics
              </Typography>
              <Button variant='contained' startIcon={<Add />}>
                Create Shipment
              </Button>
            </Box>

            {/* Summary Stats */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <LocalShipping sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {stats.total}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Total Shipments
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TrackChanges sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'info.main' }}>
                      {stats.inTransit}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      In Transit
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'success.main' }}>
                      {stats.delivered}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Delivered
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Schedule sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {stats.pending}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Pending
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tabs */}
            <Box sx={{ mb: 3 }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label='All Shipments' />
                <Tab label='In Transit' />
                <Tab label='Delivered' />
                <Tab label='Tracking' />
              </Tabs>
            </Box>

            {/* Search */}
            <TextField
              fullWidth
              placeholder='Search shipments...'
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />
          </Box>

          {/* Shipments Display */}
          {tabValue === 3 ? (
            // Tracking view
            <Card>
              <CardContent>
                <Typography variant='h6' sx={{ mb: 3 }}>
                  Real-time Tracking
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tracking #</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Progress</TableCell>
                        <TableCell>ETA</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredShipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell>{shipment.trackingNumber}</TableCell>
                          <TableCell>
                            <Chip label={shipment.status} color={getStatusColor(shipment.status) as any} size='small' />
                          </TableCell>
                          <TableCell>
                            {shipment.progress === 100
                              ? shipment.destination
                              : shipment.progress > 0
                                ? 'In Transit'
                                : shipment.origin}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress variant='determinate' value={shipment.progress} sx={{ width: 100 }} />
                              <Typography variant='body2'>{shipment.progress}%</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{shipment.estimatedDelivery.toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant='outlined' size='small' startIcon={<Visibility />}>
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ) : (
            // Card view
            <Grid container spacing={3}>
              {filteredShipments.map((shipment) => (
                <Grid item xs={12} sm={6} md={4} key={shipment.id}>
                  <ShipmentCard shipment={shipment} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Empty State */}
          {filteredShipments.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <LocalShipping sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant='h5' sx={{ mb: 1 }}>
                No shipments found
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first shipment'}
              </Typography>
              {!searchTerm && (
                <Button variant='contained' startIcon={<Add />}>
                  Create First Shipment
                </Button>
              )}
            </Box>
          )}
        </Container>
      </motion.div>
    </DashboardLayout>
  );
};

export default ShippingPage;
