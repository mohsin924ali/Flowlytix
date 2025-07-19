/**
 * Subscription Entity
 * Following Instructions standards with clean architecture and DDD principles
 */

import { SubscriptionStatus } from '../valueObjects/SubscriptionStatus';
import { SubscriptionTier } from '../valueObjects/SubscriptionTier';
import { DeviceInfo } from '../valueObjects/DeviceInfo';

export interface SubscriptionData {
  id: string;
  licenseKey: string;
  email: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  deviceId: string;
  deviceInfo: DeviceInfo;
  tenantId: string;
  features: string[];
  maxDevices: number;
  startsAt: Date;
  expiresAt: Date;
  gracePeriodDays: number;
  lastValidatedAt: Date | null;
  signedToken: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export class Subscription {
  private constructor(private readonly data: SubscriptionData) {}

  static create(data: Omit<SubscriptionData, 'id' | 'createdAt' | 'updatedAt'>): Subscription {
    return new Subscription({
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: null,
    });
  }

  static fromData(data: SubscriptionData): Subscription {
    return new Subscription(data);
  }

  // Getters following the user flow requirements
  get id(): string {
    return this.data.id;
  }

  get licenseKey(): string {
    return this.data.licenseKey;
  }

  get email(): string {
    return this.data.email;
  }

  get tier(): SubscriptionTier {
    return this.data.tier;
  }

  get status(): SubscriptionStatus {
    return this.data.status;
  }

  get deviceId(): string {
    return this.data.deviceId;
  }

  get deviceInfo(): DeviceInfo {
    return this.data.deviceInfo;
  }

  get tenantId(): string {
    return this.data.tenantId;
  }

  get features(): string[] {
    return [...this.data.features];
  }

  get maxDevices(): number {
    return this.data.maxDevices;
  }

  get startsAt(): Date {
    return this.data.startsAt;
  }

  get expiresAt(): Date {
    return this.data.expiresAt;
  }

  get gracePeriodDays(): number {
    return this.data.gracePeriodDays;
  }

  get lastValidatedAt(): Date | null {
    return this.data.lastValidatedAt;
  }

  get signedToken(): string | null {
    return this.data.signedToken;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date | null {
    return this.data.updatedAt;
  }

  // Business logic methods following user flow

  /**
   * Step 2: Normal Daily Use - Check if subscription is expired
   */
  isExpired(): boolean {
    return new Date() > this.data.expiresAt;
  }

  /**
   * Step 4: Approaching Expiry - Check if in grace period
   */
  isInGracePeriod(): boolean {
    if (!this.isExpired()) {
      return false;
    }
    const graceEndDate = new Date(this.data.expiresAt);
    graceEndDate.setDate(graceEndDate.getDate() + this.data.gracePeriodDays);
    return new Date() <= graceEndDate;
  }

  /**
   * Step 4: Approaching Expiry - Calculate days remaining
   */
  getDaysRemaining(): number {
    const now = new Date();
    const diffTime = this.data.expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Step 4: Grace Period - Calculate grace period remaining
   */
  getGracePeriodDaysRemaining(): number {
    if (!this.isExpired()) {
      return this.data.gracePeriodDays;
    }

    const graceEndDate = new Date(this.data.expiresAt);
    graceEndDate.setDate(graceEndDate.getDate() + this.data.gracePeriodDays);

    const now = new Date();
    const diffTime = graceEndDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Step 5: After Expiry - Check if completely expired (grace period ended)
   */
  isCompletelyExpired(): boolean {
    return this.isExpired() && !this.isInGracePeriod();
  }

  /**
   * Step 2: Feature Access - Check if feature is available
   */
  hasFeature(featureId: string): boolean {
    return this.data.features.includes(featureId) && !this.isCompletelyExpired();
  }

  /**
   * Step 4: Warning System - Check if should show expiry warning
   */
  shouldShowExpiryWarning(warningDays: number = 7): boolean {
    const daysRemaining = this.getDaysRemaining();
    return daysRemaining > 0 && daysRemaining <= warningDays;
  }

  /**
   * Step 3: Periodic Sync - Check if needs validation
   */
  needsValidation(maxHoursSinceLastValidation: number = 24): boolean {
    if (!this.data.lastValidatedAt) {
      return true;
    }

    const hoursSinceValidation = (new Date().getTime() - this.data.lastValidatedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceValidation >= maxHoursSinceLastValidation;
  }

  /**
   * Update last validated timestamp - Step 3: Periodic Sync
   */
  markAsValidated(): Subscription {
    return new Subscription({
      ...this.data,
      lastValidatedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Update signed token - Step 3: Token Refresh
   */
  updateToken(newToken: string): Subscription {
    return new Subscription({
      ...this.data,
      signedToken: newToken,
      lastValidatedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Update subscription status
   */
  updateStatus(newStatus: SubscriptionStatus): Subscription {
    return new Subscription({
      ...this.data,
      status: newStatus,
      updatedAt: new Date(),
    });
  }

  /**
   * Convert to plain object for storage
   */
  toData(): SubscriptionData {
    return { ...this.data };
  }

  /**
   * Clone subscription
   */
  clone(): Subscription {
    return new Subscription({ ...this.data });
  }
}
