import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  IconButton,
  Collapse,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  History,
  Payment,
  TrendingUp,
  TrendingDown,
  Schedule,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  ExpandMore,
  ExpandLess,
  MoreVert,
  Receipt,
  Refresh,
  FilterList,
  GetApp,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format, isAfter, isBefore, subDays, subMonths } from 'date-fns';

import { PaymentStatusChip } from '../../atoms/PaymentStatusChip';
import { PaymentMethodSelector } from '../../atoms/PaymentMethodSelector';
import { PaymentService } from '../../../services/PaymentService';
import {
  PaymentStatus,
  PaymentMethod,
  PaymentStatusUtils,
  PaymentMethodUtils,
} from '../../../domains/payment/valueObjects/PaymentStatus';
import type { PaymentListItem, PaymentFilters } from '../../../domains/payment/types/PaymentTypes';

// Props interface
interface PaymentHistoryCardProps {
  customerId: string;
  customerName: string;
  showHeader?: boolean;
  showSummary?: boolean;
  showFilters?: boolean;
  maxItems?: number;
  onPaymentClick?: (payment: PaymentListItem) => void;
  onRefresh?: () => void;
  className?: string;
}

// Payment summary interface
interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  averageAmount: number;
  onTimePayments: number;
  latePayments: number;
  onTimePercentage: number;
  recentTrend: 'up' | 'down' | 'stable';
  lastPaymentDate?: Date;
}

// Time period filter
type TimePeriod = 'week' | 'month' | '3months' | '6months' | 'year' | 'all';

export const PaymentHistoryCard: React.FC<PaymentHistoryCardProps> = ({
  customerId,
  customerName,
  showHeader = true,
  showSummary = true,
  showFilters = true,
  maxItems = 10,
  onPaymentClick,
  onRefresh,
  className,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('3months');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'all'>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Load payment history when component mounts or filters change
  useEffect(() => {
    loadPaymentHistory();
  }, [customerId, timePeriod, statusFilter, methodFilter]);

  // Load payment history from service
  const loadPaymentHistory = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range based on time period
      const now = new Date();
      let dateFrom: Date | undefined;

      switch (timePeriod) {
        case 'week':
          dateFrom = subDays(now, 7);
          break;
        case 'month':
          dateFrom = subMonths(now, 1);
          break;
        case '3months':
          dateFrom = subMonths(now, 3);
          break;
        case '6months':
          dateFrom = subMonths(now, 6);
          break;
        case 'year':
          dateFrom = subMonths(now, 12);
          break;
        default:
          dateFrom = undefined;
      }

      // Build filters
      const filters: PaymentFilters = {
        customerId: customerId,
        dateFrom,
        dateTo: now,
        ...(statusFilter !== 'all' && { statuses: [statusFilter] }),
        ...(methodFilter !== 'all' && { paymentMethods: [methodFilter] }),
      };

      // Fetch payments
      const response = await PaymentService.getPayments(
        'current-agency-id', // TODO: Get from agency context
        1,
        maxItems,
        filters
      );

      setPayments(response.payments);
      calculateSummary(response.payments);
    } catch (error) {
      console.error('Error loading payment history:', error);
      setError(t('payment.error.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  // Calculate payment summary
  const calculateSummary = (paymentList: PaymentListItem[]): void => {
    if (paymentList.length === 0) {
      setSummary(null);
      return;
    }

    const totalPayments = paymentList.length;
    const totalAmount = paymentList.reduce((sum, p) => sum + p.amount, 0);
    const averageAmount = totalAmount / totalPayments;

    const onTimePayments = paymentList.filter((p) => PaymentStatusUtils.isSuccessful(p.status)).length;
    const latePayments = totalPayments - onTimePayments;
    const onTimePercentage = (onTimePayments / totalPayments) * 100;

    // Calculate trend (compare recent payments with older ones)
    const midPoint = Math.floor(paymentList.length / 2);
    const recentPayments = paymentList.slice(0, midPoint);
    const olderPayments = paymentList.slice(midPoint);

    const recentAvg = recentPayments.reduce((sum, p) => sum + p.amount, 0) / recentPayments.length;
    const olderAvg = olderPayments.reduce((sum, p) => sum + p.amount, 0) / olderPayments.length;

    let recentTrend: 'up' | 'down' | 'stable' = 'stable';
    const trendThreshold = 0.1; // 10% threshold

    if (recentAvg > olderAvg * (1 + trendThreshold)) {
      recentTrend = 'up';
    } else if (recentAvg < olderAvg * (1 - trendThreshold)) {
      recentTrend = 'down';
    }

    const lastPaymentDate = paymentList.length > 0 ? paymentList[0].createdAt : undefined;

    setSummary({
      totalPayments,
      totalAmount,
      averageAmount,
      onTimePayments,
      latePayments,
      onTimePercentage,
      recentTrend,
      lastPaymentDate,
    });
  };

  // Handle payment item click
  const handlePaymentClick = (payment: PaymentListItem): void => {
    if (onPaymentClick) {
      onPaymentClick(payment);
    }
  };

  // Handle refresh
  const handleRefresh = (): void => {
    loadPaymentHistory();
    if (onRefresh) {
      onRefresh();
    }
  };

  // Handle menu open/close
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (): void => {
    setAnchorEl(null);
  };

  // Export payment history
  const handleExport = (): void => {
    // TODO: Implement export functionality
    console.log('Exporting payment history for:', customerId);
    handleMenuClose();
  };

  // Get payment status icon
  const getPaymentStatusIcon = (status: PaymentStatus) => {
    if (PaymentStatusUtils.isSuccessful(status)) {
      return <CheckCircle color='success' fontSize='small' />;
    } else if (PaymentStatusUtils.isInProgress(status)) {
      return <Schedule color='warning' fontSize='small' />;
    } else {
      return <ErrorIcon color='error' fontSize='small' />;
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp color='success' />;
      case 'down':
        return <TrendingDown color='error' />;
      default:
        return <TrendingUp color='disabled' />;
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date): string => {
    return format(date, 'MMM dd, yyyy');
  };

  // Get time period display text
  const getTimePeriodText = (period: TimePeriod): string => {
    switch (period) {
      case 'week':
        return t('payment.history.last_week');
      case 'month':
        return t('payment.history.last_month');
      case '3months':
        return t('payment.history.last_3_months');
      case '6months':
        return t('payment.history.last_6_months');
      case 'year':
        return t('payment.history.last_year');
      default:
        return t('payment.history.all_time');
    }
  };

  return (
    <Card className={className} elevation={2}>
      {showHeader && (
        <CardHeader
          avatar={<History color='primary' />}
          title={<Typography variant='h6'>{t('payment.history.title')}</Typography>}
          subheader={
            <Typography variant='body2' color='text.secondary'>
              {customerName}
            </Typography>
          }
          action={
            <Box>
              <IconButton onClick={handleRefresh} disabled={loading}>
                <Refresh />
              </IconButton>
              <IconButton onClick={handleMenuOpen}>
                <MoreVert />
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={handleExport}>
                  <GetApp sx={{ mr: 1 }} />
                  {t('payment.history.export')}
                </MenuItem>
              </Menu>
            </Box>
          }
        />
      )}

      <CardContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Payment Summary */}
        {showSummary && summary && (
          <Box mb={3}>
            <Typography variant='h6' gutterBottom>
              {t('payment.history.summary')}
            </Typography>
            <Box display='flex' flexWrap='wrap' gap={2} mb={2}>
              <Card variant='outlined' sx={{ minWidth: 120, p: 1 }}>
                <Typography variant='body2' color='text.secondary'>
                  {t('payment.history.total_payments')}
                </Typography>
                <Typography variant='h6'>{summary.totalPayments}</Typography>
              </Card>
              <Card variant='outlined' sx={{ minWidth: 120, p: 1 }}>
                <Typography variant='body2' color='text.secondary'>
                  {t('payment.history.total_amount')}
                </Typography>
                <Typography variant='h6'>{formatCurrency(summary.totalAmount)}</Typography>
              </Card>
              <Card variant='outlined' sx={{ minWidth: 120, p: 1 }}>
                <Typography variant='body2' color='text.secondary'>
                  {t('payment.history.average_amount')}
                </Typography>
                <Typography variant='h6'>{formatCurrency(summary.averageAmount)}</Typography>
              </Card>
              <Card variant='outlined' sx={{ minWidth: 120, p: 1 }}>
                <Typography variant='body2' color='text.secondary'>
                  {t('payment.history.on_time_percentage')}
                </Typography>
                <Box display='flex' alignItems='center'>
                  <Typography variant='h6'>{summary.onTimePercentage.toFixed(1)}%</Typography>
                  <Box ml={1}>{getTrendIcon(summary.recentTrend)}</Box>
                </Box>
              </Card>
            </Box>
          </Box>
        )}

        {/* Filters */}
        {showFilters && (
          <Box mb={3}>
            <Typography variant='subtitle2' gutterBottom>
              {t('payment.history.filters')}
            </Typography>
            <Box display='flex' flexWrap='wrap' gap={1}>
              <Button
                variant={timePeriod === '3months' ? 'contained' : 'outlined'}
                size='small'
                onClick={() => setTimePeriod('3months')}
              >
                {getTimePeriodText('3months')}
              </Button>
              <Button
                variant={timePeriod === 'month' ? 'contained' : 'outlined'}
                size='small'
                onClick={() => setTimePeriod('month')}
              >
                {getTimePeriodText('month')}
              </Button>
              <Button
                variant={timePeriod === '6months' ? 'contained' : 'outlined'}
                size='small'
                onClick={() => setTimePeriod('6months')}
              >
                {getTimePeriodText('6months')}
              </Button>
              <Button
                variant={timePeriod === 'year' ? 'contained' : 'outlined'}
                size='small'
                onClick={() => setTimePeriod('year')}
              >
                {getTimePeriodText('year')}
              </Button>
            </Box>
          </Box>
        )}

        {/* Payment List */}
        <Box>
          <Typography variant='subtitle2' gutterBottom>
            {t('payment.history.recent_payments')}
          </Typography>

          {payments.length === 0 ? (
            <Box textAlign='center' py={4}>
              <Payment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant='body2' color='text.secondary'>
                {t('payment.history.no_payments')}
              </Typography>
            </Box>
          ) : (
            <>
              <List>
                {payments.slice(0, expanded ? payments.length : 5).map((payment, index) => (
                  <React.Fragment key={payment.id}>
                    <ListItem
                      button
                      onClick={() => handlePaymentClick(payment)}
                      sx={{
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: 'background.paper',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemIcon>{getPaymentStatusIcon(payment.status)}</ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display='flex' justifyContent='space-between' alignItems='center'>
                            <Typography variant='body2' fontWeight='medium'>
                              {formatCurrency(payment.amount)}
                            </Typography>
                            <PaymentStatusChip status={payment.status} />
                          </Box>
                        }
                        secondary={
                          <Box display='flex' justifyContent='space-between' alignItems='center'>
                            <Typography variant='body2' color='text.secondary'>
                              {PaymentMethodUtils.getMethodText(payment.paymentMethod)}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {formatDate(payment.createdAt)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < payments.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>

              {payments.length > 5 && (
                <Box textAlign='center' mt={2}>
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={() => setExpanded(!expanded)}
                    endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
                  >
                    {expanded
                      ? t('payment.history.show_less')
                      : t('payment.history.show_more', { count: payments.length - 5 })}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
