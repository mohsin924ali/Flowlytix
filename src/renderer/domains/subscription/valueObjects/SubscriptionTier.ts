/**
 * SubscriptionTier Value Object
 * Following Instructions standards with DDD principles
 */

export enum SubscriptionTier {
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  TRIAL = 'trial',
}

export interface TierFeatures {
  maxUsers: number;
  maxAgencies: number;
  maxDevices: number;
  features: string[];
  gracePeriodDays: number;
  priority: number;
}

export class SubscriptionTierValue {
  private static readonly TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
    [SubscriptionTier.TRIAL]: {
      maxUsers: 2,
      maxAgencies: 1,
      maxDevices: 1,
      features: ['basic_dashboard', 'basic_reporting'],
      gracePeriodDays: 0,
      priority: 0,
    },
    [SubscriptionTier.BASIC]: {
      maxUsers: 5,
      maxAgencies: 1,
      maxDevices: 3,
      features: [
        'basic_dashboard',
        'basic_reporting',
        'inventory_management',
        'order_management',
        'customer_management',
      ],
      gracePeriodDays: 7,
      priority: 1,
    },
    [SubscriptionTier.PROFESSIONAL]: {
      maxUsers: 25,
      maxAgencies: 3,
      maxDevices: 10,
      features: [
        'basic_dashboard',
        'basic_reporting',
        'inventory_management',
        'order_management',
        'customer_management',
        'advanced_analytics',
        'employee_management',
        'multi_agency',
        'payment_tracking',
        'credit_management',
      ],
      gracePeriodDays: 14,
      priority: 2,
    },
    [SubscriptionTier.ENTERPRISE]: {
      maxUsers: -1, // Unlimited
      maxAgencies: -1, // Unlimited
      maxDevices: -1, // Unlimited
      features: [
        'basic_dashboard',
        'basic_reporting',
        'inventory_management',
        'order_management',
        'customer_management',
        'advanced_analytics',
        'employee_management',
        'multi_agency',
        'payment_tracking',
        'credit_management',
        'custom_integrations',
        'api_access',
        'priority_support',
        'data_export',
        'white_labeling',
      ],
      gracePeriodDays: 30,
      priority: 3,
    },
  };

  private constructor(private readonly tier: SubscriptionTier) {}

  static create(tier: SubscriptionTier): SubscriptionTierValue {
    if (!Object.values(SubscriptionTier).includes(tier)) {
      throw new Error(`Invalid subscription tier: ${tier}`);
    }
    return new SubscriptionTierValue(tier);
  }

  static fromString(tier: string): SubscriptionTierValue {
    const normalizedTier = tier.toLowerCase() as SubscriptionTier;
    return SubscriptionTierValue.create(normalizedTier);
  }

  get value(): SubscriptionTier {
    return this.tier;
  }

  get features(): TierFeatures {
    return SubscriptionTierValue.TIER_FEATURES[this.tier];
  }

  hasFeature(featureId: string): boolean {
    return this.features.features.includes(featureId);
  }

  canCreateUsers(currentUserCount: number): boolean {
    const maxUsers = this.features.maxUsers;
    return maxUsers === -1 || currentUserCount < maxUsers;
  }

  canCreateAgencies(currentAgencyCount: number): boolean {
    const maxAgencies = this.features.maxAgencies;
    return maxAgencies === -1 || currentAgencyCount < maxAgencies;
  }

  canAddDevices(currentDeviceCount: number): boolean {
    const maxDevices = this.features.maxDevices;
    return maxDevices === -1 || currentDeviceCount < maxDevices;
  }

  getDisplayName(): string {
    switch (this.tier) {
      case SubscriptionTier.TRIAL:
        return 'Trial';
      case SubscriptionTier.BASIC:
        return 'Basic';
      case SubscriptionTier.PROFESSIONAL:
        return 'Professional';
      case SubscriptionTier.ENTERPRISE:
        return 'Enterprise';
      default:
        return 'Unknown';
    }
  }

  getDescription(): string {
    switch (this.tier) {
      case SubscriptionTier.TRIAL:
        return 'Try Flowlytix with limited features';
      case SubscriptionTier.BASIC:
        return 'Essential features for small businesses';
      case SubscriptionTier.PROFESSIONAL:
        return 'Advanced features for growing businesses';
      case SubscriptionTier.ENTERPRISE:
        return 'Complete solution for large organizations';
      default:
        return 'Unknown subscription tier';
    }
  }

  getColor(): string {
    switch (this.tier) {
      case SubscriptionTier.TRIAL:
        return '#9e9e9e'; // Gray
      case SubscriptionTier.BASIC:
        return '#2196f3'; // Blue
      case SubscriptionTier.PROFESSIONAL:
        return '#513ff2'; // Purple
      case SubscriptionTier.ENTERPRISE:
        return '#ff9800'; // Orange
      default:
        return '#9e9e9e'; // Gray
    }
  }

  isHigherThan(other: SubscriptionTierValue): boolean {
    return this.features.priority > other.features.priority;
  }

  isLowerThan(other: SubscriptionTierValue): boolean {
    return this.features.priority < other.features.priority;
  }

  equals(other: SubscriptionTierValue): boolean {
    return this.tier === other.tier;
  }

  toString(): string {
    return this.tier;
  }
}
