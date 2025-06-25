/**
 * Payment Gateway Service Interface
 *
 * Domain service interface for payment gateway integration.
 * Defines the contract for payment processing with various gateway providers.
 * Follows Hexagonal Architecture port pattern for external service integration.
 *
 * Features:
 * - Gateway-agnostic payment processing
 * - Support for multiple payment methods
 * - Comprehensive error handling and validation
 * - Transaction lifecycle management
 * - Webhook and callback handling
 * - Refund and void operations
 * - Gateway health monitoring
 * - Configuration management
 *
 * @domain Order Management - Payment Processing
 * @pattern Domain Service / Port
 * @version 1.0.0
 */

import { Money } from '../value-objects/money';
import { PaymentMethod } from '../entities/order';
import { PaymentGateway, GatewayResponse, PaymentStatus } from '../entities/payment';

/**
 * Payment request interface
 */
export interface PaymentRequest {
  readonly amount: Money;
  readonly paymentMethod: PaymentMethod;
  readonly transactionReference: string;
  readonly orderId: string;
  readonly orderNumber: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerEmail?: string;
  readonly description?: string;
  readonly metadata?: Record<string, any>;
  readonly returnUrl?: string;
  readonly cancelUrl?: string;
  readonly webhookUrl?: string;
}

/**
 * Payment method configuration
 */
export interface PaymentMethodConfig {
  readonly method: PaymentMethod;
  readonly enabled: boolean;
  readonly displayName: string;
  readonly icon?: string;
  readonly minAmount?: Money;
  readonly maxAmount?: Money;
  readonly processingFee?: Money;
  readonly processingFeePercentage?: number;
  readonly supportedCurrencies: string[];
  readonly requiresRedirect: boolean;
  readonly estimatedProcessingTime: number; // minutes
}

/**
 * Gateway configuration interface
 */
export interface GatewayConfig {
  readonly gateway: PaymentGateway;
  readonly enabled: boolean;
  readonly environment: 'sandbox' | 'production';
  readonly apiKey: string;
  readonly secretKey: string;
  readonly webhookSecret?: string;
  readonly merchantId?: string;
  readonly supportedMethods: PaymentMethodConfig[];
  readonly defaultCurrency: string;
  readonly timeout: number; // seconds
  readonly retryAttempts: number;
  readonly webhookEndpoint?: string;
}

/**
 * Refund request interface
 */
export interface RefundRequest {
  readonly originalTransactionId: string;
  readonly amount: Money;
  readonly reason?: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Void request interface
 */
export interface VoidRequest {
  readonly transactionId: string;
  readonly reason?: string;
}

/**
 * Webhook payload interface
 */
export interface WebhookPayload {
  readonly gateway: PaymentGateway;
  readonly eventType: string;
  readonly transactionId: string;
  readonly gatewayTransactionId?: string;
  readonly status: PaymentStatus;
  readonly amount?: Money;
  readonly timestamp: Date;
  readonly signature?: string;
  readonly rawPayload: Record<string, any>;
}

/**
 * Gateway health status
 */
export interface GatewayHealthStatus {
  readonly gateway: PaymentGateway;
  readonly isHealthy: boolean;
  readonly responseTime: number; // milliseconds
  readonly lastChecked: Date;
  readonly errorMessage?: string;
  readonly uptime: number; // percentage
  readonly supportedMethods: PaymentMethod[];
}

/**
 * Transaction details interface
 */
export interface TransactionDetails {
  readonly transactionId: string;
  readonly gatewayTransactionId: string;
  readonly status: PaymentStatus;
  readonly amount: Money;
  readonly paymentMethod: PaymentMethod;
  readonly gateway: PaymentGateway;
  readonly processedAt: Date;
  readonly customerInfo?: {
    readonly name: string;
    readonly email?: string;
    readonly phone?: string;
  };
  readonly metadata?: Record<string, any>;
  readonly fees?: {
    readonly gatewayFee: Money;
    readonly processingFee: Money;
    readonly totalFees: Money;
  };
}

/**
 * Payment processing result
 */
export interface PaymentResult {
  readonly success: boolean;
  readonly transactionId: string;
  readonly gatewayTransactionId?: string;
  readonly status: PaymentStatus;
  readonly message?: string;
  readonly errorCode?: string;
  readonly redirectUrl?: string;
  readonly requiresAction?: boolean;
  readonly actionType?: 'redirect' | '3ds' | 'approval';
  readonly gatewayResponse: GatewayResponse;
  readonly estimatedSettlement?: Date;
  readonly fees?: Money;
}

/**
 * Gateway capability flags
 */
export interface GatewayCapabilities {
  readonly supportsVoid: boolean;
  readonly supportsPartialRefund: boolean;
  readonly supportsRecurring: boolean;
  readonly supportsPreAuth: boolean;
  readonly supportsCapture: boolean;
  readonly supportsWebhooks: boolean;
  readonly supports3DS: boolean;
  readonly supportsTokenization: boolean;
  readonly maxRefundDays: number;
  readonly minAmount: Money;
  readonly maxAmount: Money;
}

/**
 * Payment Gateway Service Interface
 */
export interface PaymentGatewayService {
  /**
   * Get gateway configuration
   */
  getConfig(gateway: PaymentGateway): Promise<GatewayConfig>;

  /**
   * Get gateway capabilities
   */
  getCapabilities(gateway: PaymentGateway): Promise<GatewayCapabilities>;

  /**
   * Get supported payment methods for gateway
   */
  getSupportedMethods(gateway: PaymentGateway): Promise<readonly PaymentMethodConfig[]>;

  /**
   * Validate payment request
   */
  validatePaymentRequest(
    gateway: PaymentGateway,
    request: PaymentRequest
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }>;

  /**
   * Process payment
   */
  processPayment(gateway: PaymentGateway, request: PaymentRequest): Promise<PaymentResult>;

  /**
   * Capture pre-authorized payment
   */
  capturePayment(gateway: PaymentGateway, transactionId: string, amount?: Money): Promise<PaymentResult>;

  /**
   * Void/cancel payment
   */
  voidPayment(gateway: PaymentGateway, request: VoidRequest): Promise<PaymentResult>;

  /**
   * Process refund
   */
  processRefund(gateway: PaymentGateway, request: RefundRequest): Promise<PaymentResult>;

  /**
   * Get transaction status
   */
  getTransactionStatus(gateway: PaymentGateway, transactionId: string): Promise<TransactionDetails>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(gateway: PaymentGateway, payload: string, signature: string): Promise<boolean>;

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(gateway: PaymentGateway, payload: string): Promise<WebhookPayload>;

  /**
   * Handle webhook event
   */
  handleWebhook(payload: WebhookPayload): Promise<{
    processed: boolean;
    paymentId?: string;
    status?: PaymentStatus;
    message?: string;
  }>;

  /**
   * Check gateway health
   */
  checkHealth(gateway: PaymentGateway): Promise<GatewayHealthStatus>;

  /**
   * Get gateway fees for transaction
   */
  calculateFees(
    gateway: PaymentGateway,
    amount: Money,
    paymentMethod: PaymentMethod
  ): Promise<{
    gatewayFee: Money;
    processingFee: Money;
    totalFees: Money;
    feePercentage: number;
  }>;

  /**
   * Test gateway connection
   */
  testConnection(gateway: PaymentGateway): Promise<{
    success: boolean;
    responseTime: number;
    message?: string;
  }>;

  /**
   * Get gateway transaction history
   */
  getTransactionHistory(
    gateway: PaymentGateway,
    dateFrom: Date,
    dateTo: Date,
    limit?: number,
    offset?: number
  ): Promise<readonly TransactionDetails[]>;

  /**
   * Update gateway configuration
   */
  updateConfig(gateway: PaymentGateway, config: Partial<GatewayConfig>): Promise<void>;

  /**
   * Enable/disable payment method
   */
  togglePaymentMethod(gateway: PaymentGateway, method: PaymentMethod, enabled: boolean): Promise<void>;

  /**
   * Get gateway analytics
   */
  getAnalytics(
    gateway: PaymentGateway,
    dateFrom: Date,
    dateTo: Date
  ): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalAmount: Money;
    averageAmount: Money;
    successRate: number;
    averageProcessingTime: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
  }>;

  /**
   * Retry failed payment
   */
  retryPayment(gateway: PaymentGateway, transactionId: string): Promise<PaymentResult>;

  /**
   * Get settlement information
   */
  getSettlementInfo(
    gateway: PaymentGateway,
    transactionId: string
  ): Promise<{
    settlementDate: Date;
    settlementAmount: Money;
    fees: Money;
    status: 'pending' | 'settled' | 'failed';
  } | null>;
}
