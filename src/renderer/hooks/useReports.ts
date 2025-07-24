/**
 * useReports Hook
 *
 * Hook for managing report history and file operations.
 * Fetches real generated reports from storage.
 *
 * @hook useReports
 * @pattern Custom Hook
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { ReportFileService } from '../domains/reporting/services/ReportFileService';
import type { FileMetadata } from '../domains/reporting/services/ReportFileService';
import { ReportFormat, ReportType, ReportStatus } from '../domains/reporting';
import { useAuthStore } from '../store/auth.store';
import { useAgencyStore } from '../store/agency.store';

/**
 * Report history item interface for UI display
 */
export interface ReportHistoryItem {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  generatedAt: Date;
  fileSize?: number;
  downloadUrl?: string;
  error?: string;
}

/**
 * Hook return interface
 */
interface UseReportsReturn {
  reports: ReportHistoryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  downloadReport: (reportId: string) => Promise<void>;
}

/**
 * Custom hook for report operations
 */
export const useReports = (): UseReportsReturn => {
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const { currentAgency } = useAgencyStore();

  /**
   * Convert file metadata to report history item
   */
  const convertToReportHistoryItem = (metadata: FileMetadata): ReportHistoryItem => {
    return {
      id: metadata.fileId,
      name: metadata.fileName.replace(/\.[^/.]+$/, ''), // Remove file extension
      type: metadata.reportType as ReportType,
      format: metadata.format,
      status: ReportStatus.COMPLETED, // Files in storage are always completed
      generatedAt: metadata.createdAt,
      fileSize: metadata.fileSize / (1024 * 1024), // Convert to MB
      downloadUrl: `/api/reports/download/${metadata.fileId}`, // Mock download URL
    };
  };

  /**
   * Fetch reports from storage
   */
  const fetchReports = useCallback(async (): Promise<void> => {
    console.log('📋 useReports: fetchReports called with currentAgency:', currentAgency);

    // Use consistent agency ID - same fallback as report generation
    const agencyId = currentAgency?.id || 'agency-1';

    try {
      setLoading(true);
      setError(null);

      console.log(`📋 useReports: Fetching reports for agency ${agencyId}`);
      console.log(`📋 useReports: Current agency details:`, {
        id: currentAgency?.id,
        name: currentAgency?.name,
        fallbackUsed: !currentAgency?.id,
        fullAgency: currentAgency,
      });

      // Fetch file metadata from ReportFileService
      const fileMetadata = await ReportFileService.listFiles(agencyId, {
        limit: 50, // Get latest 50 reports
        offset: 0,
      });

      console.log(`📋 useReports: Raw file metadata:`, fileMetadata);

      console.log(`✅ useReports: Found ${fileMetadata.length} reports`);

      // Convert to UI format
      const reportItems = fileMetadata.map(convertToReportHistoryItem);

      setReports(reportItems);
    } catch (err) {
      console.error('❌ useReports: Failed to fetch reports:', err);
      console.error('❌ useReports: Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace',
        agencyId,
        currentAgency,
      });
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [currentAgency?.id]); // Only depend on the agency ID, not the whole object

  /**
   * Download a report file
   */
  const downloadReport = useCallback(async (reportId: string): Promise<void> => {
    try {
      console.log(`⬇️ useReports: Downloading report ${reportId}`);

      // Get file metadata first
      const metadata = await ReportFileService.getFileMetadata(reportId);
      if (!metadata) {
        throw new Error('Report not found');
      }

      // Generate download URL
      const downloadUrl = await ReportFileService.generateDownloadUrl(reportId);

      if (downloadUrl) {
        // Create a simple download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = metadata.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ useReports: Download initiated for ${metadata.fileName}`);
      } else {
        throw new Error('Failed to generate download URL');
      }
    } catch (err) {
      console.error('❌ useReports: Download failed:', err);
      throw err;
    }
  }, []);

  /**
   * Refresh reports list
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchReports();
  }, [fetchReports]);

  // Initial fetch
  useEffect(() => {
    console.log('📋 useReports: Initial fetch effect triggered');
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    loading,
    error,
    refresh,
    downloadReport,
  };
};
