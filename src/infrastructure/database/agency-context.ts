/**
 * Agency Context Manager
 *
 * Manages the current agency context for multi-tenant operations.
 * Allows super admins to switch between different agency databases
 * and maintains context for subsequent operations.
 *
 * Features:
 * - Agency context switching
 * - Context persistence per session
 * - Super admin agency selection
 * - Context validation
 * - Default agency handling
 *
 * @architecture Infrastructure Layer
 * @version 1.0.0
 */

import { getConnectionPool } from './connection-pool';
import Database from 'better-sqlite3';

/**
 * Agency context errors
 */
export class AgencyContextError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(`Agency context error: ${message}`);
    this.name = 'AgencyContextError';
  }
}

/**
 * Agency context configuration
 */
interface AgencyContext {
  agencyId: string;
  agencyName?: string;
  databasePath?: string;
  isDefault?: boolean;
  setAt: number;
  setBy: string; // User ID who set this context
}

/**
 * Agency selection criteria
 */
interface AgencySelectionCriteria {
  userId: string;
  userRole: string;
  preferredAgencyId?: string;
  defaultToFirst?: boolean;
}

/**
 * Agency database record
 */
interface AgencyRecord {
  id: string;
  name: string;
}

/**
 * Agency Context Manager
 *
 * Manages which agency database should be used for operations
 * based on user context and permissions.
 */
export class AgencyContextManager {
  private static instance: AgencyContextManager | null = null;
  private currentContext: AgencyContext | null = null;
  private contextHistory: AgencyContext[] = [];
  private maxHistorySize: number = 10;
  private initialized: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AgencyContextManager {
    if (!AgencyContextManager.instance) {
      AgencyContextManager.instance = new AgencyContextManager();
    }
    return AgencyContextManager.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    if (AgencyContextManager.instance) {
      AgencyContextManager.instance.reset();
      AgencyContextManager.instance = null;
    }
  }

  /**
   * Initialize the context manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🔧 AgencyContext: Initializing context manager...');
      await this.initializeDefaultContext();
      this.initialized = true;
      console.log('✅ AgencyContext: Context manager initialized');
    } catch (error) {
      throw new AgencyContextError('Failed to initialize context manager', error as Error);
    }
  }

  /**
   * Set agency context for subsequent operations
   */
  public async setAgencyContext(agencyId: string, userId: string, agencyName?: string): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`🔄 AgencyContext: Setting context to agency: ${agencyId} for user: ${userId}`);

      // Validate agency exists and is accessible
      const pool = getConnectionPool();
      const isValid = await pool.testConnection(agencyId);

      if (!isValid) {
        throw new AgencyContextError(`Invalid agency ID or inaccessible database: ${agencyId}`);
      }

      // Create new context
      const newContext: AgencyContext = {
        agencyId,
        setAt: Date.now(),
        setBy: userId,
        isDefault: false,
        ...(agencyName && { agencyName }),
      };

      // Save previous context to history
      if (this.currentContext) {
        this.addToHistory(this.currentContext);
      }

      // Set new context
      this.currentContext = newContext;

      console.log(`✅ AgencyContext: Successfully set context to agency: ${agencyId}`);
      return true;
    } catch (error) {
      if (error instanceof AgencyContextError) {
        throw error;
      }
      throw new AgencyContextError(`Failed to set agency context: ${agencyId}`, error as Error);
    }
  }

  /**
   * Get current agency context
   */
  public getCurrentContext(): AgencyContext | null {
    if (!this.initialized) {
      throw new AgencyContextError('Context manager not initialized');
    }
    return this.currentContext;
  }

  /**
   * Get current agency ID
   */
  public getCurrentAgencyId(): string | null {
    if (!this.initialized) {
      throw new AgencyContextError('Context manager not initialized');
    }
    return this.currentContext?.agencyId || null;
  }

  /**
   * Get database for current agency context
   */
  public async getCurrentDatabase(): Promise<Database.Database | null> {
    if (!this.initialized) {
      throw new AgencyContextError('Context manager not initialized');
    }

    if (!this.currentContext) {
      console.warn('⚠️ AgencyContext: No agency context set');
      return null;
    }

    try {
      const pool = getConnectionPool();
      const database = await pool.getConnection(this.currentContext.agencyId);
      return database;
    } catch (error) {
      throw new AgencyContextError('Failed to get database for current context', error as Error);
    }
  }

  /**
   * Auto-select agency context based on user and criteria
   */
  public async autoSelectAgencyContext(criteria: AgencySelectionCriteria): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`🔍 AgencyContext: Auto-selecting agency for user: ${criteria.userId}`);

      // For super_admin, try to use preferred agency or first available
      if (criteria.userRole === 'super_admin') {
        return await this.selectAgencyForSuperAdmin(criteria);
      }

      // For regular users, they should have an agencyId in their profile
      // This would need to be implemented based on your user management system
      throw new AgencyContextError('Regular user agency selection not implemented yet');
    } catch (error) {
      if (error instanceof AgencyContextError) {
        throw error;
      }
      throw new AgencyContextError('Failed to auto-select agency', error as Error);
    }
  }

  /**
   * Select agency for super admin users
   */
  private async selectAgencyForSuperAdmin(criteria: AgencySelectionCriteria): Promise<boolean> {
    try {
      // If preferred agency is specified, try that first
      if (criteria.preferredAgencyId) {
        const success = await this.setAgencyContext(criteria.preferredAgencyId, criteria.userId, 'Preferred Agency');
        if (success) {
          return true;
        }
      }

      // If defaultToFirst is true, get first available agency
      if (criteria.defaultToFirst) {
        const firstAgency = await this.getFirstAvailableAgency();
        if (firstAgency) {
          return await this.setAgencyContext(firstAgency.id, criteria.userId, firstAgency.name);
        }
      }

      throw new AgencyContextError('Could not auto-select agency for super admin');
    } catch (error) {
      if (error instanceof AgencyContextError) {
        throw error;
      }
      throw new AgencyContextError('Error selecting agency for super admin', error as Error);
    }
  }

  /**
   * Get first available agency (for super admin default selection)
   */
  private async getFirstAvailableAgency(): Promise<{ id: string; name: string } | null> {
    try {
      // This would typically query your main database for agencies
      // For now, we'll use a simple approach

      // You could implement this by:
      // 1. Querying the main database for agencies
      // 2. Testing connectivity to each agency database
      // 3. Returning the first accessible one

      console.log('🔍 AgencyContext: Getting first available agency...');

      // Placeholder implementation - you'd replace this with actual agency lookup
      const sampleAgencyId = 'agency-1751183402704-sxyszvgeg'; // From your logs
      const pool = getConnectionPool();
      const isValid = await pool.testConnection(sampleAgencyId);

      if (isValid) {
        return {
          id: sampleAgencyId,
          name: 'MohsinAgency', // From your logs
        };
      }

      return null;
    } catch (error) {
      throw new AgencyContextError('Error getting first available agency', error as Error);
    }
  }

  /**
   * Clear current agency context
   */
  public clearContext(): void {
    if (!this.initialized) {
      throw new AgencyContextError('Context manager not initialized');
    }

    if (this.currentContext) {
      console.log(`🧹 AgencyContext: Clearing context for agency: ${this.currentContext.agencyId}`);
      this.addToHistory(this.currentContext);
      this.currentContext = null;
    }
  }

  /**
   * Get context history
   */
  public getContextHistory(): AgencyContext[] {
    if (!this.initialized) {
      throw new AgencyContextError('Context manager not initialized');
    }
    return [...this.contextHistory];
  }

  /**
   * Switch back to previous context
   */
  public switchToPreviousContext(): boolean {
    if (!this.initialized) {
      throw new AgencyContextError('Context manager not initialized');
    }

    if (this.contextHistory.length === 0) {
      throw new AgencyContextError('No previous context available');
    }

    const previousContext = this.contextHistory.pop()!;

    // Save current context if exists
    if (this.currentContext) {
      // Don't add to history to avoid infinite loop
    }

    this.currentContext = previousContext;
    console.log(`🔄 AgencyContext: Switched back to previous context: ${previousContext.agencyId}`);
    return true;
  }

  /**
   * Add context to history
   */
  private addToHistory(context: AgencyContext): void {
    this.contextHistory.push({ ...context });

    // Limit history size
    if (this.contextHistory.length > this.maxHistorySize) {
      this.contextHistory.shift();
    }
  }

  /**
   * Validate current context
   */
  public async validateCurrentContext(): Promise<boolean> {
    try {
      if (!this.initialized) {
        throw new AgencyContextError('Context manager not initialized');
      }

      if (!this.currentContext) {
        return false;
      }

      // Get connection pool instance
      const pool = getConnectionPool();

      // Try to get a connection for the current agency
      const connection = await pool.getConnection(this.currentContext.agencyId);

      // Test the connection with a simple query
      connection.prepare('SELECT 1').get();

      return true;
    } catch (error) {
      console.error('❌ AgencyContext: Context validation failed:', error);
      return false;
    }
  }

  /**
   * Initialize default context
   */
  private async initializeDefaultContext(): Promise<void> {
    try {
      console.log('🔧 AgencyContext: Initializing default context...');

      // Check if we have a main database connection
      const pool = getConnectionPool();
      const mainDb = await pool.getConnection('main', { memory: false });

      // Check if we have any agencies
      const agencies = mainDb.prepare('SELECT id, name FROM agencies LIMIT 1').all() as AgencyRecord[];
      const defaultAgency = agencies[0];

      if (defaultAgency?.id && defaultAgency?.name) {
        await this.setAgencyContext(defaultAgency.id, 'SYSTEM', defaultAgency.name);
        console.log(`✅ AgencyContext: Default context set to agency: ${defaultAgency.name}`);
      } else {
        console.log('ℹ️ AgencyContext: No agencies found for default context');
      }
    } catch (error) {
      console.warn('⚠️ AgencyContext: Could not initialize default context:', error);
      // Don't throw here - allow initialization without default context
    }
  }

  /**
   * Get context info (for debugging)
   */
  public getContextInfo(): Record<string, unknown> {
    return {
      initialized: this.initialized,
      currentContext: this.currentContext,
      historySize: this.contextHistory.length,
      maxHistorySize: this.maxHistorySize,
      timestamp: Date.now(),
    };
  }

  /**
   * Reset context manager (for testing or cleanup)
   */
  public reset(): void {
    this.currentContext = null;
    this.contextHistory = [];
    this.initialized = false;
    console.log('🔄 AgencyContext: Context manager reset');
  }
}

/**
 * Get the agency context manager instance
 */
export const getAgencyContextManager = (): AgencyContextManager => {
  return AgencyContextManager.getInstance();
};

/**
 * Helper function to get current agency database
 */
export const getCurrentAgencyDatabase = async (): Promise<Database.Database | null> => {
  const contextManager = getAgencyContextManager();
  return contextManager.getCurrentDatabase();
};

/**
 * Helper function to set agency context
 */
export const setCurrentAgencyContext = async (
  agencyId: string,
  userId: string,
  agencyName?: string
): Promise<boolean> => {
  const contextManager = getAgencyContextManager();
  return contextManager.setAgencyContext(agencyId, userId, agencyName);
};

/**
 * Helper function to get current agency ID
 */
export const getCurrentAgencyId = (): string | null => {
  const contextManager = getAgencyContextManager();
  return contextManager.getCurrentAgencyId();
};
