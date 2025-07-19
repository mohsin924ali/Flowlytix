/**
 * Credit Service
 * Service layer for credit management operations
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Credit Management
 * @architecture Service Layer Pattern
 * @version 1.0.0
 */

import { z } from 'zod';
import {
  CreditStatus,
  CreditRiskLevel,
  ApprovalStatus,
  CreditStatusUtils,
  CreditRiskUtils,
  PaymentBusinessRules,
  PaymentErrorCodes,
  PaymentDomainUtils,
  PaymentFormatters,
  CreditTerms,
} from '../domains/payment';
import type {
  CreditAccount,
  CreditCheckRequest,
  CreditCheckResult,
  CreditLimitAdjustment,
  CreditAnalytics,
  AgingReportItem,
  CreditLimitAdjustmentForm,
  AgingBucketSummary,
  CreditTrendData,
  ApiResponse,
  PaginatedResponse,
} from '../domains/payment';
import { CreditLimitAdjustmentFormSchema } from '../domains/payment';

/**
 * Credit score calculation result interface
 */
export interface CreditScoreResult {
  readonly customerId: string;
  readonly score: number;
  readonly riskLevel: CreditRiskLevel;
  readonly factors: CreditScoreFactor[];
  readonly recommendations: string[];
  readonly calculatedAt: Date;
}

/**
 * Credit score factor interface
 */
export interface CreditScoreFactor {
  readonly factor: string;
  readonly impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  readonly weight: number;
  readonly description: string;
}

/**
 * Credit limit recommendation interface
 */
export interface CreditLimitRecommendation {
  readonly customerId: string;
  readonly currentLimit: number;
  readonly recommendedLimit: number;
  readonly changeAmount: number;
  readonly changePercentage: number;
  readonly reasoning: string[];
  readonly confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly riskAssessment: CreditRiskLevel;
}

/**
 * Credit monitoring alert interface
 */
export interface CreditMonitoringAlert {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly alertType: 'LIMIT_EXCEEDED' | 'HIGH_UTILIZATION' | 'OVERDUE_PAYMENT' | 'PAYMENT_DELAY' | 'RISK_INCREASE';
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly message: string;
  readonly details: Record<string, any>;
  readonly triggeredAt: Date;
  readonly isRead: boolean;
  readonly agencyId: string;
}

/**
 * Credit risk assessment interface
 */
export interface CreditRiskAssessment {
  readonly customerId: string;
  readonly overallRisk: CreditRiskLevel;
  readonly riskScore: number;
  readonly paymentHistory: PaymentHistoryAnalysis;
  readonly creditUtilization: CreditUtilizationAnalysis;
  readonly agingAnalysis: AgingAnalysis;
  readonly businessStability: BusinessStabilityAnalysis;
  readonly recommendations: string[];
  readonly assessedAt: Date;
  readonly validUntil: Date;
}

/**
 * Payment history analysis interface
 */
export interface PaymentHistoryAnalysis {
  readonly onTimePaymentRate: number;
  readonly averagePaymentDelay: number;
  readonly totalPayments: number;
  readonly paymentTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  readonly riskContribution: number;
}

/**
 * Credit utilization analysis interface
 */
export interface CreditUtilizationAnalysis {
  readonly currentUtilization: number;
  readonly averageUtilization: number;
  readonly peakUtilization: number;
  readonly utilizationTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  readonly riskContribution: number;
}

/**
 * Aging analysis interface
 */
export interface AgingAnalysis {
  readonly totalOutstanding: number;
  readonly overduePercentage: number;
  readonly averageAgeDays: number;
  readonly oldestInvoiceDays: number;
  readonly agingTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  readonly riskContribution: number;
}

/**
 * Business stability analysis interface
 */
export interface BusinessStabilityAnalysis {
  readonly customerTenure: number;
  readonly orderFrequency: number;
  readonly orderValueStability: number;
  readonly industryRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly riskContribution: number;
}

/**
 * Credit Service
 *
 * Handles all credit-related operations including credit checking,
 * limit management, risk assessment, and analytics.
 * Follows Domain-Driven Design principles with proper business logic.
 */
export class CreditService {
  private static readonly BASE_DELAY = 400; // Slightly longer for credit checks
  private static readonly CREDIT_CHECK_TIMEOUT = PaymentBusinessRules.CREDIT_CHECK_TIMEOUT_MS;
  private static readonly DEFAULT_CREDIT_LIMIT = 5000;
  private static readonly MAX_CREDIT_LIMIT = 1000000;

  /**
   * Simulate processing delay (for mock implementation)
   */
  private static delay(ms: number = CreditService.BASE_DELAY): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get credit account information
   */
  static async getCreditAccount(customerId: string): Promise<CreditAccount | null> {
    try {
      await CreditService.delay(300);

      if (!customerId || customerId.trim().length === 0) {
        throw new Error('Customer ID is required');
      }

      // Mock implementation - in production, this would query database
      const mockCreditAccount = CreditService.generateMockCreditAccount(customerId);
      return mockCreditAccount;
    } catch (error) {
      console.error('CreditService.getCreditAccount error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve credit account');
    }
  }

  /**
   * Check credit availability for a transaction
   */
  static async checkCreditAvailability(request: CreditCheckRequest): Promise<CreditCheckResult> {
    try {
      await CreditService.delay(500); // Credit checks take time

      if (!request.customerId || request.customerId.trim().length === 0) {
        throw new Error('Customer ID is required');
      }

      if (request.requestedAmount <= 0) {
        throw new Error('Requested amount must be positive');
      }

      if (!request.agencyId || request.agencyId.trim().length === 0) {
        throw new Error('Agency ID is required');
      }

      // Get customer credit account
      const creditAccount = await CreditService.getCreditAccount(request.customerId);
      if (!creditAccount) {
        throw new Error('Customer credit account not found');
      }

      // Perform credit check logic
      const availableCredit = creditAccount.availableCredit;
      const approved = request.requestedAmount <= availableCredit;
      const requiresApproval = CreditService.requiresManagerApproval(
        request.requestedAmount,
        creditAccount.creditStatus,
        creditAccount.riskLevel
      );

      // Generate reasons and recommendations
      const reasons: string[] = [];
      const recommendations: string[] = [];

      if (!approved) {
        reasons.push(
          `Requested amount (${PaymentFormatters.formatCurrency(request.requestedAmount, request.currency)}) exceeds available credit (${PaymentFormatters.formatCurrency(availableCredit, request.currency)})`
        );
        recommendations.push('Consider requesting a credit limit increase');
        recommendations.push('Split the order into smaller amounts');
      }

      if (requiresApproval) {
        reasons.push('Transaction requires manager approval due to risk factors');
        recommendations.push('Escalate to credit manager for review');
      }

      if (creditAccount.creditUtilization > PaymentBusinessRules.CREDIT_UTILIZATION_WARNING) {
        reasons.push(
          `High credit utilization: ${PaymentFormatters.formatPercentage(creditAccount.creditUtilization / 100)}`
        );
        recommendations.push('Monitor credit usage closely');
      }

      const result: CreditCheckResult = {
        customerId: request.customerId,
        requestedAmount: request.requestedAmount,
        currentLimit: creditAccount.creditLimit,
        availableCredit: creditAccount.availableCredit,
        outstandingBalance: creditAccount.outstandingBalance,
        approved,
        requiresApproval,
        riskLevel: creditAccount.riskLevel,
        riskScore: creditAccount.riskScore,
        creditStatus: creditAccount.creditStatus,
        reasons,
        recommendations,
        checkedAt: new Date(),
        checkedBy: request.requestedBy,
      };

      // Log credit check for audit trail
      await CreditService.logCreditCheck(result);

      return result;
    } catch (error) {
      console.error('CreditService.checkCreditAvailability error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to check credit availability');
    }
  }

  /**
   * Adjust customer credit limit
   */
  static async adjustCreditLimit(
    data: CreditLimitAdjustmentForm,
    requestedBy: string,
    agencyId: string
  ): Promise<CreditLimitAdjustment> {
    try {
      // Validate input data
      const validatedData = CreditLimitAdjustmentFormSchema.parse(data);

      if (!requestedBy || requestedBy.trim().length === 0) {
        throw new Error('Requested by user ID is required');
      }

      if (!agencyId || agencyId.trim().length === 0) {
        throw new Error('Agency ID is required');
      }

      await CreditService.delay(600);

      // Get current credit account
      const creditAccount = await CreditService.getCreditAccount(validatedData.customerId);
      if (!creditAccount) {
        throw new Error('Customer credit account not found');
      }

      // Validate new limit
      if (validatedData.newLimit < 0) {
        throw new Error('Credit limit cannot be negative');
      }

      if (validatedData.newLimit > CreditService.MAX_CREDIT_LIMIT) {
        throw new Error(
          `Credit limit cannot exceed ${PaymentFormatters.formatCurrency(CreditService.MAX_CREDIT_LIMIT, 'USD')}`
        );
      }

      // Calculate changes
      const changeAmount = validatedData.newLimit - creditAccount.creditLimit;
      const changePercentage = creditAccount.creditLimit > 0 ? (changeAmount / creditAccount.creditLimit) * 100 : 0;

      // Determine approval status
      const requiresApproval =
        Math.abs(changeAmount) >= PaymentBusinessRules.CREDIT_LIMIT_ADJUSTMENT_APPROVAL_THRESHOLD;
      const approvalStatus = requiresApproval ? ApprovalStatus.PENDING : ApprovalStatus.APPROVED;

      const adjustment: CreditLimitAdjustment = {
        id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerId: validatedData.customerId,
        currentLimit: creditAccount.creditLimit,
        newLimit: validatedData.newLimit,
        changeAmount,
        changePercentage,
        reason: validatedData.reason,
        approvalStatus,
        requestedBy,
        requestedAt: new Date(),
        effectiveDate: validatedData.effectiveDate,
        agencyId,
      };

      // Auto-approve if below threshold
      if (!requiresApproval) {
        adjustment.approvedBy = requestedBy;
        adjustment.approvedAt = new Date();
      }

      // Log credit limit adjustment
      await CreditService.logCreditLimitAdjustment(adjustment);

      return adjustment;
    } catch (error) {
      console.error('CreditService.adjustCreditLimit error:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(', ')}`);
      }
      throw new Error(error instanceof Error ? error.message : 'Failed to adjust credit limit');
    }
  }

  /**
   * Approve credit limit adjustment
   */
  static async approveCreditAdjustment(adjustmentId: string, approvedBy: string): Promise<CreditLimitAdjustment> {
    try {
      await CreditService.delay(400);

      if (!adjustmentId || adjustmentId.trim().length === 0) {
        throw new Error('Adjustment ID is required');
      }

      if (!approvedBy || approvedBy.trim().length === 0) {
        throw new Error('Approved by user ID is required');
      }

      // Get adjustment (mock implementation)
      const adjustment = await CreditService.getMockAdjustment(adjustmentId);
      if (!adjustment) {
        throw new Error('Credit limit adjustment not found');
      }

      if (adjustment.approvalStatus !== ApprovalStatus.PENDING) {
        throw new Error('Adjustment is not in pending status');
      }

      // Update approval status
      const approvedAdjustment: CreditLimitAdjustment = {
        ...adjustment,
        approvalStatus: ApprovalStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
      };

      // Log approval
      await CreditService.logCreditLimitApproval(approvedAdjustment);

      return approvedAdjustment;
    } catch (error) {
      console.error('CreditService.approveCreditAdjustment error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to approve credit adjustment');
    }
  }

  /**
   * Get credit analytics
   */
  static async getCreditAnalytics(agencyId: string, dateFrom: Date, dateTo: Date): Promise<CreditAnalytics> {
    try {
      await CreditService.delay(800);

      if (!agencyId || agencyId.trim().length === 0) {
        throw new Error('Agency ID is required');
      }

      if (dateFrom > dateTo) {
        throw new Error('Date from cannot be greater than date to');
      }

      // Mock analytics data - in production, this would aggregate from database
      const mockAnalytics: CreditAnalytics = {
        totalCreditCustomers: 450,
        totalCreditLimit: 2250000,
        totalOutstanding: 897500,
        totalAvailableCredit: 1352500,
        averageCreditUtilization: 39.9,
        creditStatusDistribution: {
          [CreditStatus.GOOD]: 320,
          [CreditStatus.FAIR]: 85,
          [CreditStatus.POOR]: 30,
          [CreditStatus.BLOCKED]: 10,
          [CreditStatus.SUSPENDED]: 3,
          [CreditStatus.UNDER_REVIEW]: 2,
        },
        riskLevelDistribution: {
          [CreditRiskLevel.MINIMAL]: 180,
          [CreditRiskLevel.LOW]: 150,
          [CreditRiskLevel.MODERATE]: 80,
          [CreditRiskLevel.HIGH]: 30,
          [CreditRiskLevel.CRITICAL]: 10,
        },
        agingBuckets: CreditService.generateAgingBuckets(),
        creditTrends: CreditService.generateCreditTrends(dateFrom, dateTo),
        agencyId,
        periodStart: dateFrom,
        periodEnd: dateTo,
        generatedAt: new Date(),
      };

      return mockAnalytics;
    } catch (error) {
      console.error('CreditService.getCreditAnalytics error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve credit analytics');
    }
  }

  /**
   * Generate aging report
   */
  static async generateAgingReport(agencyId: string, asOfDate: Date = new Date()): Promise<AgingReportItem[]> {
    try {
      await CreditService.delay(1000); // Aging reports take time to generate

      if (!agencyId || agencyId.trim().length === 0) {
        throw new Error('Agency ID is required');
      }

      // Mock aging report - in production, this would query actual data
      const agingReport = CreditService.generateMockAgingReport(agencyId, asOfDate);
      return agingReport;
    } catch (error) {
      console.error('CreditService.generateAgingReport error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate aging report');
    }
  }

  /**
   * Perform comprehensive credit risk assessment
   */
  static async performRiskAssessment(customerId: string): Promise<CreditRiskAssessment> {
    try {
      await CreditService.delay(800);

      if (!customerId || customerId.trim().length === 0) {
        throw new Error('Customer ID is required');
      }

      // Get credit account
      const creditAccount = await CreditService.getCreditAccount(customerId);
      if (!creditAccount) {
        throw new Error('Customer credit account not found');
      }

      // Perform comprehensive risk assessment
      const paymentHistory = CreditService.analyzePaymentHistory(customerId);
      const creditUtilization = CreditService.analyzeCreditUtilization(creditAccount);
      const agingAnalysis = CreditService.analyzeAging(customerId);
      const businessStability = CreditService.analyzeBusinessStability(customerId);

      // Calculate overall risk score
      const riskScore = CreditService.calculateOverallRiskScore(
        paymentHistory,
        creditUtilization,
        agingAnalysis,
        businessStability
      );

      // Determine risk level
      const overallRisk = CreditService.determineRiskLevel(riskScore);

      // Generate recommendations
      const recommendations = CreditService.generateRiskRecommendations(
        overallRisk,
        paymentHistory,
        creditUtilization,
        agingAnalysis,
        businessStability
      );

      const assessment: CreditRiskAssessment = {
        customerId,
        overallRisk,
        riskScore,
        paymentHistory,
        creditUtilization,
        agingAnalysis,
        businessStability,
        recommendations,
        assessedAt: new Date(),
        validUntil: new Date(Date.now() + PaymentBusinessRules.CREDIT_REVIEW_FREQUENCY_DAYS * 24 * 60 * 60 * 1000),
      };

      return assessment;
    } catch (error) {
      console.error('CreditService.performRiskAssessment error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to perform risk assessment');
    }
  }

  /**
   * Get credit monitoring alerts
   */
  static async getCreditMonitoringAlerts(agencyId: string): Promise<CreditMonitoringAlert[]> {
    try {
      await CreditService.delay(400);

      if (!agencyId || agencyId.trim().length === 0) {
        throw new Error('Agency ID is required');
      }

      // Mock alerts - in production, this would query actual monitoring system
      const alerts = CreditService.generateMockAlerts(agencyId);
      return alerts;
    } catch (error) {
      console.error('CreditService.getCreditMonitoringAlerts error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve credit monitoring alerts');
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Check if credit adjustment requires manager approval
   */
  private static requiresManagerApproval(
    requestedAmount: number,
    creditStatus: CreditStatus,
    riskLevel: CreditRiskLevel
  ): boolean {
    // High amounts always require approval
    if (requestedAmount >= 10000) return true;

    // Poor credit status requires approval
    if (!CreditStatusUtils.allowsNewOrders(creditStatus)) return true;

    // High risk customers require approval
    if ([CreditRiskLevel.HIGH, CreditRiskLevel.CRITICAL].includes(riskLevel)) return true;

    return false;
  }

  /**
   * Generate mock credit account
   */
  private static generateMockCreditAccount(customerId: string): CreditAccount {
    const creditLimit = Math.floor(Math.random() * 50000) + 5000;
    const outstandingBalance = Math.floor(Math.random() * creditLimit * 0.7);
    const availableCredit = creditLimit - outstandingBalance;
    const creditUtilization = (outstandingBalance / creditLimit) * 100;

    return {
      id: `credit_${customerId}`,
      customerId,
      customerName: `Customer ${customerId}`,
      creditLimit,
      availableCredit,
      outstandingBalance,
      creditUtilization,
      creditStatus: Object.values(CreditStatus)[Math.floor(Math.random() * Object.values(CreditStatus).length)],
      creditTerms: 'Net 30 days',
      creditTermsDays: 30,
      lastPaymentDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      lastPaymentAmount: Math.floor(Math.random() * 5000),
      riskLevel: Object.values(CreditRiskLevel)[Math.floor(Math.random() * Object.values(CreditRiskLevel).length)],
      riskScore: Math.floor(Math.random() * 100),
      agencyId: 'agency_1',
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Generate mock aging buckets
   */
  private static generateAgingBuckets(): AgingBucketSummary[] {
    return [
      { bucket: 'Current', days: '0', customerCount: 180, totalAmount: 450000, percentage: 45.0 },
      { bucket: '1-30 days', days: '1-30', customerCount: 120, totalAmount: 300000, percentage: 30.0 },
      { bucket: '31-60 days', days: '31-60', customerCount: 80, totalAmount: 150000, percentage: 15.0 },
      { bucket: '61-90 days', days: '61-90', customerCount: 40, totalAmount: 70000, percentage: 7.0 },
      { bucket: '90+ days', days: '90+', customerCount: 30, totalAmount: 30000, percentage: 3.0 },
    ];
  }

  /**
   * Generate credit trends
   */
  private static generateCreditTrends(dateFrom: Date, dateTo: Date): CreditTrendData[] {
    const trends: CreditTrendData[] = [];
    const currentDate = new Date(dateFrom);

    while (currentDate <= dateTo) {
      trends.push({
        date: new Date(currentDate),
        totalLimit: 2000000 + Math.random() * 500000,
        totalOutstanding: 800000 + Math.random() * 200000,
        utilizationRate: 35 + Math.random() * 20,
        newCredits: Math.floor(Math.random() * 10),
        creditAdjustments: Math.floor(Math.random() * 5),
      });
      currentDate.setDate(currentDate.getDate() + 7); // Weekly data
    }

    return trends;
  }

  /**
   * Generate mock aging report
   */
  private static generateMockAgingReport(agencyId: string, asOfDate: Date): AgingReportItem[] {
    const report: AgingReportItem[] = [];

    for (let i = 1; i <= 50; i++) {
      const totalOutstanding = Math.floor(Math.random() * 25000) + 1000;
      const current = Math.floor(totalOutstanding * (0.4 + Math.random() * 0.3));
      const days1To30 = Math.floor((totalOutstanding - current) * (0.3 + Math.random() * 0.3));
      const days31To60 = Math.floor((totalOutstanding - current - days1To30) * (0.3 + Math.random() * 0.4));
      const days61To90 = Math.floor(
        (totalOutstanding - current - days1To30 - days31To60) * (0.2 + Math.random() * 0.6)
      );
      const days90Plus = totalOutstanding - current - days1To30 - days31To60 - days61To90;

      report.push({
        customerId: `cust_${i}`,
        customerName: `Customer ${i}`,
        totalOutstanding,
        current,
        days1To30,
        days31To60,
        days61To90,
        days90Plus,
        oldestInvoiceDate: new Date(asOfDate.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000),
        currency: 'USD',
        creditLimit: Math.floor(Math.random() * 50000) + 10000,
        creditStatus: Object.values(CreditStatus)[Math.floor(Math.random() * Object.values(CreditStatus).length)],
        riskLevel: Object.values(CreditRiskLevel)[Math.floor(Math.random() * Object.values(CreditRiskLevel).length)],
        lastPaymentDate: new Date(asOfDate.getTime() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        agencyId,
      });
    }

    return report.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }

  /**
   * Analyze payment history
   */
  private static analyzePaymentHistory(customerId: string): PaymentHistoryAnalysis {
    return {
      onTimePaymentRate: 0.75 + Math.random() * 0.25,
      averagePaymentDelay: Math.floor(Math.random() * 10),
      totalPayments: Math.floor(Math.random() * 100) + 20,
      paymentTrend: ['IMPROVING', 'STABLE', 'DECLINING'][Math.floor(Math.random() * 3)] as any,
      riskContribution: Math.floor(Math.random() * 30),
    };
  }

  /**
   * Analyze credit utilization
   */
  private static analyzeCreditUtilization(creditAccount: CreditAccount): CreditUtilizationAnalysis {
    return {
      currentUtilization: creditAccount.creditUtilization,
      averageUtilization: creditAccount.creditUtilization + Math.random() * 10 - 5,
      peakUtilization: Math.min(100, creditAccount.creditUtilization + Math.random() * 20),
      utilizationTrend: ['IMPROVING', 'STABLE', 'DECLINING'][Math.floor(Math.random() * 3)] as any,
      riskContribution: Math.floor(creditAccount.creditUtilization * 0.5),
    };
  }

  /**
   * Analyze aging
   */
  private static analyzeAging(customerId: string): AgingAnalysis {
    const totalOutstanding = Math.floor(Math.random() * 20000) + 1000;
    return {
      totalOutstanding,
      overduePercentage: Math.random() * 30,
      averageAgeDays: Math.floor(Math.random() * 45),
      oldestInvoiceDays: Math.floor(Math.random() * 120),
      agingTrend: ['IMPROVING', 'STABLE', 'DECLINING'][Math.floor(Math.random() * 3)] as any,
      riskContribution: Math.floor(Math.random() * 25),
    };
  }

  /**
   * Analyze business stability
   */
  private static analyzeBusinessStability(customerId: string): BusinessStabilityAnalysis {
    return {
      customerTenure: Math.floor(Math.random() * 60) + 6,
      orderFrequency: Math.floor(Math.random() * 20) + 1,
      orderValueStability: 0.6 + Math.random() * 0.4,
      industryRisk: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as any,
      riskContribution: Math.floor(Math.random() * 20),
    };
  }

  /**
   * Calculate overall risk score
   */
  private static calculateOverallRiskScore(
    paymentHistory: PaymentHistoryAnalysis,
    creditUtilization: CreditUtilizationAnalysis,
    agingAnalysis: AgingAnalysis,
    businessStability: BusinessStabilityAnalysis
  ): number {
    const weights = {
      paymentHistory: 0.35,
      creditUtilization: 0.25,
      aging: 0.25,
      businessStability: 0.15,
    };

    return Math.round(
      paymentHistory.riskContribution * weights.paymentHistory +
        creditUtilization.riskContribution * weights.creditUtilization +
        agingAnalysis.riskContribution * weights.aging +
        businessStability.riskContribution * weights.businessStability
    );
  }

  /**
   * Determine risk level from score
   */
  private static determineRiskLevel(score: number): CreditRiskLevel {
    if (score <= 20) return CreditRiskLevel.MINIMAL;
    if (score <= 40) return CreditRiskLevel.LOW;
    if (score <= 60) return CreditRiskLevel.MODERATE;
    if (score <= 80) return CreditRiskLevel.HIGH;
    return CreditRiskLevel.CRITICAL;
  }

  /**
   * Generate risk recommendations
   */
  private static generateRiskRecommendations(
    riskLevel: CreditRiskLevel,
    paymentHistory: PaymentHistoryAnalysis,
    creditUtilization: CreditUtilizationAnalysis,
    agingAnalysis: AgingAnalysis,
    businessStability: BusinessStabilityAnalysis
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === CreditRiskLevel.CRITICAL) {
      recommendations.push('Consider suspending credit privileges');
      recommendations.push('Require cash payments until risk improves');
    } else if (riskLevel === CreditRiskLevel.HIGH) {
      recommendations.push('Reduce credit limit');
      recommendations.push('Require manager approval for all orders');
    }

    if (paymentHistory.onTimePaymentRate < 0.8) {
      recommendations.push('Monitor payment behavior closely');
    }

    if (creditUtilization.currentUtilization > 80) {
      recommendations.push('Encourage payment to reduce utilization');
    }

    if (agingAnalysis.overduePercentage > 20) {
      recommendations.push('Implement aggressive collection procedures');
    }

    return recommendations;
  }

  /**
   * Generate mock monitoring alerts
   */
  private static generateMockAlerts(agencyId: string): CreditMonitoringAlert[] {
    const alerts: CreditMonitoringAlert[] = [];

    for (let i = 1; i <= 10; i++) {
      alerts.push({
        id: `alert_${i}`,
        customerId: `cust_${i}`,
        customerName: `Customer ${i}`,
        alertType: ['LIMIT_EXCEEDED', 'HIGH_UTILIZATION', 'OVERDUE_PAYMENT', 'PAYMENT_DELAY', 'RISK_INCREASE'][
          Math.floor(Math.random() * 5)
        ] as any,
        severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)] as any,
        message: `Credit monitoring alert for Customer ${i}`,
        details: { amount: Math.floor(Math.random() * 10000) + 1000 },
        triggeredAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        isRead: Math.random() > 0.5,
        agencyId,
      });
    }

    return alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  /**
   * Get mock adjustment (for testing)
   */
  private static async getMockAdjustment(adjustmentId: string): Promise<CreditLimitAdjustment | null> {
    return {
      id: adjustmentId,
      customerId: 'cust_1',
      currentLimit: 10000,
      newLimit: 15000,
      changeAmount: 5000,
      changePercentage: 50,
      reason: 'Increased business volume',
      approvalStatus: ApprovalStatus.PENDING,
      requestedBy: 'user_1',
      requestedAt: new Date(),
      effectiveDate: new Date(),
      agencyId: 'agency_1',
    };
  }

  /**
   * Log credit check for audit trail
   */
  private static async logCreditCheck(result: CreditCheckResult): Promise<void> {
    try {
      console.log('Credit Check Log:', result);
    } catch (error) {
      console.error('Failed to log credit check:', error);
    }
  }

  /**
   * Log credit limit adjustment
   */
  private static async logCreditLimitAdjustment(adjustment: CreditLimitAdjustment): Promise<void> {
    try {
      console.log('Credit Limit Adjustment Log:', adjustment);
    } catch (error) {
      console.error('Failed to log credit limit adjustment:', error);
    }
  }

  /**
   * Log credit limit approval
   */
  private static async logCreditLimitApproval(adjustment: CreditLimitAdjustment): Promise<void> {
    try {
      console.log('Credit Limit Approval Log:', adjustment);
    } catch (error) {
      console.error('Failed to log credit limit approval:', error);
    }
  }
}

export default CreditService;
