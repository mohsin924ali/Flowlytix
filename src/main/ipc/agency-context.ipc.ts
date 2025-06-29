/**
 * Agency Context IPC Handlers
 *
 * IPC handlers for managing agency context switching and multi-tenant operations.
 * Allows super admins to select which agency database to work with.
 *
 * Features:
 * - Agency context setting
 * - Context validation
 * - Context clearing
 * - Context status checking
 * - Multi-tenant database switching
 *
 * @domain Agency Context Management
 * @architecture IPC Layer
 * @version 1.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import {
  getAgencyContextManager,
  setCurrentAgencyContext,
  getCurrentAgencyId,
} from '../../infrastructure/database/agency-context';

/**
 * Agency context request schemas
 */
const SetAgencyContextRequestSchema = z.object({
  agencyId: z.string().min(1, 'Agency ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  agencyName: z.string().optional(),
});

const GetAgencyContextRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * Register agency context IPC handlers
 */
export function registerAgencyContextIpcHandlers(): void {
  // Set agency context
  ipcMain.handle('agency-context:set', async (event: IpcMainInvokeEvent, request: unknown) => {
    try {
      console.log('🔄 Agency Context: Set context request received');

      // Validate request
      const validatedRequest = SetAgencyContextRequestSchema.parse(request);

      // Set agency context
      const success = await setCurrentAgencyContext(
        validatedRequest.agencyId,
        validatedRequest.userId,
        validatedRequest.agencyName
      );

      if (success) {
        console.log(`✅ Agency Context: Successfully set to ${validatedRequest.agencyId}`);
        return {
          success: true,
          message: 'Agency context set successfully',
          data: {
            agencyId: validatedRequest.agencyId,
            agencyName: validatedRequest.agencyName,
          },
          timestamp: Date.now(),
        };
      } else {
        console.error('❌ Agency Context: Failed to set context');
        return {
          success: false,
          error: 'Failed to set agency context',
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.error('❌ Agency Context: Set context error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  });

  // Get current agency context
  ipcMain.handle('agency-context:get', async (event: IpcMainInvokeEvent, request: unknown) => {
    try {
      console.log('🔍 Agency Context: Get context request received');

      // Validate request
      const validatedRequest = GetAgencyContextRequestSchema.parse(request);

      const contextManager = getAgencyContextManager();
      const currentContext = contextManager.getCurrentContext();

      if (currentContext) {
        console.log(`✅ Agency Context: Current context found for ${currentContext.agencyId}`);
        return {
          success: true,
          data: {
            agencyId: currentContext.agencyId,
            agencyName: currentContext.agencyName,
            setAt: currentContext.setAt,
            setBy: currentContext.setBy,
            isSet: true,
          },
          timestamp: Date.now(),
        };
      } else {
        console.log('ℹ️ Agency Context: No current context set');
        return {
          success: true,
          data: {
            isSet: false,
          },
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.error('❌ Agency Context: Get context error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  });

  // Clear agency context
  ipcMain.handle('agency-context:clear', async (event: IpcMainInvokeEvent) => {
    try {
      console.log('🧹 Agency Context: Clear context request received');

      const contextManager = getAgencyContextManager();
      contextManager.clearContext();

      console.log('✅ Agency Context: Context cleared successfully');
      return {
        success: true,
        message: 'Agency context cleared successfully',
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('❌ Agency Context: Clear context error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  });

  // Validate current agency context
  ipcMain.handle('agency-context:validate', async (event: IpcMainInvokeEvent) => {
    try {
      console.log('✔️ Agency Context: Validate context request received');

      const contextManager = getAgencyContextManager();
      const isValid = await contextManager.validateCurrentContext();

      if (isValid) {
        const currentContext = contextManager.getCurrentContext();
        console.log('✅ Agency Context: Context is valid');
        return {
          success: true,
          data: {
            isValid: true,
            agencyId: currentContext?.agencyId,
            agencyName: currentContext?.agencyName,
          },
          timestamp: Date.now(),
        };
      } else {
        console.log('❌ Agency Context: Context is invalid or not set');
        return {
          success: true,
          data: {
            isValid: false,
          },
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.error('❌ Agency Context: Validate context error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  });

  // Get context info (for debugging)
  ipcMain.handle('agency-context:info', async (event: IpcMainInvokeEvent) => {
    try {
      console.log('ℹ️ Agency Context: Info request received');

      const contextManager = getAgencyContextManager();
      const info = contextManager.getContextInfo();

      console.log('✅ Agency Context: Info retrieved');
      return {
        success: true,
        data: {
          info,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('❌ Agency Context: Info error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  });

  console.log('✅ Agency Context IPC handlers registered');
}

/**
 * Unregister agency context IPC handlers
 */
export function unregisterAgencyContextIpcHandlers(): void {
  ipcMain.removeAllListeners('agency-context:set');
  ipcMain.removeAllListeners('agency-context:get');
  ipcMain.removeAllListeners('agency-context:clear');
  ipcMain.removeAllListeners('agency-context:validate');
  ipcMain.removeAllListeners('agency-context:info');

  console.log('✅ Agency Context IPC handlers unregistered');
}
