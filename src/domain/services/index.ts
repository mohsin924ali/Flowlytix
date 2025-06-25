/**
 * Domain Services Index
 *
 * Barrel exports for all domain services.
 * Provides clean module interface for service contracts.
 *
 * @domain Services
 * @pattern Barrel Export
 * @version 1.0.0
 */

// Payment Gateway Service
export type {
  PaymentGatewayService,
  PaymentRequest,
  PaymentMethodConfig,
  GatewayConfig,
  RefundRequest,
  VoidRequest,
  WebhookPayload,
  GatewayHealthStatus,
  TransactionDetails,
  PaymentResult,
  GatewayCapabilities,
} from './payment-gateway.service';

// Offline Payment Service
export type {
  OfflinePaymentService,
  CashTransactionDetails,
  CashDenomination,
  CreditTransactionDetails,
  CustomerPaymentAging,
  PaymentAgingBucket,
  CashDrawerReconciliation,
  OfflineTransaction,
  CreditApprovalRequest,
  CreditApprovalResponse,
  PaymentCollectionActivity,
} from './offline-payment.service';

export { CreditTerms } from './offline-payment.service';

// Shipping Service
export type {
  ShippingCostCalculation,
  ShippingLabelRequest,
  ShippingLabelResponse,
  BulkShippingRequest,
  BulkShippingResult,
  ShippingTrackingUpdate,
  DeliveryAttemptRequest,
  DeliveryConfirmationRequest,
} from './shipping.service';

export {
  ShippingService,
  ShippingServiceError,
  ShippingLabelError,
  ShippingCarrierError,
  ShippingDeliveryError,
} from './shipping.service';

// Sales Analytics Service
export type {
  SalesAnalyticsService,
  SalesTrendRequest,
  SalesTrendPoint,
  CustomerSegmentationRequest,
  CustomerSegment,
  ProductPerformanceRequest,
  ProductPerformanceInsight,
  RevenueForecastRequest,
  RevenueForecast,
  MarketBasketRequest,
  MarketBasketRule,
  CustomerLTVRequest,
  CustomerLTVResult,
  TerritoryPerformanceRequest,
  TerritoryPerformance,
} from './sales-analytics.service';

export { SalesAnalyticsServiceError } from './sales-analytics.service';
