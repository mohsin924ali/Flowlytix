/**
 * PaymentTable Component
 * Displays payments in a table format with actions
 * Following Instructions file standards with molecular design
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Typography,
  Box,
  Tooltip,
  TableSortLabel,
  Checkbox,
  Button,
  CircularProgress,
} from '@mui/material';
import { MoreVert, Edit, Delete, CheckCircle, Cancel, Refresh, Receipt, History } from '@mui/icons-material';
import { PaymentStatusChip, AmountDisplay } from '../../atoms';
import { Payment, PaymentStatus, PaymentMethod } from '@/types';

// Component props
export interface PaymentTableProps {
  payments: Payment[];
  loading?: boolean;
  selectable?: boolean;
  selectedPayments?: string[];
  onSelectionChange?: (selected: string[]) => void;
  onPaymentAction?: (paymentId: string, action: PaymentAction) => void;
  onSort?: (field: keyof Payment, direction: 'asc' | 'desc') => void;
  sortField?: keyof Payment;
  sortDirection?: 'asc' | 'desc';
  'data-testid'?: string;
}

// Payment actions
export type PaymentAction = 'view' | 'edit' | 'delete' | 'process' | 'fail' | 'refund' | 'history';

// Table column configuration
interface TableColumn {
  id: keyof Payment;
  label: string;
  sortable: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (payment: Payment) => React.ReactNode;
}

const columns: TableColumn[] = [
  {
    id: 'id',
    label: 'Payment ID',
    sortable: true,
    width: '120px',
    render: (payment) => (
      <Typography variant='body2' fontFamily='monospace'>
        {payment.id.slice(0, 8)}...
      </Typography>
    ),
  },
  {
    id: 'subscriptionId',
    label: 'Subscription',
    sortable: true,
    width: '120px',
    render: (payment) => (
      <Typography variant='body2' fontFamily='monospace'>
        {payment.subscriptionId.slice(0, 8)}...
      </Typography>
    ),
  },
  {
    id: 'amount',
    label: 'Amount',
    sortable: true,
    width: '120px',
    align: 'right',
    render: (payment) => (
      <AmountDisplay
        amount={payment.amount}
        currency={payment.currency}
        size='small'
        colorVariant={payment.status === 'completed' ? 'success' : 'default'}
      />
    ),
  },
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    width: '120px',
    align: 'center',
    render: (payment) => <PaymentStatusChip status={payment.status} showIcon />,
  },
  {
    id: 'paymentMethod',
    label: 'Method',
    sortable: true,
    width: '120px',
    render: (payment) => (
      <Chip label={payment.paymentMethod.replace('_', ' ').toUpperCase()} size='small' variant='outlined' />
    ),
  },
  {
    id: 'paymentType',
    label: 'Type',
    sortable: true,
    width: '100px',
    render: (payment) => (
      <Chip label={payment.paymentType.toUpperCase()} size='small' variant='outlined' color='primary' />
    ),
  },
  {
    id: 'createdAt',
    label: 'Created',
    sortable: true,
    width: '140px',
    render: (payment) => <Typography variant='body2'>{new Date(payment.createdAt).toLocaleDateString()}</Typography>,
  },
  {
    id: 'processedAt',
    label: 'Processed',
    sortable: true,
    width: '140px',
    render: (payment) => (
      <Typography variant='body2'>
        {payment.processedAt ? new Date(payment.processedAt).toLocaleDateString() : '-'}
      </Typography>
    ),
  },
];

/**
 * PaymentTable Component
 * Displays payments in a sortable, selectable table
 */
export const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  loading = false,
  selectable = false,
  selectedPayments = [],
  onSelectionChange,
  onPaymentAction,
  onSort,
  sortField,
  sortDirection = 'asc',
  'data-testid': testId,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  // Handle action menu
  const handleActionClick = (event: React.MouseEvent<HTMLElement>, paymentId: string) => {
    setAnchorEl(event.currentTarget);
    setActivePaymentId(paymentId);
  };

  const handleActionClose = () => {
    setAnchorEl(null);
    setActivePaymentId(null);
  };

  const handleAction = (action: PaymentAction) => {
    if (activePaymentId && onPaymentAction) {
      onPaymentAction(activePaymentId, action);
    }
    handleActionClose();
  };

  // Handle selection
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      if (event.target.checked) {
        onSelectionChange(payments.map((p) => p.id));
      } else {
        onSelectionChange([]);
      }
    }
  };

  const handleSelectPayment = (paymentId: string) => {
    if (onSelectionChange) {
      const isSelected = selectedPayments.includes(paymentId);
      if (isSelected) {
        onSelectionChange(selectedPayments.filter((id) => id !== paymentId));
      } else {
        onSelectionChange([...selectedPayments, paymentId]);
      }
    }
  };

  // Handle sorting
  const handleSort = (field: keyof Payment) => {
    if (onSort) {
      const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(field, newDirection);
    }
  };

  // Get available actions for a payment
  const getAvailableActions = (payment: Payment): PaymentAction[] => {
    const actions: PaymentAction[] = ['view', 'history'];

    if (payment.status === 'pending') {
      actions.push('edit', 'process', 'fail');
    } else if (payment.status === 'completed') {
      actions.push('refund');
    } else if (payment.status === 'failed') {
      actions.push('edit');
    }

    // Admin can always delete
    actions.push('delete');

    return actions;
  };

  // Action menu items
  const actionItems = useMemo(() => {
    if (!activePaymentId) return [];

    const payment = payments.find((p) => p.id === activePaymentId);
    if (!payment) return [];

    const actions = getAvailableActions(payment);

    return [
      { action: 'view', label: 'View Details', icon: <Receipt /> },
      { action: 'edit', label: 'Edit Payment', icon: <Edit /> },
      { action: 'process', label: 'Process Payment', icon: <CheckCircle /> },
      { action: 'fail', label: 'Mark as Failed', icon: <Cancel /> },
      { action: 'refund', label: 'Refund Payment', icon: <Refresh /> },
      { action: 'history', label: 'View History', icon: <History /> },
      { action: 'delete', label: 'Delete Payment', icon: <Delete /> },
    ].filter((item) => actions.includes(item.action as PaymentAction));
  }, [activePaymentId, payments]);

  const isAllSelected = selectable && payments.length > 0 && selectedPayments.length === payments.length;
  const isIndeterminate = selectable && selectedPayments.length > 0 && selectedPayments.length < payments.length;

  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='200px'>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} data-testid={testId}>
      <Table size='small' stickyHeader>
        <TableHead>
          <TableRow>
            {selectable && (
              <TableCell padding='checkbox'>
                <Checkbox checked={isAllSelected} indeterminate={isIndeterminate} onChange={handleSelectAll} />
              </TableCell>
            )}
            {columns.map((column) => (
              <TableCell key={column.id} align={column.align || 'left'} style={{ width: column.width }}>
                {column.sortable ? (
                  <TableSortLabel
                    active={sortField === column.id}
                    direction={sortField === column.id ? sortDirection : 'asc'}
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
            <TableCell align='center' width='60px'>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0) + 1} align='center' sx={{ py: 4 }}>
                <Typography variant='body2' color='text.secondary'>
                  No payments found
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment) => (
              <TableRow key={payment.id} hover selected={selectedPayments.includes(payment.id)}>
                {selectable && (
                  <TableCell padding='checkbox'>
                    <Checkbox
                      checked={selectedPayments.includes(payment.id)}
                      onChange={() => handleSelectPayment(payment.id)}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align || 'left'}>
                    {column.render ? column.render(payment) : String(payment[column.id] || '')}
                  </TableCell>
                ))}
                <TableCell align='center'>
                  <Tooltip title='More actions'>
                    <IconButton size='small' onClick={(e) => handleActionClick(e, payment.id)}>
                      <MoreVert />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {actionItems.map((item) => (
          <MenuItem key={item.action} onClick={() => handleAction(item.action as PaymentAction)}>
            <Box display='flex' alignItems='center' gap={1}>
              {item.icon}
              {item.label}
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </TableContainer>
  );
};

// Default export
export default PaymentTable;
