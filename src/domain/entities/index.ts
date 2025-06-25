/**
 * Domain Entities Barrel Exports
 * Central export point for all domain entities
 */

export { User, UserStatus, UserDomainError, UserValidationError, UserSecurityError } from './user';

export type { CreateUserParams, UserProps } from './user';

export { Agency, AgencyStatus, AgencyDomainError, AgencyValidationError, AgencyBusinessError } from './agency';

export type { AgencySettings, CreateAgencyParams, AgencyProps } from './agency';

export {
  Product,
  ProductStatus,
  ProductCategory,
  UnitOfMeasure,
  PriceChangeReason,
  ProductDomainError,
  ProductValidationError,
  InvalidSKUError,
  InvalidBarcodeError,
  InvalidStockLevelError,
  InsufficientStockError,
  ProductStatusError,
} from './product';

export type {
  ProductProps,
  ProductDimensions,
  PriceHistoryEntry,
  StockMovementEntry,
  ProductPersistence,
} from './product';

export {
  Customer,
  CustomerStatus,
  CustomerType,
  PaymentTerms,
  CustomerDomainError,
  CustomerValidationError,
  InvalidCustomerCodeError,
  InsufficientCreditError,
  CustomerStatusError,
  InvalidAddressError,
} from './customer';

export type {
  CustomerProps,
  CustomerAddress,
  CustomerContact,
  PurchaseHistoryEntry,
  CreditLimitChangeEntry,
  CustomerPersistence,
} from './customer';

export {
  Order,
  OrderStatus,
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  PaymentMethod,
  OrderItemStatus,
  OrderDomainError,
  OrderValidationError,
  InvalidOrderNumberError,
  OrderStatusError,
  FulfillmentStatusError,
  FulfillmentActionType,
  InsufficientInventoryError,
  CreditLimitExceededError,
  EmptyOrderError,
} from './order';

export type { FulfillmentAuditEntry, FulfillmentSummary, ItemFulfillmentDetails } from './order';

export type { OrderProps, OrderItem, OrderPersistence } from './order';

export {
  Payment,
  PaymentStatus,
  PaymentTransactionType,
  PaymentGateway,
  PaymentActionType,
  PaymentDomainError,
  PaymentValidationError,
  InvalidPaymentAmountError,
  PaymentStatusError,
  PaymentGatewayError,
  PaymentRetryLimitExceededError,
  InvalidRefundAmountError,
} from './payment';

export type { PaymentProps, PaymentPersistence, PaymentAuditEntry, PaymentRetryInfo, GatewayResponse } from './payment';

export { OfflinePaymentWorkflow, OfflinePaymentStatus } from './offline-payment-workflow';

export {
  Shipping,
  ShippingStatus,
  ShippingCarrier,
  ShippingServiceType,
  ShippingPriority,
  ShippingActionType,
  ShippingValidationError,
  ShippingStatusError,
  CarrierValidationError,
} from './shipping';

export type {
  ShippingProps,
  ShippingPersistence,
  ShippingAddress,
  PackageDimensions,
  TrackingEvent,
  DeliveryAttempt,
  ShippingAuditEntry,
} from './shipping';

export {
  Report,
  ReportType,
  ReportStatus,
  ReportFormat,
  ReportFrequency,
  ReportDomainError,
  InvalidReportConfigurationError,
  ReportNotExecutableError,
  ReportAlreadyExecutingError,
} from './report';

export type { ReportProps, ReportConfiguration, ReportResult } from './report';
