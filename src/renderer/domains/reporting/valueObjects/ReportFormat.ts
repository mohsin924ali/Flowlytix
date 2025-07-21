/**
 * Report Format Value Object
 *
 * Following Instructions standards with clean architecture and DDD principles.
 * Defines export formats and their capabilities for reports.
 *
 * @domain Reporting
 * @pattern Value Object
 * @architecture Clean Architecture
 * @version 1.0.0
 */

/**
 * Report format enumeration
 */
export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  HTML = 'html',
  PRINT = 'print',
}

/**
 * Format feature flags interface
 */
export interface FormatFeatures {
  readonly supportsCharts: boolean;
  readonly supportsImages: boolean;
  readonly supportsMultipleSheets: boolean;
  readonly supportsFormulas: boolean;
  readonly supportsFormatting: boolean;
  readonly supportsPagination: boolean;
  readonly supportsInteractivity: boolean;
  readonly supportsLargeDatasets: boolean;
  readonly preservesStructure: boolean;
  readonly isHumanReadable: boolean;
}

/**
 * Report format metadata interface
 */
export interface ReportFormatMetadata {
  readonly format: ReportFormat;
  readonly displayName: string;
  readonly description: string;
  readonly fileExtension: string;
  readonly mimeType: string;
  readonly features: FormatFeatures;
  readonly maxFileSize: number; // in MB
  readonly maxRecords: number;
  readonly isDefault: boolean;
  readonly compressionSupported: boolean;
  readonly encryptionSupported: boolean;
  readonly viewerRequired: boolean;
  readonly browserCompatible: boolean;
  readonly mobileSupported: boolean;
  readonly estimatedSizeRatio: number; // relative to base data size
}

/**
 * Report Format Value Object Class
 * Provides comprehensive format management and capabilities
 */
export class ReportFormatValue {
  private static readonly FORMAT_METADATA: Record<ReportFormat, ReportFormatMetadata> = {
    [ReportFormat.PDF]: {
      format: ReportFormat.PDF,
      displayName: 'PDF Document',
      description: 'Portable Document Format - Professional reports with charts and formatting',
      fileExtension: 'pdf',
      mimeType: 'application/pdf',
      features: {
        supportsCharts: true,
        supportsImages: true,
        supportsMultipleSheets: false,
        supportsFormulas: false,
        supportsFormatting: true,
        supportsPagination: true,
        supportsInteractivity: false,
        supportsLargeDatasets: false,
        preservesStructure: true,
        isHumanReadable: true,
      },
      maxFileSize: 50, // 50MB
      maxRecords: 10000,
      isDefault: true,
      compressionSupported: true,
      encryptionSupported: true,
      viewerRequired: true,
      browserCompatible: true,
      mobileSupported: true,
      estimatedSizeRatio: 1.5,
    },
    [ReportFormat.EXCEL]: {
      format: ReportFormat.EXCEL,
      displayName: 'Excel Workbook',
      description: 'Microsoft Excel format with formulas, charts, and multiple sheets',
      fileExtension: 'xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      features: {
        supportsCharts: true,
        supportsImages: true,
        supportsMultipleSheets: true,
        supportsFormulas: true,
        supportsFormatting: true,
        supportsPagination: false,
        supportsInteractivity: true,
        supportsLargeDatasets: true,
        preservesStructure: true,
        isHumanReadable: false,
      },
      maxFileSize: 100, // 100MB
      maxRecords: 100000,
      isDefault: false,
      compressionSupported: true,
      encryptionSupported: true,
      viewerRequired: true,
      browserCompatible: false,
      mobileSupported: false,
      estimatedSizeRatio: 1.2,
    },
    [ReportFormat.CSV]: {
      format: ReportFormat.CSV,
      displayName: 'CSV File',
      description: 'Comma-separated values - Simple data export for analysis',
      fileExtension: 'csv',
      mimeType: 'text/csv',
      features: {
        supportsCharts: false,
        supportsImages: false,
        supportsMultipleSheets: false,
        supportsFormulas: false,
        supportsFormatting: false,
        supportsPagination: false,
        supportsInteractivity: false,
        supportsLargeDatasets: true,
        preservesStructure: false,
        isHumanReadable: true,
      },
      maxFileSize: 500, // 500MB
      maxRecords: 1000000,
      isDefault: false,
      compressionSupported: true,
      encryptionSupported: false,
      viewerRequired: false,
      browserCompatible: true,
      mobileSupported: true,
      estimatedSizeRatio: 0.8,
    },
    [ReportFormat.JSON]: {
      format: ReportFormat.JSON,
      displayName: 'JSON Data',
      description: 'JavaScript Object Notation - Structured data for APIs and integrations',
      fileExtension: 'json',
      mimeType: 'application/json',
      features: {
        supportsCharts: false,
        supportsImages: false,
        supportsMultipleSheets: false,
        supportsFormulas: false,
        supportsFormatting: false,
        supportsPagination: false,
        supportsInteractivity: false,
        supportsLargeDatasets: true,
        preservesStructure: true,
        isHumanReadable: true,
      },
      maxFileSize: 100, // 100MB
      maxRecords: 500000,
      isDefault: false,
      compressionSupported: true,
      encryptionSupported: false,
      viewerRequired: false,
      browserCompatible: true,
      mobileSupported: true,
      estimatedSizeRatio: 1.0,
    },
    [ReportFormat.XML]: {
      format: ReportFormat.XML,
      displayName: 'XML Document',
      description: 'Extensible Markup Language - Structured data with schema validation',
      fileExtension: 'xml',
      mimeType: 'application/xml',
      features: {
        supportsCharts: false,
        supportsImages: false,
        supportsMultipleSheets: false,
        supportsFormulas: false,
        supportsFormatting: false,
        supportsPagination: false,
        supportsInteractivity: false,
        supportsLargeDatasets: true,
        preservesStructure: true,
        isHumanReadable: true,
      },
      maxFileSize: 100, // 100MB
      maxRecords: 500000,
      isDefault: false,
      compressionSupported: true,
      encryptionSupported: false,
      viewerRequired: false,
      browserCompatible: true,
      mobileSupported: true,
      estimatedSizeRatio: 1.3,
    },
    [ReportFormat.HTML]: {
      format: ReportFormat.HTML,
      displayName: 'HTML Report',
      description: 'Web page format with interactive elements and responsive design',
      fileExtension: 'html',
      mimeType: 'text/html',
      features: {
        supportsCharts: true,
        supportsImages: true,
        supportsMultipleSheets: false,
        supportsFormulas: false,
        supportsFormatting: true,
        supportsPagination: true,
        supportsInteractivity: true,
        supportsLargeDatasets: false,
        preservesStructure: true,
        isHumanReadable: true,
      },
      maxFileSize: 25, // 25MB
      maxRecords: 5000,
      isDefault: false,
      compressionSupported: true,
      encryptionSupported: false,
      viewerRequired: false,
      browserCompatible: true,
      mobileSupported: true,
      estimatedSizeRatio: 2.0,
    },
    [ReportFormat.PRINT]: {
      format: ReportFormat.PRINT,
      displayName: 'Print Preview',
      description: 'Optimized for printing with proper page breaks and formatting',
      fileExtension: 'pdf',
      mimeType: 'application/pdf',
      features: {
        supportsCharts: true,
        supportsImages: true,
        supportsMultipleSheets: false,
        supportsFormulas: false,
        supportsFormatting: true,
        supportsPagination: true,
        supportsInteractivity: false,
        supportsLargeDatasets: false,
        preservesStructure: true,
        isHumanReadable: true,
      },
      maxFileSize: 50, // 50MB
      maxRecords: 10000,
      isDefault: false,
      compressionSupported: true,
      encryptionSupported: false,
      viewerRequired: true,
      browserCompatible: true,
      mobileSupported: false,
      estimatedSizeRatio: 1.8,
    },
  };

  private constructor(private readonly format: ReportFormat) {}

  /**
   * Create ReportFormatValue from enum
   */
  static from(format: ReportFormat): ReportFormatValue {
    return new ReportFormatValue(format);
  }

  /**
   * Create from string
   */
  static fromString(format: string): ReportFormatValue {
    if (!ReportFormatUtils.isValidFormat(format)) {
      throw new Error(`Invalid report format: ${format}`);
    }
    return new ReportFormatValue(format as ReportFormat);
  }

  /**
   * Get format metadata
   */
  getMetadata(): ReportFormatMetadata {
    const metadata = ReportFormatValue.FORMAT_METADATA[this.format];
    if (!metadata) {
      throw new Error(`Unknown report format: ${this.format}`);
    }
    return metadata;
  }

  /**
   * Get display name
   */
  getDisplayName(): string {
    return this.getMetadata().displayName;
  }

  /**
   * Get description
   */
  getDescription(): string {
    return this.getMetadata().description;
  }

  /**
   * Get file extension
   */
  getFileExtension(): string {
    return this.getMetadata().fileExtension;
  }

  /**
   * Get MIME type
   */
  getMimeType(): string {
    return this.getMetadata().mimeType;
  }

  /**
   * Get format features
   */
  getFeatures(): FormatFeatures {
    return this.getMetadata().features;
  }

  /**
   * Get maximum file size in MB
   */
  getMaxFileSize(): number {
    return this.getMetadata().maxFileSize;
  }

  /**
   * Get maximum record count
   */
  getMaxRecords(): number {
    return this.getMetadata().maxRecords;
  }

  /**
   * Check if this is the default format
   */
  isDefault(): boolean {
    return this.getMetadata().isDefault;
  }

  /**
   * Check if compression is supported
   */
  supportsCompression(): boolean {
    return this.getMetadata().compressionSupported;
  }

  /**
   * Check if encryption is supported
   */
  supportsEncryption(): boolean {
    return this.getMetadata().encryptionSupported;
  }

  /**
   * Check if viewer is required
   */
  requiresViewer(): boolean {
    return this.getMetadata().viewerRequired;
  }

  /**
   * Check if browser compatible
   */
  isBrowserCompatible(): boolean {
    return this.getMetadata().browserCompatible;
  }

  /**
   * Check if mobile supported
   */
  isMobileSupported(): boolean {
    return this.getMetadata().mobileSupported;
  }

  /**
   * Get estimated size ratio
   */
  getEstimatedSizeRatio(): number {
    return this.getMetadata().estimatedSizeRatio;
  }

  /**
   * Check if format supports charts
   */
  supportsCharts(): boolean {
    return this.getFeatures().supportsCharts;
  }

  /**
   * Check if format supports images
   */
  supportsImages(): boolean {
    return this.getFeatures().supportsImages;
  }

  /**
   * Check if format supports multiple sheets
   */
  supportsMultipleSheets(): boolean {
    return this.getFeatures().supportsMultipleSheets;
  }

  /**
   * Check if format supports formulas
   */
  supportsFormulas(): boolean {
    return this.getFeatures().supportsFormulas;
  }

  /**
   * Check if format supports formatting
   */
  supportsFormatting(): boolean {
    return this.getFeatures().supportsFormatting;
  }

  /**
   * Check if format supports pagination
   */
  supportsPagination(): boolean {
    return this.getFeatures().supportsPagination;
  }

  /**
   * Check if format supports interactivity
   */
  supportsInteractivity(): boolean {
    return this.getFeatures().supportsInteractivity;
  }

  /**
   * Check if format supports large datasets
   */
  supportsLargeDatasets(): boolean {
    return this.getFeatures().supportsLargeDatasets;
  }

  /**
   * Check if format preserves structure
   */
  preservesStructure(): boolean {
    return this.getFeatures().preservesStructure;
  }

  /**
   * Check if format is human readable
   */
  isHumanReadable(): boolean {
    return this.getFeatures().isHumanReadable;
  }

  /**
   * Check if record count is within limits
   */
  canHandleRecordCount(count: number): boolean {
    return count <= this.getMaxRecords();
  }

  /**
   * Estimate file size for given record count
   */
  estimateFileSize(recordCount: number, avgRecordSize: number = 1024): number {
    const baseSize = (recordCount * avgRecordSize) / (1024 * 1024); // Convert to MB
    return baseSize * this.getEstimatedSizeRatio();
  }

  /**
   * Check if estimated file size is within limits
   */
  canHandleFileSize(recordCount: number, avgRecordSize: number = 1024): boolean {
    const estimatedSize = this.estimateFileSize(recordCount, avgRecordSize);
    return estimatedSize <= this.getMaxFileSize();
  }

  /**
   * Get format as string
   */
  toString(): string {
    return this.format;
  }

  /**
   * Check equality
   */
  equals(other: ReportFormatValue): boolean {
    return this.format === other.format;
  }

  /**
   * Get all available formats
   */
  static getAllFormats(): ReportFormat[] {
    return Object.values(ReportFormat);
  }

  /**
   * Get default format
   */
  static getDefaultFormat(): ReportFormatValue {
    const defaultFormat = Object.values(ReportFormat).find((format) => {
      const metadata = ReportFormatValue.FORMAT_METADATA[format];
      return metadata && metadata.isDefault;
    });

    if (!defaultFormat) {
      return ReportFormatValue.from(ReportFormat.PDF);
    }

    return ReportFormatValue.from(defaultFormat);
  }

  /**
   * Get formats that support feature
   */
  static getFormatsWithFeature(feature: keyof FormatFeatures): ReportFormat[] {
    return Object.values(ReportFormat).filter((format) => {
      const metadata = ReportFormatValue.FORMAT_METADATA[format];
      return metadata && metadata.features[feature];
    });
  }

  /**
   * Get browser compatible formats
   */
  static getBrowserCompatibleFormats(): ReportFormat[] {
    return Object.values(ReportFormat).filter((format) => {
      const metadata = ReportFormatValue.FORMAT_METADATA[format];
      return metadata && metadata.browserCompatible;
    });
  }

  /**
   * Get mobile supported formats
   */
  static getMobileSupportedFormats(): ReportFormat[] {
    return Object.values(ReportFormat).filter((format) => {
      const metadata = ReportFormatValue.FORMAT_METADATA[format];
      return metadata && metadata.mobileSupported;
    });
  }

  /**
   * Get formats suitable for large datasets
   */
  static getLargeDatasetFormats(): ReportFormat[] {
    return Object.values(ReportFormat).filter((format) => {
      const metadata = ReportFormatValue.FORMAT_METADATA[format];
      return metadata && metadata.features.supportsLargeDatasets;
    });
  }
}

/**
 * Report format utilities
 */
export const ReportFormatUtils = {
  /**
   * Validate format string
   */
  isValidFormat: (format: string): format is ReportFormat => {
    return Object.values(ReportFormat).includes(format as ReportFormat);
  },

  /**
   * Get format icon for UI components
   */
  getFormatIcon: (format: ReportFormat): string => {
    const icons: Record<ReportFormat, string> = {
      [ReportFormat.PDF]: 'picture_as_pdf',
      [ReportFormat.EXCEL]: 'grid_on',
      [ReportFormat.CSV]: 'table_chart',
      [ReportFormat.JSON]: 'code',
      [ReportFormat.XML]: 'code',
      [ReportFormat.HTML]: 'web',
      [ReportFormat.PRINT]: 'print',
    };
    return icons[format] || 'description';
  },

  /**
   * Get format color for UI components
   */
  getFormatColor: (format: ReportFormat): string => {
    const colors: Record<ReportFormat, string> = {
      [ReportFormat.PDF]: '#d32f2f', // Red
      [ReportFormat.EXCEL]: '#2e7d32', // Green
      [ReportFormat.CSV]: '#f57c00', // Orange
      [ReportFormat.JSON]: '#512da8', // Deep Purple
      [ReportFormat.XML]: '#512da8', // Deep Purple
      [ReportFormat.HTML]: '#1976d2', // Blue
      [ReportFormat.PRINT]: '#424242', // Grey
    };
    return colors[format] || '#616161';
  },

  /**
   * Get recommended format for data size
   */
  getRecommendedFormat: (recordCount: number, includeCharts: boolean = false): ReportFormat => {
    if (recordCount > 50000) {
      return ReportFormat.CSV; // Large datasets
    }

    if (recordCount > 10000) {
      return ReportFormat.EXCEL; // Medium datasets with potential for analysis
    }

    if (includeCharts) {
      return ReportFormat.PDF; // Visual reports
    }

    return ReportFormat.PDF; // Default for most cases
  },

  /**
   * Get format file name
   */
  getFileName: (baseName: string, format: ReportFormat, timestamp?: Date): string => {
    const formatValue = ReportFormatValue.from(format);
    const extension = formatValue.getFileExtension();

    let fileName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (timestamp) {
      const dateStr = timestamp.toISOString().slice(0, 19).replace(/[:-]/g, '');
      fileName += `_${dateStr}`;
    }

    return `${fileName}.${extension}`;
  },

  /**
   * Check format compatibility with features
   */
  isCompatibleWithFeatures: (format: ReportFormat, requiredFeatures: (keyof FormatFeatures)[]): boolean => {
    const formatValue = ReportFormatValue.from(format);
    const features = formatValue.getFeatures();

    return requiredFeatures.every((feature) => features[feature]);
  },

  /**
   * Get format quality score (0-100)
   */
  getQualityScore: (format: ReportFormat): number => {
    const formatValue = ReportFormatValue.from(format);
    const features = formatValue.getFeatures();

    let score = 0;

    // Feature scoring
    if (features.supportsCharts) score += 15;
    if (features.supportsImages) score += 10;
    if (features.supportsFormatting) score += 15;
    if (features.supportsMultipleSheets) score += 10;
    if (features.supportsFormulas) score += 10;
    if (features.supportsPagination) score += 10;
    if (features.supportsInteractivity) score += 10;
    if (features.preservesStructure) score += 10;
    if (features.isHumanReadable) score += 10;

    return Math.min(score, 100);
  },

  /**
   * Sort formats by preference
   */
  sortByPreference: (formats: ReportFormat[]): ReportFormat[] => {
    return formats.sort((a, b) => {
      const scoreA = ReportFormatUtils.getQualityScore(a);
      const scoreB = ReportFormatUtils.getQualityScore(b);
      return scoreB - scoreA; // Descending order
    });
  },
} as const;
