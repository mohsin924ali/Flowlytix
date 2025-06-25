/**
 * Offline Payment Workflow
 *
 * Simplified payment workflow specifically designed for offline credit and cash operations.
 * Eliminates online gateway complexity and focuses on business-critical offline features.
 *
 * Key Features:
 * - Immediate cash payment processing
 * - Credit limit validation and approval workflow
 * - Offline transaction queuing
 * - Payment aging and collection tracking
 * - Cash drawer management
 * - Simplified status transitions for offline operations
 *
 * @domain Order Management - Offline Payment Processing
 * @version 1.0.0
 */

import { Money } from '../value-objects/money';
import { PaymentMethod } from './order';
import { Payment, PaymentStatus, PaymentGateway, PaymentActionType } from './payment';

/**
 * Simplified offline payment status
 */
export enum OfflinePaymentStatus {
  PENDING = 'PENDING', // Order created, payment not yet processed
  CASH_RECEIVED = 'CASH_RECEIVED', // Cash payment received and verified
  CREDIT_APPROVED = 'CREDIT_APPROVED', // Credit transaction approved
  CREDIT_PENDING = 'CREDIT_PENDING', // Credit approval required
  OVERDUE = 'OVERDUE', // Credit payment past due date
  PARTIALLY_PAID = 'PARTIALLY_PAID', // Partial payment received
  PAID_IN_FULL = 'PAID_IN_FULL', // Full payment completed
  CANCELLED = 'CANCELLED', // Payment cancelled
}

/**
 * Offline payment workflow operations
 */
export class OfflinePaymentWorkflow {
  /**
   * Process immediate cash payment
   */
  public static processCashPayment(
    orderId: string,
    orderTotal: Money,
    amountReceived: Money,
    receivedBy: string,
    cashDrawerId?: string
  ): {
    status: OfflinePaymentStatus;
    changeRequired: Money;
    transactionComplete: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Validate cash amount
    if (amountReceived.lessThan(orderTotal)) {
      errors.push(`Insufficient cash received. Required: ${orderTotal.format()}, Received: ${amountReceived.format()}`);
      return {
        status: OfflinePaymentStatus.PENDING,
        changeRequired: Money.zero(orderTotal.currency),
        transactionComplete: false,
        errors,
      };
    }

    // Calculate change
    const changeRequired = amountReceived.subtract(orderTotal);

    return {
      status: OfflinePaymentStatus.CASH_RECEIVED,
      changeRequired,
      transactionComplete: true,
    };
  }

  /**
   * Process credit transaction
   */
  public static processCreditTransaction(
    customerId: string,
    orderTotal: Money,
    customerCreditLimit: Money,
    customerCurrentBalance: Money,
    creditDays: number,
    approvedBy?: string
  ): {
    status: OfflinePaymentStatus;
    requiresApproval: boolean;
    availableCredit: Money;
    dueDate: Date;
    errors?: string[];
  } {
    const errors: string[] = [];
    const availableCredit = customerCreditLimit.subtract(customerCurrentBalance);

    // Check if order amount exceeds available credit
    if (orderTotal.greaterThan(availableCredit)) {
      const shortfall = orderTotal.subtract(availableCredit);

      if (!approvedBy) {
        errors.push(
          `Credit limit exceeded. Available: ${availableCredit.format()}, Required: ${orderTotal.format()}, Shortfall: ${shortfall.format()}`
        );
        return {
          status: OfflinePaymentStatus.CREDIT_PENDING,
          requiresApproval: true,
          availableCredit,
          dueDate: new Date(Date.now() + creditDays * 24 * 60 * 60 * 1000),
          errors,
        };
      }
    }

    // Calculate due date
    const dueDate = new Date(Date.now() + creditDays * 24 * 60 * 60 * 1000);

    return {
      status: OfflinePaymentStatus.CREDIT_APPROVED,
      requiresApproval: false,
      availableCredit,
      dueDate,
    };
  }

  /**
   * Create offline payment record
   */
  public static createOfflinePayment(
    orderId: string,
    orderNumber: string,
    customerId: string,
    customerName: string,
    amount: Money,
    paymentMethod: PaymentMethod,
    agencyId: string,
    createdBy: string,
    deviceId?: string
  ): Payment {
    // Determine appropriate gateway for offline payment
    const gateway = OfflinePaymentWorkflow.getOfflineGateway(paymentMethod);

    // Generate offline transaction reference
    const transactionReference = OfflinePaymentWorkflow.generateOfflineTransactionReference(
      paymentMethod,
      orderId,
      deviceId
    );

    const paymentProps = {
      orderId,
      orderNumber,
      customerId,
      customerName,
      amount,
      paymentMethod,
      gateway,
      transactionReference,
      description: `Offline ${paymentMethod.toLowerCase()} payment for order ${orderNumber}`,
      metadata: {
        offline: true,
        deviceId: deviceId || 'unknown',
        processingMode: 'offline',
      },
      agencyId,
      initiatedBy: createdBy,
    };

    return Payment.create(paymentProps);
  }

  /**
   * Complete cash payment immediately
   */
  public static completeCashPayment(
    payment: Payment,
    amountReceived: Money,
    receivedBy: string,
    cashDrawerId?: string
  ): Payment {
    // Start processing
    const processing = payment.startProcessing(
      receivedBy,
      `CASH_${Date.now()}`,
      `Cash payment received: ${amountReceived.format()}`
    );

    // Create gateway response for cash payment
    const gatewayResponse = {
      success: true,
      transactionId: payment.transactionReference,
      gatewayTransactionId: `CASH_${cashDrawerId || 'MAIN'}_${Date.now()}`,
      message: `Cash payment completed. Amount received: ${amountReceived.format()}`,
      processedAt: new Date(),
    };

    // Complete payment
    return processing.complete(receivedBy, gatewayResponse, `Cash payment completed successfully`);
  }

  /**
   * Complete credit transaction
   */
  public static completeCreditTransaction(
    payment: Payment,
    approvedBy: string,
    creditDays: number,
    dueDate: Date
  ): Payment {
    // Start processing
    const processing = payment.startProcessing(
      approvedBy,
      `CREDIT_${Date.now()}`,
      `Credit transaction approved for ${creditDays} days`
    );

    // Create gateway response for credit transaction
    const gatewayResponse = {
      success: true,
      transactionId: payment.transactionReference,
      gatewayTransactionId: `CREDIT_${Date.now()}`,
      message: `Credit transaction approved. Due date: ${dueDate.toISOString().split('T')[0]}`,
      processedAt: new Date(),
    };

    // Complete payment
    return processing.complete(approvedBy, gatewayResponse, `Credit transaction approved and completed`);
  }

  /**
   * Handle partial payment
   */
  public static processPartialPayment(
    originalPayment: Payment,
    partialAmount: Money,
    receivedBy: string,
    paymentMethod: PaymentMethod
  ): Payment {
    // Create partial refund to adjust the original payment
    const refund = originalPayment.createRefund(
      originalPayment.amount.subtract(partialAmount),
      receivedBy,
      `Partial payment adjustment - ${partialAmount.format()} received`,
      {
        partialPayment: true,
        amountReceived: partialAmount.decimalAmount,
        remainingBalance: originalPayment.amount.subtract(partialAmount).decimalAmount,
      }
    );

    return refund;
  }

  /**
   * Queue offline transaction for later sync
   */
  public static queueOfflineTransaction(
    payment: Payment,
    deviceId: string,
    userId: string,
    transactionData: Record<string, any>
  ): {
    queueId: string;
    estimatedSyncTime: Date;
  } {
    const queueId = `OFFLINE_${deviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const estimatedSyncTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // In a real implementation, this would save to local storage or offline database
    return {
      queueId,
      estimatedSyncTime,
    };
  }

  /**
   * Validate offline payment business rules
   */
  public static validateOfflinePayment(
    paymentMethod: PaymentMethod,
    amount: Money,
    customerCreditLimit?: Money,
    customerBalance?: Money
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate amount
    if (amount.isZero() || amount.isNegative()) {
      errors.push('Payment amount must be positive');
    }

    // Validate credit-specific rules
    if (paymentMethod === PaymentMethod.CREDIT) {
      if (!customerCreditLimit) {
        errors.push('Customer credit limit is required for credit transactions');
      } else if (!customerBalance) {
        errors.push('Customer current balance is required for credit transactions');
      } else {
        const availableCredit = customerCreditLimit.subtract(customerBalance);
        if (amount.greaterThan(availableCredit)) {
          warnings.push(
            `Payment exceeds available credit. Available: ${availableCredit.format()}, Required: ${amount.format()}`
          );
        }
      }
    }

    // Validate cash-specific rules
    if (paymentMethod === PaymentMethod.CASH) {
      // Could add cash drawer limits, denomination validation, etc.
      if (amount.greaterThan(Money.fromDecimal(10000, amount.currency))) {
        warnings.push('Large cash transaction - consider additional verification');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get appropriate offline gateway for payment method
   */
  private static getOfflineGateway(paymentMethod: PaymentMethod): PaymentGateway {
    switch (paymentMethod) {
      case PaymentMethod.CASH:
        return PaymentGateway.INTERNAL_CASH;
      case PaymentMethod.CREDIT:
        return PaymentGateway.INTERNAL_CREDIT;
      case PaymentMethod.BANK_TRANSFER:
        return PaymentGateway.BANK_TRANSFER;
      case PaymentMethod.CHEQUE:
        return PaymentGateway.INTERNAL_CASH; // Treat cheques as cash until cleared
      default:
        return PaymentGateway.INTERNAL_CASH;
    }
  }

  /**
   * Generate offline transaction reference
   */
  private static generateOfflineTransactionReference(
    paymentMethod: PaymentMethod,
    orderId: string,
    deviceId?: string
  ): string {
    const timestamp = Date.now();
    const orderShort = orderId.substring(0, 8);
    const deviceShort = deviceId ? deviceId.substring(0, 4) : 'UNKN';

    switch (paymentMethod) {
      case PaymentMethod.CASH:
        return `CASH-${orderShort}-${deviceShort}-${timestamp}`;
      case PaymentMethod.CREDIT:
        return `CREDIT-${orderShort}-${deviceShort}-${timestamp}`;
      case PaymentMethod.CHEQUE:
        return `CHEQUE-${orderShort}-${deviceShort}-${timestamp}`;
      case PaymentMethod.BANK_TRANSFER:
        return `BANK-${orderShort}-${deviceShort}-${timestamp}`;
      default:
        return `OFFLINE-${orderShort}-${deviceShort}-${timestamp}`;
    }
  }
}
