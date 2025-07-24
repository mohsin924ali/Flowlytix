/**
 * Report Template Service
 *
 * Following Instructions standards with clean architecture and DDD principles.
 * Manages report templates and provides data generation capabilities.
 *
 * @domain Reporting
 * @pattern Service Layer
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { ReportType, ReportTypeValue } from '../valueObjects/ReportType';
import { ReportFormat } from '../valueObjects/ReportFormat';
import type {
  ReportTemplate,
  ReportParameter,
  ReportDataSource,
  ReportData,
  ReportSection,
  ChartData,
  TableData,
  MetricData,
  ReportExecutionContext,
  ReportErrorCode,
} from '../types/ReportTypes';
import { ReportErrorCodes } from '../types/ReportTypes';

/**
 * Template generation context
 */
export interface TemplateContext {
  readonly agencyId: string;
  readonly userId: string;
  readonly parameters: Record<string, unknown>;
  readonly filters: Record<string, unknown>;
  readonly dateRange: {
    readonly startDate: Date;
    readonly endDate: Date;
  };
}

/**
 * Data generation result
 */
export interface DataGenerationResult {
  readonly success: boolean;
  readonly data?: ReportData;
  readonly error?: {
    readonly code: ReportErrorCode;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
  readonly metadata: {
    readonly generationTime: number; // in milliseconds
    readonly recordCount: number;
    readonly dataSource: string;
    readonly cacheHit: boolean;
  };
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly missingParameters: string[];
}

/**
 * Report Template Service Implementation
 * Handles report template management and data generation
 */
export class ReportTemplateService {
  private static readonly templates = new Map<ReportType, ReportTemplate>();
  private static readonly dataCache = new Map<string, { data: any; timestamp: Date; ttl: number }>();
  private static readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  /**
   * Get report template by type
   */
  static async getReportTemplate(reportType: ReportType): Promise<ReportTemplate | null> {
    console.log(`📋 Template Service: Getting template for ${reportType}`);

    try {
      // Check cache first
      if (ReportTemplateService.templates.has(reportType)) {
        const template = ReportTemplateService.templates.get(reportType)!;
        console.log(`✅ Template Service: Found cached template for ${reportType}`);
        return template;
      }

      // Generate template if not cached
      const template = await ReportTemplateService.generateTemplate(reportType);
      if (template) {
        ReportTemplateService.templates.set(reportType, template);
        console.log(`✅ Template Service: Generated and cached template for ${reportType}`);
      }

      return template;
    } catch (error) {
      console.error(`❌ Template Service: Failed to get template for ${reportType}:`, error);
      return null;
    }
  }

  /**
   * Get all available templates
   */
  static async getReportTemplates(category?: string): Promise<ReportTemplate[]> {
    console.log(`📋 Template Service: Getting all templates${category ? ` for category ${category}` : ''}`);

    try {
      const reportTypes = ReportTypeValue.getAllTypes();
      const templates: ReportTemplate[] = [];

      for (const reportType of reportTypes) {
        const typeValue = ReportTypeValue.from(reportType);

        // Filter by category if specified
        if (category && typeValue.getCategory() !== category) {
          continue;
        }

        const template = await ReportTemplateService.getReportTemplate(reportType);
        if (template) {
          templates.push(template);
        }
      }

      console.log(`✅ Template Service: Retrieved ${templates.length} templates`);
      return templates;
    } catch (error) {
      console.error(`❌ Template Service: Failed to get templates:`, error);
      return [];
    }
  }

  /**
   * Generate report data from template
   */
  static async generateReportData(template: ReportTemplate, context: TemplateContext): Promise<DataGenerationResult> {
    const startTime = Date.now();

    console.log(`📊 Template Service: Generating data for ${template.type}`, {
      agencyId: context.agencyId,
      parameters: Object.keys(context.parameters),
      dateRange: context.dateRange,
    });

    try {
      // Validate template and context
      const validation = await ReportTemplateService.validateTemplate(template, context);
      if (!validation.isValid) {
        throw new TemplateError(
          ReportErrorCodes.INVALID_PARAMETERS,
          `Template validation failed: ${validation.errors.join(', ')}`,
          { errors: validation.errors, warnings: validation.warnings }
        );
      }

      // Check cache
      const cacheKey = ReportTemplateService.generateCacheKey(template.type, context);
      const cached = ReportTemplateService.getCachedData(cacheKey);
      if (cached) {
        console.log(`✅ Template Service: Using cached data for ${template.type}`);
        return {
          success: true,
          data: cached,
          metadata: {
            generationTime: Date.now() - startTime,
            recordCount: cached.metadata.recordCount,
            dataSource: 'cache',
            cacheHit: true,
          },
        };
      }

      // Generate fresh data
      const reportData = await ReportTemplateService.generateFreshData(template, context);

      // Cache the result
      ReportTemplateService.setCachedData(cacheKey, reportData, ReportTemplateService.CACHE_TTL);

      const generationTime = Date.now() - startTime;
      console.log(`✅ Template Service: Generated data for ${template.type}`, {
        recordCount: reportData.metadata.recordCount,
        generationTime,
      });

      return {
        success: true,
        data: reportData,
        metadata: {
          generationTime,
          recordCount: reportData.metadata.recordCount,
          dataSource: template.dataSource.type,
          cacheHit: false,
        },
      };
    } catch (error) {
      const generationTime = Date.now() - startTime;
      console.error(`❌ Template Service: Data generation failed for ${template.type}:`, error);

      return {
        success: false,
        error: {
          code: error instanceof TemplateError ? error.code : ReportErrorCodes.GENERATION_FAILED,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error instanceof TemplateError ? error.details : { template: template.type },
        } as any,
        metadata: {
          generationTime,
          recordCount: 0,
          dataSource: template.dataSource.type,
          cacheHit: false,
        },
      };
    }
  }

  /**
   * Validate report template
   */
  static async validateTemplate(
    template: ReportTemplate,
    context?: TemplateContext
  ): Promise<TemplateValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingParameters: string[] = [];

    // Validate template structure
    if (!template.id || !template.name || !template.type) {
      errors.push('Template must have id, name, and type');
    }

    if (!template.parameters || !Array.isArray(template.parameters)) {
      errors.push('Template must have parameters array');
    }

    if (!template.dataSource) {
      errors.push('Template must have data source configuration');
    }

    // Validate parameters if context provided
    if (context) {
      for (const param of template.parameters) {
        if (param.required && !(param.name in context.parameters)) {
          missingParameters.push(param.name);
        }
      }

      if (missingParameters.length > 0) {
        errors.push(`Missing required parameters: ${missingParameters.join(', ')}`);
      }
    }

    // Validate data source
    if (template.dataSource) {
      const validTypes = ['database', 'api', 'file', 'cache'];
      if (!validTypes.includes(template.dataSource.type)) {
        errors.push(`Invalid data source type: ${template.dataSource.type}`);
      }

      if (!template.dataSource.connection) {
        warnings.push('Data source missing connection configuration');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingParameters,
    };
  }

  /**
   * Clear template cache
   */
  static clearTemplateCache(): void {
    console.log('🧹 Template Service: Clearing template cache');
    ReportTemplateService.templates.clear();
  }

  /**
   * Clear data cache
   */
  static clearDataCache(): void {
    console.log('🧹 Template Service: Clearing data cache');
    ReportTemplateService.dataCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { templateCount: number; dataCount: number; memoryUsage: number } {
    const memoryUsage = ReportTemplateService.estimateMemoryUsage();

    return {
      templateCount: ReportTemplateService.templates.size,
      dataCount: ReportTemplateService.dataCache.size,
      memoryUsage,
    };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Generate template for report type
   */
  private static async generateTemplate(reportType: ReportType): Promise<ReportTemplate | null> {
    const typeValue = ReportTypeValue.from(reportType);
    const metadata = typeValue.getMetadata();

    // Generate base template structure
    const template: ReportTemplate = {
      id: `template_${reportType}`,
      name: metadata.displayName,
      type: reportType,
      category: metadata.category,
      description: metadata.description,
      version: '1.0.0',
      parameters: await ReportTemplateService.generateParameters(reportType),
      dataSource: ReportTemplateService.generateDataSource(reportType),
      supportedFormats: metadata.supportedFormats.map((format) => format as ReportFormat),
      template: await ReportTemplateService.generateTemplateContent(reportType),
      styles: ReportTemplateService.generateTemplateStyles(reportType),
      isCustom: false,
      isPublic: true,
      tags: ReportTemplateService.generateTemplateTags(reportType),
      createdBy: 'system',
      createdAt: new Date(),
      metadata: {
        estimatedTime: metadata.estimatedTime,
        complexity: metadata.complexity,
        maxDataRange: metadata.maxDataRange,
      },
    };

    return template;
  }

  /**
   * Generate parameters for report type
   */
  private static async generateParameters(reportType: ReportType): Promise<ReportParameter[]> {
    const baseParameters: ReportParameter[] = [
      {
        name: 'dateRange',
        type: 'object',
        label: 'Date Range',
        description: 'Start and end dates for the report',
        required: true,
        group: 'filters',
      },
      {
        name: 'agencyId',
        type: 'string',
        label: 'Agency',
        description: 'Agency to generate report for',
        required: true,
        group: 'context',
      },
    ];

    // Add report-specific parameters
    const specificParameters = ReportTemplateService.getReportSpecificParameters(reportType);

    return [...baseParameters, ...specificParameters];
  }

  /**
   * Get report-specific parameters
   */
  private static getReportSpecificParameters(reportType: ReportType): ReportParameter[] {
    switch (reportType) {
      case ReportType.ACCOUNTS_RECEIVABLE_AGING:
        return [
          {
            name: 'includePaidInvoices',
            type: 'boolean',
            label: 'Include Paid Invoices',
            description: 'Include invoices that have been paid',
            required: false,
            defaultValue: false,
            group: 'options',
          },
          {
            name: 'groupByCustomer',
            type: 'boolean',
            label: 'Group by Customer',
            description: 'Group aging buckets by customer',
            required: false,
            defaultValue: true,
            group: 'options',
          },
        ];

      case ReportType.SALES_SUMMARY:
        return [
          {
            name: 'groupByPeriod',
            type: 'string',
            label: 'Group by Period',
            description: 'How to group sales data',
            required: false,
            defaultValue: 'daily',
            options: [
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ],
            group: 'options',
          },
          {
            name: 'includeTargets',
            type: 'boolean',
            label: 'Include Sales Targets',
            description: 'Include sales target comparisons',
            required: false,
            defaultValue: false,
            group: 'options',
          },
        ];

      case ReportType.INVENTORY_STOCK_LEVELS:
        return [
          {
            name: 'showOnlyLowStock',
            type: 'boolean',
            label: 'Show Only Low Stock',
            description: 'Show only products with low stock levels',
            required: false,
            defaultValue: false,
            group: 'filters',
          },
          {
            name: 'includeReorderPoints',
            type: 'boolean',
            label: 'Include Reorder Points',
            description: 'Include reorder point recommendations',
            required: false,
            defaultValue: true,
            group: 'options',
          },
        ];

      default:
        return [];
    }
  }

  /**
   * Generate data source configuration
   */
  private static generateDataSource(reportType: ReportType): ReportDataSource {
    // In a real implementation, this would configure actual data sources
    return {
      type: 'database',
      connection: 'default',
      query: `SELECT * FROM ${reportType}_data`,
      cacheTtl: 3600, // 1 hour
      timeout: 30000, // 30 seconds
    };
  }

  /**
   * Generate template content
   */
  private static async generateTemplateContent(reportType: ReportType): Promise<string> {
    // This would contain the actual template markup
    // For now, return a simple placeholder
    return `<div class="report-template" data-type="${reportType}">
      <header class="report-header">
        <h1>{{title}}</h1>
        <div class="report-meta">{{metadata}}</div>
      </header>
      <main class="report-content">
        {{#sections}}
          <section class="report-section" data-type="{{type}}">
            <h2>{{title}}</h2>
            <div class="section-content">{{content}}</div>
          </section>
        {{/sections}}
      </main>
      <footer class="report-footer">{{footer}}</footer>
    </div>`;
  }

  /**
   * Generate template styles
   */
  private static generateTemplateStyles(reportType: ReportType): string {
    return `
      .report-template {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .report-header {
        border-bottom: 2px solid #007acc;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .report-header h1 {
        color: #007acc;
        font-size: 24px;
        margin: 0 0 10px 0;
      }
      
      .report-section {
        margin-bottom: 30px;
      }
      
      .report-section h2 {
        color: #333;
        font-size: 18px;
        margin-bottom: 15px;
      }
    `;
  }

  /**
   * Generate template tags
   */
  private static generateTemplateTags(reportType: ReportType): string[] {
    const typeValue = ReportTypeValue.from(reportType);
    const category = typeValue.getCategory();
    const complexity = typeValue.getComplexity();

    return [category, complexity, 'system', 'standard'];
  }

  /**
   * Generate fresh data for report
   */
  private static async generateFreshData(template: ReportTemplate, context: TemplateContext): Promise<ReportData> {
    console.log(`📊 Template Service: Generating fresh data for ${template.type}`);

    // Simulate data generation delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockData = await ReportTemplateService.generateMockData(template.type, context);
    const reportContent = ReportTemplateService.generateReportSpecificContent(template.type, context, mockData);

    return {
      reportType: template.type,
      title: reportContent.title,
      subtitle: reportContent.subtitle,
      description: reportContent.description,
      summary: reportContent.summary,
      sections: mockData.sections,
      footer: {
        generatedAt: new Date(),
        generatedBy: context.userId,
        dataSource: template.dataSource.connection,
        disclaimer: reportContent.disclaimer,
      },
      metadata: {
        parameters: context.parameters,
        dataRange: context.dateRange,
        recordCount: mockData.recordCount,
        executionTime: 500,
        version: template.version,
      },
    };
  }

  /**
   * Generate mock data for development
   */
  private static async generateMockData(
    reportType: ReportType,
    context: TemplateContext
  ): Promise<{ sections: ReportSection[]; recordCount: number }> {
    switch (reportType) {
      case ReportType.ACCOUNTS_RECEIVABLE_AGING:
        return ReportTemplateService.generateAgingReportData(context);

      case ReportType.SALES_SUMMARY:
        return ReportTemplateService.generateSalesReportData(context);

      case ReportType.INVENTORY_STOCK_LEVELS:
        return ReportTemplateService.generateInventoryReportData(context);

      case ReportType.DAILY_CASH_FLOW:
        return ReportTemplateService.generateCashFlowReportData(context);

      case ReportType.CUSTOMER_ACTIVITY:
        return ReportTemplateService.generateCustomerActivityReportData(context);

      case ReportType.PRODUCT_PERFORMANCE:
        return ReportTemplateService.generateProductPerformanceReportData(context);

      case ReportType.CREDIT_RISK_ASSESSMENT:
      case ReportType.PAYMENT_COLLECTION_REPORT:
        return ReportTemplateService.generateAgingReportData(context); // Reuse aging data for credit reports

      case ReportType.EXECUTIVE_SUMMARY:
        return ReportTemplateService.generateExecutiveSummaryReportData(context);

      case ReportType.TRANSACTION_AUDIT_TRAIL:
        return ReportTemplateService.generateAuditTrailReportData(context);

      default:
        return ReportTemplateService.generateGenericReportData(context);
    }
  }

  /**
   * Generate aging report mock data
   */
  private static generateAgingReportData(context: TemplateContext): { sections: ReportSection[]; recordCount: number } {
    const metricsData: MetricData[] = [
      {
        label: 'Total Outstanding',
        value: '$245,680',
        format: 'currency',
        change: { value: -5.2, type: 'decrease', period: 'vs last month' },
      },
      {
        label: 'Current (0-30 days)',
        value: '$156,420',
        format: 'currency',
        change: { value: 2.1, type: 'increase', period: 'vs last month' },
      },
      {
        label: 'Overdue (30+ days)',
        value: '$89,260',
        format: 'currency',
        change: { value: -12.3, type: 'decrease', period: 'vs last month' },
      },
      {
        label: 'Average Days Outstanding',
        value: '34',
        format: 'number',
        change: { value: -2, type: 'decrease', period: 'vs last month' },
      },
    ];

    const tableData: TableData = {
      title: 'Customer Aging Details',
      columns: [
        { key: 'customer', label: 'Customer', type: 'string', sortable: true },
        { key: 'current', label: 'Current', type: 'currency', sortable: true },
        { key: 'days30', label: '31-60 Days', type: 'currency', sortable: true },
        { key: 'days60', label: '61-90 Days', type: 'currency', sortable: true },
        { key: 'days90', label: '90+ Days', type: 'currency', sortable: true },
        { key: 'total', label: 'Total', type: 'currency', sortable: true },
      ],
      rows: [
        {
          customer: 'Metro Supermarket',
          current: 15420,
          days30: 8500,
          days60: 0,
          days90: 0,
          total: 23920,
        },
        {
          customer: 'TechCorp Industries',
          current: 28300,
          days30: 12400,
          days60: 5600,
          days90: 0,
          total: 46300,
        },
        {
          customer: 'Fresh Foods Market',
          current: 9850,
          days30: 0,
          days60: 0,
          days90: 3200,
          total: 13050,
        },
      ],
      summary: {
        totalRows: 3,
        aggregations: {
          current: 53570,
          days30: 20900,
          days60: 5600,
          days90: 3200,
          total: 83270,
        },
      },
    };

    return {
      sections: [
        {
          id: 'metrics',
          title: 'Aging Summary',
          type: 'metrics',
          content: metricsData,
          layout: { columns: 4, order: 1 },
        },
        {
          id: 'aging_table',
          title: 'Customer Aging Details',
          type: 'table',
          content: tableData,
          layout: { columns: 1, order: 2 },
        },
      ],
      recordCount: 3,
    };
  }

  /**
   * Generate sales report mock data
   */
  private static generateSalesReportData(context: TemplateContext): { sections: ReportSection[]; recordCount: number } {
    const metricsData: MetricData[] = [
      {
        label: 'Total Sales',
        value: '$182,450',
        format: 'currency',
        change: { value: 8.3, type: 'increase', period: 'vs last month' },
      },
      {
        label: 'Total Orders',
        value: '456',
        format: 'number',
        change: { value: 12.1, type: 'increase', period: 'vs last month' },
      },
      {
        label: 'Average Order Value',
        value: '$400.11',
        format: 'currency',
        change: { value: -2.8, type: 'decrease', period: 'vs last month' },
      },
      {
        label: 'Conversion Rate',
        value: '3.2%',
        format: 'percentage',
        change: { value: 0.4, type: 'increase', period: 'vs last month' },
      },
    ];

    return {
      sections: [
        {
          id: 'sales_metrics',
          title: 'Sales Performance',
          type: 'metrics',
          content: metricsData,
          layout: { columns: 4, order: 1 },
        },
      ],
      recordCount: 456,
    };
  }

  /**
   * Generate inventory report mock data
   */
  private static generateInventoryReportData(context: TemplateContext): {
    sections: ReportSection[];
    recordCount: number;
  } {
    const metricsData: MetricData[] = [
      {
        label: 'Total Products',
        value: '1,247',
        format: 'number',
      },
      {
        label: 'Low Stock Items',
        value: '42',
        format: 'number',
        color: '#ff9800',
      },
      {
        label: 'Out of Stock',
        value: '8',
        format: 'number',
        color: '#f44336',
      },
      {
        label: 'Total Value',
        value: '$485,600',
        format: 'currency',
      },
    ];

    return {
      sections: [
        {
          id: 'inventory_metrics',
          title: 'Inventory Overview',
          type: 'metrics',
          content: metricsData,
          layout: { columns: 4, order: 1 },
        },
      ],
      recordCount: 1247,
    };
  }

  /**
   * Generate generic report mock data
   */
  private static generateGenericReportData(context: TemplateContext): {
    sections: ReportSection[];
    recordCount: number;
  } {
    const metricsData: MetricData[] = [
      {
        label: 'Total Records',
        value: '1,000',
        format: 'number',
      },
      {
        label: 'Period',
        value: '30 days',
        format: 'text',
      },
    ];

    return {
      sections: [
        {
          id: 'generic_metrics',
          title: 'Report Summary',
          type: 'metrics',
          content: metricsData,
          layout: { columns: 2, order: 1 },
        },
      ],
      recordCount: 1000,
    };
  }

  /**
   * Generate cash flow report mock data
   */
  private static generateCashFlowReportData(context: TemplateContext): {
    sections: ReportSection[];
    recordCount: number;
  } {
    const metricsData: MetricData[] = [
      {
        label: 'Total Inflows',
        value: '$123,450',
        format: 'currency',
        change: { value: 8.2, type: 'increase', period: 'vs last month' },
      },
      {
        label: 'Total Outflows',
        value: '$98,200',
        format: 'currency',
        change: { value: 4.1, type: 'increase', period: 'vs last month' },
      },
      {
        label: 'Net Cash Flow',
        value: '$25,250',
        format: 'currency',
        change: { value: 15.7, type: 'increase', period: 'vs last month' },
      },
      {
        label: 'Positive Flow Days',
        value: '23/30',
        format: 'text',
        change: { value: 2, type: 'increase', period: 'vs last month' },
      },
    ];

    const cashFlowTable: TableData = {
      title: 'Daily Cash Flow Details',
      columns: [
        { key: 'date', label: 'Date', type: 'date', sortable: true },
        { key: 'inflows', label: 'Inflows', type: 'currency', sortable: true },
        { key: 'outflows', label: 'Outflows', type: 'currency', sortable: true },
        { key: 'netFlow', label: 'Net Flow', type: 'currency', sortable: true },
        { key: 'balance', label: 'Running Balance', type: 'currency', sortable: true },
      ],
      rows: [
        { date: '2024-01-01', inflows: 15420, outflows: 8900, netFlow: 6520, balance: 156520 },
        { date: '2024-01-02', inflows: 12800, outflows: 11200, netFlow: 1600, balance: 158120 },
        { date: '2024-01-03', inflows: 18900, outflows: 9500, netFlow: 9400, balance: 167520 },
      ],
      summary: {
        totalRows: 30,
        aggregations: {
          inflows: 123450,
          outflows: 98200,
          netFlow: 25250,
        },
      },
    };

    return {
      sections: [
        {
          id: 'cash_flow_metrics',
          title: 'Cash Flow Summary',
          type: 'metrics',
          content: metricsData,
          layout: { columns: 4, order: 1 },
        },
        {
          id: 'cash_flow_table',
          title: 'Daily Cash Flow Details',
          type: 'table',
          content: cashFlowTable,
          layout: { columns: 1, order: 2 },
        },
      ],
      recordCount: 30,
    };
  }

  /**
   * Generate customer activity report mock data
   */
  private static generateCustomerActivityReportData(context: TemplateContext): {
    sections: ReportSection[];
    recordCount: number;
  } {
    const metricsData: MetricData[] = [
      {
        label: 'Active Customers',
        value: '1,247',
        format: 'number',
        change: { value: 8.5, type: 'increase', period: 'vs last month' },
      },
      {
        label: 'New Customers',
        value: '89',
        format: 'number',
        change: { value: 12.3, type: 'increase', period: 'vs last month' },
      },
      {
        label: 'Avg Orders/Customer',
        value: '3.2',
        format: 'number',
        change: { value: 0.4, type: 'increase', period: 'vs last month' },
      },
      {
        label: 'Customer Retention',
        value: '94.2%',
        format: 'percentage',
        change: { value: 1.1, type: 'increase', period: 'vs last month' },
      },
    ];

    return {
      sections: [
        {
          id: 'customer_metrics',
          title: 'Customer Activity Overview',
          type: 'metrics',
          content: metricsData,
          layout: { columns: 4, order: 1 },
        },
      ],
      recordCount: 1247,
    };
  }

  /**
   * Generate product performance report mock data
   */
  private static generateProductPerformanceReportData(context: TemplateContext): {
    sections: ReportSection[];
    recordCount: number;
  } {
    const metricsData: MetricData[] = [
      {
        label: 'Total Products',
        value: '2,156',
        format: 'number',
      },
      {
        label: 'Best Performers',
        value: '45',
        format: 'number',
        color: '#4caf50',
      },
      {
        label: 'Declining Products',
        value: '12',
        format: 'number',
        color: '#ff9800',
      },
      {
        label: 'Revenue Impact',
        value: '$89,600',
        format: 'currency',
        change: { value: 15.2, type: 'increase', period: 'vs last month' },
      },
    ];

    return {
      sections: [
        {
          id: 'product_metrics',
          title: 'Product Performance Overview',
          type: 'metrics',
          content: metricsData,
          layout: { columns: 4, order: 1 },
        },
      ],
      recordCount: 2156,
    };
  }

  /**
   * Generate executive summary report mock data
   */
  private static generateExecutiveSummaryReportData(context: TemplateContext): {
    sections: ReportSection[];
    recordCount: number;
  } {
    const metricsData: MetricData[] = [
      {
        label: 'Revenue Growth',
        value: '15.7%',
        format: 'percentage',
        change: { value: 3.2, type: 'increase', period: 'vs target' },
      },
      {
        label: 'Operating Margin',
        value: '18.5%',
        format: 'percentage',
        change: { value: 2.1, type: 'increase', period: 'vs last quarter' },
      },
      {
        label: 'Customer Satisfaction',
        value: '4.7/5.0',
        format: 'text',
        change: { value: 0.2, type: 'increase', period: 'vs last period' },
      },
      {
        label: 'Target Achievement',
        value: '112.3%',
        format: 'percentage',
        change: { value: 12.3, type: 'increase', period: 'vs target' },
      },
    ];

    return {
      sections: [
        {
          id: 'executive_metrics',
          title: 'Key Performance Indicators',
          type: 'metrics',
          content: metricsData,
          layout: { columns: 4, order: 1 },
        },
      ],
      recordCount: 4,
    };
  }

  /**
   * Generate audit trail report mock data
   */
  private static generateAuditTrailReportData(context: TemplateContext): {
    sections: ReportSection[];
    recordCount: number;
  } {
    const metricsData: MetricData[] = [
      {
        label: 'Total Transactions',
        value: '15,642',
        format: 'number',
      },
      {
        label: 'Compliance Rate',
        value: '100%',
        format: 'percentage',
        color: '#4caf50',
      },
      {
        label: 'Avg Process Time',
        value: '2.3s',
        format: 'duration',
      },
      {
        label: 'Security Incidents',
        value: '0',
        format: 'number',
        color: '#4caf50',
      },
    ];

    const auditTable: TableData = {
      title: 'Recent Transaction Log',
      columns: [
        { key: 'timestamp', label: 'Timestamp', type: 'date', sortable: true },
        { key: 'user', label: 'User', type: 'string', sortable: true },
        { key: 'action', label: 'Action', type: 'string', sortable: true },
        { key: 'amount', label: 'Amount', type: 'currency', sortable: true },
        { key: 'status', label: 'Status', type: 'string', sortable: true },
      ],
      rows: [
        {
          timestamp: '2024-01-15 09:15:23',
          user: 'user001',
          action: 'Payment Received',
          amount: 1520,
          status: 'Completed',
        },
        {
          timestamp: '2024-01-15 09:18:45',
          user: 'user002',
          action: 'Order Created',
          amount: 2350,
          status: 'Completed',
        },
        {
          timestamp: '2024-01-15 09:22:12',
          user: 'user001',
          action: 'Refund Processed',
          amount: 450,
          status: 'Completed',
        },
      ],
      summary: {
        totalRows: 15642,
        aggregations: {
          amount: 2456780,
        },
      },
    };

    return {
      sections: [
        {
          id: 'audit_metrics',
          title: 'Audit Summary',
          type: 'metrics',
          content: metricsData,
          layout: { columns: 4, order: 1 },
        },
        {
          id: 'audit_table',
          title: 'Transaction Audit Trail',
          type: 'table',
          content: auditTable,
          layout: { columns: 1, order: 2 },
        },
      ],
      recordCount: 15642,
    };
  }

  /**
   * Generate report-specific content (title, summary, etc.)
   */
  private static generateReportSpecificContent(
    reportType: ReportType,
    context: TemplateContext,
    mockData: { sections: ReportSection[]; recordCount: number }
  ): {
    title: string;
    subtitle: string;
    description: string;
    summary: { keyFindings: string[]; recommendations: string[] };
    disclaimer: string;
  } {
    const dateRange = `${context.dateRange.startDate.toLocaleDateString()} - ${context.dateRange.endDate.toLocaleDateString()}`;

    switch (reportType) {
      case ReportType.ACCOUNTS_RECEIVABLE_AGING:
        return {
          title: `Accounts Receivable Aging Report`,
          subtitle: `Agency ${context.agencyId} • ${dateRange} • ${mockData.recordCount} customers`,
          description: `Detailed analysis of outstanding customer balances grouped by aging periods`,
          summary: {
            keyFindings: [
              'Total outstanding receivables: $245,680 (-5.2% vs last month)',
              'Current accounts (0-30 days) represent 63.7% of total outstanding',
              '8 customers have balances over 90 days old totaling $89,260',
              'Average days outstanding improved by 2 days to 34 days',
            ],
            recommendations: [
              'Focus collection efforts on accounts over 60 days old',
              'Implement stricter credit terms for customers with recurring late payments',
              'Consider offering early payment discounts to improve cash flow',
            ],
          },
          disclaimer: 'Aging calculations based on invoice dates and current outstanding balances',
        };

      case ReportType.SALES_SUMMARY:
        return {
          title: `Sales Performance Summary`,
          subtitle: `Agency ${context.agencyId} • ${dateRange} • ${mockData.recordCount} orders`,
          description: `Comprehensive overview of sales performance, trends, and key metrics`,
          summary: {
            keyFindings: [
              'Total sales revenue: $182,450 (+8.3% vs last month)',
              'Order volume increased by 12.1% with 456 orders processed',
              'Average order value decreased slightly to $400.11 (-2.8%)',
              'Customer conversion rate improved to 3.2% (+0.4 points)',
            ],
            recommendations: [
              'Investigate factors causing decrease in average order value',
              'Capitalize on increased order volume with targeted upselling',
              'Continue strategies that improved conversion rate',
            ],
          },
          disclaimer: 'Sales figures include all completed orders within the selected date range',
        };

      case ReportType.INVENTORY_STOCK_LEVELS:
        return {
          title: `Inventory Stock Levels Report`,
          subtitle: `Agency ${context.agencyId} • ${dateRange} • ${mockData.recordCount} products`,
          description: `Current inventory status, stock levels, and product availability analysis`,
          summary: {
            keyFindings: [
              'Total inventory value: $485,600 across 1,247 products',
              '42 products are currently below minimum stock levels',
              '8 products are completely out of stock',
              'Inventory turnover rate is within acceptable parameters',
            ],
            recommendations: [
              'Reorder immediately for out-of-stock items to prevent lost sales',
              'Review minimum stock levels for frequently low-stock products',
              'Consider reducing order quantities for slow-moving inventory',
            ],
          },
          disclaimer: 'Stock levels reflect real-time inventory as of report generation time',
        };

      case ReportType.CREDIT_RISK_ASSESSMENT:
        return {
          title: `Credit Risk Assessment Report`,
          subtitle: `Agency ${context.agencyId} • ${dateRange} • Risk Analysis`,
          description: `Customer credit risk evaluation and payment behavior analysis`,
          summary: {
            keyFindings: [
              'Overall portfolio credit risk remains at moderate levels',
              '15% of customers show elevated risk indicators',
              'Payment delays have increased by 3% over the period',
              'New customer onboarding shows improved credit screening results',
            ],
            recommendations: [
              'Implement enhanced monitoring for high-risk accounts',
              'Review and update credit limits for customers showing deteriorating payment patterns',
              'Consider requiring deposits or shorter payment terms for elevated risk customers',
            ],
          },
          disclaimer: 'Risk assessments based on payment history, credit scores, and industry factors',
        };

      case ReportType.PAYMENT_COLLECTION_REPORT:
        return {
          title: `Payment Collection Performance Report`,
          subtitle: `Agency ${context.agencyId} • ${dateRange} • Collections Analysis`,
          description: `Analysis of payment collection efficiency and outstanding balances recovery`,
          summary: {
            keyFindings: [
              'Collection rate improved to 94.2% (+2.1% vs previous period)',
              'Average collection time reduced to 28 days',
              'Successful recovery of $67,500 in previously written-off accounts',
              'Customer payment plan compliance rate: 87%',
            ],
            recommendations: [
              'Expand successful collection strategies to other customer segments',
              'Implement automated reminder systems for better efficiency',
              'Negotiate payment plans proactively to prevent escalations',
            ],
          },
          disclaimer: 'Collection metrics include all payment activities within the reporting period',
        };

      case ReportType.DAILY_CASH_FLOW:
        return {
          title: `Daily Cash Flow Report`,
          subtitle: `Agency ${context.agencyId} • ${dateRange} • Cash Flow Analysis`,
          description: `Daily cash inflows and outflows with liquidity analysis and forecasting`,
          summary: {
            keyFindings: [
              'Average daily cash inflow: $12,350 across the reporting period',
              'Peak collection day generated $28,900 in receivables',
              'Operating expenses averaged $8,200 per day',
              'Net positive cash flow achieved on 23 out of 30 days',
            ],
            recommendations: [
              'Optimize collection timing to improve daily cash consistency',
              'Consider expense timing adjustments for negative flow days',
              'Implement daily cash flow forecasting for better planning',
            ],
          },
          disclaimer: 'Cash flow figures include all monetary transactions within the specified period',
        };

      case ReportType.CUSTOMER_ACTIVITY:
        return {
          title: `Customer Activity Report`,
          subtitle: `Agency ${context.agencyId} • ${dateRange} • ${mockData.recordCount} customers`,
          description: `Customer engagement, transaction patterns, and behavior analysis`,
          summary: {
            keyFindings: [
              'Active customers increased by 8.5% with 1,247 total active accounts',
              'Average transaction frequency: 3.2 orders per customer per month',
              'Top 20% of customers contribute 67% of total revenue',
              'Customer retention rate improved to 94.2%',
            ],
            recommendations: [
              'Develop loyalty programs for high-value customer segments',
              'Implement targeted campaigns for lower-frequency customers',
              'Focus on maintaining strong relationships with top revenue contributors',
            ],
          },
          disclaimer: 'Customer activity based on transaction history and engagement metrics',
        };

      case ReportType.PRODUCT_PERFORMANCE:
        return {
          title: `Product Performance Analysis`,
          subtitle: `Agency ${context.agencyId} • ${dateRange} • ${mockData.recordCount} products`,
          description: `Product sales performance, profitability, and market demand analysis`,
          summary: {
            keyFindings: [
              'Top 10 products account for 42% of total sales revenue',
              'Fast-moving consumer goods category leads with 35% market share',
              'New product introductions generated $45,600 in sales',
              '12 products show declining sales trends requiring attention',
            ],
            recommendations: [
              'Increase marketing focus on high-performing product categories',
              'Review pricing strategy for declining products',
              'Consider discontinuing or repositioning underperforming items',
            ],
          },
          disclaimer: 'Performance metrics based on sales data, inventory turnover, and profitability analysis',
        };

      case ReportType.EXECUTIVE_SUMMARY:
        return {
          title: `Executive Summary Dashboard`,
          subtitle: `Agency ${context.agencyId} • ${dateRange} • Strategic Overview`,
          description: `High-level business performance summary for executive decision making`,
          summary: {
            keyFindings: [
              'Overall business performance exceeded targets by 12.3%',
              'Revenue growth of 15.7% compared to previous period',
              'Operating margin improved to 18.5% through cost optimization',
              'Customer satisfaction scores maintained at 4.7/5.0',
            ],
            recommendations: [
              'Continue aggressive growth strategy in high-performing segments',
              'Allocate additional resources to emerging market opportunities',
              'Maintain focus on operational excellence and cost management',
            ],
          },
          disclaimer: 'Executive summary consolidates key business metrics and strategic indicators',
        };

      case ReportType.TRANSACTION_AUDIT_TRAIL:
        return {
          title: `Transaction Audit Trail Report`,
          subtitle: `Agency ${context.agencyId} • ${dateRange} • ${mockData.recordCount} transactions`,
          description: `Comprehensive audit trail of all financial transactions for compliance and security`,
          summary: {
            keyFindings: [
              `${mockData.recordCount} transactions processed with full audit trail`,
              'All transactions comply with regulatory requirements',
              'No unauthorized access or suspicious activity detected',
              'Average transaction processing time: 2.3 seconds',
            ],
            recommendations: [
              'Continue monitoring for any unusual transaction patterns',
              'Regular review of access controls and user permissions',
              'Maintain current security protocols and audit procedures',
            ],
          },
          disclaimer: 'Audit trail includes all transaction metadata, user actions, and system events',
        };

      default:
        return {
          title: `Business Intelligence Report`,
          subtitle: `Agency ${context.agencyId} • ${dateRange} • ${mockData.recordCount} records`,
          description: `Comprehensive business analysis and performance metrics`,
          summary: {
            keyFindings: [
              `Analysis completed for ${mockData.recordCount} records`,
              'Data patterns and trends identified within the selected period',
              'Key performance indicators calculated and benchmarked',
            ],
            recommendations: [
              'Review detailed findings in the sections below',
              'Consider setting up automated monitoring for key metrics',
              'Use insights to inform strategic business decisions',
            ],
          },
          disclaimer: 'This report contains aggregated business intelligence data for the specified period',
        };
    }
  }

  /**
   * Generate cache key
   */
  private static generateCacheKey(reportType: ReportType, context: TemplateContext): string {
    const keyParts = [
      reportType,
      context.agencyId,
      context.dateRange.startDate.toISOString().slice(0, 10),
      context.dateRange.endDate.toISOString().slice(0, 10),
      JSON.stringify(context.parameters),
    ];

    return keyParts.join('|');
  }

  /**
   * Get cached data
   */
  private static getCachedData(cacheKey: string): ReportData | null {
    const cached = ReportTemplateService.dataCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    const age = now - cached.timestamp.getTime();

    if (age > cached.ttl) {
      ReportTemplateService.dataCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached data
   */
  private static setCachedData(cacheKey: string, data: ReportData, ttl: number): void {
    ReportTemplateService.dataCache.set(cacheKey, {
      data,
      timestamp: new Date(),
      ttl,
    });

    // Clean up expired entries
    ReportTemplateService.cleanupExpiredCache();
  }

  /**
   * Clean up expired cache entries
   */
  private static cleanupExpiredCache(): void {
    const now = Date.now();

    for (const [key, cached] of ReportTemplateService.dataCache.entries()) {
      const age = now - cached.timestamp.getTime();
      if (age > cached.ttl) {
        ReportTemplateService.dataCache.delete(key);
      }
    }
  }

  /**
   * Estimate memory usage
   */
  private static estimateMemoryUsage(): number {
    // Rough estimation - in a real implementation, use proper memory monitoring
    const templateSize = ReportTemplateService.templates.size * 10000; // ~10KB per template
    const dataSize = ReportTemplateService.dataCache.size * 50000; // ~50KB per cached report

    return templateSize + dataSize;
  }
}

/**
 * Template error class
 */
export class TemplateError extends Error {
  constructor(
    public readonly code: ReportErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TemplateError';
  }
}

/**
 * Template service utilities
 */
export const TemplateServiceUtils = {
  /**
   * Create template context
   */
  createTemplateContext: (
    agencyId: string,
    userId: string,
    parameters: Record<string, unknown>,
    filters: Record<string, unknown> = {},
    dateRange?: { startDate: Date; endDate: Date }
  ): TemplateContext => {
    const defaultDateRange = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date(),
    };

    return {
      agencyId,
      userId,
      parameters,
      filters,
      dateRange: dateRange || defaultDateRange,
    };
  },

  /**
   * Validate template context
   */
  validateTemplateContext: (context: TemplateContext): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!context.agencyId) {
      errors.push('Agency ID is required');
    }

    if (!context.userId) {
      errors.push('User ID is required');
    }

    if (!context.dateRange || !context.dateRange.startDate || !context.dateRange.endDate) {
      errors.push('Date range with start and end dates is required');
    }

    if (context.dateRange && context.dateRange.startDate > context.dateRange.endDate) {
      errors.push('Start date cannot be after end date');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Get default parameters for report type
   */
  getDefaultParameters: (reportType: ReportType): Record<string, unknown> => {
    // Get default date range
    const endDate = new Date();
    const startDate = new Date();

    switch (reportType) {
      case ReportType.DAILY_CASH_FLOW:
        startDate.setDate(endDate.getDate() - 7);
        break;
      case ReportType.ACCOUNTS_RECEIVABLE_AGING:
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
        break;
    }

    return {
      dateRange: { startDate, endDate },
      includeCharts: true,
      includeImages: false,
    };
  },
} as const;
