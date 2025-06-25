/**
 * Offline Payment Service
 *
 * Specialized service for managing offline credit and cash payments in distribution systems.
 * Handles credit limits, cash transactions, payment terms, and offline synchronization.
 *
 * Features:
 * - Credit limit management and validation
 * - Cash transaction handling with change calculation
 * - Payment term enforcement (net 30, net 60, etc.)
 * - Offline transaction queuing and synchronization
 * - Customer payment history and aging reports
 * - Cash drawer reconciliation
 * - Credit collection workflow
 *
 * @domain Order Management - Offline Payment Processing
 * @pattern Domain Service
 * @version 1.0.0
 */

import { Money } from '../value-objects/money';
import { PaymentMethod } from '../entities/order';
import { Payment, PaymentStatus, PaymentGateway } from '../entities/payment';

/**
 * Cash transaction details
 */
export interface CashTransactionDetails {
  readonly orderId: string;
  readonly orderTotal: Money;
  readonly amountReceived: Money;
  readonly changeGiven: Money;
  readonly denomination?: CashDenomination[];
  readonly cashDrawerId?: string;
  readonly receivedBy: string;
  readonly receivedAt: Date;
  readonly notes?: string;
}

/**
 * Cash denomination breakdown
 */
export interface CashDenomination {
  readonly value: Money;
  readonly count: number;
  readonly total: Money;
}

/**
 * Credit transaction details
 */
export interface CreditTransactionDetails {
  readonly customerId: string;
  readonly customerName: string;
  readonly orderId: string;
  readonly orderTotal: Money;
  readonly creditLimit: Money;
  readonly currentBalance: Money;
  readonly availableCredit: Money;
  readonly creditDays: number;
  readonly dueDate: Date;
  readonly approvedBy: string;
  readonly approvedAt: Date;
  readonly terms: CreditTerms;
  readonly collateralInfo?: string;
  readonly guarantorInfo?: string;
}

/**
 * Credit terms enumeration
 */
export enum CreditTerms {
  NET_15 = 'NET_15',
  NET_30 = 'NET_30',
  NET_45 = 'NET_45',
  NET_60 = 'NET_60',
  NET_90 = 'NET_90',
  COD = 'COD', // Cash on Delivery
  PREPAID = 'PREPAID',
}

/**
 * Payment aging bucket
 */
export interface PaymentAgingBucket {
  readonly range: string;
  readonly daysMin: number;
  readonly daysMax: number;
  readonly amount: Money;
  readonly count: number;
  readonly percentage: number;
}

/**
 * Customer payment aging report
 */
export interface CustomerPaymentAging {
  readonly customerId: string;
  readonly customerName: string;
  readonly totalOutstanding: Money;
  readonly current: PaymentAgingBucket;
  readonly days1to30: PaymentAgingBucket;
  readonly days31to60: PaymentAgingBucket;
  readonly days61to90: PaymentAgingBucket;
  readonly over90Days: PaymentAgingBucket;
  readonly lastPaymentDate: Date | null;
  readonly lastPaymentAmount: Money | null;
  readonly creditLimit: Money;
  readonly availableCredit: Money;
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Cash drawer reconciliation
 */
export interface CashDrawerReconciliation {
  readonly drawerId: string;
  readonly openingBalance: Money;
  readonly totalCashSales: Money;
  readonly totalCashReceived: Money;
  readonly totalChangeGiven: Money;
  readonly expectedBalance: Money;
  readonly actualBalance: Money;
  readonly variance: Money;
  readonly reconciliationDate: Date;
  readonly reconciledBy: string;
  readonly transactions: readonly CashTransactionDetails[];
  readonly notes?: string;
}

/**
 * Offline transaction queue item
 */
export interface OfflineTransaction {
  readonly id: string;
  readonly type: 'CASH' | 'CREDIT' | 'PAYMENT_RECEIVED';
  readonly orderId?: string;
  readonly customerId: string;
  readonly amount: Money;
  readonly paymentMethod: PaymentMethod;
  readonly transactionData: CashTransactionDetails | CreditTransactionDetails;
  readonly deviceId: string;
  readonly userId: string;
  readonly timestamp: Date;
  readonly synced: boolean;
  readonly syncAttempts: number;
  readonly lastSyncAttempt?: Date;
  readonly syncError?: string;
}

/**
 * Credit approval workflow
 */
export interface CreditApprovalRequest {
  readonly customerId: string;
  readonly orderTotal: Money;
  readonly requestedCreditIncrease?: Money;
  readonly businessJustification: string;
  readonly customerFinancialInfo?: Record<string, any>;
  readonly requestedBy: string;
  readonly requestedAt: Date;
  readonly urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Credit approval response
 */
export interface CreditApprovalResponse {
  readonly approved: boolean;
  readonly approvedAmount: Money;
  readonly approvedTerms: CreditTerms;
  readonly conditions?: string[];
  readonly approvedBy: string;
  readonly approvedAt: Date;
  readonly validUntil: Date;
  readonly notes?: string;
}

/**
 * Payment collection activity
 */
export interface PaymentCollectionActivity {
  readonly customerId: string;
  readonly activityType: 'CALL' | 'EMAIL' | 'VISIT' | 'LETTER' | 'LEGAL_NOTICE';
  readonly description: string;
  readonly outcome: 'CONTACTED' | 'NO_ANSWER' | 'PROMISED_PAYMENT' | 'DISPUTE' | 'PARTIAL_PAYMENT';
  readonly promisedPaymentDate?: Date;
  readonly promisedAmount?: Money;
  readonly nextActionDate?: Date;
  readonly performedBy: string;
  readonly performedAt: Date;
  readonly notes?: string;
}

/**
 * Offline Payment Service Interface
 */
export interface OfflinePaymentService {
  /**
   * Process cash payment for order
   */
  processCashPayment(
    orderId: string,
    amountReceived: Money,
    receivedBy: string,
    cashDrawerId?: string,
    denomination?: CashDenomination[]
  ): Promise<{
    payment: Payment;
    transactionDetails: CashTransactionDetails;
    changeRequired: Money;
  }>;

  /**
   * Process credit transaction for order
   */
  processCreditTransaction(
    orderId: string,
    customerId: string,
    approvedBy: string,
    terms?: CreditTerms
  ): Promise<{
    payment: Payment;
    transactionDetails: CreditTransactionDetails;
    creditApprovalRequired: boolean;
  }>;

  /**
   * Validate customer credit limit
   */
  validateCreditLimit(
    customerId: string,
    orderAmount: Money
  ): Promise<{
    approved: boolean;
    availableCredit: Money;
    reason?: string;
    requiresApproval: boolean;
  }>;

  /**
   * Request credit approval for exceeding limit
   */
  requestCreditApproval(request: CreditApprovalRequest): Promise<{
    requestId: string;
    requiresManagerApproval: boolean;
    estimatedResponseTime: number; // hours
  }>;

  /**
   * Process credit approval response
   */
  processCreditApproval(requestId: string, response: CreditApprovalResponse): Promise<void>;

  /**
   * Record customer payment received
   */
  recordPaymentReceived(
    customerId: string,
    amount: Money,
    paymentMethod: PaymentMethod,
    receivedBy: string,
    allocateToOrders?: string[],
    notes?: string
  ): Promise<{
    paymentId: string;
    allocatedAmounts: Record<string, Money>;
    remainingBalance: Money;
  }>;

  /**
   * Get customer payment aging report
   */
  getCustomerPaymentAging(customerId: string): Promise<CustomerPaymentAging>;

  /**
   * Get aging report for all customers
   */
  getAgingReport(agencyId: string, asOfDate?: Date): Promise<readonly CustomerPaymentAging[]>;

  /**
   * Calculate cash drawer expected balance
   */
  calculateCashDrawerBalance(
    drawerId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<{
    openingBalance: Money;
    totalSales: Money;
    totalReceived: Money;
    totalChange: Money;
    expectedBalance: Money;
    transactionCount: number;
  }>;

  /**
   * Reconcile cash drawer
   */
  reconcileCashDrawer(
    drawerId: string,
    actualBalance: Money,
    reconciledBy: string,
    denomination?: CashDenomination[],
    notes?: string
  ): Promise<CashDrawerReconciliation>;

  /**
   * Queue offline transaction
   */
  queueOfflineTransaction(transaction: Omit<OfflineTransaction, 'id' | 'synced' | 'syncAttempts'>): Promise<string>;

  /**
   * Sync offline transactions
   */
  syncOfflineTransactions(deviceId: string): Promise<{
    synced: number;
    failed: number;
    errors: Array<{ transactionId: string; error: string }>;
  }>;

  /**
   * Get pending offline transactions
   */
  getPendingOfflineTransactions(deviceId: string): Promise<readonly OfflineTransaction[]>;

  /**
   * Record collection activity
   */
  recordCollectionActivity(activity: PaymentCollectionActivity): Promise<void>;

  /**
   * Get collection activities for customer
   */
  getCollectionActivities(customerId: string, limit?: number): Promise<readonly PaymentCollectionActivity[]>;

  /**
   * Get customers requiring collection action
   */
  getCustomersRequiringCollection(
    agencyId: string,
    overdueDays: number
  ): Promise<
    Array<{
      customer: CustomerPaymentAging;
      lastActivity?: PaymentCollectionActivity;
      recommendedAction: 'CALL' | 'VISIT' | 'LEGAL_NOTICE';
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    }>
  >;

  /**
   * Generate payment terms for customer
   */
  generatePaymentTerms(
    customerId: string,
    orderAmount: Money,
    creditHistory?: boolean
  ): Promise<{
    recommendedTerms: CreditTerms;
    maxCreditDays: number;
    requiresDeposit: boolean;
    depositPercentage?: number;
    specialConditions?: string[];
  }>;

  /**
   * Process cheque payment
   */
  processChequePayment(
    orderId: string,
    chequeNumber: string,
    bankName: string,
    chequeDate: Date,
    amount: Money,
    receivedBy: string
  ): Promise<{
    payment: Payment;
    clearanceRequired: boolean;
    estimatedClearanceDate: Date;
  }>;

  /**
   * Update cheque clearance status
   */
  updateChequeClearance(paymentId: string, cleared: boolean, clearanceDate: Date, notes?: string): Promise<void>;

  /**
   * Generate daily cash summary
   */
  generateDailyCashSummary(
    agencyId: string,
    date: Date
  ): Promise<{
    totalCashSales: Money;
    totalCashReceived: Money;
    totalChangeGiven: Money;
    netCashFlow: Money;
    transactionCount: number;
    averageTransaction: Money;
    largestTransaction: Money;
    cashDrawerVariances: Money;
  }>;

  /**
   * Generate credit summary
   */
  generateCreditSummary(
    agencyId: string,
    asOfDate: Date
  ): Promise<{
    totalCreditSales: Money;
    totalOutstanding: Money;
    totalOverdue: Money;
    averageDaysOutstanding: number;
    creditUtilization: number; // percentage
    riskDistribution: Record<string, { count: number; amount: Money }>;
  }>;
}
