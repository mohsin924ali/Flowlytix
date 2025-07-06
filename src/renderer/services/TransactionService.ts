/**
 * Transaction Service
 * Service layer for transaction and ledger management operations
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Transaction Management
 * @architecture Service Layer Pattern
 * @version 1.0.0
 */

import { z } from 'zod';
import {
  TransactionType,
  PaymentStatus,
  PaymentMethod,
  Money,
  Currency,
  PaymentBusinessRules,
  PaymentErrorCodes,
  PaymentDomainUtils,
  PaymentFormatters,
} from '../domains/payment';
import type {
  Transaction,
  CustomerAccountBalance,
  PaymentRecord,
  ApiResponse,
  PaginatedResponse,
} from '../domains/payment';

/**
 * Transaction creation data interface
 */
export interface CreateTransactionData {
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
  readonly metadata?: Record<string, any>;
  readonly effectiveDate?: Date;
}

/**
 * Transaction validation schema
 */
export const CreateTransactionSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  type: z.nativeEnum(TransactionType),
  amount: z.number().finite('Amount must be a valid number'),
  currency: z.string().length(3, 'Currency must be 3 letters'),
  description: z.string().min(1, 'Description is required'),
  reference: z.string().optional(),
  relatedPaymentId: z.string().optional(),
  relatedInvoiceId: z.string().optional(),
  relatedOrderId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  effectiveDate: z.date().optional(),
});

/**
 * Transaction filters interface
 */
export interface TransactionFilters {
  readonly customerId?: string;
  readonly customerName?: string;
  readonly types?: TransactionType[];
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
  readonly amountMin?: number;
  readonly amountMax?: number;
  readonly reference?: string;
  readonly agencyId?: string;
  readonly search?: string;
}

/**
 * Ledger entry interface
 */
export interface LedgerEntry {
  readonly id: string;
  readonly transactionId: string;
  readonly customerId: string;
  readonly accountType: 'RECEIVABLES' | 'PAYABLES' | 'CASH' | 'CREDIT';
  readonly debitAmount: number;
  readonly creditAmount: number;
  readonly balance: number;
  readonly currency: string;
  readonly description: string;
  readonly reference?: string;
  readonly createdAt: Date;
  readonly agencyId: string;
}

/**
 * Account statement interface
 */
export interface AccountStatement {
  readonly customerId: string;
  readonly customerName: string;
  readonly statementDate: Date;
  readonly openingBalance: number;
  readonly closingBalance: number;
  readonly totalDebits: number;
  readonly totalCredits: number;
  readonly currency: string;
  readonly transactions: Transaction[];
  readonly agingBreakdown: {
    readonly current: number;
    readonly days1To30: number;
    readonly days31To60: number;
    readonly days61To90: number;
    readonly days90Plus: number;
  };
  readonly agencyId: string;
  readonly generatedAt: Date;
}

/**
 * Transaction summary interface
 */
export interface TransactionSummary {
  readonly totalTransactions: number;
  readonly totalAmount: number;
  readonly currency: string;
  readonly byType: Record<
    TransactionType,
    {
      count: number;
      amount: number;
    }
  >;
  readonly dailySummary: {
    readonly date: Date;
    readonly count: number;
    readonly amount: number;
  }[];
  readonly topCustomers: {
    readonly customerId: string;
    readonly customerName: string;
    readonly transactionCount: number;
    readonly totalAmount: number;
  }[];
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly agencyId: string;
}

/**
 * Payment allocation interface
 */
export interface PaymentAllocation {
  readonly id: string;
  readonly paymentId: string;
  readonly invoiceId: string;
  readonly customerId: string;
  readonly allocatedAmount: number;
  readonly currency: string;
  readonly allocationDate: Date;
  readonly allocatedBy: string;
  readonly notes?: string;
  readonly agencyId: string;
}

/**
 * Balance adjustment interface
 */
export interface BalanceAdjustment {
  readonly id: string;
  readonly customerId: string;
  readonly adjustmentType: 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'WRITE_OFF' | 'CORRECTION';
  readonly amount: number;
  readonly currency: string;
  readonly reason: string;
  readonly reference?: string;
  readonly approvedBy?: string;
  readonly approvedAt?: Date;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly agencyId: string;
}

/**
 * Transaction Service
 *
 * Handles all transaction-related operations including transaction creation,
 * ledger management, account balances, and financial reporting.
 * Follows Domain-Driven Design principles with proper audit trails.
 */
export class TransactionService {
  private static readonly BASE_DELAY = 250; // Fast for real-time updates
  private static readonly LEDGER_BATCH_SIZE = 500;
  private static readonly STATEMENT_RETENTION_DAYS = 2555; // 7 years

  /**
   * Simulate processing delay (for mock implementation)
   */
  private static delay(ms: number = TransactionService.BASE_DELAY): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a new transaction
   */
  static async createTransaction(
    data: CreateTransactionData,
    createdBy: string,
    agencyId: string
  ): Promise<Transaction> {
    try {
      // Validate input data
      const validatedData = CreateTransactionSchema.parse(data);

      if (!createdBy || createdBy.trim().length === 0) {
        throw new Error('Created by user ID is required');
      }

      if (!agencyId || agencyId.trim().length === 0) {
        throw new Error('Agency ID is required');
      }

      await TransactionService.delay(300);

      // Validate transaction amount based on type
      TransactionService.validateTransactionAmount(validatedData.type, validatedData.amount);

      // Create transaction
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerId: validatedData.customerId,
        customerName: validatedData.customerName,
        type: validatedData.type,
        amount: validatedData.amount,
        currency: validatedData.currency,
        description: validatedData.description,
        reference: validatedData.reference,
        relatedPaymentId: validatedData.relatedPaymentId,
        relatedInvoiceId: validatedData.relatedInvoiceId,
        relatedOrderId: validatedData.relatedOrderId,
        metadata: validatedData.metadata || {},
        agencyId,
        createdBy,
        createdAt: new Date(),
        effectiveDate: validatedData.effectiveDate || new Date(),
      };

      // Create corresponding ledger entries
      await TransactionService.createLedgerEntries(transaction);

      // Update customer balance
      await TransactionService.updateCustomerBalance(transaction);

      // Log transaction creation
      await TransactionService.logTransactionAudit(transaction, 'CREATED', createdBy);

      return transaction;
    } catch (error) {
      console.error('TransactionService.createTransaction error:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(', ')}`);
      }
      throw new Error(error instanceof Error ? error.message : 'Failed to create transaction');
    }
  }

  /**
   * Get transactions with filtering and pagination
   */
  static async getTransactions(
    agencyId: string,
    page: number = 1,
    limit: number = 25,
    filters: TransactionFilters = {}
  ): Promise<PaginatedResponse<Transaction>> {
    try {
      await TransactionService.delay(200);

      if (!agencyId || agencyId.trim().length === 0) {
        throw new Error('Agency ID is required');
      }

      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 25;

      // Mock implementation - in production, this would query database
      const mockTransactions = TransactionService.generateMockTransactions(agencyId, filters);

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTransactions = mockTransactions.slice(startIndex, endIndex);

      const total = mockTransactions.length;
      const totalPages = Math.ceil(total / limit);

      return {
        items: paginatedTransactions,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      console.error('TransactionService.getTransactions error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve transactions');
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(transactionId: string): Promise<Transaction | null> {
    try {
      await TransactionService.delay(150);

      if (!transactionId || transactionId.trim().length === 0) {
        throw new Error('Transaction ID is required');
      }

      // Mock implementation
      const mockTransaction = TransactionService.generateMockTransactionById(transactionId);
      return mockTransaction;
    } catch (error) {
      console.error('TransactionService.getTransactionById error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve transaction');
    }
  }

  /**
   * Get customer account balance
   */
  static async getCustomerAccountBalance(customerId: string): Promise<CustomerAccountBalance | null> {
    try {
      await TransactionService.delay(250);

      if (!customerId || customerId.trim().length === 0) {
        throw new Error('Customer ID is required');
      }

      // Mock implementation - in production, this would calculate from ledger
      const balance = TransactionService.calculateMockCustomerBalance(customerId);
      return balance;
    } catch (error) {
      console.error('TransactionService.getCustomerAccountBalance error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve customer balance');
    }
  }

  /**
   * Generate customer account statement
   */
  static async generateAccountStatement(customerId: string, dateFrom: Date, dateTo: Date): Promise<AccountStatement> {
    try {
      await TransactionService.delay(800);

      if (!customerId || customerId.trim().length === 0) {
        throw new Error('Customer ID is required');
      }

      if (dateFrom > dateTo) {
        throw new Error('Date from cannot be greater than date to');
      }

      // Mock implementation
      const statement = TransactionService.generateMockAccountStatement(customerId, dateFrom, dateTo);
      return statement;
    } catch (error) {
      console.error('TransactionService.generateAccountStatement error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate account statement');
    }
  }

  /**
   * Allocate payment to invoices
   */
  static async allocatePaymentToInvoices(
    paymentId: string,
    allocations: {
      invoiceId: string;
      amount: number;
    }[],
    allocatedBy: string
  ): Promise<PaymentAllocation[]> {
    try {
      await TransactionService.delay(500);

      if (!paymentId || paymentId.trim().length === 0) {
        throw new Error('Payment ID is required');
      }

      if (!allocations || allocations.length === 0) {
        throw new Error('At least one allocation is required');
      }

      if (!allocatedBy || allocatedBy.trim().length === 0) {
        throw new Error('Allocated by user ID is required');
      }

      // Validate total allocation amount doesn't exceed payment amount
      const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);

      // Mock validation - in production, get actual payment amount
      const mockPaymentAmount = 5000; // Would come from payment record
      if (totalAllocated > mockPaymentAmount) {
        throw new Error('Total allocation amount exceeds payment amount');
      }

      // Create allocation records
      const paymentAllocations: PaymentAllocation[] = allocations.map((alloc, index) => ({
        id: `alloc_${Date.now()}_${index}`,
        paymentId,
        invoiceId: alloc.invoiceId,
        customerId: 'cust_1', // Would come from payment/invoice record
        allocatedAmount: alloc.amount,
        currency: 'USD',
        allocationDate: new Date(),
        allocatedBy,
        agencyId: 'agency_1',
      }));

      // Create transactions for each allocation
      for (const allocation of paymentAllocations) {
        await TransactionService.createTransaction(
          {
            customerId: allocation.customerId,
            customerName: `Customer ${allocation.customerId}`,
            type: TransactionType.PAYMENT,
            amount: allocation.allocatedAmount,
            currency: allocation.currency,
            description: `Payment allocation to invoice ${allocation.invoiceId}`,
            reference: `ALLOC-${allocation.id}`,
            relatedPaymentId: paymentId,
            relatedInvoiceId: allocation.invoiceId,
            metadata: {
              allocationType: 'INVOICE_PAYMENT',
              allocationId: allocation.id,
            },
          },
          allocatedBy,
          allocation.agencyId
        );
      }

      return paymentAllocations;
    } catch (error) {
      console.error('TransactionService.allocatePaymentToInvoices error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to allocate payment to invoices');
    }
  }

  /**
   * Create balance adjustment
   */
  static async createBalanceAdjustment(
    customerId: string,
    adjustmentType: 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'WRITE_OFF' | 'CORRECTION',
    amount: number,
    reason: string,
    createdBy: string,
    agencyId: string,
    reference?: string
  ): Promise<BalanceAdjustment> {
    try {
      await TransactionService.delay(400);

      if (!customerId || customerId.trim().length === 0) {
        throw new Error('Customer ID is required');
      }

      if (amount <= 0) {
        throw new Error('Adjustment amount must be positive');
      }

      if (!reason || reason.trim().length === 0) {
        throw new Error('Adjustment reason is required');
      }

      if (!createdBy || createdBy.trim().length === 0) {
        throw new Error('Created by user ID is required');
      }

      if (!agencyId || agencyId.trim().length === 0) {
        throw new Error('Agency ID is required');
      }

      // Create balance adjustment
      const adjustment: BalanceAdjustment = {
        id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerId,
        adjustmentType,
        amount,
        currency: 'USD',
        reason,
        reference,
        createdBy,
        createdAt: new Date(),
        agencyId,
      };

      // Determine transaction type based on adjustment type
      let transactionType: TransactionType;
      switch (adjustmentType) {
        case 'CREDIT_NOTE':
          transactionType = TransactionType.CREDIT_NOTE;
          break;
        case 'DEBIT_NOTE':
          transactionType = TransactionType.DEBIT_NOTE;
          break;
        case 'WRITE_OFF':
        case 'CORRECTION':
          transactionType = TransactionType.ADJUSTMENT;
          break;
        default:
          transactionType = TransactionType.ADJUSTMENT;
      }

      // Create corresponding transaction
      await TransactionService.createTransaction(
        {
          customerId,
          customerName: `Customer ${customerId}`,
          type: transactionType,
          amount: adjustmentType === 'DEBIT_NOTE' ? amount : -amount, // Debit increases balance, credit decreases
          currency: 'USD',
          description: `${adjustmentType.replace('_', ' ').toLowerCase()}: ${reason}`,
          reference: adjustment.reference,
          metadata: {
            adjustmentId: adjustment.id,
            adjustmentType,
          },
        },
        createdBy,
        agencyId
      );

      return adjustment;
    } catch (error) {
      console.error('TransactionService.createBalanceAdjustment error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create balance adjustment');
    }
  }

  /**
   * Get transaction summary for analytics
   */
  static async getTransactionSummary(agencyId: string, dateFrom: Date, dateTo: Date): Promise<TransactionSummary> {
    try {
      await TransactionService.delay(600);

      if (!agencyId || agencyId.trim().length === 0) {
        throw new Error('Agency ID is required');
      }

      if (dateFrom > dateTo) {
        throw new Error('Date from cannot be greater than date to');
      }

      // Mock implementation
      const summary = TransactionService.generateMockTransactionSummary(agencyId, dateFrom, dateTo);
      return summary;
    } catch (error) {
      console.error('TransactionService.getTransactionSummary error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve transaction summary');
    }
  }

  /**
   * Reverse a transaction
   */
  static async reverseTransaction(transactionId: string, reason: string, reversedBy: string): Promise<Transaction> {
    try {
      await TransactionService.delay(600);

      if (!transactionId || transactionId.trim().length === 0) {
        throw new Error('Transaction ID is required');
      }

      if (!reason || reason.trim().length === 0) {
        throw new Error('Reversal reason is required');
      }

      if (!reversedBy || reversedBy.trim().length === 0) {
        throw new Error('Reversed by user ID is required');
      }

      // Get original transaction
      const originalTransaction = await TransactionService.getTransactionById(transactionId);
      if (!originalTransaction) {
        throw new Error('Original transaction not found');
      }

      // Create reversal transaction with opposite amount
      const reversalTransaction = await TransactionService.createTransaction(
        {
          customerId: originalTransaction.customerId,
          customerName: originalTransaction.customerName,
          type: TransactionType.REVERSAL,
          amount: -originalTransaction.amount,
          currency: originalTransaction.currency,
          description: `Reversal of transaction ${transactionId}: ${reason}`,
          reference: `REV-${originalTransaction.reference || transactionId}`,
          relatedPaymentId: originalTransaction.relatedPaymentId,
          relatedInvoiceId: originalTransaction.relatedInvoiceId,
          relatedOrderId: originalTransaction.relatedOrderId,
          metadata: {
            originalTransactionId: transactionId,
            reversalReason: reason,
            reversalType: 'FULL_REVERSAL',
          },
        },
        reversedBy,
        originalTransaction.agencyId
      );

      return reversalTransaction;
    } catch (error) {
      console.error('TransactionService.reverseTransaction error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to reverse transaction');
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Validate transaction amount based on type
   */
  private static validateTransactionAmount(type: TransactionType, amount: number): void {
    switch (type) {
      case TransactionType.PAYMENT:
      case TransactionType.REFUND:
        if (amount <= 0) {
          throw new Error('Payment and refund amounts must be positive');
        }
        break;

      case TransactionType.FEE:
      case TransactionType.INTEREST:
        if (amount <= 0) {
          throw new Error('Fee and interest amounts must be positive');
        }
        break;

      case TransactionType.ADJUSTMENT:
      case TransactionType.REVERSAL:
        // Can be positive or negative
        if (amount === 0) {
          throw new Error('Adjustment and reversal amounts cannot be zero');
        }
        break;

      case TransactionType.CREDIT_NOTE:
        if (amount >= 0) {
          throw new Error('Credit note amounts must be negative');
        }
        break;

      case TransactionType.DEBIT_NOTE:
        if (amount <= 0) {
          throw new Error('Debit note amounts must be positive');
        }
        break;

      case TransactionType.DISCOUNT:
        if (amount >= 0) {
          throw new Error('Discount amounts must be negative');
        }
        break;
    }

    // Validate against business rules
    if (!PaymentDomainUtils.validatePaymentAmount(Math.abs(amount))) {
      throw new Error(
        `Transaction amount must be between ${PaymentBusinessRules.MINIMUM_PAYMENT_AMOUNT} and ${PaymentBusinessRules.MAXIMUM_PAYMENT_AMOUNT}`
      );
    }
  }

  /**
   * Create corresponding ledger entries for a transaction
   */
  private static async createLedgerEntries(transaction: Transaction): Promise<void> {
    try {
      // Mock implementation - in production, this would create actual ledger entries
      const ledgerEntry: LedgerEntry = {
        id: `ledger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionId: transaction.id,
        customerId: transaction.customerId,
        accountType: TransactionService.getAccountTypeForTransaction(transaction.type),
        debitAmount: transaction.amount > 0 ? transaction.amount : 0,
        creditAmount: transaction.amount < 0 ? Math.abs(transaction.amount) : 0,
        balance: 0, // Would be calculated based on previous balance
        currency: transaction.currency,
        description: transaction.description,
        reference: transaction.reference,
        createdAt: transaction.createdAt,
        agencyId: transaction.agencyId,
      };

      console.log('Ledger entry created:', ledgerEntry);
    } catch (error) {
      console.error('Failed to create ledger entries:', error);
      // Don't throw error for ledger creation failures in mock implementation
    }
  }

  /**
   * Update customer balance after transaction
   */
  private static async updateCustomerBalance(transaction: Transaction): Promise<void> {
    try {
      // Mock implementation - in production, this would update actual customer balance
      console.log('Customer balance updated for transaction:', transaction.id);
    } catch (error) {
      console.error('Failed to update customer balance:', error);
      // Don't throw error for balance update failures in mock implementation
    }
  }

  /**
   * Get account type for transaction type
   */
  private static getAccountTypeForTransaction(type: TransactionType): 'RECEIVABLES' | 'PAYABLES' | 'CASH' | 'CREDIT' {
    switch (type) {
      case TransactionType.PAYMENT:
      case TransactionType.REFUND:
        return 'CASH';

      case TransactionType.CREDIT_NOTE:
      case TransactionType.DEBIT_NOTE:
        return 'RECEIVABLES';

      case TransactionType.FEE:
      case TransactionType.INTEREST:
        return 'RECEIVABLES';

      case TransactionType.ADJUSTMENT:
      case TransactionType.REVERSAL:
      case TransactionType.DISCOUNT:
        return 'RECEIVABLES';

      default:
        return 'RECEIVABLES';
    }
  }

  /**
   * Generate mock transactions for testing
   */
  private static generateMockTransactions(agencyId: string, filters: TransactionFilters): Transaction[] {
    const transactions: Transaction[] = [];

    for (let i = 1; i <= 100; i++) {
      const type = Object.values(TransactionType)[Math.floor(Math.random() * Object.values(TransactionType).length)];
      const amount =
        type === TransactionType.CREDIT_NOTE || type === TransactionType.DISCOUNT
          ? -(Math.random() * 2000 + 100)
          : Math.random() * 5000 + 100;

      transactions.push({
        id: `txn_${Date.now()}_${i}`,
        customerId: `cust_${Math.floor(Math.random() * 20) + 1}`,
        customerName: `Customer ${Math.floor(Math.random() * 20) + 1}`,
        type,
        amount: Math.round(amount * 100) / 100,
        currency: 'USD',
        description: `${type.replace('_', ' ').toLowerCase()} transaction`,
        reference: `REF-${i.toString().padStart(6, '0')}`,
        metadata: {},
        agencyId,
        createdBy: `user_${Math.floor(Math.random() * 5) + 1}`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        effectiveDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }

    return transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Generate mock transaction by ID
   */
  private static generateMockTransactionById(transactionId: string): Transaction | null {
    return {
      id: transactionId,
      customerId: 'cust_1',
      customerName: 'Mock Customer',
      type: TransactionType.PAYMENT,
      amount: 1500.0,
      currency: 'USD',
      description: 'Mock payment transaction',
      reference: 'REF-001234',
      metadata: {},
      agencyId: 'agency_1',
      createdBy: 'user_1',
      createdAt: new Date(),
      effectiveDate: new Date(),
    };
  }

  /**
   * Calculate mock customer balance
   */
  private static calculateMockCustomerBalance(customerId: string): CustomerAccountBalance {
    const outstandingInvoices = Math.floor(Math.random() * 15000) + 2000;
    const creditLimit = Math.floor(Math.random() * 30000) + 10000;
    const overdueAmount = Math.floor(outstandingInvoices * (Math.random() * 0.3));

    return {
      customerId,
      customerName: `Customer ${customerId}`,
      currentBalance: outstandingInvoices,
      availableCredit: creditLimit - outstandingInvoices,
      creditLimit,
      outstandingInvoices,
      overdueAmount,
      currency: 'USD',
      lastTransactionDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      lastPaymentDate: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
      agencyId: 'agency_1',
      calculatedAt: new Date(),
    };
  }

  /**
   * Generate mock account statement
   */
  private static generateMockAccountStatement(customerId: string, dateFrom: Date, dateTo: Date): AccountStatement {
    const mockTransactions = TransactionService.generateMockTransactions('agency_1', { customerId })
      .filter((t) => t.effectiveDate >= dateFrom && t.effectiveDate <= dateTo)
      .slice(0, 50);

    const openingBalance = Math.floor(Math.random() * 10000);
    const totalDebits = mockTransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalCredits = Math.abs(mockTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
    const closingBalance = openingBalance + totalDebits - totalCredits;

    return {
      customerId,
      customerName: `Customer ${customerId}`,
      statementDate: dateTo,
      openingBalance,
      closingBalance,
      totalDebits,
      totalCredits,
      currency: 'USD',
      transactions: mockTransactions,
      agingBreakdown: {
        current: Math.floor(closingBalance * 0.6),
        days1To30: Math.floor(closingBalance * 0.2),
        days31To60: Math.floor(closingBalance * 0.1),
        days61To90: Math.floor(closingBalance * 0.05),
        days90Plus: Math.floor(closingBalance * 0.05),
      },
      agencyId: 'agency_1',
      generatedAt: new Date(),
    };
  }

  /**
   * Generate mock transaction summary
   */
  private static generateMockTransactionSummary(agencyId: string, dateFrom: Date, dateTo: Date): TransactionSummary {
    const byType: Record<TransactionType, { count: number; amount: number }> = {} as any;

    Object.values(TransactionType).forEach((type) => {
      byType[type] = {
        count: Math.floor(Math.random() * 50) + 10,
        amount: Math.floor(Math.random() * 25000) + 5000,
      };
    });

    return {
      totalTransactions: Object.values(byType).reduce((sum, item) => sum + item.count, 0),
      totalAmount: Object.values(byType).reduce((sum, item) => sum + item.amount, 0),
      currency: 'USD',
      byType,
      dailySummary: TransactionService.generateDailySummary(dateFrom, dateTo),
      topCustomers: TransactionService.generateTopCustomers(),
      periodStart: dateFrom,
      periodEnd: dateTo,
      agencyId,
    };
  }

  /**
   * Generate daily summary for date range
   */
  private static generateDailySummary(
    dateFrom: Date,
    dateTo: Date
  ): {
    readonly date: Date;
    readonly count: number;
    readonly amount: number;
  }[] {
    const summary: { date: Date; count: number; amount: number }[] = [];
    const currentDate = new Date(dateFrom);

    while (currentDate <= dateTo) {
      summary.push({
        date: new Date(currentDate),
        count: Math.floor(Math.random() * 20) + 5,
        amount: Math.floor(Math.random() * 15000) + 2000,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return summary;
  }

  /**
   * Generate top customers for summary
   */
  private static generateTopCustomers(): {
    readonly customerId: string;
    readonly customerName: string;
    readonly transactionCount: number;
    readonly totalAmount: number;
  }[] {
    const customers: {
      customerId: string;
      customerName: string;
      transactionCount: number;
      totalAmount: number;
    }[] = [];

    for (let i = 1; i <= 10; i++) {
      customers.push({
        customerId: `cust_${i}`,
        customerName: `Top Customer ${i}`,
        transactionCount: Math.floor(Math.random() * 50) + 20,
        totalAmount: Math.floor(Math.random() * 50000) + 10000,
      });
    }

    return customers.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Log transaction audit trail
   */
  private static async logTransactionAudit(
    transaction: Transaction,
    action: string,
    performedBy: string
  ): Promise<void> {
    try {
      console.log('Transaction Audit Log:', {
        transactionId: transaction.id,
        action,
        performedBy,
        timestamp: new Date(),
        transaction,
      });
    } catch (error) {
      console.error('Failed to log transaction audit:', error);
      // Don't throw error for audit logging failures
    }
  }
}

export default TransactionService;
