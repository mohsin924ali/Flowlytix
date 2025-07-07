/**
 * Payment System Types and Interfaces
 *
 * Comprehensive type definitions for the payment domain.
 * Following strict TypeScript standards with proper JSDoc documentation.
 *
 * @domain Payment
 * @pattern Type Definitions
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { z } from 'zod';
import Money from '../valueObjects/Money';
import CreditTerms from '../valueObjects/CreditTerms';
import {
  PaymentStatus,
  PaymentMethod,
  CreditStatus,
  InvoiceStatus,
  TransactionType,
  CreditRiskLevel,
  ApprovalStatus,
  CollectionActivityType,
  CollectionOutcome,
} from '../valueObjects/PaymentStatus';
import { PaymentMetadata } from '../entities/Payment';

// ==================== CORE PAYMENT INTERFACES ====================

/**
 * Payment record interface
 */
export interface PaymentRecord {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly amount: number;
  readonly currency: string;
  readonly paymentMethod: PaymentMethod;
  readonly status: PaymentStatus;
  readonly metadata: PaymentMetadata;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy?: string;
  readonly updatedAt?: Date;
  readonly agencyId: string;
  readonly version: number;
}

/**
 * Payment list item interface (for UI)
 */
export interface PaymentListItem {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly amount: number;
  readonly currency: string;
  readonly formattedAmount: string;
  readonly paymentMethod: PaymentMethod;
  readonly paymentMethodText: string;
  readonly status: PaymentStatus;
  readonly statusText: string;
  readonly statusColor: string;
  readonly reference: string;
  readonly createdAt: Date;
  readonly agencyId: string;
  readonly isRecent: boolean;
  readonly canEdit: boolean;
  readonly canCancel: boolean;
  readonly canRefund: boolean;
}

/**
 * Payment filters interface
 */
export interface PaymentFilters {
  readonly customerId?: string;
  readonly customerName?: string;
  readonly paymentMethods?: PaymentMethod[];
  readonly statuses?: PaymentStatus[];
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
  readonly amountMin?: number;
  readonly amountMax?: number;
  readonly reference?: string;
  readonly agencyId?: string;
  readonly createdBy?: string;
  readonly search?: string;
}

/**
 * Payment list response interface
 */
export interface PaymentListResponse {
  readonly payments: PaymentListItem[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

// ==================== CREDIT MANAGEMENT INTERFACES ====================

/**
 * Credit account interface
 */
export interface CreditAccount {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly creditLimit: number;
  readonly availableCredit: number;
  readonly outstandingBalance: number;
  readonly creditUtilization: number;
  readonly creditStatus: CreditStatus;
  readonly creditTerms: string;
  readonly creditTermsDays: number;
  readonly lastPaymentDate?: Date;
  readonly lastPaymentAmount?: number;
  readonly riskLevel: CreditRiskLevel;
  readonly riskScore: number;
  readonly agencyId: string;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
}

/**
 * Credit check request interface
 */
export interface CreditCheckRequest {
  readonly customerId: string;
  readonly requestedAmount: number;
  readonly currency: string;
  readonly orderTotal?: number;
  readonly agencyId: string;
  readonly requestedBy: string;
}

/**
 * Credit check result interface
 */
export interface CreditCheckResult {
  readonly customerId: string;
  readonly requestedAmount: number;
  readonly currentLimit: number;
  readonly availableCredit: number;
  readonly outstandingBalance: number;
  readonly approved: boolean;
  readonly requiresApproval: boolean;
  readonly riskLevel: CreditRiskLevel;
  readonly riskScore: number;
  readonly creditStatus: CreditStatus;
  readonly reasons: string[];
  readonly recommendations: string[];
  readonly checkedAt: Date;
  readonly checkedBy: string;
}

/**
 * Credit limit adjustment interface
 */
export interface CreditLimitAdjustment {
  readonly id: string;
  readonly customerId: string;
  readonly currentLimit: number;
  readonly newLimit: number;
  readonly changeAmount: number;
  readonly changePercentage: number;
  readonly reason: string;
  readonly approvalStatus: ApprovalStatus;
  readonly requestedBy: string;
  readonly requestedAt: Date;
  readonly approvedBy?: string;
  readonly approvedAt?: Date;
  readonly effectiveDate?: Date;
  readonly agencyId: string;
}

// ==================== INVOICE INTERFACES ====================

/**
 * Invoice interface
 */
export interface Invoice {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly orderId?: string;
  readonly orderNumber?: string;
  readonly issueDate: Date;
  readonly dueDate: Date;
  readonly subtotal: number;
  readonly taxAmount: number;
  readonly discountAmount: number;
  readonly totalAmount: number;
  readonly currency: string;
  readonly status: InvoiceStatus;
  readonly paymentTerms: string;
  readonly paymentTermsDays: number;
  readonly paidAmount: number;
  readonly outstandingAmount: number;
  readonly overdueDays: number;
  readonly items: InvoiceItem[];
  readonly payments: InvoicePaymentAllocation[];
  readonly agencyId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
}

/**
 * Invoice item interface
 */
export interface InvoiceItem {
  readonly id: string;
  readonly productId: string;
  readonly productCode: string;
  readonly productName: string;
  readonly description?: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
  readonly taxRate: number;
  readonly taxAmount: number;
  readonly discountPercentage: number;
  readonly discountAmount: number;
  readonly finalAmount: number;
}

/**
 * Invoice payment allocation interface
 */
export interface InvoicePaymentAllocation {
  readonly id: string;
  readonly invoiceId: string;
  readonly paymentId: string;
  readonly allocatedAmount: number;
  readonly currency: string;
  readonly allocatedAt: Date;
  readonly allocatedBy: string;
  readonly notes?: string;
}

// ==================== TRANSACTION INTERFACES ====================

/**
 * Transaction interface
 */
export interface Transaction {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly type: TransactionType;
  readonly amount: number;
  readonly currency: string;
  readonly description: string;
  readonly reference?: string;
  readonly relatedPaymentId?: string;
  readonly relatedInvoiceId?: string;
  readonly relatedOrderId?: string;
  readonly metadata: Record<string, any>;
  readonly agencyId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly effectiveDate: Date;
}

/**
 * Customer account balance interface
 */
export interface CustomerAccountBalance {
  readonly customerId: string;
  readonly customerName: string;
  readonly currentBalance: number;
  readonly availableCredit: number;
  readonly creditLimit: number;
  readonly outstandingInvoices: number;
  readonly overdueAmount: number;
  readonly currency: string;
  readonly lastTransactionDate?: Date;
  readonly lastPaymentDate?: Date;
  readonly agencyId: string;
  readonly calculatedAt: Date;
}

// ==================== COLLECTION INTERFACES ====================

/**
 * Collection activity interface
 */
export interface CollectionActivity {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly activityType: CollectionActivityType;
  readonly description: string;
  readonly outcome: CollectionOutcome;
  readonly promisedPaymentDate?: Date;
  readonly promisedAmount?: number;
  readonly notes?: string;
  readonly performedBy: string;
  readonly performedAt: Date;
  readonly followUpDate?: Date;
  readonly agencyId: string;
}

/**
 * Aging report item interface
 */
export interface AgingReportItem {
  readonly customerId: string;
  readonly customerName: string;
  readonly totalOutstanding: number;
  readonly current: number;
  readonly days1To30: number;
  readonly days31To60: number;
  readonly days61To90: number;
  readonly days90Plus: number;
  readonly oldestInvoiceDate?: Date;
  readonly currency: string;
  readonly creditLimit: number;
  readonly creditStatus: CreditStatus;
  readonly riskLevel: CreditRiskLevel;
  readonly lastPaymentDate?: Date;
  readonly agencyId: string;
}

// ==================== ANALYTICS INTERFACES ====================

/**
 * Payment analytics interface
 */
export interface PaymentAnalytics {
  readonly totalPayments: number;
  readonly totalAmount: number;
  readonly currency: string;
  readonly averagePaymentAmount: number;
  readonly paymentsByMethod: Record<PaymentMethod, number>;
  readonly paymentsByStatus: Record<PaymentStatus, number>;
  readonly dailyPayments: DailyPaymentSummary[];
  readonly topCustomers: TopPayingCustomer[];
  readonly pendingPayments: number;
  readonly overduePayments: number;
  readonly agencyId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly generatedAt: Date;
}

/**
 * Daily payment summary interface
 */
export interface DailyPaymentSummary {
  readonly date: Date;
  readonly totalPayments: number;
  readonly totalAmount: number;
  readonly cashPayments: number;
  readonly creditPayments: number;
  readonly averageAmount: number;
}

/**
 * Top paying customer interface
 */
export interface TopPayingCustomer {
  readonly customerId: string;
  readonly customerName: string;
  readonly totalPaid: number;
  readonly paymentCount: number;
  readonly averagePayment: number;
  readonly lastPaymentDate: Date;
  readonly rank: number;
}

/**
 * Credit analytics interface
 */
export interface CreditAnalytics {
  readonly totalCreditCustomers: number;
  readonly totalCreditLimit: number;
  readonly totalOutstanding: number;
  readonly totalAvailableCredit: number;
  readonly averageCreditUtilization: number;
  readonly creditStatusDistribution: Record<CreditStatus, number>;
  readonly riskLevelDistribution: Record<CreditRiskLevel, number>;
  readonly agingBuckets: AgingBucketSummary[];
  readonly creditTrends: CreditTrendData[];
  readonly agencyId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly generatedAt: Date;
}

/**
 * Aging bucket summary interface
 */
export interface AgingBucketSummary {
  readonly bucket: string;
  readonly days: string;
  readonly customerCount: number;
  readonly totalAmount: number;
  readonly percentage: number;
}

/**
 * Credit trend data interface
 */
export interface CreditTrendData {
  readonly date: Date;
  readonly totalLimit: number;
  readonly totalOutstanding: number;
  readonly utilizationRate: number;
  readonly newCredits: number;
  readonly creditAdjustments: number;
}

// ==================== FORM INTERFACES ====================

/**
 * Payment record form interface
 */
export interface PaymentRecordForm {
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  orderId?: string;
  invoiceId?: string;
  cashDrawerId?: string;
  bankAccount?: string;
  checkNumber?: string;
  tags?: string[];
}

/**
 * Credit limit adjustment form interface
 */
export interface CreditLimitAdjustmentForm {
  customerId: string;
  newLimit: number;
  reason: string;
  effectiveDate: Date;
  requiresApproval: boolean;
  justification?: string;
}

/**
 * Invoice creation form interface
 */
export interface InvoiceCreationForm {
  customerId: string;
  orderId?: string;
  issueDate: Date;
  dueDate: Date;
  paymentTerms: string;
  items: InvoiceItemForm[];
  notes?: string;
  discountPercentage?: number;
  discountAmount?: number;
}

/**
 * Invoice item form interface
 */
export interface InvoiceItemForm {
  productId: string;
  quantity: number;
  unitPrice: number;
  description?: string;
  discountPercentage?: number;
  taxRate?: number;
}

/**
 * Collection activity form interface
 */
export interface CollectionActivityForm {
  customerId: string;
  activityType: CollectionActivityType;
  description: string;
  outcome: CollectionOutcome;
  promisedPaymentDate?: Date;
  promisedAmount?: number;
  notes?: string;
  followUpDate?: Date;
}

// ==================== API INTERFACES ====================

/**
 * API response wrapper interface
 */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly message?: string;
  readonly timestamp: Date;
  readonly requestId?: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

/**
 * Payment service interface
 */
export interface IPaymentService {
  getPayments(agencyId: string, filters?: PaymentFilters, page?: number, limit?: number): Promise<PaymentListResponse>;
  getPaymentById(paymentId: string): Promise<PaymentRecord | null>;
  recordPayment(data: PaymentRecordForm, createdBy: string, agencyId: string): Promise<PaymentRecord>;
  updatePayment(paymentId: string, updates: Partial<PaymentRecordForm>, updatedBy: string): Promise<PaymentRecord>;
  cancelPayment(paymentId: string, reason: string, cancelledBy: string): Promise<PaymentRecord>;
  refundPayment(paymentId: string, refundAmount: number, refundedBy: string): Promise<PaymentRecord>;
  getPaymentAnalytics(agencyId: string, dateFrom: Date, dateTo: Date): Promise<PaymentAnalytics>;
}

/**
 * Credit service interface
 */
export interface ICreditService {
  getCreditAccount(customerId: string): Promise<CreditAccount | null>;
  checkCreditAvailability(request: CreditCheckRequest): Promise<CreditCheckResult>;
  adjustCreditLimit(
    data: CreditLimitAdjustmentForm,
    requestedBy: string,
    agencyId: string
  ): Promise<CreditLimitAdjustment>;
  approveCreditAdjustment(adjustmentId: string, approvedBy: string): Promise<CreditLimitAdjustment>;
  getCreditAnalytics(agencyId: string, dateFrom: Date, dateTo: Date): Promise<CreditAnalytics>;
  generateAgingReport(agencyId: string, asOfDate?: Date): Promise<AgingReportItem[]>;
}

/**
 * Invoice service interface
 */
export interface IInvoiceService {
  getInvoices(agencyId: string, filters?: any, page?: number, limit?: number): Promise<PaginatedResponse<Invoice>>;
  getInvoiceById(invoiceId: string): Promise<Invoice | null>;
  createInvoice(data: InvoiceCreationForm, createdBy: string, agencyId: string): Promise<Invoice>;
  allocatePaymentToInvoice(
    invoiceId: string,
    paymentId: string,
    amount: number,
    allocatedBy: string
  ): Promise<InvoicePaymentAllocation>;
  generateInvoicePdf(invoiceId: string): Promise<Buffer>;
}

// ==================== MISSING INTERFACE EXPORTS ====================

/**
 * Invoice list item interface (for UI)
 */
export interface InvoiceListItem {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly totalAmount: number;
  readonly paidAmount: number;
  readonly outstandingAmount: number;
  readonly status: InvoiceStatus;
  readonly statusText: string;
  readonly statusColor: string;
  readonly dueDate: Date;
  readonly overdueDays: number;
  readonly isOverdue: boolean;
  readonly currency: string;
  readonly formattedTotal: string;
  readonly agencyId: string;
  readonly createdAt: Date;
}

/**
 * Invoice filters interface
 */
export interface InvoiceFilters {
  readonly customerId?: string;
  readonly customerName?: string;
  readonly statuses?: InvoiceStatus[];
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
  readonly amountMin?: number;
  readonly amountMax?: number;
  readonly invoiceNumber?: string;
  readonly orderNumber?: string;
  readonly agencyId?: string;
  readonly search?: string;
}

/**
 * Invoice list response interface
 */
export interface InvoiceListResponse {
  readonly invoices: InvoiceListItem[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

/**
 * Invoice template interface
 */
export interface InvoiceTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly isDefault: boolean;
  readonly layout: 'standard' | 'detailed' | 'simple';
  readonly logoUrl?: string;
  readonly headerText?: string;
  readonly footerText?: string;
  readonly showTaxDetails: boolean;
  readonly showPaymentTerms: boolean;
  readonly agencyId: string;
  readonly createdAt: Date;
}

/**
 * Invoice generation request interface
 */
export interface InvoiceGenerationRequest {
  readonly customerId: string;
  readonly orderId?: string;
  readonly templateId?: string;
  readonly dueDate: Date;
  readonly paymentTerms: string;
  readonly notes?: string;
  readonly agencyId: string;
}

/**
 * Invoice analytics interface
 */
export interface InvoiceAnalytics {
  readonly totalInvoices: number;
  readonly totalAmount: number;
  readonly totalPaid: number;
  readonly totalOutstanding: number;
  readonly averageInvoiceAmount: number;
  readonly collectionRate: number;
  readonly averageDaysToPayment: number;
  readonly overdueInvoices: number;
  readonly overdueAmount: number;
  readonly agencyId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly generatedAt: Date;
}

/**
 * Invoice payment interface
 */
export interface InvoicePayment {
  readonly id: string;
  readonly invoiceId: string;
  readonly paymentId: string;
  readonly amount: number;
  readonly currency: string;
  readonly paidAt: Date;
  readonly paymentMethod: PaymentMethod;
  readonly reference?: string;
  readonly notes?: string;
}

// ==================== VALIDATION SCHEMAS ====================

/**
 * Payment record validation schema
 */
export const PaymentRecordFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  orderId: z.string().optional(),
  invoiceId: z.string().optional(),
  cashDrawerId: z.string().optional(),
  bankAccount: z.string().optional(),
  checkNumber: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Credit limit adjustment validation schema
 */
export const CreditLimitAdjustmentFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  newLimit: z.number().min(0, 'Credit limit cannot be negative'),
  reason: z.string().min(1, 'Reason is required'),
  effectiveDate: z.date(),
  requiresApproval: z.boolean(),
  justification: z.string().optional(),
});

/**
 * Collection activity validation schema
 */
export const CollectionActivityFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  activityType: z.nativeEnum(CollectionActivityType),
  description: z.string().min(1, 'Description is required'),
  outcome: z.nativeEnum(CollectionOutcome),
  promisedPaymentDate: z.date().optional(),
  promisedAmount: z.number().positive().optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  followUpDate: z.date().optional(),
});

// ==================== TYPE GUARDS ====================

/**
 * Type guard for PaymentRecord
 */
export function isPaymentRecord(value: any): value is PaymentRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.customerId === 'string' &&
    typeof value.amount === 'number' &&
    Object.values(PaymentMethod).includes(value.paymentMethod) &&
    Object.values(PaymentStatus).includes(value.status)
  );
}

/**
 * Type guard for CreditAccount
 */
export function isCreditAccount(value: any): value is CreditAccount {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.customerId === 'string' &&
    typeof value.creditLimit === 'number' &&
    Object.values(CreditStatus).includes(value.creditStatus)
  );
}

/**
 * Type guard for Invoice
 */
export function isInvoice(value: any): value is Invoice {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.invoiceNumber === 'string' &&
    typeof value.customerId === 'string' &&
    typeof value.totalAmount === 'number' &&
    Object.values(InvoiceStatus).includes(value.status)
  );
}

// ==================== UTILITY TYPES ====================

/**
 * Utility type for creating partial updates
 */
export type PartialUpdate<T> = Partial<Omit<T, 'id' | 'createdAt' | 'createdBy' | 'agencyId'>>;

/**
 * Utility type for creating new entities
 */
export type CreateData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>;

/**
 * Utility type for API filters
 */
export type FilterType<T> = {
  [K in keyof T]?: T[K] | T[K][];
};

// Export validation schemas as default for easy access
export default {
  PaymentRecordFormSchema,
  CreditLimitAdjustmentFormSchema,
  CollectionActivityFormSchema,
};
