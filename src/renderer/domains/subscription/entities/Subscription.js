/**
 * Subscription Entity
 * Following Instructions standards with clean architecture and DDD principles
 */
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
    // Getters following the user flow requirements
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
    // Business logic methods following user flow
    /**
     * Step 2: Normal Daily Use - Check if subscription is expired
     */
    isExpired() {
        return new Date() > this.data.expiresAt;
    }
    /**
     * Step 4: Approaching Expiry - Check if in grace period
     */
    isInGracePeriod() {
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
    getDaysRemaining() {
        const now = new Date();
        const diffTime = this.data.expiresAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }
    /**
     * Step 4: Grace Period - Calculate grace period remaining
     */
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
    /**
     * Step 5: After Expiry - Check if completely expired (grace period ended)
     */
    isCompletelyExpired() {
        return this.isExpired() && !this.isInGracePeriod();
    }
    /**
     * Step 2: Feature Access - Check if feature is available
     */
    hasFeature(featureId) {
        return this.data.features.includes(featureId) && !this.isCompletelyExpired();
    }
    /**
     * Step 4: Warning System - Check if should show expiry warning
     */
    shouldShowExpiryWarning(warningDays = 7) {
        const daysRemaining = this.getDaysRemaining();
        return daysRemaining > 0 && daysRemaining <= warningDays;
    }
    /**
     * Step 3: Periodic Sync - Check if needs validation
     */
    needsValidation(maxHoursSinceLastValidation = 24) {
        if (!this.data.lastValidatedAt) {
            return true;
        }
        const hoursSinceValidation = (new Date().getTime() - this.data.lastValidatedAt.getTime()) / (1000 * 60 * 60);
        return hoursSinceValidation >= maxHoursSinceLastValidation;
    }
    /**
     * Update last validated timestamp - Step 3: Periodic Sync
     */
    markAsValidated() {
        return new Subscription({
            ...this.data,
            lastValidatedAt: new Date(),
            updatedAt: new Date(),
        });
    }
    /**
     * Update signed token - Step 3: Token Refresh
     */
    updateToken(newToken) {
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
    updateStatus(newStatus) {
        return new Subscription({
            ...this.data,
            status: newStatus,
            updatedAt: new Date(),
        });
    }
    /**
     * Convert to plain object for storage
     */
    toData() {
        return { ...this.data };
    }
    /**
     * Clone subscription
     */
    clone() {
        return new Subscription({ ...this.data });
    }
}
