/**
 * Asset Path Utilities
 * Handles correct asset path resolution for Electron apps in both dev and production
 */

/**
 * Get the correct asset path for the current environment
 * In Electron, we need to handle paths differently in dev vs production
 */
export const getAssetPath = (assetPath: string): string => {
  // Remove leading slash if present
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;

  const protocol = window.location.protocol;
  const href = window.location.href;

  let resolvedPath: string;

  // Check different scenarios
  if (protocol === 'http:' || protocol === 'https:') {
    // Web browser development or production
    resolvedPath = `/${cleanPath}`;
  } else if (protocol === 'file:') {
    // Electron production build (file:// protocol)
    resolvedPath = `./${cleanPath}`;
  } else {
    // Fallback - use relative path
    resolvedPath = `./${cleanPath}`;
  }

  console.log(`🎨 Asset path resolution:`);
  console.log(`  Input: ${assetPath}`);
  console.log(`  Protocol: ${protocol}`);
  console.log(`  Href: ${href}`);
  console.log(`  Resolved: ${resolvedPath}`);

  return resolvedPath;
};

/**
 * Get the logo path
 */
export const getLogoPath = (): string => {
  return getAssetPath('logo-main.svg');
};

/**
 * Common asset paths
 */
export const ASSET_PATHS = {
  LOGO_MAIN: getLogoPath(),
  LOGO_SECONDARY: getAssetPath('logo.svg'),
} as const;
