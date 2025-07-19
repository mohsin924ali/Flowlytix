import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Divider,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Timeline,
  AccountBalance,
  CreditCard,
  Schedule,
  Refresh,
  ExpandMore,
  Security,
  Stars,
  ShowChart,
  Person,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format, subMonths, differenceInDays } from 'date-fns';

import { CreditStatusChip } from '../../atoms/CreditStatusChip';
import { CreditLimitDisplay } from '../../atoms/CreditLimitDisplay';
import { CreditService } from '../../../services/CreditService';
import { CreditStatus, CreditRiskLevel, CreditStatusUtils } from '../../../domains/payment/valueObjects/PaymentStatus';
import type { CreditAccount, CreditCheckResult, CreditAnalytics } from '../../../domains/payment/types/PaymentTypes';

// Props interface
interface CreditAssessmentCardProps {
  customerId: string;
  customerName: string;
  showHeader?: boolean;
  showActions?: boolean;
  showHistory?: boolean;
  onCreditLimitAdjust?: (customerId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

// Credit metrics interface
interface CreditMetrics {
  creditScore: number;
  paymentReliability: number;
  creditUtilization: number;
  averagePaymentDelay: number;
  totalTransactions: number;
  lastAssessmentDate: Date;
  riskFactors: string[];
  positiveFactors: string[];
  recommendations: string[];
}

// Risk indicator interface
interface RiskIndicator {
  label: string;
  value: number;
  status: 'good' | 'warning' | 'danger';
  description: string;
}

export const CreditAssessmentCard: React.FC<CreditAssessmentCardProps> = ({
  customerId,
  customerName,
  showHeader = true,
  showActions = true,
  showHistory = false,
  onCreditLimitAdjust,
  onRefresh,
  className,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditAccount, setCreditAccount] = useState<CreditAccount | null>(null);
  const [creditMetrics, setCreditMetrics] = useState<CreditMetrics | null>(null);
  const [riskIndicators, setRiskIndicators] = useState<RiskIndicator[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Load credit assessment when component mounts
  useEffect(() => {
    loadCreditAssessment();
  }, [customerId]);

  // Load credit assessment data
  const loadCreditAssessment = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Fetch credit account
      const account = await CreditService.getCreditAccount(customerId);
      setCreditAccount(account);

      if (account) {
        // Generate mock credit metrics - in production, this would come from real analysis
        const mockMetrics = generateMockCreditMetrics(account);
        setCreditMetrics(mockMetrics);

        // Generate risk indicators
        const indicators = generateRiskIndicators(account, mockMetrics);
        setRiskIndicators(indicators);
      }
    } catch (error) {
      console.error('Error loading credit assessment:', error);
      setError(t('credit.assessment.error.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  // Generate mock credit metrics
  const generateMockCreditMetrics = (account: CreditAccount): CreditMetrics => {
    const utilization = (account.outstandingBalance / account.creditLimit) * 100;

    // Calculate credit score based on various factors
    let creditScore = 850; // Start with perfect score

    // Deduct based on utilization
    if (utilization > 80) creditScore -= 150;
    else if (utilization > 60) creditScore -= 100;
    else if (utilization > 40) creditScore -= 50;
    else if (utilization > 20) creditScore -= 20;

    // Deduct based on risk level
    switch (account.riskLevel) {
      case CreditRiskLevel.HIGH:
        creditScore -= 200;
        break;
      case CreditRiskLevel.MODERATE:
        creditScore -= 100;
        break;
      case CreditRiskLevel.LOW:
        creditScore -= 30;
        break;
      case CreditRiskLevel.CRITICAL:
        creditScore -= 300;
        break;
    }

    // Ensure score is within valid range
    creditScore = Math.max(300, Math.min(850, creditScore));

    // Generate other metrics
    const paymentReliability = Math.max(0, Math.min(100, 100 - account.riskScore * 0.5));
    const averagePaymentDelay =
      account.riskLevel === CreditRiskLevel.HIGH ? 15 : account.riskLevel === CreditRiskLevel.MODERATE ? 7 : 2;

    // Generate risk factors and recommendations based on account data
    const riskFactors: string[] = [];
    const positiveFactors: string[] = [];
    const recommendations: string[] = [];

    if (utilization > 80) {
      riskFactors.push(t('credit.assessment.risk_factors.high_utilization'));
      recommendations.push(t('credit.assessment.recommendations.reduce_utilization'));
    } else if (utilization < 30) {
      positiveFactors.push(t('credit.assessment.positive_factors.low_utilization'));
    }

    if (account.riskLevel === CreditRiskLevel.HIGH || account.riskLevel === CreditRiskLevel.CRITICAL) {
      riskFactors.push(t('credit.assessment.risk_factors.high_risk_level'));
      recommendations.push(t('credit.assessment.recommendations.improve_payment_history'));
    }

    if (account.lastPaymentDate && differenceInDays(new Date(), account.lastPaymentDate) > 60) {
      riskFactors.push(t('credit.assessment.risk_factors.no_recent_payments'));
      recommendations.push(t('credit.assessment.recommendations.encourage_payments'));
    } else if (account.lastPaymentDate && differenceInDays(new Date(), account.lastPaymentDate) < 30) {
      positiveFactors.push(t('credit.assessment.positive_factors.recent_payments'));
    }

    if (account.creditStatus === CreditStatus.GOOD) {
      positiveFactors.push(t('credit.assessment.positive_factors.good_status'));
    }

    return {
      creditScore,
      paymentReliability,
      creditUtilization: utilization,
      averagePaymentDelay,
      totalTransactions: Math.floor(Math.random() * 50) + 10, // Mock data
      lastAssessmentDate: new Date(),
      riskFactors,
      positiveFactors,
      recommendations,
    };
  };

  // Generate risk indicators
  const generateRiskIndicators = (account: CreditAccount, metrics: CreditMetrics): RiskIndicator[] => {
    const indicators: RiskIndicator[] = [
      {
        label: t('credit.assessment.indicators.credit_score'),
        value: metrics.creditScore,
        status: metrics.creditScore >= 700 ? 'good' : metrics.creditScore >= 600 ? 'warning' : 'danger',
        description: t('credit.assessment.indicators.credit_score_desc'),
      },
      {
        label: t('credit.assessment.indicators.payment_reliability'),
        value: metrics.paymentReliability,
        status: metrics.paymentReliability >= 80 ? 'good' : metrics.paymentReliability >= 60 ? 'warning' : 'danger',
        description: t('credit.assessment.indicators.payment_reliability_desc'),
      },
      {
        label: t('credit.assessment.indicators.credit_utilization'),
        value: metrics.creditUtilization,
        status: metrics.creditUtilization <= 30 ? 'good' : metrics.creditUtilization <= 70 ? 'warning' : 'danger',
        description: t('credit.assessment.indicators.credit_utilization_desc'),
      },
      {
        label: t('credit.assessment.indicators.payment_delay'),
        value: metrics.averagePaymentDelay,
        status: metrics.averagePaymentDelay <= 5 ? 'good' : metrics.averagePaymentDelay <= 15 ? 'warning' : 'danger',
        description: t('credit.assessment.indicators.payment_delay_desc'),
      },
    ];

    return indicators;
  };

  // Handle refresh
  const handleRefresh = (): void => {
    loadCreditAssessment();
    if (onRefresh) {
      onRefresh();
    }
  };

  // Handle credit limit adjustment
  const handleCreditLimitAdjust = (): void => {
    if (onCreditLimitAdjust) {
      onCreditLimitAdjust(customerId);
    }
  };

  // Get risk level color
  const getRiskLevelColor = (level: CreditRiskLevel): 'success' | 'warning' | 'error' | 'default' => {
    switch (level) {
      case CreditRiskLevel.MINIMAL:
      case CreditRiskLevel.LOW:
        return 'success';
      case CreditRiskLevel.MODERATE:
        return 'warning';
      case CreditRiskLevel.HIGH:
      case CreditRiskLevel.CRITICAL:
        return 'error';
      default:
        return 'default';
    }
  };

  // Get indicator color
  const getIndicatorColor = (status: 'good' | 'warning' | 'danger'): string => {
    switch (status) {
      case 'good':
        return '#4caf50';
      case 'warning':
        return '#ff9800';
      case 'danger':
        return '#f44336';
      default:
        return '#666666';
    }
  };

  // Get indicator icon
  const getIndicatorIcon = (status: 'good' | 'warning' | 'danger') => {
    switch (status) {
      case 'good':
        return <CheckCircle color='success' fontSize='small' />;
      case 'warning':
        return <Warning color='warning' fontSize='small' />;
      case 'danger':
        return <ErrorIcon color='error' fontSize='small' />;
      default:
        return <Info color='disabled' fontSize='small' />;
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Card className={className} elevation={2}>
      {showHeader && (
        <CardHeader
          avatar={<Assessment color='primary' />}
          title={<Typography variant='h6'>{t('credit.assessment.title')}</Typography>}
          subheader={
            <Typography variant='body2' color='text.secondary'>
              {customerName}
            </Typography>
          }
          action={
            showActions && (
              <Box>
                <IconButton onClick={handleRefresh} disabled={loading}>
                  <Refresh />
                </IconButton>
              </Box>
            )
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

        {creditAccount && creditMetrics && (
          <>
            {/* Credit Overview */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={6}>
                <Box display='flex' alignItems='center' mb={2}>
                  <AccountBalance sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant='h6'>{t('credit.assessment.overview')}</Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>
                      {t('credit.assessment.credit_limit')}
                    </Typography>
                    <CreditLimitDisplay amount={creditAccount.creditLimit} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>
                      {t('credit.assessment.available_credit')}
                    </Typography>
                    <Typography variant='h6' color='success.main'>
                      {formatCurrency(creditAccount.availableCredit)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>
                      {t('credit.assessment.outstanding_balance')}
                    </Typography>
                    <Typography variant='h6' color='error.main'>
                      {formatCurrency(creditAccount.outstandingBalance)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>
                      {t('credit.assessment.credit_status')}
                    </Typography>
                    <CreditStatusChip status={creditAccount.creditStatus} />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box display='flex' alignItems='center' mb={2}>
                  <Stars sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant='h6'>{t('credit.assessment.credit_score')}</Typography>
                </Box>

                <Box textAlign='center'>
                  <Typography variant='h3' color='primary.main' gutterBottom>
                    {creditMetrics.creditScore}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {t('credit.assessment.score_range')}
                  </Typography>
                  <Chip
                    label={creditAccount.riskLevel}
                    color={getRiskLevelColor(creditAccount.riskLevel)}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
            </Grid>

            {/* Risk Indicators */}
            <Box mb={3}>
              <Typography variant='h6' gutterBottom>
                {t('credit.assessment.risk_indicators')}
              </Typography>

              <Grid container spacing={2}>
                {riskIndicators.map((indicator, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Card variant='outlined' sx={{ p: 2, height: '100%' }}>
                      <Box display='flex' alignItems='center' mb={1}>
                        {getIndicatorIcon(indicator.status)}
                        <Typography variant='body2' sx={{ ml: 1 }}>
                          {indicator.label}
                        </Typography>
                      </Box>

                      <Typography variant='h6' color={getIndicatorColor(indicator.status)}>
                        {indicator.label.includes('score')
                          ? indicator.value
                          : indicator.label.includes('delay')
                            ? `${indicator.value} days`
                            : formatPercentage(indicator.value)}
                      </Typography>

                      <LinearProgress
                        variant='determinate'
                        value={
                          indicator.label.includes('score')
                            ? (indicator.value / 850) * 100
                            : indicator.label.includes('delay')
                              ? Math.max(0, 100 - indicator.value * 3)
                              : indicator.value
                        }
                        color={
                          indicator.status === 'good' ? 'success' : indicator.status === 'warning' ? 'warning' : 'error'
                        }
                        sx={{ mt: 1, mb: 1 }}
                      />

                      <Tooltip title={indicator.description}>
                        <Typography variant='caption' color='text.secondary'>
                          {indicator.description.substring(0, 50)}...
                        </Typography>
                      </Tooltip>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Risk Analysis */}
            <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant='h6'>{t('credit.assessment.detailed_analysis')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Risk Factors */}
                  <Grid item xs={12} md={4}>
                    <Typography variant='subtitle1' gutterBottom color='error.main'>
                      {t('credit.assessment.risk_factors')}
                    </Typography>
                    {creditMetrics.riskFactors.length > 0 ? (
                      <List dense>
                        {creditMetrics.riskFactors.map((factor, index) => (
                          <ListItem key={index} disablePadding>
                            <ListItemIcon>
                              <Warning color='error' fontSize='small' />
                            </ListItemIcon>
                            <ListItemText primary={factor} primaryTypographyProps={{ variant: 'body2' }} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant='body2' color='text.secondary'>
                        {t('credit.assessment.no_risk_factors')}
                      </Typography>
                    )}
                  </Grid>

                  {/* Positive Factors */}
                  <Grid item xs={12} md={4}>
                    <Typography variant='subtitle1' gutterBottom color='success.main'>
                      {t('credit.assessment.positive_factors')}
                    </Typography>
                    {creditMetrics.positiveFactors.length > 0 ? (
                      <List dense>
                        {creditMetrics.positiveFactors.map((factor, index) => (
                          <ListItem key={index} disablePadding>
                            <ListItemIcon>
                              <CheckCircle color='success' fontSize='small' />
                            </ListItemIcon>
                            <ListItemText primary={factor} primaryTypographyProps={{ variant: 'body2' }} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant='body2' color='text.secondary'>
                        {t('credit.assessment.no_positive_factors')}
                      </Typography>
                    )}
                  </Grid>

                  {/* Recommendations */}
                  <Grid item xs={12} md={4}>
                    <Typography variant='subtitle1' gutterBottom color='primary.main'>
                      {t('credit.assessment.recommendations')}
                    </Typography>
                    {creditMetrics.recommendations.length > 0 ? (
                      <List dense>
                        {creditMetrics.recommendations.map((recommendation, index) => (
                          <ListItem key={index} disablePadding>
                            <ListItemIcon>
                              <Info color='primary' fontSize='small' />
                            </ListItemIcon>
                            <ListItemText primary={recommendation} primaryTypographyProps={{ variant: 'body2' }} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant='body2' color='text.secondary'>
                        {t('credit.assessment.no_recommendations')}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Actions */}
            {showActions && (
              <Box mt={3} display='flex' justifyContent='center' gap={2}>
                <Button variant='contained' onClick={handleCreditLimitAdjust} startIcon={<Assessment />}>
                  {t('credit.assessment.adjust_limit')}
                </Button>
                <Button variant='outlined' onClick={() => setExpanded(!expanded)} startIcon={<ShowChart />}>
                  {expanded ? t('credit.assessment.hide_details') : t('credit.assessment.show_details')}
                </Button>
              </Box>
            )}

            {/* Last Assessment Info */}
            <Box mt={2} textAlign='center'>
              <Typography variant='caption' color='text.secondary'>
                {t('credit.assessment.last_updated')}: {format(creditMetrics.lastAssessmentDate, 'MMM dd, yyyy HH:mm')}
              </Typography>
            </Box>
          </>
        )}

        {!creditAccount && !loading && (
          <Box textAlign='center' py={4}>
            <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant='body2' color='text.secondary'>
              {t('credit.assessment.no_credit_account')}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
