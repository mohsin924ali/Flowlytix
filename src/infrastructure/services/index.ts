/**
 * Infrastructure Services Index
 *
 * Barrel exports for all service implementations.
 * Provides clean module interface for concrete service adapters.
 *
 * @domain Service Implementations
 * @pattern Barrel Export
 * @version 1.0.0
 */

// Payment Gateway Service Implementation - Step 2C: Payment Infrastructure Layer
export {
  PaymentGatewayServiceImpl,
  createPaymentGatewayService,
  PaymentGatewayServiceError,
  GatewayErrorCode,
} from './payment-gateway.service';

// Sales Analytics Service Implementation - Phase 3: Analytics Infrastructure Layer
export { SalesAnalyticsServiceImpl, createSalesAnalyticsService, AnalyticsErrorCode } from './sales-analytics.service';
