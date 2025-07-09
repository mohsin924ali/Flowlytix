/**
 * Payment Service
 * Handles all payment-related API operations
 * Following Instructions file standards with comprehensive error handling
 */

import { apiClient } from './api';
import {
  Payment,
  PaymentFilters,
  PaymentListResponse,
  PaymentHistory,
  PaymentAnalytics,
  RevenueDataPoint,
  PaymentMethodStats,
  CreatePaymentForm,
  ProcessPaymentForm,
  FailPaymentForm,
  RefundPaymentForm,
  AddPaymentNoteForm,
  BulkPaymentActionForm,
  RefundResponse,
  BulkPaymentActionResponse,
  PaymentStatusSummary,
  AdminActivityResponse,
  ApiResponse,
} from '@/types';

class PaymentService {
  /**
   * Create a new payment
   */
  async createPayment(paymentData: CreatePaymentForm): Promise<ApiResponse<Payment>> {
    return apiClient.post<Payment, CreatePaymentForm>('/api/v1/payments', paymentData);
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<ApiResponse<Payment>> {
    return apiClient.get<Payment>(`/api/v1/payments/${paymentId}`);
  }

  /**
   * Search payments with filters and pagination
   */
  async searchPayments(
    filters: PaymentFilters,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<PaymentListResponse>> {
    const searchData = {
      ...filters,
      limit,
      offset,
    };

    return apiClient.post<PaymentListResponse>('/api/v1/payments/search', searchData);
  }

  /**
   * Get payments for a specific subscription
   */
  async getSubscriptionPayments(
    subscriptionId: string,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<PaymentListResponse>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    return apiClient.get<PaymentListResponse>(`/api/v1/payments/subscription/${subscriptionId}?${params.toString()}`);
  }

  /**
   * Get pending payments that require manual processing
   */
  async getPendingPayments(limit?: number, offset?: number): Promise<ApiResponse<PaymentListResponse>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    return apiClient.get<PaymentListResponse>(`/api/v1/payments/pending?${params.toString()}`);
  }

  /**
   * Get failed payments for review
   */
  async getFailedPayments(limit?: number, offset?: number): Promise<ApiResponse<PaymentListResponse>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    return apiClient.get<PaymentListResponse>(`/api/v1/payments/failed?${params.toString()}`);
  }

  /**
   * Process a payment manually
   */
  async processPayment(paymentId: string, processData: ProcessPaymentForm): Promise<ApiResponse<Payment>> {
    return apiClient.post<Payment, ProcessPaymentForm>(`/api/v1/payments/${paymentId}/process`, processData);
  }

  /**
   * Mark a payment as failed
   */
  async failPayment(paymentId: string, failData: FailPaymentForm): Promise<ApiResponse<Payment>> {
    return apiClient.post<Payment, FailPaymentForm>(`/api/v1/payments/${paymentId}/fail`, failData);
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, refundData: RefundPaymentForm): Promise<ApiResponse<RefundResponse>> {
    return apiClient.post<RefundResponse, RefundPaymentForm>(`/api/v1/payments/${paymentId}/refund`, refundData);
  }

  /**
   * Add a note to a payment
   */
  async addPaymentNote(paymentId: string, noteData: AddPaymentNoteForm): Promise<ApiResponse<Payment>> {
    return apiClient.post<Payment, AddPaymentNoteForm>(`/api/v1/payments/${paymentId}/notes`, noteData);
  }

  /**
   * Perform bulk actions on payments
   */
  async bulkPaymentAction(actionData: BulkPaymentActionForm): Promise<ApiResponse<BulkPaymentActionResponse>> {
    return apiClient.post<BulkPaymentActionResponse, BulkPaymentActionForm>('/api/v1/payments/bulk-action', actionData);
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(startDate?: Date, endDate?: Date): Promise<ApiResponse<PaymentAnalytics>> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate.toISOString());
    if (endDate) params.append('end_date', endDate.toISOString());

    return apiClient.get<PaymentAnalytics>(`/api/v1/payments/analytics?${params.toString()}`);
  }

  /**
   * Get revenue data by period
   */
  async getRevenueByPeriod(
    period: 'day' | 'week' | 'month' | 'year',
    startDate?: Date,
    endDate?: Date
  ): Promise<ApiResponse<{ data: RevenueDataPoint[]; period: string; startDate?: Date; endDate?: Date }>> {
    const params = new URLSearchParams();
    params.append('period', period);
    if (startDate) params.append('start_date', startDate.toISOString());
    if (endDate) params.append('end_date', endDate.toISOString());

    return apiClient.get(`/api/v1/payments/analytics/revenue?${params.toString()}`);
  }

  /**
   * Get payment method statistics
   */
  async getPaymentMethodStats(): Promise<ApiResponse<{ methods: Record<string, PaymentMethodStats> }>> {
    return apiClient.get('/api/v1/payments/analytics/methods');
  }

  /**
   * Get payment history for a specific payment
   */
  async getPaymentHistory(
    paymentId: string,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<{ entries: PaymentHistory[]; total: number; limit?: number; offset?: number }>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    return apiClient.get(`/api/v1/payments/${paymentId}/history?${params.toString()}`);
  }

  /**
   * Get admin activity for payment operations
   */
  async getAdminActivity(
    adminUserId: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<AdminActivityResponse>> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate.toISOString());
    if (endDate) params.append('end_date', endDate.toISOString());
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    return apiClient.get(`/api/v1/payments/admin/${adminUserId}/activity?${params.toString()}`);
  }

  /**
   * Get payment status summary for a list of payments
   */
  getPaymentStatusSummary(payments: Payment[]): PaymentStatusSummary {
    const summary: PaymentStatusSummary = {
      total: payments.length,
      byStatus: {},
      byMethod: {},
      totalAmount: 0,
      completedAmount: 0,
    };

    payments.forEach((payment) => {
      // Count by status
      summary.byStatus[payment.status] = (summary.byStatus[payment.status] || 0) + 1;

      // Count by method
      summary.byMethod[payment.paymentMethod] = (summary.byMethod[payment.paymentMethod] || 0) + 1;

      // Sum amounts
      summary.totalAmount += payment.amount;
      if (payment.status === 'completed') {
        summary.completedAmount += payment.amount;
      }
    });

    return summary;
  }

  /**
   * Format payment amount with currency
   */
  formatAmount(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Get payment status display color
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#fbbf24', // yellow
      processing: '#3b82f6', // blue
      completed: '#10b981', // green
      failed: '#ef4444', // red
      cancelled: '#6b7280', // gray
      refunded: '#8b5cf6', // purple
      partially_refunded: '#f59e0b', // amber
      expired: '#9ca3af', // gray
    };

    return colors[status] || '#6b7280';
  }

  /**
   * Get payment method display name
   */
  getMethodDisplayName(method: string): string {
    const names: Record<string, string> = {
      manual: 'Manual',
      bank_transfer: 'Bank Transfer',
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      paypal: 'PayPal',
      stripe: 'Stripe',
      cash: 'Cash',
      check: 'Check',
      wire_transfer: 'Wire Transfer',
      cryptocurrency: 'Cryptocurrency',
      other: 'Other',
    };

    return names[method] || method;
  }

  /**
   * Get payment type display name
   */
  getTypeDisplayName(type: string): string {
    const names: Record<string, string> = {
      subscription: 'Subscription',
      renewal: 'Renewal',
      upgrade: 'Upgrade',
      refund: 'Refund',
    };

    return names[type] || type;
  }

  /**
   * Check if payment can be processed
   */
  canProcessPayment(payment: Payment): boolean {
    return payment.status === 'pending' || payment.status === 'failed';
  }

  /**
   * Check if payment can be refunded
   */
  canRefundPayment(payment: Payment): boolean {
    return payment.status === 'completed' && payment.paymentType !== 'refund';
  }

  /**
   * Check if payment can be failed
   */
  canFailPayment(payment: Payment): boolean {
    return payment.status === 'pending' || payment.status === 'processing';
  }

  /**
   * Validate payment form data
   */
  validatePaymentForm(formData: CreatePaymentForm): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.subscriptionId) {
      errors.push('Subscription ID is required');
    }

    if (!formData.amount || formData.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!formData.currency || formData.currency.length !== 3) {
      errors.push('Valid currency code is required');
    }

    if (!formData.paymentMethod) {
      errors.push('Payment method is required');
    }

    if (!formData.paymentType) {
      errors.push('Payment type is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate payment statistics
   */
  calculatePaymentStats(payments: Payment[]): {
    totalRevenue: number;
    averageAmount: number;
    successRate: number;
    pendingCount: number;
    failedCount: number;
    refundedCount: number;
  } {
    const totalRevenue = payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

    const averageAmount = payments.length > 0 ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length : 0;

    const completedCount = payments.filter((p) => p.status === 'completed').length;
    const successRate = payments.length > 0 ? (completedCount / payments.length) * 100 : 0;

    const pendingCount = payments.filter((p) => p.status === 'pending').length;
    const failedCount = payments.filter((p) => p.status === 'failed').length;
    const refundedCount = payments.filter((p) => p.status === 'refunded').length;

    return {
      totalRevenue,
      averageAmount,
      successRate,
      pendingCount,
      failedCount,
      refundedCount,
    };
  }

  /**
   * Filter payments by date range
   */
  filterPaymentsByDate(payments: Payment[], startDate: Date, endDate: Date): Payment[] {
    return payments.filter((payment) => {
      const paymentDate = new Date(payment.createdAt);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
  }

  /**
   * Group payments by period
   */
  groupPaymentsByPeriod(payments: Payment[], period: 'day' | 'week' | 'month' | 'year'): Record<string, Payment[]> {
    const grouped: Record<string, Payment[]> = {};

    payments.forEach((payment) => {
      const date = new Date(payment.createdAt);
      let key: string;

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(payment);
    });

    return grouped;
  }

  /**
   * Export payments to CSV
   */
  exportPaymentsToCSV(payments: Payment[]): string {
    const headers = [
      'ID',
      'Subscription ID',
      'Amount',
      'Currency',
      'Payment Method',
      'Payment Type',
      'Status',
      'Reference ID',
      'Description',
      'Created At',
      'Processed At',
      'Admin User ID',
    ];

    const rows = payments.map((payment) => [
      payment.id,
      payment.subscriptionId,
      payment.amount.toString(),
      payment.currency,
      this.getMethodDisplayName(payment.paymentMethod),
      this.getTypeDisplayName(payment.paymentType),
      payment.status,
      payment.referenceId || '',
      payment.description || '',
      new Date(payment.createdAt).toISOString(),
      payment.processedAt ? new Date(payment.processedAt).toISOString() : '',
      payment.adminUserId || '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    return csvContent;
  }

  /**
   * Download payments as CSV file
   */
  downloadPaymentsCSV(payments: Payment[], filename: string = 'payments.csv'): void {
    const csvContent = this.exportPaymentsToCSV(payments);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;
