/**
 * DeviceInfo Value Object
 * Following Instructions standards for device identification and fingerprinting
 */
export var Platform;
(function (Platform) {
    Platform["WINDOWS"] = "windows";
    Platform["MAC"] = "mac";
    Platform["LINUX"] = "linux";
    Platform["UNKNOWN"] = "unknown";
})(Platform || (Platform = {}));
export class DeviceInfo {
    _deviceId;
    _fingerprint;
    _registeredAt;
    constructor(_deviceId, _fingerprint, _registeredAt) {
        this._deviceId = _deviceId;
        this._fingerprint = _fingerprint;
        this._registeredAt = _registeredAt;
    }
    static create(deviceId, fingerprint) {
        if (!deviceId || deviceId.trim().length === 0) {
            throw new Error('Device ID cannot be empty');
        }
        return new DeviceInfo(deviceId, fingerprint, new Date());
    }
    static fromData(data) {
        return new DeviceInfo(data.deviceId, data.fingerprint, data.registeredAt);
    }
    get deviceId() {
        return this._deviceId;
    }
    get platform() {
        return this._fingerprint.platform;
    }
    get arch() {
        return this._fingerprint.arch;
    }
    get hostname() {
        return this._fingerprint.hostname;
    }
    get userAgent() {
        return this._fingerprint.userAgent;
    }
    get screenResolution() {
        return this._fingerprint.screenResolution;
    }
    get timezone() {
        return this._fingerprint.timezone;
    }
    get language() {
        return this._fingerprint.language;
    }
    get cpuCores() {
        return this._fingerprint.cpuCores;
    }
    get memoryGB() {
        return this._fingerprint.memoryGB;
    }
    get osVersion() {
        return this._fingerprint.osVersion;
    }
    get nodeVersion() {
        return this._fingerprint.nodeVersion;
    }
    get electronVersion() {
        return this._fingerprint.electronVersion;
    }
    get appVersion() {
        return this._fingerprint.appVersion;
    }
    get registeredAt() {
        return this._registeredAt;
    }
    get fingerprint() {
        return { ...this._fingerprint };
    }
    /**
     * Generate a unique fingerprint hash for device identification
     */
    generateFingerprintHash() {
        const fingerprintString = [
            this._fingerprint.platform,
            this._fingerprint.arch,
            this._fingerprint.hostname,
            this._fingerprint.screenResolution,
            this._fingerprint.cpuCores,
            this._fingerprint.memoryGB,
            this._fingerprint.osVersion,
        ].join('|');
        // Simple hash function for fingerprinting
        let hash = 0;
        for (let i = 0; i < fingerprintString.length; i++) {
            const char = fingerprintString.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * Check if this device fingerprint matches another
     */
    matchesFingerprint(other) {
        return this.generateFingerprintHash() === other.generateFingerprintHash();
    }
    /**
     * Get a human-readable device description
     */
    getDeviceDescription() {
        const platform = this.getPlatformDisplayName();
        const arch = this._fingerprint.arch;
        const cores = this._fingerprint.cpuCores;
        const memory = this._fingerprint.memoryGB;
        return `${platform} ${arch} (${cores} cores, ${memory}GB RAM)`;
    }
    /**
     * Get platform display name
     */
    getPlatformDisplayName() {
        switch (this._fingerprint.platform) {
            case Platform.WINDOWS:
                return 'Windows';
            case Platform.MAC:
                return 'macOS';
            case Platform.LINUX:
                return 'Linux';
            default:
                return 'Unknown';
        }
    }
    /**
     * Check if device is supported
     */
    isSupported() {
        return this._fingerprint.platform !== Platform.UNKNOWN;
    }
    /**
     * Get device age in days
     */
    getDeviceAgeDays() {
        const now = new Date();
        const diffTime = now.getTime() - this._registeredAt.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    /**
     * Convert to plain object for storage
     */
    toData() {
        return {
            deviceId: this._deviceId,
            fingerprint: { ...this._fingerprint },
            registeredAt: this._registeredAt,
        };
    }
    /**
     * Clone device info
     */
    clone() {
        return new DeviceInfo(this._deviceId, { ...this._fingerprint }, this._registeredAt);
    }
    equals(other) {
        return this._deviceId === other._deviceId && this.matchesFingerprint(other);
    }
    toString() {
        return `Device(${this._deviceId}): ${this.getDeviceDescription()}`;
    }
}
