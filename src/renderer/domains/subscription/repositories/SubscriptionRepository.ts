/**
 * Subscription Repository Interface
 * Following Instructions standards with repository pattern and clean architecture
 */

import { Subscription } from '../entities/Subscription';

export interface SubscriptionRepository {
  /**
   * Step 1: First Install/Activation - Save initial subscription
   */
  save(subscription: Subscription): Promise<void>;

  /**
   * Step 2: Normal Daily Use - Find subscription by device ID
   */
  findByDeviceId(deviceId: string): Promise<Subscription | null>;

  /**
   * Step 3: Periodic Sync - Find subscription by tenant ID
   */
  findByTenantId(tenantId: string): Promise<Subscription | null>;

  /**
   * Step 3: Periodic Sync - Update subscription data
   */
  update(subscription: Subscription): Promise<void>;

  /**
   * Step 3: Token Refresh - Update signed token
   */
  updateToken(deviceId: string, signedToken: string): Promise<void>;

  /**
   * Step 3: Periodic Sync - Mark as validated
   */
  markAsValidated(deviceId: string): Promise<void>;

  /**
   * Check if device is already registered
   */
  exists(deviceId: string): Promise<boolean>;

  /**
   * Remove subscription (for testing/cleanup)
   */
  remove(deviceId: string): Promise<void>;

  /**
   * Get all subscriptions (for admin purposes)
   */
  findAll(): Promise<Subscription[]>;
}
