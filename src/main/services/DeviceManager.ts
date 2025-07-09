/**
 * Device Manager Service
 * Manages device information and fingerprinting for subscription licensing
 * Following Instructions standards with comprehensive device identification
 */

import { app } from 'electron';
import { createHash } from 'crypto';
import { networkInterfaces, platform, arch, hostname, userInfo } from 'os';

// Shared types (avoiding cross-directory imports)
export enum Platform {
  WINDOWS = 'windows',
  MAC = 'mac',
  LINUX = 'linux',
  UNKNOWN = 'unknown',
}

export interface DeviceFingerprint {
  hardwareId: string;
  osFingerprint: string;
  networkFingerprint: string;
  timestamp: string;
}

export interface DeviceInfo {
  deviceId: string;
  platform: Platform;
  appVersion: string;
  fingerprint: DeviceFingerprint;
  registeredAt: Date;
  lastSeenAt: Date;
}

export class DeviceManager {
  private static instance: DeviceManager | null = null;
  private cachedDeviceInfo: DeviceInfo | null = null;

  private constructor() {}

  static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  /**
   * Get comprehensive device information for licensing
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    if (this.cachedDeviceInfo) {
      // Update last seen and return cached info
      this.cachedDeviceInfo.lastSeenAt = new Date();
      return this.cachedDeviceInfo;
    }

    console.log('🔧 DeviceManager: Generating device information...');

    const devicePlatform = this.getPlatform();
    const fingerprint = await this.generateDeviceFingerprint();
    const deviceId = this.generateDeviceId(fingerprint);

    const deviceInfo: DeviceInfo = {
      deviceId,
      platform: devicePlatform,
      appVersion: app.getVersion(),
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
  private async generateDeviceFingerprint(): Promise<DeviceFingerprint> {
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
  private generateDeviceId(fingerprint: DeviceFingerprint): string {
    const combined = `${fingerprint.hardwareId}-${fingerprint.osFingerprint}-${fingerprint.networkFingerprint}`;
    const hash = createHash('sha256').update(combined).digest('hex');

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
  private getHardwareFingerprint(): string {
    try {
      // Combine multiple hardware identifiers
      const identifiers = [
        platform(),
        arch(),
        process.env.PROCESSOR_IDENTIFIER || '',
        process.env.PROCESSOR_ARCHITECTURE || '',
        app.getPath('exe'),
      ];

      const combined = identifiers.join('|');
      return createHash('md5').update(combined).digest('hex');
    } catch (error) {
      console.warn('⚠️ DeviceManager: Error getting hardware fingerprint:', error);
      return createHash('md5').update('unknown-hardware').digest('hex');
    }
  }

  /**
   * Get OS-based fingerprint
   */
  private getOSFingerprint(): string {
    try {
      const osInfo = [platform(), process.platform, process.arch, hostname(), userInfo().username, app.getVersion()];

      const combined = osInfo.join('|');
      return createHash('md5').update(combined).digest('hex');
    } catch (error) {
      console.warn('⚠️ DeviceManager: Error getting OS fingerprint:', error);
      return createHash('md5').update('unknown-os').digest('hex');
    }
  }

  /**
   * Get network-based fingerprint
   */
  private getNetworkFingerprint(): string {
    try {
      const interfaces = networkInterfaces();
      const macAddresses: string[] = [];

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
      return createHash('md5').update(combined).digest('hex');
    } catch (error) {
      console.warn('⚠️ DeviceManager: Error getting network fingerprint:', error);
      return createHash('md5').update('unknown-network').digest('hex');
    }
  }

  /**
   * Determine device platform
   */
  private getPlatform(): Platform {
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
  async validateDeviceFingerprint(storedFingerprint: DeviceFingerprint): Promise<boolean> {
    try {
      const currentFingerprint = await this.generateDeviceFingerprint();

      // Compare fingerprints (allowing for some variance in network)
      const hardwareMatch = currentFingerprint.hardwareId === storedFingerprint.hardwareId;
      const osMatch = currentFingerprint.osFingerprint === storedFingerprint.osFingerprint;

      // Network can change, so we're more lenient here
      const networkSimilarity = this.calculateFingerprintSimilarity(
        currentFingerprint.networkFingerprint,
        storedFingerprint.networkFingerprint
      );

      return hardwareMatch && osMatch && networkSimilarity > 0.7;
    } catch (error) {
      console.error('❌ DeviceManager: Fingerprint validation error:', error);
      return false;
    }
  }

  /**
   * Calculate similarity between two fingerprints
   */
  private calculateFingerprintSimilarity(current: string, stored: string): number {
    if (current === stored) return 1.0;

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
  clearCache(): void {
    this.cachedDeviceInfo = null;
  }

  /**
   * Get device description for display
   */
  async getDeviceDescription(): Promise<string> {
    const deviceInfo = await this.getDeviceInfo();
    const platformName = deviceInfo.platform.charAt(0).toUpperCase() + deviceInfo.platform.slice(1);
    return `${platformName} - ${deviceInfo.deviceId.substring(0, 16)}...`;
  }
}
