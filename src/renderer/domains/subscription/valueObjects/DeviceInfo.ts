/**
 * DeviceInfo Value Object
 * Following Instructions standards for device identification and fingerprinting
 */

export enum Platform {
  WINDOWS = 'windows',
  MAC = 'mac',
  LINUX = 'linux',
  UNKNOWN = 'unknown',
}

export interface DeviceFingerprint {
  platform: Platform;
  arch: string;
  hostname: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  cpuCores: number;
  memoryGB: number;
  osVersion: string;
  nodeVersion: string;
  electronVersion: string;
  appVersion: string;
}

export class DeviceInfo {
  private constructor(
    private readonly _deviceId: string,
    private readonly _fingerprint: DeviceFingerprint,
    private readonly _registeredAt: Date
  ) {}

  static create(deviceId: string, fingerprint: DeviceFingerprint): DeviceInfo {
    if (!deviceId || deviceId.trim().length === 0) {
      throw new Error('Device ID cannot be empty');
    }

    return new DeviceInfo(deviceId, fingerprint, new Date());
  }

  static fromData(data: { deviceId: string; fingerprint: DeviceFingerprint; registeredAt: Date }): DeviceInfo {
    return new DeviceInfo(data.deviceId, data.fingerprint, data.registeredAt);
  }

  get deviceId(): string {
    return this._deviceId;
  }

  get platform(): Platform {
    return this._fingerprint.platform;
  }

  get arch(): string {
    return this._fingerprint.arch;
  }

  get hostname(): string {
    return this._fingerprint.hostname;
  }

  get userAgent(): string {
    return this._fingerprint.userAgent;
  }

  get screenResolution(): string {
    return this._fingerprint.screenResolution;
  }

  get timezone(): string {
    return this._fingerprint.timezone;
  }

  get language(): string {
    return this._fingerprint.language;
  }

  get cpuCores(): number {
    return this._fingerprint.cpuCores;
  }

  get memoryGB(): number {
    return this._fingerprint.memoryGB;
  }

  get osVersion(): string {
    return this._fingerprint.osVersion;
  }

  get nodeVersion(): string {
    return this._fingerprint.nodeVersion;
  }

  get electronVersion(): string {
    return this._fingerprint.electronVersion;
  }

  get appVersion(): string {
    return this._fingerprint.appVersion;
  }

  get registeredAt(): Date {
    return this._registeredAt;
  }

  get fingerprint(): DeviceFingerprint {
    return { ...this._fingerprint };
  }

  /**
   * Generate a unique fingerprint hash for device identification
   */
  generateFingerprintHash(): string {
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
  matchesFingerprint(other: DeviceInfo): boolean {
    return this.generateFingerprintHash() === other.generateFingerprintHash();
  }

  /**
   * Get a human-readable device description
   */
  getDeviceDescription(): string {
    const platform = this.getPlatformDisplayName();
    const arch = this._fingerprint.arch;
    const cores = this._fingerprint.cpuCores;
    const memory = this._fingerprint.memoryGB;

    return `${platform} ${arch} (${cores} cores, ${memory}GB RAM)`;
  }

  /**
   * Get platform display name
   */
  getPlatformDisplayName(): string {
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
  isSupported(): boolean {
    return this._fingerprint.platform !== Platform.UNKNOWN;
  }

  /**
   * Get device age in days
   */
  getDeviceAgeDays(): number {
    const now = new Date();
    const diffTime = now.getTime() - this._registeredAt.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Convert to plain object for storage
   */
  toData(): {
    deviceId: string;
    fingerprint: DeviceFingerprint;
    registeredAt: Date;
  } {
    return {
      deviceId: this._deviceId,
      fingerprint: { ...this._fingerprint },
      registeredAt: this._registeredAt,
    };
  }

  /**
   * Clone device info
   */
  clone(): DeviceInfo {
    return new DeviceInfo(this._deviceId, { ...this._fingerprint }, this._registeredAt);
  }

  equals(other: DeviceInfo): boolean {
    return this._deviceId === other._deviceId && this.matchesFingerprint(other);
  }

  toString(): string {
    return `Device(${this._deviceId}): ${this.getDeviceDescription()}`;
  }
}
