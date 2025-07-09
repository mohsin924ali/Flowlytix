"use strict";
/**
 * Shared Subscription Types
 * Used by main process to avoid cross-directory imports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = exports.Platform = exports.SubscriptionTier = exports.SubscriptionTierValue = exports.SubscriptionStatus = exports.SubscriptionStatusValue = void 0;
// Subscription Status
var SubscriptionStatusValue;
(function (SubscriptionStatusValue) {
    SubscriptionStatusValue["ACTIVE"] = "active";
    SubscriptionStatusValue["EXPIRED"] = "expired";
    SubscriptionStatusValue["SUSPENDED"] = "suspended";
    SubscriptionStatusValue["CANCELLED"] = "cancelled";
})(SubscriptionStatusValue || (exports.SubscriptionStatusValue = SubscriptionStatusValue = {}));
class SubscriptionStatus {
    value;
    constructor(value) {
        this.value = value;
    }
    static ACTIVE = new SubscriptionStatus(SubscriptionStatusValue.ACTIVE);
    static EXPIRED = new SubscriptionStatus(SubscriptionStatusValue.EXPIRED);
    static SUSPENDED = new SubscriptionStatus(SubscriptionStatusValue.SUSPENDED);
    static CANCELLED = new SubscriptionStatus(SubscriptionStatusValue.CANCELLED);
    static fromString(value) {
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
    toString() {
        return this.value;
    }
    equals(other) {
        return this.value === other.value;
    }
}
exports.SubscriptionStatus = SubscriptionStatus;
// Subscription Tier
var SubscriptionTierValue;
(function (SubscriptionTierValue) {
    SubscriptionTierValue["BASIC"] = "basic";
    SubscriptionTierValue["PROFESSIONAL"] = "professional";
    SubscriptionTierValue["ENTERPRISE"] = "enterprise";
})(SubscriptionTierValue || (exports.SubscriptionTierValue = SubscriptionTierValue = {}));
class SubscriptionTier {
    value;
    constructor(value) {
        this.value = value;
    }
    static BASIC = new SubscriptionTier(SubscriptionTierValue.BASIC);
    static PROFESSIONAL = new SubscriptionTier(SubscriptionTierValue.PROFESSIONAL);
    static ENTERPRISE = new SubscriptionTier(SubscriptionTierValue.ENTERPRISE);
    static fromString(value) {
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
    toString() {
        return this.value;
    }
    equals(other) {
        return this.value === other.value;
    }
    getFeatures() {
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
exports.SubscriptionTier = SubscriptionTier;
// Device Info
var Platform;
(function (Platform) {
    Platform["WINDOWS"] = "windows";
    Platform["MAC"] = "mac";
    Platform["LINUX"] = "linux";
    Platform["UNKNOWN"] = "unknown";
})(Platform || (exports.Platform = Platform = {}));
// Subscription Entity Class
class Subscription {
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
exports.Subscription = Subscription;
