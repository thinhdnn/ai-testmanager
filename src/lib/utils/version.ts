/**
 * Increments a version number in a consistent way
 * 
 * @param currentVersion Current version string (e.g., "1.0", "1.1", "1.0.1")
 * @returns New incremented version string
 */
export function incrementVersion(currentVersion: string): string {
  try {
    const versionParts = currentVersion.split('.');
    
    // Handle various version formats
    if (versionParts.length === 3) {
      // Format like 1.1.0 - increment the last part
      const major = parseInt(versionParts[0]) || 0;
      const minor = parseInt(versionParts[1]) || 0;
      const patch = parseInt(versionParts[2]) || 0;
      return `${major}.${minor}.${patch + 1}`;
    } else if (versionParts.length === 2) {
      // Format like 1.1 - add .1 at the end
      const major = parseInt(versionParts[0]) || 0;
      const minor = parseInt(versionParts[1]) || 0;
      return `${major}.${minor}.1`;
    } else {
      // Single number or unexpected format - use safe default
      const versionNum = parseFloat(currentVersion) || 1.0;
      return `${versionNum}.0.1`;
    }
  } catch (error) {
    console.error('Error incrementing version:', error);
    // Fallback to simple version increment
    return `${currentVersion}.1`;
  }
}

/**
 * Increments a major version number (e.g., 1.0 -> 2.0)
 */
export function incrementMajorVersion(currentVersion: string): string {
  try {
    const versionParts = currentVersion.split('.');
    const major = parseInt(versionParts[0]) || 0;
    return `${major + 1}.0`;
  } catch (error) {
    console.error('Error incrementing major version:', error);
    return '1.0';
  }
}

/**
 * Increments a minor version number (e.g., 1.0 -> 1.1)
 */
export function incrementMinorVersion(currentVersion: string): string {
  try {
    const versionParts = currentVersion.split('.');
    const major = parseInt(versionParts[0]) || 0;
    const minor = parseInt(versionParts[1]) || 0;
    return `${major}.${minor + 1}`;
  } catch (error) {
    console.error('Error incrementing minor version:', error);
    return '1.1';
  }
} 