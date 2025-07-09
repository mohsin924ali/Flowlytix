/**
 * SubscriptionStatus Value Object
 * Following Instructions standards with DDD principles
 */

export enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
  GRACE_PERIOD = 'grace_period',
}

export class SubscriptionStatusValue {
  private constructor(private readonly status: SubscriptionStatus) {}

  static create(status: SubscriptionStatus): SubscriptionStatusValue {
    if (!Object.values(SubscriptionStatus).includes(status)) {
      throw new Error(`Invalid subscription status: ${status}`);
    }
    return new SubscriptionStatusValue(status);
  }

  static fromString(status: string): SubscriptionStatusValue {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_') as SubscriptionStatus;
    return SubscriptionStatusValue.create(normalizedStatus);
  }

  get value(): SubscriptionStatus {
    return this.status;
  }

  isActive(): boolean {
    return this.status === SubscriptionStatus.ACTIVE;
  }

  isExpired(): boolean {
    return this.status === SubscriptionStatus.EXPIRED;
  }

  isInGracePeriod(): boolean {
    return this.status === SubscriptionStatus.GRACE_PERIOD;
  }

  isCancelled(): boolean {
    return this.status === SubscriptionStatus.CANCELLED;
  }

  isSuspended(): boolean {
    return this.status === SubscriptionStatus.SUSPENDED;
  }

  isPending(): boolean {
    return this.status === SubscriptionStatus.PENDING;
  }

  canUseFeatures(): boolean {
    return this.isActive() || this.isInGracePeriod();
  }

  getDisplayName(): string {
    switch (this.status) {
      case SubscriptionStatus.PENDING:
        return 'Pending Activation';
      case SubscriptionStatus.ACTIVE:
        return 'Active';
      case SubscriptionStatus.EXPIRED:
        return 'Expired';
      case SubscriptionStatus.CANCELLED:
        return 'Cancelled';
      case SubscriptionStatus.SUSPENDED:
        return 'Suspended';
      case SubscriptionStatus.GRACE_PERIOD:
        return 'Grace Period';
      default:
        return 'Unknown';
    }
  }

  getColor(): string {
    switch (this.status) {
      case SubscriptionStatus.ACTIVE:
        return '#4caf50'; // Green
      case SubscriptionStatus.GRACE_PERIOD:
        return '#ff9800'; // Orange
      case SubscriptionStatus.EXPIRED:
        return '#f44336'; // Red
      case SubscriptionStatus.CANCELLED:
        return '#9e9e9e'; // Gray
      case SubscriptionStatus.SUSPENDED:
        return '#ff5722'; // Deep Orange
      case SubscriptionStatus.PENDING:
        return '#2196f3'; // Blue
      default:
        return '#9e9e9e'; // Gray
    }
  }

  equals(other: SubscriptionStatusValue): boolean {
    return this.status === other.status;
  }

  toString(): string {
    return this.status;
  }
}
