/**
 * Utility functions for API calls
 */

/**
 * Creates an absolute URL for API endpoints
 * This is necessary for server components that use fetch
 */
export function getApiUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Use environment variable if available, fallback to localhost
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Create and return the full URL
  return new URL(`/api/${cleanPath}`, baseUrl).toString();
}

/**
 * Creates a project-specific API URL
 */
export function getProjectApiUrl(projectId: string, path?: string): string {
  return getApiUrl(`projects/${projectId}${path ? `/${path}` : ''}`);
} 