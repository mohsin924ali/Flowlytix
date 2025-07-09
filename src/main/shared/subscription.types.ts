/**
 * Shared Subscription Types
 * Used by main process to avoid cross-directory imports
 */

// Subscription Status
export enum SubscriptionStatusValue {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export class SubscriptionStatus {
  constructor(public readonly value: SubscriptionStatusValue) {}

  static readonly ACTIVE = new SubscriptionStatus(SubscriptionStatusValue.ACTIVE);
  static readonly EXPIRED = new SubscriptionStatus(SubscriptionStatusValue.EXPIRED);
  static readonly SUSPENDED = new SubscriptionStatus(SubscriptionStatusValue.SUSPENDED);
  static readonly CANCELLED = new SubscriptionStatus(SubscriptionStatusValue.CANCELLED);

  static fromString(value: string): SubscriptionStatus {
    switch (value) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'expired':
        return SubscriptionStatus.EXPIRED;
      case 'suspended':
        return SubscriptionStatus.SUSPENDED;
      case 'cancelled':
        return SubscriptionStatus.CANCELLED;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: SubscriptionStatus): boolean {
    return this.value === other.value;
  }
}

// Subscription Tier
export enum SubscriptionTierValue {
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export class SubscriptionTier {
  constructor(public readonly value: SubscriptionTierValue) {}

  static readonly BASIC = new SubscriptionTier(SubscriptionTierValue.BASIC);
  static readonly PROFESSIONAL = new SubscriptionTier(SubscriptionTierValue.PROFESSIONAL);
  static readonly ENTERPRISE = new SubscriptionTier(SubscriptionTierValue.ENTERPRISE);

  static fromString(value: string): SubscriptionTier {
    switch (value) {
      case 'basic':
        return SubscriptionTier.BASIC;
      case 'professional':
        return SubscriptionTier.PROFESSIONAL;
      case 'enterprise':
        return SubscriptionTier.ENTERPRISE;
      default:
        return SubscriptionTier.BASIC;
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: SubscriptionTier): boolean {
    return this.value === other.value;
  }

  getFeatures(): string[] {
    switch (this.value) {
      case SubscriptionTierValue.BASIC:
        return ['basic_analytics', 'inventory_management'];
      case SubscriptionTierValue.PROFESSIONAL:
        return ['basic_analytics', 'inventory_management', 'advanced_reports', 'multi_location'];
      case SubscriptionTierValue.ENTERPRISE:
        return ['all_features', 'custom_integrations', 'priority_support'];
      default:
        return [];
    }
  }
}

// Device Info
export enum Platform {
  WINDOWS = 'windows',
  MAC = 'mac',
  LINUX = 'linux',
  UNKNOWN = 'unknown',
}

export interface DeviceFingerprint {
  hardwareId: string;
  osFingerprint: string;
  networkFingerprint: string;
  timestamp: string;
}

export interface SubscriptionDeviceInfo {
  deviceId: string;
  platform: Platform;
  fingerprint: DeviceFingerprint;
  registeredAt: Date;
}

// Subscription Data
export interface SubscriptionData {
  id: string;
  licenseKey: string;
  email: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  deviceId: string;
  deviceInfo: SubscriptionDeviceInfo;
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

// Subscription Entity Class
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

  // Getters
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
  get deviceInfo(): SubscriptionDeviceInfo {
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

  // Business logic methods
  isExpired(): boolean {
    return new Date() > this.data.expiresAt;
  }

  isInGracePeriod(): boolean {
    if (!this.isExpired()) {
      return false;
    }
    const graceEndDate = new Date(this.data.expiresAt);
    graceEndDate.setDate(graceEndDate.getDate() + this.data.gracePeriodDays);
    return new Date() <= graceEndDate;
  }

  getDaysRemaining(): number {
    const now = new Date();
    const diffTime = this.data.expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

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

  isCompletelyExpired(): boolean {
    return this.isExpired() && !this.isInGracePeriod();
  }

  hasFeature(featureId: string): boolean {
    return this.data.features.includes(featureId) && !this.isCompletelyExpired();
  }

  shouldShowExpiryWarning(warningDays: number = 7): boolean {
    const daysRemaining = this.getDaysRemaining();
    return daysRemaining > 0 && daysRemaining <= warningDays;
  }

  needsValidation(maxHoursSinceLastValidation: number = 24): boolean {
    if (!this.data.lastValidatedAt) {
      return true;
    }

    const hoursSinceValidation = (new Date().getTime() - this.data.lastValidatedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceValidation >= maxHoursSinceLastValidation;
  }

  markAsValidated(): Subscription {
    return new Subscription({
      ...this.data,
      lastValidatedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  updateToken(newToken: string): Subscription {
    return new Subscription({
      ...this.data,
      signedToken: newToken,
      lastValidatedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  updateStatus(newStatus: SubscriptionStatus): Subscription {
    return new Subscription({
      ...this.data,
      status: newStatus,
      updatedAt: new Date(),
    });
  }

  toData(): SubscriptionData {
    return { ...this.data };
  }

  clone(): Subscription {
    return new Subscription({ ...this.data });
  }
}
