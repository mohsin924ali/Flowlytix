/**
 * SubscriptionStatus Value Object
 * Following Instructions standards with DDD principles
 */
export var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["PENDING"] = "pending";
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["EXPIRED"] = "expired";
    SubscriptionStatus["CANCELLED"] = "cancelled";
    SubscriptionStatus["SUSPENDED"] = "suspended";
    SubscriptionStatus["GRACE_PERIOD"] = "grace_period";
})(SubscriptionStatus || (SubscriptionStatus = {}));
export class SubscriptionStatusValue {
    status;
    constructor(status) {
        this.status = status;
    }
    static create(status) {
        if (!Object.values(SubscriptionStatus).includes(status)) {
            throw new Error(`Invalid subscription status: ${status}`);
        }
        return new SubscriptionStatusValue(status);
    }
    static fromString(status) {
        const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
        return SubscriptionStatusValue.create(normalizedStatus);
    }
    get value() {
        return this.status;
    }
    isActive() {
        return this.status === SubscriptionStatus.ACTIVE;
    }
    isExpired() {
        return this.status === SubscriptionStatus.EXPIRED;
    }
    isInGracePeriod() {
        return this.status === SubscriptionStatus.GRACE_PERIOD;
    }
    isCancelled() {
        return this.status === SubscriptionStatus.CANCELLED;
    }
    isSuspended() {
        return this.status === SubscriptionStatus.SUSPENDED;
    }
    isPending() {
        return this.status === SubscriptionStatus.PENDING;
    }
    canUseFeatures() {
        return this.isActive() || this.isInGracePeriod();
    }
    getDisplayName() {
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
    getColor() {
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
    equals(other) {
        return this.status === other.status;
    }
    toString() {
        return this.status;
    }
}
