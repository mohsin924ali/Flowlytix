/**
 * Generate Reports Page Component
 *
 * Following Instructions standards with clean architecture.
 * Page for generating new reports using the ReportConfigForm component.
 *
 * @component GenerateReportsPage
 * @pattern Page Component
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Button,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { ArrowBack, Assignment, Home } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/templates';
import { ReportConfigForm } from '../components/molecules';
import { useAuthStore } from '../store/auth.store';
import { useAgencyStore } from '../store/agency.store';
import { ReportType, ReportFormat, ReportExecutionRequest } from '../domains/reporting';
import { ReportService } from '../domains/reporting/services';
import { ROUTES } from '../constants/navigation.constants';

// ==================== ANIMATION VARIANTS ====================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ==================== COMPONENT ====================

export const GenerateReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { currentAgency } = useAgencyStore();

  // ==================== STATE ====================

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ==================== COMPUTED VALUES ====================

  // Get initial report type from navigation state
  const initialReportType = location.state?.selectedReportType as ReportType | undefined;

  // ==================== HANDLERS ====================

  const handleReportSubmit = async (request: ReportExecutionRequest) => {
    if (!user || !currentAgency) {
      setError('User authentication or agency information is missing');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Initialize the report service
      const reportService = new ReportService();

      // Execute the report
      const result = await reportService.executeReport(request);

      if (result.status === 'completed') {
        setSuccess(`Report "${request.parameters.title}" has been generated successfully!`);

        // Navigate to reports history after a delay
        setTimeout(() => {
          navigate(ROUTES.REPORTS_HISTORY);
        }, 2000);
      } else if (result.status === 'running') {
        setSuccess(
          `Report "${request.parameters.title}" is being generated. You can check its progress in the reports history.`
        );

        // Navigate to reports history after a delay
        setTimeout(() => {
          navigate(ROUTES.REPORTS_HISTORY);
        }, 3000);
      } else {
        setError(`Report generation failed: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Report generation error:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // DEBUG: Test PDF generation directly
  const handleTestPdfGeneration = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🧪 Testing PDF generation directly...');

      // Dynamically import jsPDF
      const { jsPDF } = await import('jspdf');

      // Create a simple test PDF
      const pdf = new jsPDF();
      pdf.setFontSize(16);
      pdf.text('TEST PDF GENERATION', 20, 20);
      pdf.setFontSize(12);
      pdf.text('This is a test PDF generated directly using jsPDF.', 20, 40);
      pdf.text(`Generated at: ${new Date().toLocaleString()}`, 20, 60);
      pdf.text('If you can read this, PDF generation is working correctly.', 20, 80);

      // Generate and download
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `test-pdf-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess('Test PDF generated and downloaded successfully! Check your downloads folder.');
      console.log('✅ Test PDF generated successfully');
    } catch (err: any) {
      console.error('❌ Test PDF generation failed:', err);
      setError(`Test PDF generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(ROUTES.REPORTS_DASHBOARD);
  };

  const handleBackToReports = () => {
    navigate(ROUTES.REPORTS_DASHBOARD);
  };

  // ==================== RENDER ====================

  return (
    <DashboardLayout title='Generate Report'>
      <motion.div variants={containerVariants} initial='hidden' animate='visible'>
        <Container maxWidth='lg' sx={{ py: 3 }}>
          {/* Navigation */}
          <Box sx={{ mb: 3 }}>
            <Breadcrumbs aria-label='breadcrumb'>
              <Link
                component='button'
                variant='body2'
                onClick={handleBackToReports}
                sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
              >
                <Home sx={{ mr: 0.5 }} fontSize='small' />
                Reports
              </Link>
              <Typography color='text.primary' sx={{ display: 'flex', alignItems: 'center' }}>
                <Assignment sx={{ mr: 0.5 }} fontSize='small' />
                Generate Report
              </Typography>
            </Breadcrumbs>
          </Box>

          {/* Header */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant='h4' component='h1' sx={{ mb: 2, fontWeight: 600 }}>
              Generate New Report
            </Typography>
            <Typography variant='body1' color='text.secondary'>
              Configure and generate custom reports for your business insights
            </Typography>
          </Box>

          {/* Debug Test Button */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Button
                variant='outlined'
                color='warning'
                onClick={handleTestPdfGeneration}
                disabled={loading}
                sx={{ mr: 2 }}
              >
                🧪 Test PDF Generation (Debug)
              </Button>
            </Box>
          )}

          {/* Status Messages */}
          {error && (
            <Alert severity='error' sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity='success' sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {/* Report Configuration Form */}
          <motion.div variants={cardVariants}>
            <Card elevation={2}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant='h6' sx={{ fontWeight: 600, mb: 3 }}>
                  Report Configuration
                </Typography>

                <ReportConfigForm
                  onSubmit={handleReportSubmit}
                  onCancel={handleCancel}
                  {...(initialReportType && { initialReportType })}
                  loading={loading}
                  showAdvanced={true}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Help Section */}
          <motion.div variants={cardVariants}>
            <Card sx={{ mt: 3 }} elevation={1}>
              <CardContent>
                <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
                  Need Help?
                </Typography>

                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                  Here are some tips for generating reports:
                </Typography>

                <Box component='ul' sx={{ pl: 2, mb: 0 }}>
                  <Typography component='li' variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                    <strong>Report Type:</strong> Choose the type that best matches your business needs
                  </Typography>
                  <Typography component='li' variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                    <strong>Export Format:</strong> PDF for presentation, Excel for analysis, CSV for data processing
                  </Typography>
                  <Typography component='li' variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                    <strong>Date Range:</strong> Select an appropriate time period for meaningful insights
                  </Typography>
                  <Typography component='li' variant='body2' color='text.secondary'>
                    <strong>Advanced Options:</strong> Enable charts and images for more visual reports
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Container>
      </motion.div>
    </DashboardLayout>
  );
};

export default GenerateReportsPage;
