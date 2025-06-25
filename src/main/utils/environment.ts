/**
 * Environment utility functions for the Electron main process
 * Provides secure environment detection and configuration
 */

/**
 * Check if the application is running in development mode
 * @returns {boolean} True if in development mode
 */
export const isDev = (): boolean => {
  return process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';
};

/**
 * Check if the application is running in production mode
 * @returns {boolean} True if in production mode
 */
export const isProd = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if the application is running in test mode
 * @returns {boolean} True if in test mode
 */
export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

/**
 * Get the current environment
 * @returns {string} Current environment (development, production, test)
 */
export const getEnvironment = (): string => {
  return process.env.NODE_ENV || 'development';
};

/**
 * Check if debugging is enabled
 * @returns {boolean} True if debugging is enabled
 */
export const isDebugging = (): boolean => {
  return isDev() || process.env.DEBUG === 'true';
};

/**
 * Get application version from package.json
 * @returns {string} Application version
 */
export const getAppVersion = (): string => {
  return process.env.npm_package_version || '1.0.0';
};

/**
 * Check if the application is packaged (built)
 * @returns {boolean} True if the application is packaged
 */
export const isPackaged = (): boolean => {
  return process.mainModule?.filename.indexOf('app.asar') !== -1;
}; 