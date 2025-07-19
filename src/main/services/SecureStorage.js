"use strict";
/**
 * Secure Storage Service
 * Handles secure storage of subscription tokens and sensitive data
 * Following Instructions standards with Electron's safeStorage API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureStorage = void 0;
const electron_1 = require("electron");
const fs_1 = require("fs");
const path_1 = require("path");
const subscription_types_1 = require("../shared/subscription.types");
class SecureStorage {
    static instance = null;
    storageDir;
    subscriptionFile;
    constructor() {
        this.storageDir = (0, path_1.join)(electron_1.app.getPath('userData'), 'subscription');
        this.subscriptionFile = (0, path_1.join)(this.storageDir, 'subscription.json');
    }
    static getInstance() {
        if (!SecureStorage.instance) {
            SecureStorage.instance = new SecureStorage();
        }
        return SecureStorage.instance;
    }
    /**
     * Step 1: First Install/Activation - Store activation data
     */
    async storeSubscription(subscription) {
        await this.ensureStorageDir();
        const encryptedToken = subscription.signedToken ? this.encryptToken(subscription.signedToken) : null;
        const storedData = {
            subscription: subscription.toData(),
            encryptedToken,
            lastStoredAt: new Date().toISOString(),
        };
        // Remove the plain text token before storing
        const subscriptionData = { ...storedData.subscription };
        subscriptionData.signedToken = null;
        storedData.subscription = subscriptionData;
        await fs_1.promises.writeFile(this.subscriptionFile, JSON.stringify(storedData, null, 2), 'utf8');
    }
    /**
     * Step 2: Normal Daily Use - Retrieve stored subscription
     */
    async getSubscription() {
        try {
            const data = await fs_1.promises.readFile(this.subscriptionFile, 'utf8');
            const storedData = JSON.parse(data);
            // Decrypt the token if it exists
            let decryptedToken = null;
            if (storedData.encryptedToken) {
                decryptedToken = this.decryptToken(storedData.encryptedToken);
            }
            // Restore the token to the subscription data
            const subscriptionData = {
                ...storedData.subscription,
                signedToken: decryptedToken,
            };
            // Convert dates back to Date objects
            subscriptionData.startsAt = new Date(subscriptionData.startsAt);
            subscriptionData.expiresAt = new Date(subscriptionData.expiresAt);
            subscriptionData.createdAt = new Date(subscriptionData.createdAt);
            subscriptionData.updatedAt = subscriptionData.updatedAt ? new Date(subscriptionData.updatedAt) : null;
            subscriptionData.lastValidatedAt = subscriptionData.lastValidatedAt
                ? new Date(subscriptionData.lastValidatedAt)
                : null;
            return subscription_types_1.Subscription.fromData(subscriptionData);
        }
        catch (error) {
            // File doesn't exist or is corrupted
            return null;
        }
    }
    /**
     * Step 3: Token Refresh - Update stored token
     */
    async updateToken(deviceId, newToken) {
        const subscription = await this.getSubscription();
        if (!subscription || subscription.deviceId !== deviceId) {
            throw new Error('Subscription not found for device');
        }
        const updatedSubscription = subscription.updateToken(newToken);
        await this.storeSubscription(updatedSubscription);
    }
    /**
     * Step 3: Periodic Sync - Mark as validated
     */
    async markAsValidated(deviceId) {
        const subscription = await this.getSubscription();
        if (!subscription || subscription.deviceId !== deviceId) {
            throw new Error('Subscription not found for device');
        }
        const updatedSubscription = subscription.markAsValidated();
        await this.storeSubscription(updatedSubscription);
    }
    /**
     * Check if subscription exists
     */
    async exists() {
        try {
            await fs_1.promises.access(this.subscriptionFile);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Remove stored subscription (for testing/cleanup)
     */
    async removeSubscription() {
        try {
            await fs_1.promises.unlink(this.subscriptionFile);
        }
        catch {
            // File doesn't exist, ignore
        }
    }
    /**
     * Get storage information
     */
    async getStorageInfo() {
        try {
            const data = await fs_1.promises.readFile(this.subscriptionFile, 'utf8');
            const storedData = JSON.parse(data);
            return {
                exists: true,
                lastStoredAt: storedData.lastStoredAt,
            };
        }
        catch {
            return {
                exists: false,
                lastStoredAt: null,
            };
        }
    }
    /**
     * Get specific subscription data field
     */
    async getSubscriptionData(field) {
        const subscription = await this.getSubscription();
        if (!subscription) {
            return null;
        }
        const data = subscription.toData();
        switch (field) {
            case 'isActivated':
                return true; // If subscription exists, it's activated
            case 'subscriptionTier':
                return data.tier;
            case 'expiresAt':
                return data.expiresAt.toISOString();
            case 'features':
                return data.features;
            case 'daysRemaining':
                return subscription.getDaysRemaining();
            case 'isInGracePeriod':
                return subscription.isInGracePeriod();
            case 'lastValidatedAt':
                return data.lastValidatedAt ? data.lastValidatedAt.toISOString() : null;
            case 'needsOnlineValidation':
                return subscription.needsValidation();
            case 'subscriptionToken':
                return data.signedToken;
            case 'deviceId':
                return data.deviceId;
            case 'gracePeriodDays':
                return data.gracePeriodDays;
            default:
                return data[field];
        }
    }
    /**
     * Set specific subscription data field
     */
    async setSubscriptionData(field, value) {
        const subscription = await this.getSubscription();
        if (!subscription) {
            throw new Error('No subscription found to update');
        }
        const data = subscription.toData();
        // Update the field
        switch (field) {
            case 'subscriptionTier':
                data.tier = value;
                break;
            case 'expiresAt':
                data.expiresAt = new Date(value);
                break;
            case 'features':
                data.features = value;
                break;
            case 'lastValidatedAt':
                data.lastValidatedAt = value ? new Date(value) : null;
                break;
            case 'subscriptionToken':
                data.signedToken = value;
                break;
            case 'isActivated':
                // For deactivation, we remove the subscription
                if (!value) {
                    await this.removeSubscription();
                    return;
                }
                break;
            case 'isInGracePeriod':
                // This is computed, can't be set directly
                break;
            case 'needsOnlineValidation':
                // This is computed, can't be set directly
                break;
            default:
                data[field] = value;
        }
        // Create updated subscription and store it
        const updatedSubscription = subscription_types_1.Subscription.fromData(data);
        await this.storeSubscription(updatedSubscription);
    }
    /**
     * Clear all subscription data
     */
    async clearSubscriptionData() {
        await this.removeSubscription();
    }
    /**
     * Helper: Encrypt token using Electron's safeStorage
     */
    encryptToken(token) {
        if (!electron_1.safeStorage.isEncryptionAvailable()) {
            throw new Error('Encryption is not available on this system');
        }
        return electron_1.safeStorage.encryptString(token);
    }
    /**
     * Helper: Decrypt token using Electron's safeStorage
     */
    decryptToken(encryptedToken) {
        if (!electron_1.safeStorage.isEncryptionAvailable()) {
            throw new Error('Encryption is not available on this system');
        }
        return electron_1.safeStorage.decryptString(encryptedToken);
    }
    /**
     * Helper: Ensure storage directory exists
     */
    async ensureStorageDir() {
        try {
            await fs_1.promises.mkdir(this.storageDir, { recursive: true });
        }
        catch (error) {
            // Directory might already exist, ignore
        }
    }
    /**
     * Check if encryption is available
     */
    isEncryptionAvailable() {
        return electron_1.safeStorage.isEncryptionAvailable();
    }
}
exports.SecureStorage = SecureStorage;
