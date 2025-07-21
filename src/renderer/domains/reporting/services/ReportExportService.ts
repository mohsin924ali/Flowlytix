/**
 * Report Export Service
 *
 * Following Instructions standards with clean architecture and DDD principles.
 * Implements export functionality for multiple formats with proper error handling.
 *
 * @domain Reporting
 * @pattern Service Layer
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { ReportFormat, ReportFormatValue } from '../valueObjects/ReportFormat';
import type { ReportData, IReportExportService, ReportErrorCode } from '../types/ReportTypes';
import { ReportErrorCodes } from '../types/ReportTypes';

/**
 * Export operation context
 */
export interface ExportContext {
  readonly userId: string;
  readonly agencyId: string;
  readonly timestamp: Date;
  readonly clientInfo?: {
    readonly userAgent: string;
    readonly deviceType: 'desktop' | 'mobile' | 'tablet';
  };
}

/**
 * Export options interface
 */
export interface ExportOptions {
  readonly compress?: boolean;
  readonly encrypt?: boolean;
  readonly watermark?: string;
  readonly pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
  readonly orientation?: 'portrait' | 'landscape';
  readonly includeCharts?: boolean;
  readonly includeImages?: boolean;
  readonly quality?: 'draft' | 'standard' | 'high';
  readonly metadata?: Record<string, unknown>;
}

/**
 * Export result interface
 */
export interface ExportResult {
  readonly success: boolean;
  readonly data?: Blob;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly fileSize?: number;
  readonly error?: {
    readonly code: ReportErrorCode;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
  readonly metadata: {
    readonly exportTime: number; // in milliseconds
    readonly format: ReportFormat;
    readonly originalSize: number;
    readonly compressedSize?: number;
    readonly exportedAt: Date;
  };
}

/**
 * Export capabilities interface
 */
export interface ExportCapabilities {
  readonly supportsCharts: boolean;
  readonly supportsImages: boolean;
  readonly supportsMultipleSheets: boolean;
  readonly supportsFormulas: boolean;
  readonly supportsFormatting: boolean;
  readonly supportsPagination: boolean;
  readonly supportsCompression: boolean;
  readonly supportsEncryption: boolean;
  readonly maxFileSize: number; // in bytes
  readonly maxRecords: number;
}

/**
 * Report Export Service Implementation
 * Handles conversion of report data to various export formats
 */
export class ReportExportService implements IReportExportService {
  /**
   * Export report to specified format
   */
  async exportReport(
    reportData: ReportData,
    format: ReportFormat,
    options: ExportOptions = {},
    context?: ExportContext
  ): Promise<Blob> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Export Service: Starting export to ${format}`, {
        reportType: reportData.reportType,
        recordCount: reportData.metadata.recordCount,
        format,
        options,
      });

      // Validate inputs
      this.validateExportRequest(reportData, format, options);

      // Check format capabilities
      const capabilities = await this.getExportCapabilities(format);
      this.validateBasicCapabilities(reportData, format, options);

      // Perform export based on format
      const result = await this.performExport(reportData, format, options, context);

      const exportTime = Date.now() - startTime;
      console.log(`✅ Export Service: Export completed successfully`, {
        format,
        fileSize: result.size,
        exportTime,
      });

      return result;
    } catch (error) {
      const exportTime = Date.now() - startTime;
      console.error(`❌ Export Service: Export failed`, {
        format,
        exportTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof ExportError) {
        throw error;
      }

      throw new ExportError(
        ReportErrorCodes.GENERATION_FAILED,
        `Failed to export report to ${format}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { format, reportType: reportData.reportType, exportTime }
      );
    }
  }

  /**
   * Get export capabilities for a format
   */
  async getExportCapabilities(format: ReportFormat): Promise<Record<string, boolean>> {
    const formatValue = ReportFormatValue.from(format);
    const features = formatValue.getFeatures();
    const metadata = formatValue.getMetadata();

    return {
      supportsCharts: features.supportsCharts,
      supportsImages: features.supportsImages,
      supportsMultipleSheets: features.supportsMultipleSheets,
      supportsFormulas: features.supportsFormulas,
      supportsFormatting: features.supportsFormatting,
      supportsPagination: features.supportsPagination,
      supportsLargeDatasets: features.supportsLargeDatasets,
      preservesStructure: features.preservesStructure,
      isHumanReadable: features.isHumanReadable,
      compressionSupported: metadata.compressionSupported,
      encryptionSupported: metadata.encryptionSupported,
      browserCompatible: metadata.browserCompatible,
      mobileSupported: metadata.mobileSupported,
    };
  }

  /**
   * Convert between formats
   */
  async convertFormat(sourceBlob: Blob, sourceFormat: ReportFormat, targetFormat: ReportFormat): Promise<Blob> {
    console.log(`🔄 Export Service: Converting from ${sourceFormat} to ${targetFormat}`);

    try {
      // Validate conversion possibility
      this.validateFormatConversion(sourceFormat, targetFormat);

      // For now, format conversion requires re-generation from original data
      // In a real implementation, this would depend on the specific formats
      throw new ExportError(
        ReportErrorCodes.CONFIGURATION_ERROR,
        `Direct conversion from ${sourceFormat} to ${targetFormat} is not supported. Please regenerate the report in the target format.`,
        { sourceFormat, targetFormat }
      );
    } catch (error) {
      console.error(`❌ Export Service: Format conversion failed`, {
        sourceFormat,
        targetFormat,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Validate export request
   */
  private validateExportRequest(reportData: ReportData, format: ReportFormat, options: ExportOptions): void {
    if (!reportData) {
      throw new ExportError(ReportErrorCodes.INVALID_PARAMETERS, 'Report data is required for export');
    }

    if (!reportData.sections || reportData.sections.length === 0) {
      throw new ExportError(ReportErrorCodes.INSUFFICIENT_DATA, 'Report must contain at least one section to export');
    }

    const formatValue = ReportFormatValue.from(format);
    if (!formatValue.supportsFormat(format)) {
      throw new ExportError(ReportErrorCodes.INVALID_FORMAT, `Unsupported export format: ${format}`);
    }

    // Validate record count limits
    const recordCount = reportData.metadata.recordCount;
    if (!formatValue.canHandleRecordCount(recordCount)) {
      throw new ExportError(
        ReportErrorCodes.FILE_SIZE_LIMIT_EXCEEDED,
        `Format ${format} cannot handle ${recordCount} records. Maximum supported: ${formatValue.getMaxRecords()}`
      );
    }

    // Validate options
    if (options.encrypt && !formatValue.supportsEncryption()) {
      throw new ExportError(ReportErrorCodes.FORMAT_NOT_SUPPORTED, `Format ${format} does not support encryption`);
    }

    if (options.compress && !formatValue.supportsCompression()) {
      throw new ExportError(ReportErrorCodes.FORMAT_NOT_SUPPORTED, `Format ${format} does not support compression`);
    }
  }

  /**
   * Validate capabilities against requirements
   */
  private validateCapabilities(reportData: ReportData, capabilities: ExportCapabilities, options: ExportOptions): void {
    const recordCount = reportData.metadata.recordCount;

    // Check record count limits
    if (recordCount > capabilities.maxRecords) {
      throw new ExportError(
        ReportErrorCodes.FILE_SIZE_LIMIT_EXCEEDED,
        `Record count ${recordCount} exceeds format limit of ${capabilities.maxRecords}`
      );
    }

    // Check chart support
    const hasCharts = reportData.sections.some((section) => section.type === 'chart');
    if (hasCharts && options.includeCharts !== false && !capabilities.supportsCharts) {
      throw new ExportError(
        ReportErrorCodes.FORMAT_NOT_SUPPORTED,
        'Format does not support charts. Set includeCharts to false or use a different format.'
      );
    }

    // Check image support
    const hasImages = reportData.sections.some((section) => section.type === 'image');
    if (hasImages && options.includeImages !== false && !capabilities.supportsImages) {
      throw new ExportError(
        ReportErrorCodes.FORMAT_NOT_SUPPORTED,
        'Format does not support images. Set includeImages to false or use a different format.'
      );
    }
  }

  /**
   * Perform the actual export based on format
   */
  private async performExport(
    reportData: ReportData,
    format: ReportFormat,
    options: ExportOptions,
    context?: ExportContext
  ): Promise<Blob> {
    switch (format) {
      case ReportFormat.PDF:
        return this.exportToPDF(reportData, options, context);

      case ReportFormat.EXCEL:
        return this.exportToExcel(reportData, options, context);

      case ReportFormat.CSV:
        return this.exportToCSV(reportData, options, context);

      case ReportFormat.JSON:
        return this.exportToJSON(reportData, options, context);

      case ReportFormat.XML:
        return this.exportToXML(reportData, options, context);

      case ReportFormat.HTML:
        return this.exportToHTML(reportData, options, context);

      case ReportFormat.PRINT:
        return this.exportToPrint(reportData, options, context);

      default:
        throw new ExportError(ReportErrorCodes.INVALID_FORMAT, `Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to PDF format
   */
  private async exportToPDF(reportData: ReportData, options: ExportOptions, context?: ExportContext): Promise<Blob> {
    console.log('📄 Export Service: Generating PDF');

    try {
      // In a real implementation, this would use a PDF generation library like jsPDF or Puppeteer
      const htmlContent = await this.generateHTMLContent(reportData, options, true);

      // Mock PDF generation - in reality would use proper PDF library
      const pdfData = await this.convertHTMLToPDF(htmlContent, options);

      return new Blob([pdfData], { type: 'application/pdf' });
    } catch (error) {
      throw new ExportError(
        ReportErrorCodes.GENERATION_FAILED,
        `PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Export to Excel format
   */
  private async exportToExcel(reportData: ReportData, options: ExportOptions, context?: ExportContext): Promise<Blob> {
    console.log('📊 Export Service: Generating Excel');

    try {
      // In a real implementation, this would use a library like ExcelJS or SheetJS
      const workbookData = await this.generateExcelWorkbook(reportData, options);

      return new Blob([workbookData], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } catch (error) {
      throw new ExportError(
        ReportErrorCodes.GENERATION_FAILED,
        `Excel export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(reportData: ReportData, options: ExportOptions, context?: ExportContext): Promise<Blob> {
    console.log('📋 Export Service: Generating CSV');

    try {
      const csvContent = await this.generateCSVContent(reportData, options);

      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      throw new ExportError(
        ReportErrorCodes.GENERATION_FAILED,
        `CSV export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(reportData: ReportData, options: ExportOptions, context?: ExportContext): Promise<Blob> {
    console.log('📁 Export Service: Generating JSON');

    try {
      const jsonContent = JSON.stringify(reportData, null, 2);

      return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    } catch (error) {
      throw new ExportError(
        ReportErrorCodes.GENERATION_FAILED,
        `JSON export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Export to XML format
   */
  private async exportToXML(reportData: ReportData, options: ExportOptions, context?: ExportContext): Promise<Blob> {
    console.log('📄 Export Service: Generating XML');

    try {
      const xmlContent = await this.generateXMLContent(reportData, options);

      return new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    } catch (error) {
      throw new ExportError(
        ReportErrorCodes.GENERATION_FAILED,
        `XML export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Export to HTML format
   */
  private async exportToHTML(reportData: ReportData, options: ExportOptions, context?: ExportContext): Promise<Blob> {
    console.log('🌐 Export Service: Generating HTML');

    try {
      const htmlContent = await this.generateHTMLContent(reportData, options, false);

      return new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    } catch (error) {
      throw new ExportError(
        ReportErrorCodes.GENERATION_FAILED,
        `HTML export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Export to print-optimized format
   */
  private async exportToPrint(reportData: ReportData, options: ExportOptions, context?: ExportContext): Promise<Blob> {
    console.log('🖨️ Export Service: Generating print-optimized format');

    // Print format is essentially PDF with print-specific optimizations
    const printOptions: ExportOptions = {
      ...options,
      pageSize: options.pageSize || 'A4',
      orientation: options.orientation || 'portrait',
      quality: 'high',
    };

    return this.exportToPDF(reportData, printOptions, context);
  }

  /**
   * Generate HTML content for PDF/HTML exports
   */
  private async generateHTMLContent(reportData: ReportData, options: ExportOptions, forPDF: boolean): Promise<string> {
    const title = reportData.title || 'Report';
    const subtitle = reportData.subtitle || '';
    const generatedAt = reportData.footer?.generatedAt?.toLocaleString() || new Date().toLocaleString();
    const generatedBy = reportData.footer?.generatedBy || 'Flowlytix';

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    <style>
        ${this.generateCSS(options, forPDF)}
    </style>
</head>
<body>
    <div class="report-container">
        <header class="report-header">
            <h1>${this.escapeHtml(title)}</h1>
            ${subtitle ? `<h2>${this.escapeHtml(subtitle)}</h2>` : ''}
            <div class="report-meta">
                <span>Generated: ${generatedAt}</span>
                <span>By: ${generatedBy}</span>
            </div>
        </header>

        <main class="report-content">`;

    // Add summary if present
    if (reportData.summary) {
      html += this.generateSummaryHTML(reportData.summary);
    }

    // Add sections
    for (const section of reportData.sections) {
      html += await this.generateSectionHTML(section, options);
    }

    html += `
        </main>

        <footer class="report-footer">
            <div class="footer-content">
                <span>Report ID: ${reportData.metadata.executionTime || 'N/A'}</span>
                <span>Records: ${reportData.metadata.recordCount.toLocaleString()}</span>
                <span>Generated by Flowlytix</span>
            </div>
        </footer>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate CSS styles for HTML/PDF
   */
  private generateCSS(options: ExportOptions, forPDF: boolean): string {
    const pageSize = options.pageSize || 'A4';
    const orientation = options.orientation || 'portrait';

    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: #fff;
        }

        .report-container {
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
        }

        .report-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #007acc;
        }

        .report-header h1 {
            color: #007acc;
            font-size: 24px;
            margin-bottom: 10px;
        }

        .report-header h2 {
            color: #666;
            font-size: 16px;
            margin-bottom: 15px;
        }

        .report-meta {
            font-size: 11px;
            color: #666;
        }

        .report-meta span {
            margin: 0 15px;
        }

        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }

        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #007acc;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ddd;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .table th,
        .table td {
            padding: 8px 12px;
            text-align: left;
            border: 1px solid #ddd;
        }

        .table th {
            background-color: #f5f5f5;
            font-weight: bold;
            color: #333;
        }

        .table tbody tr:nth-child(even) {
            background-color: #f9f9f9;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .metric-card {
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            text-align: center;
        }

        .metric-value {
            font-size: 20px;
            font-weight: bold;
            color: #007acc;
        }

        .metric-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }

        .report-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 10px;
            color: #666;
        }

        .footer-content span {
            margin: 0 15px;
        }

        ${
          forPDF
            ? `
        @page {
            size: ${pageSize} ${orientation};
            margin: 1in;
        }

        .page-break {
            page-break-before: always;
        }
        `
            : ''
        }

        @media print {
            .report-container {
                max-width: none;
                margin: 0;
                padding: 0;
            }
        }
    `;
  }

  /**
   * Generate summary HTML
   */
  private generateSummaryHTML(summary: {
    keyFindings: string[];
    recommendations?: string[];
    caveats?: string[];
  }): string {
    let html = '<div class="section summary-section">';
    html += '<h3 class="section-title">Summary</h3>';

    if (summary.keyFindings && summary.keyFindings.length > 0) {
      html += '<div class="key-findings">';
      html += '<h4>Key Findings:</h4>';
      html += '<ul>';
      summary.keyFindings.forEach((finding) => {
        html += `<li>${this.escapeHtml(finding)}</li>`;
      });
      html += '</ul>';
      html += '</div>';
    }

    if (summary.recommendations && summary.recommendations.length > 0) {
      html += '<div class="recommendations">';
      html += '<h4>Recommendations:</h4>';
      html += '<ul>';
      summary.recommendations.forEach((rec) => {
        html += `<li>${this.escapeHtml(rec)}</li>`;
      });
      html += '</ul>';
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Generate section HTML
   */
  private async generateSectionHTML(section: any, options: ExportOptions): Promise<string> {
    let html = `<div class="section">`;
    html += `<h3 class="section-title">${this.escapeHtml(section.title)}</h3>`;

    switch (section.type) {
      case 'table':
        html += this.generateTableHTML(section.content);
        break;
      case 'metrics':
        html += this.generateMetricsHTML(section.content);
        break;
      case 'chart':
        if (options.includeCharts !== false) {
          html += this.generateChartHTML(section.content);
        }
        break;
      case 'text':
        html += `<div class="text-content">${this.escapeHtml(section.content)}</div>`;
        break;
      default:
        html += `<div class="unsupported-content">Unsupported section type: ${section.type}</div>`;
    }

    html += '</div>';
    return html;
  }

  /**
   * Generate table HTML
   */
  private generateTableHTML(tableData: any): string {
    if (!tableData.columns || !tableData.rows) {
      return '<div class="error">Invalid table data</div>';
    }

    let html = '<table class="table">';

    // Header
    html += '<thead><tr>';
    tableData.columns.forEach((col: any) => {
      html += `<th>${this.escapeHtml(col.label)}</th>`;
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody>';
    tableData.rows.forEach((row: any) => {
      html += '<tr>';
      tableData.columns.forEach((col: any) => {
        const value = row[col.key] || '';
        html += `<td>${this.escapeHtml(String(value))}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';

    html += '</table>';
    return html;
  }

  /**
   * Generate metrics HTML
   */
  private generateMetricsHTML(metrics: any[]): string {
    let html = '<div class="metrics-grid">';

    metrics.forEach((metric) => {
      html += '<div class="metric-card">';
      html += `<div class="metric-value">${this.escapeHtml(String(metric.value))}</div>`;
      html += `<div class="metric-label">${this.escapeHtml(metric.label)}</div>`;
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  /**
   * Generate chart HTML placeholder
   */
  private generateChartHTML(chartData: any): string {
    return `<div class="chart-placeholder">
        <p>Chart: ${this.escapeHtml(chartData.title || 'Untitled Chart')}</p>
        <p><em>Chart rendering in HTML/PDF export is not yet implemented</em></p>
    </div>`;
  }

  /**
   * Generate CSV content
   */
  private async generateCSVContent(reportData: ReportData, options: ExportOptions): Promise<string> {
    let csvContent = '';

    // Add header information
    csvContent += `Report: ${this.escapeCSV(reportData.title)}\n`;
    csvContent += `Generated: ${reportData.footer?.generatedAt?.toISOString() || new Date().toISOString()}\n`;
    csvContent += `Records: ${reportData.metadata.recordCount}\n`;
    csvContent += '\n';

    // Process each section
    for (const section of reportData.sections) {
      if (section.type === 'table') {
        csvContent += `Section: ${this.escapeCSV(section.title)}\n`;
        csvContent += this.generateTableCSV(section.content);
        csvContent += '\n';
      } else if (section.type === 'metrics') {
        csvContent += `Metrics: ${this.escapeCSV(section.title)}\n`;
        csvContent += this.generateMetricsCSV(section.content);
        csvContent += '\n';
      }
    }

    return csvContent;
  }

  /**
   * Generate table CSV
   */
  private generateTableCSV(tableData: any): string {
    if (!tableData.columns || !tableData.rows) {
      return 'Invalid table data\n';
    }

    let csv = '';

    // Header
    const headers = tableData.columns.map((col: any) => this.escapeCSV(col.label));
    csv += headers.join(',') + '\n';

    // Rows
    tableData.rows.forEach((row: any) => {
      const values = tableData.columns.map((col: any) => {
        const value = row[col.key] || '';
        return this.escapeCSV(String(value));
      });
      csv += values.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Generate metrics CSV
   */
  private generateMetricsCSV(metrics: any[]): string {
    let csv = 'Metric,Value\n';

    metrics.forEach((metric) => {
      csv += `${this.escapeCSV(metric.label)},${this.escapeCSV(String(metric.value))}\n`;
    });

    return csv;
  }

  /**
   * Generate Excel workbook (mock implementation)
   */
  private async generateExcelWorkbook(reportData: ReportData, options: ExportOptions): Promise<ArrayBuffer> {
    // In a real implementation, this would use ExcelJS or similar library
    console.log('📊 Generating Excel workbook (mock implementation)');

    // For now, return a simple mock Excel file
    // In production, implement proper Excel generation
    const mockExcelData = new ArrayBuffer(1024);
    return mockExcelData;
  }

  /**
   * Generate XML content
   */
  private async generateXMLContent(reportData: ReportData, options: ExportOptions): Promise<string> {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<report>\n';
    xml += `  <title>${this.escapeXml(reportData.title)}</title>\n`;
    xml += `  <generated>${reportData.footer?.generatedAt?.toISOString() || new Date().toISOString()}</generated>\n`;
    xml += `  <recordCount>${reportData.metadata.recordCount}</recordCount>\n`;
    xml += '  <sections>\n';

    for (const section of reportData.sections) {
      xml += `    <section type="${section.type}">\n`;
      xml += `      <title>${this.escapeXml(section.title)}</title>\n`;

      if (section.type === 'table') {
        xml += this.generateTableXML(section.content);
      } else if (section.type === 'metrics') {
        xml += this.generateMetricsXML(section.content);
      }

      xml += '    </section>\n';
    }

    xml += '  </sections>\n';
    xml += '</report>';

    return xml;
  }

  /**
   * Generate table XML
   */
  private generateTableXML(tableData: any): string {
    if (!tableData.columns || !tableData.rows) {
      return '      <error>Invalid table data</error>\n';
    }

    let xml = '      <table>\n';
    xml += '        <columns>\n';

    tableData.columns.forEach((col: any) => {
      xml += `          <column key="${this.escapeXml(col.key)}" label="${this.escapeXml(col.label)}" type="${this.escapeXml(col.type || 'string')}" />\n`;
    });

    xml += '        </columns>\n';
    xml += '        <rows>\n';

    tableData.rows.forEach((row: any) => {
      xml += '          <row>\n';
      tableData.columns.forEach((col: any) => {
        const value = row[col.key] || '';
        xml += `            <cell key="${this.escapeXml(col.key)}">${this.escapeXml(String(value))}</cell>\n`;
      });
      xml += '          </row>\n';
    });

    xml += '        </rows>\n';
    xml += '      </table>\n';

    return xml;
  }

  /**
   * Generate metrics XML
   */
  private generateMetricsXML(metrics: any[]): string {
    let xml = '      <metrics>\n';

    metrics.forEach((metric) => {
      xml += `        <metric label="${this.escapeXml(metric.label)}" value="${this.escapeXml(String(metric.value))}" format="${this.escapeXml(metric.format || 'text')}" />\n`;
    });

    xml += '      </metrics>\n';
    return xml;
  }

  /**
   * Convert HTML to PDF (mock implementation)
   */
  private async convertHTMLToPDF(htmlContent: string, options: ExportOptions): Promise<ArrayBuffer> {
    // In a real implementation, this would use Puppeteer, jsPDF, or similar
    console.log('📄 Converting HTML to PDF (mock implementation)');

    // Mock PDF generation
    const mockPdfData = new ArrayBuffer(2048);
    return mockPdfData;
  }

  /**
   * Validate format conversion
   */
  private validateFormatConversion(sourceFormat: ReportFormat, targetFormat: ReportFormat): void {
    if (sourceFormat === targetFormat) {
      throw new ExportError(ReportErrorCodes.INVALID_PARAMETERS, 'Source and target formats cannot be the same');
    }

    // Add specific conversion rules
    const unsupportedConversions = [
      [ReportFormat.PDF, ReportFormat.EXCEL],
      [ReportFormat.PDF, ReportFormat.CSV],
    ];

    const conversionKey = [sourceFormat, targetFormat];
    const isUnsupported = unsupportedConversions.some(
      ([src, tgt]) => src === conversionKey[0] && tgt === conversionKey[1]
    );

    if (isUnsupported) {
      throw new ExportError(
        ReportErrorCodes.FORMAT_NOT_SUPPORTED,
        `Conversion from ${sourceFormat} to ${targetFormat} is not supported`
      );
    }
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Escape CSV values
   */
  private escapeCSV(text: string): string {
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  /**
   * Escape XML entities
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * Export error class
 */
export class ExportError extends Error {
  constructor(
    public readonly code: ReportErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ExportError';
  }
}

/**
 * Export service factory
 */
export class ExportServiceFactory {
  /**
   * Create export service instance
   */
  static createExportService(): ReportExportService {
    return new ReportExportService();
  }

  /**
   * Create export context
   */
  static createExportContext(
    userId: string,
    agencyId: string,
    clientInfo?: { userAgent: string; deviceType: 'desktop' | 'mobile' | 'tablet' }
  ): ExportContext {
    return {
      userId,
      agencyId,
      timestamp: new Date(),
      clientInfo,
    };
  }
}

/**
 * Export service utilities
 */
export const ExportServiceUtils = {
  /**
   * Get file extension for format
   */
  getFileExtension: (format: ReportFormat): string => {
    const formatValue = ReportFormatValue.from(format);
    return formatValue.getFileExtension();
  },

  /**
   * Get MIME type for format
   */
  getMimeType: (format: ReportFormat): string => {
    const formatValue = ReportFormatValue.from(format);
    return formatValue.getMimeType();
  },

  /**
   * Generate filename for export
   */
  generateFileName: (reportTitle: string, format: ReportFormat, timestamp?: Date): string => {
    const formatValue = ReportFormatValue.from(format);
    const baseName = reportTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const dateStr = timestamp
      ? timestamp.toISOString().slice(0, 19).replace(/[:-]/g, '')
      : new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');

    return `${baseName}_${dateStr}.${formatValue.getFileExtension()}`;
  },

  /**
   * Calculate estimated file size
   */
  estimateFileSize: (recordCount: number, format: ReportFormat, avgRecordSize: number = 1024): number => {
    const formatValue = ReportFormatValue.from(format);
    return formatValue.estimateFileSize(recordCount, avgRecordSize);
  },

  /**
   * Validate export options
   */
  validateExportOptions: (format: ReportFormat, options: ExportOptions): { isValid: boolean; errors: string[] } => {
    const formatValue = ReportFormatValue.from(format);
    const errors: string[] = [];

    if (options.encrypt && !formatValue.supportsEncryption()) {
      errors.push(`Format ${format} does not support encryption`);
    }

    if (options.compress && !formatValue.supportsCompression()) {
      errors.push(`Format ${format} does not support compression`);
    }

    if (options.includeCharts && !formatValue.supportsCharts()) {
      errors.push(`Format ${format} does not support charts`);
    }

    if (options.includeImages && !formatValue.supportsImages()) {
      errors.push(`Format ${format} does not support images`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
} as const;
