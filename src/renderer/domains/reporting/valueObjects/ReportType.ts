/**
 * Report Type Value Object
 *
 * Following Instructions standards with clean architecture and DDD principles.
 * Defines all available report types in the Flowlytix system.
 *
 * @domain Reporting
 * @pattern Value Object
 * @architecture Clean Architecture
 * @version 1.0.0
 */

/**
 * Report type enumeration
 * Covers all business areas: Financial, Sales, Operational, Management, Compliance
 */
export enum ReportType {
  // Financial Reports - Credit Business Critical
  ACCOUNTS_RECEIVABLE_AGING = 'accounts_receivable_aging',
  CREDIT_RISK_ASSESSMENT = 'credit_risk_assessment',
  PAYMENT_COLLECTION_REPORT = 'payment_collection_report',
  CREDIT_LIMIT_ANALYSIS = 'credit_limit_analysis',
  DAILY_CASH_FLOW = 'daily_cash_flow',
  PAYMENT_METHOD_ANALYSIS = 'payment_method_analysis',

  // Sales & Performance Reports
  SALES_SUMMARY = 'sales_summary',
  CUSTOMER_ACTIVITY = 'customer_activity',
  PRODUCT_PERFORMANCE = 'product_performance',
  ORDER_FULFILLMENT = 'order_fulfillment',
  SALES_PIPELINE = 'sales_pipeline',
  CUSTOMER_LIFETIME_VALUE = 'customer_lifetime_value',

  // Operational Reports
  INVENTORY_STOCK_LEVELS = 'inventory_stock_levels',
  INVENTORY_MOVEMENT = 'inventory_movement',
  PURCHASE_ORDER_ANALYSIS = 'purchase_order_analysis',
  AGENCY_PERFORMANCE_COMPARISON = 'agency_performance_comparison',
  SUPPLIER_PERFORMANCE = 'supplier_performance',

  // Management & Analytics Reports
  EXECUTIVE_SUMMARY = 'executive_summary',
  TREND_ANALYSIS = 'trend_analysis',
  PERIOD_COMPARISON = 'period_comparison',
  KPI_DASHBOARD = 'kpi_dashboard',
  FINANCIAL_ANALYTICS = 'financial_analytics',

  // Compliance & Audit Reports
  USER_ACTIVITY_AUDIT = 'user_activity_audit',
  TRANSACTION_AUDIT_TRAIL = 'transaction_audit_trail',
  REGULATORY_COMPLIANCE = 'regulatory_compliance',
  DATA_INTEGRITY_REPORT = 'data_integrity_report',

  // Custom Reports
  CUSTOM_REPORT = 'custom_report',
}

/**
 * Report category enumeration for grouping related reports
 */
export enum ReportCategory {
  FINANCIAL = 'financial',
  SALES = 'sales',
  OPERATIONAL = 'operational',
  MANAGEMENT = 'management',
  COMPLIANCE = 'compliance',
  CUSTOM = 'custom',
}

/**
 * Report complexity level for performance and caching strategies
 */
export enum ReportComplexity {
  SIMPLE = 'simple', // < 1000 records, basic aggregation
  MEDIUM = 'medium', // 1000-10000 records, moderate joins
  COMPLEX = 'complex', // 10000+ records, complex calculations
  ENTERPRISE = 'enterprise', // Multi-agency, heavy analytics
}

/**
 * Report frequency for scheduling
 */
export enum ReportFrequency {
  ON_DEMAND = 'on_demand',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

/**
 * Report type metadata interface
 */
export interface ReportTypeMetadata {
  readonly type: ReportType;
  readonly category: ReportCategory;
  readonly complexity: ReportComplexity;
  readonly displayName: string;
  readonly description: string;
  readonly estimatedTime: number; // in seconds
  readonly requiredPermissions: string[];
  readonly supportedFormats: string[];
  readonly defaultParameters?: Record<string, unknown>;
  readonly isSchedulable: boolean;
  readonly maxDataRange: number; // in days
}

/**
 * Report Type Value Object Class
 * Provides comprehensive metadata and validation for report types
 */
export class ReportTypeValue {
  private static readonly TYPE_METADATA: Record<ReportType, ReportTypeMetadata> = {
    [ReportType.ACCOUNTS_RECEIVABLE_AGING]: {
      type: ReportType.ACCOUNTS_RECEIVABLE_AGING,
      category: ReportCategory.FINANCIAL,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'Accounts Receivable Aging',
      description: 'Outstanding balances by aging buckets with collection priorities',
      estimatedTime: 15,
      requiredPermissions: ['CREDIT_VIEW', 'AGING_REPORT_VIEW'],
      supportedFormats: ['PDF', 'EXCEL', 'CSV'],
      defaultParameters: {
        includePaidInvoices: false,
        groupByCustomer: true,
        showCollectionNotes: true,
      },
      isSchedulable: true,
      maxDataRange: 365,
    },
    [ReportType.CREDIT_RISK_ASSESSMENT]: {
      type: ReportType.CREDIT_RISK_ASSESSMENT,
      category: ReportCategory.FINANCIAL,
      complexity: ReportComplexity.COMPLEX,
      displayName: 'Credit Risk Assessment',
      description: 'Customer risk scoring and classification analysis',
      estimatedTime: 30,
      requiredPermissions: ['CREDIT_VIEW', 'CREDIT_ADMIN'],
      supportedFormats: ['PDF', 'EXCEL'],
      defaultParameters: {
        includeRiskScore: true,
        includeRecommendations: true,
        riskThreshold: 70,
      },
      isSchedulable: true,
      maxDataRange: 90,
    },
    [ReportType.PAYMENT_COLLECTION_REPORT]: {
      type: ReportType.PAYMENT_COLLECTION_REPORT,
      category: ReportCategory.FINANCIAL,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'Payment Collection Report',
      description: 'Collection activities, outcomes, and efficiency metrics',
      estimatedTime: 20,
      requiredPermissions: ['COLLECTION_VIEW', 'PAYMENT_VIEW'],
      supportedFormats: ['PDF', 'EXCEL', 'CSV'],
      defaultParameters: {
        includeActivity: true,
        includeOutcomes: true,
        groupByCollector: false,
      },
      isSchedulable: true,
      maxDataRange: 180,
    },
    [ReportType.SALES_SUMMARY]: {
      type: ReportType.SALES_SUMMARY,
      category: ReportCategory.SALES,
      complexity: ReportComplexity.SIMPLE,
      displayName: 'Sales Summary',
      description: 'Sales performance metrics and trends',
      estimatedTime: 10,
      requiredPermissions: ['ANALYTICS_VIEW'],
      supportedFormats: ['PDF', 'EXCEL', 'CSV'],
      defaultParameters: {
        includeTrends: true,
        groupByPeriod: 'daily',
        includeTargets: false,
      },
      isSchedulable: true,
      maxDataRange: 365,
    },
    [ReportType.CUSTOMER_ACTIVITY]: {
      type: ReportType.CUSTOMER_ACTIVITY,
      category: ReportCategory.SALES,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'Customer Activity Report',
      description: 'Customer purchase patterns and behavior analysis',
      estimatedTime: 25,
      requiredPermissions: ['CUSTOMER_VIEW', 'ANALYTICS_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      defaultParameters: {
        includeSegmentation: true,
        includeLTV: true,
        minOrderCount: 1,
      },
      isSchedulable: true,
      maxDataRange: 365,
    },
    [ReportType.INVENTORY_STOCK_LEVELS]: {
      type: ReportType.INVENTORY_STOCK_LEVELS,
      category: ReportCategory.OPERATIONAL,
      complexity: ReportComplexity.SIMPLE,
      displayName: 'Inventory Stock Levels',
      description: 'Current stock levels and reorder recommendations',
      estimatedTime: 8,
      requiredPermissions: ['INVENTORY_VIEW'],
      supportedFormats: ['PDF', 'EXCEL', 'CSV'],
      defaultParameters: {
        includeReorderPoints: true,
        showOnlyLowStock: false,
        includeValuation: true,
      },
      isSchedulable: true,
      maxDataRange: 30,
    },
    [ReportType.EXECUTIVE_SUMMARY]: {
      type: ReportType.EXECUTIVE_SUMMARY,
      category: ReportCategory.MANAGEMENT,
      complexity: ReportComplexity.COMPLEX,
      displayName: 'Executive Summary',
      description: 'High-level KPIs and strategic insights',
      estimatedTime: 45,
      requiredPermissions: ['ANALYTICS_ADMIN', 'EXECUTIVE_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      defaultParameters: {
        includeKPIs: true,
        includeAlerts: true,
        includeForecast: false,
      },
      isSchedulable: true,
      maxDataRange: 90,
    },
    // Add remaining report types with similar structure...
    [ReportType.CREDIT_LIMIT_ANALYSIS]: {
      type: ReportType.CREDIT_LIMIT_ANALYSIS,
      category: ReportCategory.FINANCIAL,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'Credit Limit Analysis',
      description: 'Credit limit utilization and adjustment recommendations',
      estimatedTime: 20,
      requiredPermissions: ['CREDIT_VIEW', 'CREDIT_LIMIT_ADJUST'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: true,
      maxDataRange: 180,
    },
    [ReportType.DAILY_CASH_FLOW]: {
      type: ReportType.DAILY_CASH_FLOW,
      category: ReportCategory.FINANCIAL,
      complexity: ReportComplexity.SIMPLE,
      displayName: 'Daily Cash Flow',
      description: 'Daily cash receipts and payment analysis',
      estimatedTime: 5,
      requiredPermissions: ['PAYMENT_VIEW', 'ANALYTICS_VIEW'],
      supportedFormats: ['PDF', 'EXCEL', 'CSV'],
      isSchedulable: true,
      maxDataRange: 90,
    },
    [ReportType.PAYMENT_METHOD_ANALYSIS]: {
      type: ReportType.PAYMENT_METHOD_ANALYSIS,
      category: ReportCategory.FINANCIAL,
      complexity: ReportComplexity.SIMPLE,
      displayName: 'Payment Method Analysis',
      description: 'Payment method distribution and efficiency',
      estimatedTime: 12,
      requiredPermissions: ['PAYMENT_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: true,
      maxDataRange: 365,
    },
    [ReportType.PRODUCT_PERFORMANCE]: {
      type: ReportType.PRODUCT_PERFORMANCE,
      category: ReportCategory.SALES,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'Product Performance',
      description: 'Product sales analysis and profitability',
      estimatedTime: 18,
      requiredPermissions: ['PRODUCT_VIEW', 'ANALYTICS_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: true,
      maxDataRange: 365,
    },
    [ReportType.ORDER_FULFILLMENT]: {
      type: ReportType.ORDER_FULFILLMENT,
      category: ReportCategory.OPERATIONAL,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'Order Fulfillment',
      description: 'Order processing efficiency and delivery metrics',
      estimatedTime: 15,
      requiredPermissions: ['ORDER_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: true,
      maxDataRange: 180,
    },
    [ReportType.SALES_PIPELINE]: {
      type: ReportType.SALES_PIPELINE,
      category: ReportCategory.SALES,
      complexity: ReportComplexity.SIMPLE,
      displayName: 'Sales Pipeline',
      description: 'Opportunity tracking and conversion analysis',
      estimatedTime: 10,
      requiredPermissions: ['ORDER_VIEW', 'ANALYTICS_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: true,
      maxDataRange: 90,
    },
    [ReportType.CUSTOMER_LIFETIME_VALUE]: {
      type: ReportType.CUSTOMER_LIFETIME_VALUE,
      category: ReportCategory.SALES,
      complexity: ReportComplexity.COMPLEX,
      displayName: 'Customer Lifetime Value',
      description: 'Customer value analysis and segmentation',
      estimatedTime: 35,
      requiredPermissions: ['CUSTOMER_VIEW', 'ANALYTICS_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: false,
      maxDataRange: 730,
    },
    [ReportType.INVENTORY_MOVEMENT]: {
      type: ReportType.INVENTORY_MOVEMENT,
      category: ReportCategory.OPERATIONAL,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'Inventory Movement',
      description: 'Stock movement tracking and turnover analysis',
      estimatedTime: 20,
      requiredPermissions: ['INVENTORY_VIEW'],
      supportedFormats: ['PDF', 'EXCEL', 'CSV'],
      isSchedulable: true,
      maxDataRange: 365,
    },
    [ReportType.PURCHASE_ORDER_ANALYSIS]: {
      type: ReportType.PURCHASE_ORDER_ANALYSIS,
      category: ReportCategory.OPERATIONAL,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'Purchase Order Analysis',
      description: 'Supplier performance and procurement efficiency',
      estimatedTime: 22,
      requiredPermissions: ['PURCHASE_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: true,
      maxDataRange: 365,
    },
    [ReportType.AGENCY_PERFORMANCE_COMPARISON]: {
      type: ReportType.AGENCY_PERFORMANCE_COMPARISON,
      category: ReportCategory.OPERATIONAL,
      complexity: ReportComplexity.COMPLEX,
      displayName: 'Agency Performance Comparison',
      description: 'Multi-agency performance benchmarking',
      estimatedTime: 40,
      requiredPermissions: ['MULTI_AGENCY_VIEW', 'ANALYTICS_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: true,
      maxDataRange: 365,
    },
    [ReportType.SUPPLIER_PERFORMANCE]: {
      type: ReportType.SUPPLIER_PERFORMANCE,
      category: ReportCategory.OPERATIONAL,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'Supplier Performance',
      description: 'Supplier reliability and quality metrics',
      estimatedTime: 18,
      requiredPermissions: ['PURCHASE_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: true,
      maxDataRange: 365,
    },
    [ReportType.TREND_ANALYSIS]: {
      type: ReportType.TREND_ANALYSIS,
      category: ReportCategory.MANAGEMENT,
      complexity: ReportComplexity.COMPLEX,
      displayName: 'Trend Analysis',
      description: 'Historical trends and predictive analytics',
      estimatedTime: 50,
      requiredPermissions: ['ANALYTICS_ADMIN'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: false,
      maxDataRange: 730,
    },
    [ReportType.PERIOD_COMPARISON]: {
      type: ReportType.PERIOD_COMPARISON,
      category: ReportCategory.MANAGEMENT,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'Period Comparison',
      description: 'Period-over-period performance analysis',
      estimatedTime: 25,
      requiredPermissions: ['ANALYTICS_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: true,
      maxDataRange: 730,
    },
    [ReportType.KPI_DASHBOARD]: {
      type: ReportType.KPI_DASHBOARD,
      category: ReportCategory.MANAGEMENT,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'KPI Dashboard',
      description: 'Key performance indicators overview',
      estimatedTime: 15,
      requiredPermissions: ['ANALYTICS_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: true,
      maxDataRange: 90,
    },
    [ReportType.FINANCIAL_ANALYTICS]: {
      type: ReportType.FINANCIAL_ANALYTICS,
      category: ReportCategory.MANAGEMENT,
      complexity: ReportComplexity.COMPLEX,
      displayName: 'Financial Analytics',
      description: 'Comprehensive financial performance analysis',
      estimatedTime: 45,
      requiredPermissions: ['FINANCIAL_VIEW', 'ANALYTICS_ADMIN'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: true,
      maxDataRange: 365,
    },
    [ReportType.USER_ACTIVITY_AUDIT]: {
      type: ReportType.USER_ACTIVITY_AUDIT,
      category: ReportCategory.COMPLIANCE,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'User Activity Audit',
      description: 'User access and activity tracking',
      estimatedTime: 20,
      requiredPermissions: ['AUDIT_VIEW', 'USER_ADMIN'],
      supportedFormats: ['PDF', 'CSV'],
      isSchedulable: true,
      maxDataRange: 90,
    },
    [ReportType.TRANSACTION_AUDIT_TRAIL]: {
      type: ReportType.TRANSACTION_AUDIT_TRAIL,
      category: ReportCategory.COMPLIANCE,
      complexity: ReportComplexity.COMPLEX,
      displayName: 'Transaction Audit Trail',
      description: 'Complete transaction history and modifications',
      estimatedTime: 35,
      requiredPermissions: ['AUDIT_VIEW', 'TRANSACTION_ADMIN'],
      supportedFormats: ['PDF', 'CSV'],
      isSchedulable: false,
      maxDataRange: 180,
    },
    [ReportType.REGULATORY_COMPLIANCE]: {
      type: ReportType.REGULATORY_COMPLIANCE,
      category: ReportCategory.COMPLIANCE,
      complexity: ReportComplexity.COMPLEX,
      displayName: 'Regulatory Compliance',
      description: 'Compliance reporting for regulatory requirements',
      estimatedTime: 60,
      requiredPermissions: ['COMPLIANCE_VIEW'],
      supportedFormats: ['PDF', 'EXCEL'],
      isSchedulable: true,
      maxDataRange: 365,
    },
    [ReportType.DATA_INTEGRITY_REPORT]: {
      type: ReportType.DATA_INTEGRITY_REPORT,
      category: ReportCategory.COMPLIANCE,
      complexity: ReportComplexity.MEDIUM,
      displayName: 'Data Integrity Report',
      description: 'Data quality and consistency validation',
      estimatedTime: 25,
      requiredPermissions: ['DATA_ADMIN'],
      supportedFormats: ['PDF', 'CSV'],
      isSchedulable: true,
      maxDataRange: 30,
    },
    [ReportType.CUSTOM_REPORT]: {
      type: ReportType.CUSTOM_REPORT,
      category: ReportCategory.CUSTOM,
      complexity: ReportComplexity.ENTERPRISE,
      displayName: 'Custom Report',
      description: 'User-defined custom reports with flexible parameters',
      estimatedTime: 120,
      requiredPermissions: ['CUSTOM_REPORT_CREATE'],
      supportedFormats: ['PDF', 'EXCEL', 'CSV'],
      isSchedulable: false,
      maxDataRange: 365,
    },
  };

  private constructor(private readonly type: ReportType) {}

  /**
   * Create ReportTypeValue from enum
   */
  static from(type: ReportType): ReportTypeValue {
    return new ReportTypeValue(type);
  }

  /**
   * Get report type metadata
   */
  getMetadata(): ReportTypeMetadata {
    const metadata = ReportTypeValue.TYPE_METADATA[this.type];
    if (!metadata) {
      throw new Error(`Unknown report type: ${this.type}`);
    }
    return metadata;
  }

  /**
   * Get display name for the report type
   */
  getDisplayName(): string {
    return this.getMetadata().displayName;
  }

  /**
   * Get report category
   */
  getCategory(): ReportCategory {
    return this.getMetadata().category;
  }

  /**
   * Get complexity level
   */
  getComplexity(): ReportComplexity {
    return this.getMetadata().complexity;
  }

  /**
   * Check if report is schedulable
   */
  isSchedulable(): boolean {
    return this.getMetadata().isSchedulable;
  }

  /**
   * Get estimated generation time in seconds
   */
  getEstimatedTime(): number {
    return this.getMetadata().estimatedTime;
  }

  /**
   * Get required permissions for this report
   */
  getRequiredPermissions(): string[] {
    return this.getMetadata().requiredPermissions;
  }

  /**
   * Get supported export formats
   */
  getSupportedFormats(): string[] {
    return this.getMetadata().supportedFormats;
  }

  /**
   * Get maximum data range in days
   */
  getMaxDataRange(): number {
    return this.getMetadata().maxDataRange;
  }

  /**
   * Get default parameters
   */
  getDefaultParameters(): Record<string, unknown> {
    return this.getMetadata().defaultParameters || {};
  }

  /**
   * Check if format is supported
   */
  supportsFormat(format: string): boolean {
    return this.getSupportedFormats().includes(format.toUpperCase());
  }

  /**
   * Validate data range
   */
  isValidDataRange(days: number): boolean {
    return days > 0 && days <= this.getMaxDataRange();
  }

  /**
   * Get report type as string
   */
  toString(): string {
    return this.type;
  }

  /**
   * Check equality
   */
  equals(other: ReportTypeValue): boolean {
    return this.type === other.type;
  }

  /**
   * Get all available report types
   */
  static getAllTypes(): ReportType[] {
    return Object.values(ReportType);
  }

  /**
   * Get report types by category
   */
  static getTypesByCategory(category: ReportCategory): ReportType[] {
    return Object.values(ReportType).filter((type) => {
      const metadata = ReportTypeValue.TYPE_METADATA[type];
      return metadata && metadata.category === category;
    });
  }

  /**
   * Get report types by complexity
   */
  static getTypesByComplexity(complexity: ReportComplexity): ReportType[] {
    return Object.values(ReportType).filter((type) => {
      const metadata = ReportTypeValue.TYPE_METADATA[type];
      return metadata && metadata.complexity === complexity;
    });
  }

  /**
   * Get schedulable report types
   */
  static getSchedulableTypes(): ReportType[] {
    return Object.values(ReportType).filter((type) => {
      const metadata = ReportTypeValue.TYPE_METADATA[type];
      return metadata && metadata.isSchedulable;
    });
  }
}

/**
 * Report type utilities
 */
export const ReportTypeUtils = {
  /**
   * Get category display name
   */
  getCategoryDisplayName: (category: ReportCategory): string => {
    const names = {
      [ReportCategory.FINANCIAL]: 'Financial Reports',
      [ReportCategory.SALES]: 'Sales & Performance',
      [ReportCategory.OPERATIONAL]: 'Operational Reports',
      [ReportCategory.MANAGEMENT]: 'Management & Analytics',
      [ReportCategory.COMPLIANCE]: 'Compliance & Audit',
      [ReportCategory.CUSTOM]: 'Custom Reports',
    };
    return names[category] || category;
  },

  /**
   * Get complexity display name
   */
  getComplexityDisplayName: (complexity: ReportComplexity): string => {
    const names = {
      [ReportComplexity.SIMPLE]: 'Simple',
      [ReportComplexity.MEDIUM]: 'Medium',
      [ReportComplexity.COMPLEX]: 'Complex',
      [ReportComplexity.ENTERPRISE]: 'Enterprise',
    };
    return names[complexity] || complexity;
  },

  /**
   * Get frequency display name
   */
  getFrequencyDisplayName: (frequency: ReportFrequency): string => {
    const names = {
      [ReportFrequency.ON_DEMAND]: 'On Demand',
      [ReportFrequency.DAILY]: 'Daily',
      [ReportFrequency.WEEKLY]: 'Weekly',
      [ReportFrequency.MONTHLY]: 'Monthly',
      [ReportFrequency.QUARTERLY]: 'Quarterly',
      [ReportFrequency.YEARLY]: 'Yearly',
    };
    return names[frequency] || frequency;
  },

  /**
   * Validate report type
   */
  isValidReportType: (type: string): type is ReportType => {
    return Object.values(ReportType).includes(type as ReportType);
  },

  /**
   * Get report icon (for UI components)
   */
  getReportIcon: (type: ReportType): string => {
    const icons: Record<ReportType, string> = {
      [ReportType.ACCOUNTS_RECEIVABLE_AGING]: 'schedule',
      [ReportType.CREDIT_RISK_ASSESSMENT]: 'security',
      [ReportType.PAYMENT_COLLECTION_REPORT]: 'payment',
      [ReportType.CREDIT_LIMIT_ANALYSIS]: 'credit_card',
      [ReportType.DAILY_CASH_FLOW]: 'account_balance',
      [ReportType.PAYMENT_METHOD_ANALYSIS]: 'payment',
      [ReportType.SALES_SUMMARY]: 'trending_up',
      [ReportType.CUSTOMER_ACTIVITY]: 'people',
      [ReportType.PRODUCT_PERFORMANCE]: 'assessment',
      [ReportType.ORDER_FULFILLMENT]: 'local_shipping',
      [ReportType.SALES_PIPELINE]: 'timeline',
      [ReportType.CUSTOMER_LIFETIME_VALUE]: 'star',
      [ReportType.INVENTORY_STOCK_LEVELS]: 'inventory',
      [ReportType.INVENTORY_MOVEMENT]: 'swap_horiz',
      [ReportType.PURCHASE_ORDER_ANALYSIS]: 'shopping_cart',
      [ReportType.AGENCY_PERFORMANCE_COMPARISON]: 'compare',
      [ReportType.SUPPLIER_PERFORMANCE]: 'business',
      [ReportType.EXECUTIVE_SUMMARY]: 'dashboard',
      [ReportType.TREND_ANALYSIS]: 'show_chart',
      [ReportType.PERIOD_COMPARISON]: 'compare_arrows',
      [ReportType.KPI_DASHBOARD]: 'speed',
      [ReportType.FINANCIAL_ANALYTICS]: 'analytics',
      [ReportType.USER_ACTIVITY_AUDIT]: 'person_search',
      [ReportType.TRANSACTION_AUDIT_TRAIL]: 'receipt',
      [ReportType.REGULATORY_COMPLIANCE]: 'gavel',
      [ReportType.DATA_INTEGRITY_REPORT]: 'verified_user',
      [ReportType.CUSTOM_REPORT]: 'build',
    };
    return icons[type] || 'description';
  },
} as const;
