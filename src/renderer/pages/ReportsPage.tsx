/**
 * Reports Page Component
 *
 * Following Instructions standards with clean architecture.
 * Main dashboard for report generation and management.
 *
 * @component ReportsPage
 * @pattern Page Component
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Assignment,
  Schedule,
  History,
  TrendingUp,
  GetApp,
  PlayArrow,
  Pause,
  Visibility,
  Add,
  Assessment,
  FileDownload,
  CalendarToday,
  AccessTime,
  CheckCircle,
  Error,
  Warning,
  Refresh,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { ReportStatusChip } from '../components/atoms';
import { useAuthStore } from '../store/auth.store';
import { useAgencyStore } from '../store/agency.store';
import {
  ReportType,
  ReportFormat,
  ReportStatus,
  ReportTypeValue,
  ScheduledReport,
  ScheduledReportUtils,
  ScheduleStatus,
} from '../domains/reporting';
import { ROUTES } from '../constants/navigation.constants';
import { useReports, type ReportHistoryItem } from '../hooks/useReports';

// ==================== ANIMATION VARIANTS ====================

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

// ==================== MOCK DATA ====================

// Mock scheduled reports - in real app this would come from a service
const mockScheduledReports: ScheduledReport[] = [];

// ==================== COMPONENT ====================

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuthStore();
  const { currentAgency } = useAgencyStore();

  // Debug when component mounts
  React.useEffect(() => {
    console.log('📊 ReportsPage: Component mounted with:', {
      user: user?.id,
      currentAgency: currentAgency?.id,
      currentAgencyName: currentAgency?.name,
    });
  }, []);

  // ==================== HOOKS ====================

  const { reports, loading, error, refresh, downloadReport } = useReports();

  // Debug the useReports hook state
  React.useEffect(() => {
    console.log('📊 ReportsPage: useReports state changed:', {
      reportsCount: reports.length,
      loading,
      error,
      reports: reports.slice(0, 3), // Show first 3 reports for debugging
    });
  }, [reports, loading, error]);

  // ==================== COMPUTED VALUES ====================

  const reportStats = useMemo(() => {
    const total = reports.length;
    const completed = reports.filter((r) => r.status === ReportStatus.COMPLETED).length;
    const running = reports.filter((r) => r.status === ReportStatus.RUNNING).length;
    const failed = reports.filter((r) => r.status === ReportStatus.FAILED).length;

    return { total, completed, running, failed };
  }, [reports]);

  const quickActions = [
    {
      title: 'Generate New Report',
      description: 'Create a new report with custom parameters',
      icon: Assignment,
      color: 'primary',
      action: () => navigate(ROUTES.REPORTS_GENERATE),
    },
    {
      title: 'Schedule Reports',
      description: 'Set up automated report generation',
      icon: Schedule,
      color: 'secondary',
      action: () => navigate(ROUTES.REPORTS_SCHEDULED),
    },
    {
      title: 'View History',
      description: 'Browse previously generated reports',
      icon: History,
      color: 'info',
      action: () => navigate(ROUTES.REPORTS_HISTORY),
    },
  ];

  const popularReportTypes = [
    {
      type: ReportType.ACCOUNTS_RECEIVABLE_AGING,
      name: 'Accounts Receivable Aging',
      description: 'Outstanding balances by aging buckets',
      usage: 78,
    },
    {
      type: ReportType.SALES_SUMMARY,
      name: 'Sales Summary',
      description: 'Comprehensive sales performance overview',
      usage: 65,
    },
    {
      type: ReportType.CREDIT_RISK_ASSESSMENT,
      name: 'Credit Risk Assessment',
      description: 'Customer credit risk analysis',
      usage: 52,
    },
    {
      type: ReportType.INVENTORY_STOCK_LEVELS,
      name: 'Inventory Status',
      description: 'Current inventory levels and status',
      usage: 43,
    },
  ];

  // ==================== HANDLERS ====================

  const handleGenerateReport = (reportType: ReportType) => {
    navigate(ROUTES.REPORTS_GENERATE, { state: { selectedReportType: reportType } });
  };

  const handleViewReport = async (reportId: string) => {
    try {
      await downloadReport(reportId);
    } catch (err) {
      console.error('Failed to download report:', err);
      // Could show a toast notification here
    }
  };

  // ==================== RENDER HELPERS ====================

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.COMPLETED:
        return <CheckCircle color='success' fontSize='small' />;
      case ReportStatus.RUNNING:
        return <CircularProgress size={16} color='primary' />;
      case ReportStatus.FAILED:
        return <Error color='error' fontSize='small' />;
      case ReportStatus.PENDING:
        return <AccessTime color='warning' fontSize='small' />;
      case ReportStatus.CANCELLED:
        return <Warning color='warning' fontSize='small' />;
      default:
        return <Warning color='warning' fontSize='small' />;
    }
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <DashboardLayout title='Reports'>
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
    <DashboardLayout title='Reports'>
      <motion.div variants={containerVariants} initial='hidden' animate='visible'>
        <Container maxWidth='xl' sx={{ py: 3 }}>
          {/* Header Section */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4 }}>
              <Typography variant='h4' sx={{ fontWeight: 700, mb: 1 }}>
                Report Management
              </Typography>
              <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
                Generate, schedule, and manage business reports for {currentAgency?.name || 'your agency'}
              </Typography>

              {error && (
                <Alert severity='error' sx={{ mb: 3 }} onClose={() => refresh()}>
                  {error}
                </Alert>
              )}
            </Box>
          </motion.div>

          {/* Statistics Cards */}
          <motion.div variants={itemVariants}>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Assessment sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {reportStats.total}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Total Reports
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'success.main' }}>
                      {reportStats.completed}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Completed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <AccessTime sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {reportStats.running}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Running
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Schedule sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant='h4' sx={{ fontWeight: 700, color: 'info.main' }}>
                      {mockScheduledReports.length}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Scheduled
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <Typography variant='h5' sx={{ fontWeight: 600, mb: 2 }}>
              Quick Actions
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {quickActions.map((action, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[8],
                      },
                    }}
                    onClick={action.action}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <action.icon sx={{ fontSize: 32, color: `${action.color}.main`, mr: 2 }} />
                        <Typography variant='h6' sx={{ fontWeight: 600 }}>
                          {action.title}
                        </Typography>
                      </Box>
                      <Typography variant='body2' color='text.secondary'>
                        {action.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </motion.div>

          <Grid container spacing={3}>
            {/* Recent Reports */}
            <Grid item xs={12} lg={8}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant='h6' sx={{ fontWeight: 600 }}>
                        Recent Reports
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton size='small' onClick={refresh} title='Refresh Reports'>
                          <Refresh />
                        </IconButton>
                        <Button size='small' onClick={() => navigate(ROUTES.REPORTS_HISTORY)} endIcon={<History />}>
                          View All
                        </Button>
                      </Box>
                    </Box>

                    <List>
                      {reports.map((report, index) => (
                        <React.Fragment key={report.id}>
                          <ListItem sx={{ px: 0 }}>
                            <Box sx={{ mr: 2 }}>{getStatusIcon(report.status)}</Box>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                                    {report.name}
                                  </Typography>
                                  <Chip label={report.format} size='small' variant='outlined' />
                                </Box>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant='caption' color='text.secondary'>
                                    {formatTimeAgo(report.generatedAt)}
                                    {report.fileSize && ` • ${report.fileSize} MB`}
                                  </Typography>

                                  {report.status === ReportStatus.RUNNING && (
                                    <Typography
                                      variant='caption'
                                      color='primary.main'
                                      sx={{ mt: 0.5, display: 'block' }}
                                    >
                                      Processing...
                                    </Typography>
                                  )}

                                  {report.status === ReportStatus.FAILED && report.error && (
                                    <Typography variant='caption' color='error.main' sx={{ mt: 0.5, display: 'block' }}>
                                      Error: {report.error}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              {report.status === ReportStatus.COMPLETED && (
                                <IconButton size='small' onClick={() => handleViewReport(report.id)}>
                                  <GetApp />
                                </IconButton>
                              )}
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < reports.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* Popular Report Types */}
            <Grid item xs={12} lg={4}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
                      Popular Reports
                    </Typography>

                    <List>
                      {popularReportTypes.map((reportType, index) => (
                        <React.Fragment key={reportType.type}>
                          <ListItem
                            sx={{
                              px: 0,
                              cursor: 'pointer',
                              borderRadius: 1,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              },
                            }}
                            onClick={() => handleGenerateReport(reportType.type)}
                          >
                            <ListItemText
                              primary={
                                <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                                  {reportType.name}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant='caption' color='text.secondary' sx={{ mb: 1 }}>
                                    {reportType.description}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                    <Box
                                      sx={{
                                        flex: 1,
                                        height: 3,
                                        backgroundColor: 'grey.200',
                                        borderRadius: 2,
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          width: `${reportType.usage}%`,
                                          height: '100%',
                                          backgroundColor: 'primary.main',
                                          borderRadius: 2,
                                        }}
                                      />
                                    </Box>
                                    <Typography variant='caption' color='text.secondary'>
                                      {reportType.usage}%
                                    </Typography>
                                  </Box>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton size='small'>
                                <Add />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < popularReportTypes.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </motion.div>
    </DashboardLayout>
  );
};

export default ReportsPage;
