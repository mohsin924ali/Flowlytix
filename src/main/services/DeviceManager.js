"use strict";
/**
 * Device Manager Service
 * Manages device information and fingerprinting for subscription licensing
 * Following Instructions standards with comprehensive device identification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceManager = exports.Platform = void 0;
const electron_1 = require("electron");
const crypto_1 = require("crypto");
const os_1 = require("os");
// Shared types (avoiding cross-directory imports)
var Platform;
(function (Platform) {
    Platform["WINDOWS"] = "windows";
    Platform["MAC"] = "mac";
    Platform["LINUX"] = "linux";
    Platform["UNKNOWN"] = "unknown";
})(Platform || (exports.Platform = Platform = {}));
class DeviceManager {
    static instance = null;
    cachedDeviceInfo = null;
    constructor() { }
    static getInstance() {
        if (!DeviceManager.instance) {
            DeviceManager.instance = new DeviceManager();
        }
        return DeviceManager.instance;
    }
    /**
     * Get comprehensive device information for licensing
     */
    async getDeviceInfo() {
        if (this.cachedDeviceInfo) {
            // Update last seen and return cached info
            this.cachedDeviceInfo.lastSeenAt = new Date();
            return this.cachedDeviceInfo;
        }
        console.log('🔧 DeviceManager: Generating device information...');
        const devicePlatform = this.getPlatform();
        const fingerprint = await this.generateDeviceFingerprint();
        const deviceId = this.generateDeviceId(fingerprint);
        const deviceInfo = {
            deviceId,
            platform: devicePlatform,
            appVersion: electron_1.app.getVersion(),
            fingerprint,
            registeredAt: new Date(),
            lastSeenAt: new Date(),
        };
        this.cachedDeviceInfo = deviceInfo;
        console.log('✅ DeviceManager: Device info generated:', deviceId);
        return deviceInfo;
    }
    /**
     * Generate unique device fingerprint
     */
    async generateDeviceFingerprint() {
        const hardwareId = this.getHardwareFingerprint();
        const osFingerprint = this.getOSFingerprint();
        const networkFingerprint = this.getNetworkFingerprint();
        return {
            hardwareId,
            osFingerprint,
            networkFingerprint,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Generate stable device ID from fingerprint
     */
    generateDeviceId(fingerprint) {
        const combined = `${fingerprint.hardwareId}-${fingerprint.osFingerprint}-${fingerprint.networkFingerprint}`;
        const hash = (0, crypto_1.createHash)('sha256').update(combined).digest('hex');
        // Format as UUID-like string for readability
        const deviceId = [
            hash.substring(0, 8),
            hash.substring(8, 12),
            hash.substring(12, 16),
            hash.substring(16, 20),
            hash.substring(20, 32),
        ].join('-');
        return `device-${deviceId}`;
    }
    /**
     * Get hardware-based fingerprint
     */
    getHardwareFingerprint() {
        try {
            // Combine multiple hardware identifiers
            const identifiers = [
                (0, os_1.platform)(),
                (0, os_1.arch)(),
                process.env.PROCESSOR_IDENTIFIER || '',
                process.env.PROCESSOR_ARCHITECTURE || '',
                electron_1.app.getPath('exe'),
            ];
            const combined = identifiers.join('|');
            return (0, crypto_1.createHash)('md5').update(combined).digest('hex');
        }
        catch (error) {
            console.warn('⚠️ DeviceManager: Error getting hardware fingerprint:', error);
            return (0, crypto_1.createHash)('md5').update('unknown-hardware').digest('hex');
        }
    }
    /**
     * Get OS-based fingerprint
     */
    getOSFingerprint() {
        try {
            const osInfo = [(0, os_1.platform)(), process.platform, process.arch, (0, os_1.hostname)(), (0, os_1.userInfo)().username, electron_1.app.getVersion()];
            const combined = osInfo.join('|');
            return (0, crypto_1.createHash)('md5').update(combined).digest('hex');
        }
        catch (error) {
            console.warn('⚠️ DeviceManager: Error getting OS fingerprint:', error);
            return (0, crypto_1.createHash)('md5').update('unknown-os').digest('hex');
        }
    }
    /**
     * Get network-based fingerprint
     */
    getNetworkFingerprint() {
        try {
            const interfaces = (0, os_1.networkInterfaces)();
            const macAddresses = [];
            // Extract MAC addresses from network interfaces
            Object.values(interfaces).forEach((iface) => {
                if (iface) {
                    iface.forEach((details) => {
                        if (details.mac && details.mac !== '00:00:00:00:00:00') {
                            macAddresses.push(details.mac);
                        }
                    });
                }
            });
            // Sort for consistency
            macAddresses.sort();
            const combined = macAddresses.join('|') || 'no-network-interfaces';
            return (0, crypto_1.createHash)('md5').update(combined).digest('hex');
        }
        catch (error) {
            console.warn('⚠️ DeviceManager: Error getting network fingerprint:', error);
            return (0, crypto_1.createHash)('md5').update('unknown-network').digest('hex');
        }
    }
    /**
     * Determine device platform
     */
    getPlatform() {
        switch (process.platform) {
            case 'darwin':
                return Platform.MAC;
            case 'win32':
                return Platform.WINDOWS;
            case 'linux':
                return Platform.LINUX;
            default:
                return Platform.UNKNOWN;
        }
    }
    /**
     * Validate device fingerprint matches
     */
    async validateDeviceFingerprint(storedFingerprint) {
        try {
            const currentFingerprint = await this.generateDeviceFingerprint();
            // Compare fingerprints (allowing for some variance in network)
            const hardwareMatch = currentFingerprint.hardwareId === storedFingerprint.hardwareId;
            const osMatch = currentFingerprint.osFingerprint === storedFingerprint.osFingerprint;
            // Network can change, so we're more lenient here
            const networkSimilarity = this.calculateFingerprintSimilarity(currentFingerprint.networkFingerprint, storedFingerprint.networkFingerprint);
            return hardwareMatch && osMatch && networkSimilarity > 0.7;
        }
        catch (error) {
            console.error('❌ DeviceManager: Fingerprint validation error:', error);
            return false;
        }
    }
    /**
     * Calculate similarity between two fingerprints
     */
    calculateFingerprintSimilarity(current, stored) {
        if (current === stored)
            return 1.0;
        // Simple character-based similarity
        const maxLength = Math.max(current.length, stored.length);
        let matches = 0;
        for (let i = 0; i < maxLength; i++) {
            if (current[i] === stored[i]) {
                matches++;
            }
        }
        return matches / maxLength;
    }
    /**
     * Clear cached device info (for testing)
     */
    clearCache() {
        this.cachedDeviceInfo = null;
    }
    /**
     * Get device description for display
     */
    async getDeviceDescription() {
        const deviceInfo = await this.getDeviceInfo();
        const platformName = deviceInfo.platform.charAt(0).toUpperCase() + deviceInfo.platform.slice(1);
        return `${platformName} - ${deviceInfo.deviceId.substring(0, 16)}...`;
    }
}
exports.DeviceManager = DeviceManager;
