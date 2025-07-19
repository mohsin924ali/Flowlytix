/**
 * Shared Subscription Types
 * Used by both main and renderer processes to avoid cross-directory imports
 */
// Subscription Status
export var SubscriptionStatusValue;
(function (SubscriptionStatusValue) {
    SubscriptionStatusValue["ACTIVE"] = "active";
    SubscriptionStatusValue["EXPIRED"] = "expired";
    SubscriptionStatusValue["SUSPENDED"] = "suspended";
    SubscriptionStatusValue["CANCELLED"] = "cancelled";
})(SubscriptionStatusValue || (SubscriptionStatusValue = {}));
export class SubscriptionStatus {
    value;
    constructor(value) {
        this.value = value;
    }
    static ACTIVE = new SubscriptionStatus(SubscriptionStatusValue.ACTIVE);
    static EXPIRED = new SubscriptionStatus(SubscriptionStatusValue.EXPIRED);
    static SUSPENDED = new SubscriptionStatus(SubscriptionStatusValue.SUSPENDED);
    static CANCELLED = new SubscriptionStatus(SubscriptionStatusValue.CANCELLED);
    toString() {
        return this.value;
    }
    equals(other) {
        return this.value === other.value;
    }
}
// Subscription Tier
export var SubscriptionTierValue;
(function (SubscriptionTierValue) {
    SubscriptionTierValue["BASIC"] = "basic";
    SubscriptionTierValue["PROFESSIONAL"] = "professional";
    SubscriptionTierValue["ENTERPRISE"] = "enterprise";
})(SubscriptionTierValue || (SubscriptionTierValue = {}));
export class SubscriptionTier {
    value;
    constructor(value) {
        this.value = value;
    }
    static BASIC = new SubscriptionTier(SubscriptionTierValue.BASIC);
    static PROFESSIONAL = new SubscriptionTier(SubscriptionTierValue.PROFESSIONAL);
    static ENTERPRISE = new SubscriptionTier(SubscriptionTierValue.ENTERPRISE);
    toString() {
        return this.value;
    }
    equals(other) {
        return this.value === other.value;
    }
    getFeatures() {
        switch (this.value) {
            case SubscriptionTierValue.BASIC:
                return {
                    maxUsers: 5,
                    maxDevices: 1,
                    features: ['basic_analytics', 'inventory_management'],
                    storage: '1GB',
                    support: 'email',
                };
            case SubscriptionTierValue.PROFESSIONAL:
                return {
                    maxUsers: 20,
                    maxDevices: 3,
                    features: ['basic_analytics', 'inventory_management', 'advanced_reports', 'multi_location'],
                    storage: '10GB',
                    support: 'email + chat',
                };
            case SubscriptionTierValue.ENTERPRISE:
                return {
                    maxUsers: -1, // unlimited
                    maxDevices: 10,
                    features: ['all_features', 'custom_integrations', 'priority_support'],
                    storage: 'unlimited',
                    support: '24/7 phone + email + chat',
                };
            default:
                return {
                    maxUsers: 0,
                    maxDevices: 0,
                    features: [],
                    storage: '0GB',
                    support: 'none',
                };
        }
    }
}
// Device Info
export var Platform;
(function (Platform) {
    Platform["WINDOWS"] = "windows";
    Platform["MAC"] = "mac";
    Platform["LINUX"] = "linux";
    Platform["UNKNOWN"] = "unknown";
})(Platform || (Platform = {}));
// Subscription Entity Class
export class Subscription {
    data;
    constructor(data) {
        this.data = data;
    }
    static create(data) {
        return new Subscription({
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: null,
        });
    }
    static fromData(data) {
        return new Subscription(data);
    }
    // Getters
    get id() {
        return this.data.id;
    }
    get licenseKey() {
        return this.data.licenseKey;
    }
    get email() {
        return this.data.email;
    }
    get tier() {
        return this.data.tier;
    }
    get status() {
        return this.data.status;
    }
    get deviceId() {
        return this.data.deviceId;
    }
    get deviceInfo() {
        return this.data.deviceInfo;
    }
    get tenantId() {
        return this.data.tenantId;
    }
    get features() {
        return [...this.data.features];
    }
    get maxDevices() {
        return this.data.maxDevices;
    }
    get startsAt() {
        return this.data.startsAt;
    }
    get expiresAt() {
        return this.data.expiresAt;
    }
    get gracePeriodDays() {
        return this.data.gracePeriodDays;
    }
    get lastValidatedAt() {
        return this.data.lastValidatedAt;
    }
    get signedToken() {
        return this.data.signedToken;
    }
    get createdAt() {
        return this.data.createdAt;
    }
    get updatedAt() {
        return this.data.updatedAt;
    }
    // Business logic methods
    isExpired() {
        return new Date() > this.data.expiresAt;
    }
    isInGracePeriod() {
        if (!this.isExpired()) {
            return false;
        }
        const graceEndDate = new Date(this.data.expiresAt);
        graceEndDate.setDate(graceEndDate.getDate() + this.data.gracePeriodDays);
        return new Date() <= graceEndDate;
    }
    getDaysRemaining() {
        const now = new Date();
        const diffTime = this.data.expiresAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }
    getGracePeriodDaysRemaining() {
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
    isCompletelyExpired() {
        return this.isExpired() && !this.isInGracePeriod();
    }
    hasFeature(featureId) {
        return this.data.features.includes(featureId) && !this.isCompletelyExpired();
    }
    shouldShowExpiryWarning(warningDays = 7) {
        const daysRemaining = this.getDaysRemaining();
        return daysRemaining > 0 && daysRemaining <= warningDays;
    }
    needsValidation(maxHoursSinceLastValidation = 24) {
        if (!this.data.lastValidatedAt) {
            return true;
        }
        const hoursSinceValidation = (new Date().getTime() - this.data.lastValidatedAt.getTime()) / (1000 * 60 * 60);
        return hoursSinceValidation >= maxHoursSinceLastValidation;
    }
    markAsValidated() {
        return new Subscription({
            ...this.data,
            lastValidatedAt: new Date(),
            updatedAt: new Date(),
        });
    }
    updateToken(newToken) {
        return new Subscription({
            ...this.data,
            signedToken: newToken,
            lastValidatedAt: new Date(),
            updatedAt: new Date(),
        });
    }
    updateStatus(newStatus) {
        return new Subscription({
            ...this.data,
            status: newStatus,
            updatedAt: new Date(),
        });
    }
    toData() {
        return { ...this.data };
    }
    clone() {
        return new Subscription({ ...this.data });
    }
}
