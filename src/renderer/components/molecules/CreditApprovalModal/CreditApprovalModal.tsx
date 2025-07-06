import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Alert,
  AlertTitle,
  Chip,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Warning,
  Info,
  Assessment,
  Person,
  AccountBalance,
  TrendingUp,
  History,
  ExpandMore,
  ThumbUp,
  ThumbDown,
  Schedule,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { CreditService } from '../../../services/CreditService';
import { CreditStatusChip } from '../../atoms/CreditStatusChip';
import { CreditLimitDisplay } from '../../atoms/CreditLimitDisplay';
import { AmountInput } from '../../atoms/AmountInput';
import { PaymentTermsSelector } from '../../atoms/PaymentTermsSelector';
import { CreditStatus, CreditRiskLevel, ApprovalStatus } from '../../../domains/payment/valueObjects/PaymentStatus';
import type { CreditCheckResult, CreditLimitAdjustment } from '../../../domains/payment/types/PaymentTypes';

// Validation schema for credit approval form
const CreditApprovalSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  requestedAmount: z.number().min(0.01, 'Requested amount must be greater than 0'),
  approvalDecision: z.enum(['APPROVE', 'REJECT', 'ESCALATE']),
  newCreditLimit: z.number().min(0, 'Credit limit cannot be negative').optional(),
  approvalNotes: z.string().min(10, 'Approval notes must be at least 10 characters'),
  conditions: z.array(z.string()).optional(),
  followUpDate: z.date().optional(),
});

type CreditApprovalForm = z.infer<typeof CreditApprovalSchema>;

// Props interface
interface CreditApprovalModalProps {
  open: boolean;
  onClose: () => void;
  customer: {
    id: string;
    fullName: string;
    outstandingBalance: number;
    creditLimit: number;
    availableCredit: number;
    creditStatus: CreditStatus;
    riskLevel: CreditRiskLevel;
  } | null;
  creditCheckResult: CreditCheckResult | null;
  onApprovalCompleted: (result: CreditLimitAdjustment) => void;
}

// Credit decision interface
interface CreditDecision {
  decision: 'APPROVE' | 'REJECT' | 'ESCALATE';
  reason: string;
  conditions?: string[];
  newLimit?: number;
}

export const CreditApprovalModal: React.FC<CreditApprovalModalProps> = ({
  open,
  onClose,
  customer,
  creditCheckResult,
  onApprovalCompleted,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<CreditDecision | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<any>(null);

  const form = useForm<CreditApprovalForm>({
    resolver: zodResolver(CreditApprovalSchema),
    defaultValues: {
      customerId: customer?.id || '',
      requestedAmount: creditCheckResult?.requestedAmount || 0,
      approvalDecision: 'APPROVE',
      newCreditLimit: customer?.creditLimit || 0,
      approvalNotes: '',
      conditions: [],
      followUpDate: undefined,
    },
  });

  // Load payment history and risk analysis when customer changes
  useEffect(() => {
    if (customer && open) {
      loadCustomerAnalysis();
    }
  }, [customer, open]);

  // Load customer analysis data
  const loadCustomerAnalysis = async (): Promise<void> => {
    try {
      setLoading(true);

      // Mock payment history - in production, this would fetch real data
      const mockPaymentHistory = [
        { date: '2024-01-15', amount: 5000, status: 'PAID', daysLate: 0 },
        { date: '2024-01-01', amount: 3500, status: 'PAID', daysLate: 2 },
        { date: '2023-12-15', amount: 4200, status: 'PAID', daysLate: 0 },
        { date: '2023-12-01', amount: 2800, status: 'PAID', daysLate: 5 },
      ];

      // Mock risk analysis
      const mockRiskAnalysis = {
        paymentReliability: 85,
        averageDelayDays: 1.75,
        totalPaidOnTime: 75,
        creditUtilization: 65,
        trendDirection: 'improving',
        recommendedAction: 'approve_with_conditions',
      };

      setPaymentHistory(mockPaymentHistory);
      setRiskAnalysis(mockRiskAnalysis);
      generateRecommendation(mockRiskAnalysis);
    } catch (error) {
      console.error('Error loading customer analysis:', error);
      setError(t('credit.error.analysis_failed'));
    } finally {
      setLoading(false);
    }
  };

  // Generate AI recommendation based on risk analysis
  const generateRecommendation = (analysis: any): void => {
    if (!customer || !creditCheckResult) return;

    let decision: CreditDecision;

    if (analysis.paymentReliability > 80 && analysis.creditUtilization < 70) {
      decision = {
        decision: 'APPROVE',
        reason: t('credit.recommendation.approve_reason'),
        conditions: [t('credit.conditions.payment_terms_30_days'), t('credit.conditions.monthly_review')],
        newLimit: Math.min(creditCheckResult.requestedAmount * 1.1, customer.creditLimit * 1.5),
      };
    } else if (analysis.paymentReliability > 60) {
      decision = {
        decision: 'APPROVE',
        reason: t('credit.recommendation.approve_with_conditions_reason'),
        conditions: [
          t('credit.conditions.payment_terms_15_days'),
          t('credit.conditions.weekly_review'),
          t('credit.conditions.collateral_required'),
        ],
        newLimit: creditCheckResult.requestedAmount,
      };
    } else if (analysis.paymentReliability > 40) {
      decision = {
        decision: 'ESCALATE',
        reason: t('credit.recommendation.escalate_reason'),
        conditions: [t('credit.conditions.manager_approval'), t('credit.conditions.additional_documentation')],
      };
    } else {
      decision = {
        decision: 'REJECT',
        reason: t('credit.recommendation.reject_reason'),
        conditions: [],
      };
    }

    setRecommendation(decision);
    form.setValue('approvalDecision', decision.decision);
    form.setValue('newCreditLimit', decision.newLimit || customer.creditLimit);
    form.setValue('approvalNotes', decision.reason);
    form.setValue('conditions', decision.conditions || []);
  };

  // Handle form submission
  const handleSubmit = async (data: CreditApprovalForm): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (!customer) {
        throw new Error(t('credit.error.no_customer'));
      }

      // Process credit approval
      const approvalResult = await CreditService.adjustCreditLimit(
        {
          customerId: data.customerId,
          newLimit: data.newCreditLimit || customer.creditLimit,
          reason: data.approvalNotes,
          effectiveDate: new Date(),
          requiresApproval: data.approvalDecision === 'ESCALATE',
        },
        'current-user-id', // TODO: Get from auth context
        'current-agency-id' // TODO: Get from agency context
      );

      onApprovalCompleted(approvalResult);
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('credit.error.approval_failed');
      setError(errorMessage);
      console.error('Credit approval failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get risk level color
  const getRiskLevelColor = (level: CreditRiskLevel): string => {
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

  // Get recommendation icon
  const getRecommendationIcon = (decision: string) => {
    switch (decision) {
      case 'APPROVE':
        return <ThumbUp color='success' />;
      case 'REJECT':
        return <ThumbDown color='error' />;
      case 'ESCALATE':
        return <Schedule color='warning' />;
      default:
        return <Info />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' },
      }}
    >
      <DialogTitle>
        <Box display='flex' alignItems='center' justifyContent='space-between'>
          <Box display='flex' alignItems='center'>
            <Assessment sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant='h6' component='div'>
              {t('credit.approval.title')}
            </Typography>
          </Box>
          {customer && <CreditStatusChip status={customer.creditStatus} />}
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {error && (
          <Alert severity='error' sx={{ mb: 3 }}>
            <AlertTitle>{t('credit.error.title')}</AlertTitle>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Customer Overview */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box display='flex' alignItems='center' mb={2}>
                  <Person sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant='h6'>{customer?.fullName || t('credit.no_customer')}</Typography>
                </Box>

                {customer && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='body2' color='text.secondary'>
                        {t('credit.current_limit')}
                      </Typography>
                      <CreditLimitDisplay amount={customer.creditLimit} variant='h6' />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='body2' color='text.secondary'>
                        {t('credit.available_credit')}
                      </Typography>
                      <Typography variant='h6' color='success.main'>
                        ${customer.availableCredit.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='body2' color='text.secondary'>
                        {t('credit.outstanding_balance')}
                      </Typography>
                      <Typography variant='h6' color='error.main'>
                        ${customer.outstandingBalance.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='body2' color='text.secondary'>
                        {t('credit.risk_level')}
                      </Typography>
                      <Chip
                        label={customer.riskLevel}
                        color={getRiskLevelColor(customer.riskLevel) as any}
                        size='small'
                      />
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Credit Request Details */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box display='flex' alignItems='center' mb={2}>
                  <AccountBalance sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant='h6'>{t('credit.request_details')}</Typography>
                </Box>

                {creditCheckResult && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='body2' color='text.secondary'>
                        {t('credit.requested_amount')}
                      </Typography>
                      <Typography variant='h6'>${creditCheckResult.requestedAmount.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant='body2' color='text.secondary'>
                        {t('credit.approval_status')}
                      </Typography>
                      <Chip
                        label={creditCheckResult.approved ? t('credit.approved') : t('credit.requires_approval')}
                        color={creditCheckResult.approved ? 'success' : 'warning'}
                        size='small'
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant='body2' color='text.secondary'>
                        {t('credit.risk_score')}
                      </Typography>
                      <Box display='flex' alignItems='center' mt={1}>
                        <LinearProgress
                          variant='determinate'
                          value={creditCheckResult.riskScore}
                          sx={{ flexGrow: 1, mr: 2 }}
                        />
                        <Typography variant='body2'>{creditCheckResult.riskScore}%</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* AI Recommendation */}
          {recommendation && (
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent>
                  <Box display='flex' alignItems='center' mb={2}>
                    <TrendingUp sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant='h6'>{t('credit.ai_recommendation')}</Typography>
                    <Box ml={2}>{getRecommendationIcon(recommendation.decision)}</Box>
                  </Box>

                  <Alert
                    severity={
                      recommendation.decision === 'APPROVE'
                        ? 'success'
                        : recommendation.decision === 'REJECT'
                          ? 'error'
                          : 'warning'
                    }
                    sx={{ mb: 2 }}
                  >
                    <AlertTitle>{t(`credit.recommendation.${recommendation.decision.toLowerCase()}`)}</AlertTitle>
                    {recommendation.reason}
                  </Alert>

                  {recommendation.conditions && recommendation.conditions.length > 0 && (
                    <Box>
                      <Typography variant='subtitle2' gutterBottom>
                        {t('credit.recommended_conditions')}
                      </Typography>
                      <List dense>
                        {recommendation.conditions.map((condition, index) => (
                          <ListItem key={index} disablePadding>
                            <ListItemIcon>
                              <CheckCircle color='primary' fontSize='small' />
                            </ListItemIcon>
                            <ListItemText primary={condition} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Risk Analysis */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant='h6'>{t('credit.risk_analysis')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {riskAnalysis && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant='subtitle2' gutterBottom>
                        {t('credit.payment_reliability')}
                      </Typography>
                      <Box display='flex' alignItems='center'>
                        <LinearProgress
                          variant='determinate'
                          value={riskAnalysis.paymentReliability}
                          sx={{ flexGrow: 1, mr: 2 }}
                        />
                        <Typography variant='body2'>{riskAnalysis.paymentReliability}%</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant='subtitle2' gutterBottom>
                        {t('credit.average_delay')}
                      </Typography>
                      <Typography variant='body1'>
                        {riskAnalysis.averageDelayDays} {t('credit.days')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant='subtitle2' gutterBottom>
                        {t('credit.on_time_payments')}
                      </Typography>
                      <Typography variant='body1'>{riskAnalysis.totalPaidOnTime}%</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant='subtitle2' gutterBottom>
                        {t('credit.credit_utilization')}
                      </Typography>
                      <Typography variant='body1'>{riskAnalysis.creditUtilization}%</Typography>
                    </Grid>
                  </Grid>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Approval Form */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant='h6' gutterBottom>
                  {t('credit.approval_decision')}
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name='approvalDecision'
                      control={form.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          select
                          label={t('credit.decision')}
                          fullWidth
                          SelectProps={{ native: true }}
                          error={!!form.formState.errors.approvalDecision}
                          helperText={form.formState.errors.approvalDecision?.message}
                        >
                          <option value='APPROVE'>{t('credit.approve')}</option>
                          <option value='REJECT'>{t('credit.reject')}</option>
                          <option value='ESCALATE'>{t('credit.escalate')}</option>
                        </TextField>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name='newCreditLimit'
                      control={form.control}
                      render={({ field }) => (
                        <AmountInput
                          label={t('credit.new_credit_limit')}
                          value={field.value || 0}
                          onChange={field.onChange}
                          error={!!form.formState.errors.newCreditLimit}
                          helperText={form.formState.errors.newCreditLimit?.message}
                          fullWidth
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name='approvalNotes'
                      control={form.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t('credit.approval_notes')}
                          fullWidth
                          multiline
                          rows={4}
                          placeholder={t('credit.approval_notes_placeholder')}
                          error={!!form.formState.errors.approvalNotes}
                          helperText={form.formState.errors.approvalNotes?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading} variant='outlined'>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={form.handleSubmit(handleSubmit)}
          variant='contained'
          disabled={loading || !customer}
          sx={{ minWidth: 160 }}
        >
          {loading ? t('common.processing') : t('credit.submit_approval')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
