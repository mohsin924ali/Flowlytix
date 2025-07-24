/**
 * Report File Service
 *
 * Following Instructions standards with clean architecture and DDD principles.
 * Handles file operations, storage, and download management for reports.
 *
 * @domain Reporting
 * @pattern Service Layer
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { ReportFormat, ReportFormatValue } from '../valueObjects/ReportFormat';
import type { ReportErrorCode } from '../types/ReportTypes';
import { ReportBusinessRules, ReportErrorCodes } from '../types/ReportTypes';

/**
 * File storage result interface
 */
export interface FileStorageResult {
  readonly success: boolean;
  readonly fileId?: string | undefined;
  readonly url?: string | undefined;
  readonly fileName?: string | undefined;
  readonly fileSize?: number | undefined;
  readonly expiresAt?: Date | undefined;
  readonly error?:
    | {
        readonly code: ReportErrorCode;
        readonly message: string;
        readonly details?: Record<string, unknown> | undefined;
      }
    | undefined;
}

/**
 * File metadata interface
 */
export interface FileMetadata {
  readonly fileId: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly format: ReportFormat;
  readonly reportType: string;
  readonly agencyId: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly downloadCount: number;
  readonly lastDownloadAt?: Date;
  readonly isEncrypted: boolean;
  readonly isCompressed: boolean;
  readonly checksum: string;
}

/**
 * Download options interface
 */
export interface DownloadOptions {
  readonly fileName?: string;
  readonly inline?: boolean; // Open in browser vs download
  readonly requestId?: string;
  readonly userAgent?: string;
}

/**
 * File cleanup result interface
 */
export interface FileCleanupResult {
  readonly filesRemoved: number;
  readonly spaceFreed: number; // in bytes
  readonly errors: string[];
}

/**
 * Report File Service Implementation
 * Handles all file operations for generated reports
 */
export class ReportFileService {
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly DOWNLOAD_URL_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly STORAGE_QUOTA = 1024 * 1024 * 1024; // 1GB

  // In-memory storage for development (replace with proper storage in production)
  private static readonly fileStorage = new Map<
    string,
    {
      blob: Blob;
      metadata: FileMetadata;
      downloadUrls: Map<string, { url: string; expiresAt: Date }>;
    }
  >();

  /**
   * Store report file
   */
  static async storeFile(
    blob: Blob,
    fileName: string,
    format: ReportFormat,
    reportType: string,
    agencyId: string,
    userId: string,
    options: {
      encrypt?: boolean;
      compress?: boolean;
      retentionDays?: number;
    } = {}
  ): Promise<FileStorageResult> {
    console.log(`💾 File Service: Storing file ${fileName}`, {
      size: blob.size,
      format,
      reportType,
      agencyId,
      options,
    });

    try {
      // Validate file size
      if (blob.size > ReportFileService.MAX_FILE_SIZE) {
        throw new FileError(
          ReportErrorCodes.FILE_SIZE_LIMIT_EXCEEDED,
          `File size ${blob.size} exceeds maximum allowed size of ${ReportFileService.MAX_FILE_SIZE}`,
          { fileSize: blob.size, maxSize: ReportFileService.MAX_FILE_SIZE }
        );
      }

      // Check storage quota
      const currentUsage = ReportFileService.getCurrentStorageUsage();
      if (currentUsage + blob.size > ReportFileService.STORAGE_QUOTA) {
        throw new FileError(
          ReportErrorCodes.STORAGE_QUOTA_EXCEEDED,
          `Storage quota exceeded. Current: ${currentUsage}, Required: ${blob.size}, Limit: ${ReportFileService.STORAGE_QUOTA}`,
          { currentUsage, required: blob.size, limit: ReportFileService.STORAGE_QUOTA }
        );
      }

      // Generate file ID and metadata
      const fileId = ReportFileService.generateFileId();
      const formatValue = ReportFormatValue.from(format);
      const retentionDays = options.retentionDays || ReportBusinessRules.MAX_REPORT_RETENTION_DAYS;

      const metadata: FileMetadata = {
        fileId,
        fileName,
        fileSize: blob.size,
        mimeType: formatValue.getMimeType(),
        format,
        reportType,
        agencyId,
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
        downloadCount: 0,
        isEncrypted: options.encrypt || false,
        isCompressed: options.compress || false,
        checksum: await ReportFileService.calculateChecksum(blob),
      };

      // Process blob if needed
      let processedBlob = blob;
      if (options.compress && formatValue.supportsCompression()) {
        processedBlob = await ReportFileService.compressBlob(blob);
        console.log(`📦 File Service: Compressed file from ${blob.size} to ${processedBlob.size} bytes`);
      }

      if (options.encrypt && formatValue.supportsEncryption()) {
        processedBlob = await ReportFileService.encryptBlob(processedBlob);
        console.log(`🔒 File Service: Encrypted file`);
      }

      // Store file
      ReportFileService.fileStorage.set(fileId, {
        blob: processedBlob,
        metadata: { ...metadata, fileSize: processedBlob.size },
        downloadUrls: new Map(),
      });

      // Generate initial download URL
      const downloadUrl = await ReportFileService.generateDownloadUrl(fileId);

      console.log(`✅ File Service: File stored successfully`, {
        fileId,
        originalSize: blob.size,
        storedSize: processedBlob.size,
        downloadUrl,
      });

      return {
        success: true,
        fileId,
        url: downloadUrl || undefined,
        fileName,
        fileSize: processedBlob.size,
        expiresAt: metadata.expiresAt,
      };
    } catch (error) {
      console.error(`❌ File Service: Failed to store file ${fileName}:`, error);

      const errorDetails = error instanceof FileError ? error.details : { fileName, format };
      return {
        success: false,
        error: {
          code: error instanceof FileError ? error.code : ReportErrorCodes.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: errorDetails,
        },
      };
    }
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    console.log(`📋 File Service: Getting metadata for file ${fileId}`);

    const stored = ReportFileService.fileStorage.get(fileId);
    if (!stored) {
      console.log(`❌ File Service: File ${fileId} not found`);
      return null;
    }

    // Check if file is expired
    if (stored.metadata.expiresAt < new Date()) {
      console.log(`⏰ File Service: File ${fileId} has expired, removing`);
      ReportFileService.fileStorage.delete(fileId);
      return null;
    }

    return stored.metadata;
  }

  /**
   * Generate download URL
   */
  static async generateDownloadUrl(fileId: string, options: DownloadOptions = {}): Promise<string | null> {
    console.log(`🔗 File Service: Generating download URL for file ${fileId}`);

    const stored = ReportFileService.fileStorage.get(fileId);
    if (!stored) {
      console.log(`❌ File Service: File ${fileId} not found`);
      return null;
    }

    // Check if file is expired
    if (stored.metadata.expiresAt < new Date()) {
      console.log(`⏰ File Service: File ${fileId} has expired`);
      ReportFileService.fileStorage.delete(fileId);
      return null;
    }

    // Generate URL ID and expiration
    const urlId = ReportFileService.generateUrlId();
    const expiresAt = new Date(Date.now() + ReportFileService.DOWNLOAD_URL_TTL);

    // Process blob for download (decrypt/decompress if needed)
    let downloadBlob = stored.blob;

    // Decrypt if encrypted
    if (stored.metadata.isEncrypted) {
      downloadBlob = await ReportFileService.decryptBlob(downloadBlob);
      console.log(`🔓 File Service: Decrypted file for download URL generation`);
    }

    // Decompress if compressed
    if (stored.metadata.isCompressed) {
      downloadBlob = await ReportFileService.decompressBlob(downloadBlob);
      console.log(`📦 File Service: Decompressed file for download URL generation`);
    }

    // Create blob URL with the processed blob
    const blobUrl = URL.createObjectURL(downloadBlob);

    // Store URL mapping
    stored.downloadUrls.set(urlId, { url: blobUrl, expiresAt });

    // Clean up expired URLs
    ReportFileService.cleanupExpiredUrls(stored.downloadUrls);

    console.log(`✅ File Service: Generated download URL for file ${fileId}`, {
      urlId,
      expiresAt,
      blobUrl: blobUrl.substring(0, 50) + '...',
    });

    // Return the actual blob URL instead of a fake API URL
    return blobUrl;
  }

  /**
   * Download file
   */
  static async downloadFile(
    fileId: string,
    urlId: string,
    options: DownloadOptions = {}
  ): Promise<{ blob: Blob; metadata: FileMetadata } | null> {
    console.log(`⬇️ File Service: Processing download for file ${fileId}, URL ${urlId}`);

    const stored = ReportFileService.fileStorage.get(fileId);
    if (!stored) {
      console.log(`❌ File Service: File ${fileId} not found`);
      return null;
    }

    // Check file expiration
    if (stored.metadata.expiresAt < new Date()) {
      console.log(`⏰ File Service: File ${fileId} has expired`);
      ReportFileService.fileStorage.delete(fileId);
      return null;
    }

    // Check URL validity
    const urlData = stored.downloadUrls.get(urlId);
    if (!urlData) {
      console.log(`❌ File Service: Download URL ${urlId} not found for file ${fileId}`);
      return null;
    }

    if (urlData.expiresAt < new Date()) {
      console.log(`⏰ File Service: Download URL ${urlId} has expired`);
      stored.downloadUrls.delete(urlId);
      return null;
    }

    // Process blob for download
    let downloadBlob = stored.blob;

    // Decrypt if encrypted
    if (stored.metadata.isEncrypted) {
      downloadBlob = await ReportFileService.decryptBlob(downloadBlob);
      console.log(`🔓 File Service: Decrypted file for download`);
    }

    // Decompress if compressed
    if (stored.metadata.isCompressed) {
      downloadBlob = await ReportFileService.decompressBlob(downloadBlob);
      console.log(`📦 File Service: Decompressed file for download`);
    }

    // Update download statistics
    const updatedMetadata = {
      ...stored.metadata,
      downloadCount: stored.metadata.downloadCount + 1,
      lastDownloadAt: new Date(),
    };

    // Update stored metadata
    stored.metadata = updatedMetadata;

    console.log(`✅ File Service: File download processed successfully`, {
      fileId,
      downloadCount: updatedMetadata.downloadCount,
      fileSize: downloadBlob.size,
    });

    return {
      blob: downloadBlob,
      metadata: updatedMetadata,
    };
  }

  /**
   * Delete file
   */
  static async deleteFile(fileId: string): Promise<boolean> {
    console.log(`🗑️ File Service: Deleting file ${fileId}`);

    const stored = ReportFileService.fileStorage.get(fileId);
    if (!stored) {
      console.log(`❌ File Service: File ${fileId} not found`);
      return false;
    }

    // Clean up blob URLs
    stored.downloadUrls.forEach((urlData) => {
      URL.revokeObjectURL(urlData.url);
    });

    // Remove from storage
    const success = ReportFileService.fileStorage.delete(fileId);

    if (success) {
      console.log(`✅ File Service: File ${fileId} deleted successfully`);
    } else {
      console.log(`❌ File Service: Failed to delete file ${fileId}`);
    }

    return success;
  }

  /**
   * List files for agency
   */
  static async listFiles(
    agencyId: string,
    options: {
      userId?: string;
      reportType?: string;
      format?: ReportFormat;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<FileMetadata[]> {
    console.log(`📋 File Service: Listing files for agency ${agencyId}`, options);

    const allFiles: FileMetadata[] = [];
    const now = new Date();

    ReportFileService.fileStorage.forEach((stored, fileId) => {
      const metadata = stored.metadata;

      // Skip expired files
      if (metadata.expiresAt < now) {
        ReportFileService.fileStorage.delete(fileId);
        return;
      }

      // Filter by agency
      if (metadata.agencyId !== agencyId) {
        return;
      }

      // Apply additional filters
      if (options.userId && metadata.userId !== options.userId) {
        return;
      }

      if (options.reportType && metadata.reportType !== options.reportType) {
        return;
      }

      if (options.format && metadata.format !== options.format) {
        return;
      }

      allFiles.push(metadata);
    });

    // Sort by creation date (newest first)
    allFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    const paginatedFiles = allFiles.slice(offset, offset + limit);

    console.log(`✅ File Service: Found ${paginatedFiles.length} files (${allFiles.length} total)`);

    return paginatedFiles;
  }

  /**
   * Clean up expired files
   */
  static async cleanupExpiredFiles(): Promise<FileCleanupResult> {
    console.log(`🧹 File Service: Cleaning up expired files`);

    const now = new Date();
    let filesRemoved = 0;
    let spaceFreed = 0;
    const errors: string[] = [];

    ReportFileService.fileStorage.forEach((stored, fileId) => {
      try {
        if (stored.metadata.expiresAt < now) {
          spaceFreed += stored.metadata.fileSize;

          // Clean up blob URLs
          stored.downloadUrls.forEach((urlData) => {
            URL.revokeObjectURL(urlData.url);
          });

          ReportFileService.fileStorage.delete(fileId);
          filesRemoved++;
        }
      } catch (error) {
        const errorMessage = `Failed to cleanup file ${fileId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.error(`❌ File Service: ${errorMessage}`);
      }
    });

    const result = { filesRemoved, spaceFreed, errors };

    console.log(`✅ File Service: Cleanup completed`, result);

    return result;
  }

  /**
   * Get storage statistics
   */
  static getStorageStats(): {
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    quotaUsed: number;
    quotaAvailable: number;
    quotaUtilization: number;
  } {
    let totalFiles = 0;
    let totalSize = 0;

    ReportFileService.fileStorage.forEach((stored) => {
      totalFiles++;
      totalSize += stored.metadata.fileSize;
    });

    const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;
    const quotaAvailable = ReportFileService.STORAGE_QUOTA - totalSize;
    const quotaUtilization = (totalSize / ReportFileService.STORAGE_QUOTA) * 100;

    return {
      totalFiles,
      totalSize,
      averageFileSize,
      quotaUsed: totalSize,
      quotaAvailable,
      quotaUtilization,
    };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Generate unique file ID
   */
  private static generateFileId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `file_${timestamp}_${random}`;
  }

  /**
   * Generate unique URL ID
   */
  private static generateUrlId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `url_${timestamp}_${random}`;
  }

  /**
   * Calculate file checksum
   */
  private static async calculateChecksum(blob: Blob): Promise<string> {
    try {
      const buffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('⚠️ File Service: Failed to calculate checksum, using fallback');
      return `fallback_${Date.now()}_${Math.random().toString(36)}`;
    }
  }

  /**
   * Compress blob (mock implementation)
   */
  private static async compressBlob(blob: Blob): Promise<Blob> {
    // In a real implementation, use compression library like pako
    console.log('📦 File Service: Compressing blob (mock implementation)');

    // Mock compression by reducing size slightly
    const buffer = await blob.arrayBuffer();
    const compressedBuffer = buffer.slice(0, Math.floor(buffer.byteLength * 0.8));

    return new Blob([compressedBuffer], { type: blob.type });
  }

  /**
   * Decompress blob (mock implementation)
   */
  private static async decompressBlob(blob: Blob): Promise<Blob> {
    // In a real implementation, use decompression library
    console.log('📦 File Service: Decompressing blob (mock implementation)');

    // Mock decompression - in reality, this would restore original size
    return blob;
  }

  /**
   * Encrypt blob (mock implementation)
   */
  private static async encryptBlob(blob: Blob): Promise<Blob> {
    // In a real implementation, use Web Crypto API or encryption library
    console.log('🔒 File Service: Encrypting blob (mock implementation)');

    // Mock encryption
    const buffer = await blob.arrayBuffer();
    const encryptedBuffer = new ArrayBuffer(buffer.byteLength + 16); // Add mock header
    new Uint8Array(encryptedBuffer).set(new Uint8Array(buffer), 16);

    return new Blob([encryptedBuffer], { type: blob.type });
  }

  /**
   * Decrypt blob (mock implementation)
   */
  private static async decryptBlob(blob: Blob): Promise<Blob> {
    // In a real implementation, use decryption
    console.log('🔓 File Service: Decrypting blob (mock implementation)');

    // Mock decryption - remove mock header
    const buffer = await blob.arrayBuffer();
    const decryptedBuffer = buffer.slice(16);

    return new Blob([decryptedBuffer], { type: blob.type });
  }

  /**
   * Get current storage usage
   */
  private static getCurrentStorageUsage(): number {
    let totalSize = 0;

    ReportFileService.fileStorage.forEach((stored) => {
      totalSize += stored.metadata.fileSize;
    });

    return totalSize;
  }

  /**
   * Clean up expired download URLs
   */
  private static cleanupExpiredUrls(urlMap: Map<string, { url: string; expiresAt: Date }>): void {
    const now = new Date();

    urlMap.forEach((urlData, urlId) => {
      if (urlData.expiresAt < now) {
        URL.revokeObjectURL(urlData.url);
        urlMap.delete(urlId);
      }
    });
  }
}

/**
 * File error class
 */
export class FileError extends Error {
  constructor(
    public readonly code: ReportErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FileError';
  }
}

/**
 * File service utilities
 */
export const FileServiceUtils = {
  /**
   * Format file size for display
   */
  formatFileSize: (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  /**
   * Get file type icon
   */
  getFileTypeIcon: (format: ReportFormat): string => {
    const icons = {
      [ReportFormat.PDF]: '📄',
      [ReportFormat.EXCEL]: '📊',
      [ReportFormat.CSV]: '📋',
      [ReportFormat.JSON]: '📁',
      [ReportFormat.XML]: '📄',
      [ReportFormat.HTML]: '🌐',
      [ReportFormat.PRINT]: '🖨️',
    };

    return icons[format] || '📄';
  },

  /**
   * Validate file name
   */
  validateFileName: (fileName: string): { isValid: boolean; error?: string } => {
    if (!fileName || fileName.trim().length === 0) {
      return { isValid: false, error: 'File name cannot be empty' };
    }

    if (fileName.length > 255) {
      return { isValid: false, error: 'File name cannot exceed 255 characters' };
    }

    const invalidChars = /[<>:"/\\|?*]/g;
    if (invalidChars.test(fileName)) {
      return { isValid: false, error: 'File name contains invalid characters' };
    }

    return { isValid: true };
  },

  /**
   * Sanitize file name
   */
  sanitizeFileName: (fileName: string): string => {
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 255);
  },

  /**
   * Generate secure download token
   */
  generateDownloadToken: (fileId: string, userId: string): string => {
    const data = `${fileId}:${userId}:${Date.now()}`;
    const encoder = new TextEncoder();
    const dataArray = encoder.encode(data);

    // Simple token generation - in production, use proper JWT or similar
    const token = Array.from(dataArray)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    return token.substring(0, 32);
  },
} as const;
