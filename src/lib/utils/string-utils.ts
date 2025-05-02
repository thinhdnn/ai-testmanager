/**
 * Utility functions for string manipulation
 */

/**
 * Converts a string to camelCase suitable for Playwright export names
 * @param str - The string to convert
 * @returns The camelCase version of the string, safe for use as export name
 */
export function toCamelCase(str: string): string {
  if (!str) return 'myFixture';

  // First, handle strings with special characters
  let result = str
    .replace(/[^\w\s]/g, ' ') // Replace special characters with spaces
    .trim() // Trim leading/trailing spaces
    .replace(/\s+/g, ' '); // Replace multiple spaces with a single space
  
  // Convert to camelCase (first part lowercase, other parts start with uppercase)
  result = result
    .split(' ')
    .map((word, index) => {
      // Skip empty parts
      if (!word) return '';
      
      // For the first word, make it all lowercase
      if (index === 0) {
        return word.toLowerCase();
      }
      
      // For other words, capitalize the first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
  
  // Ensure it starts with a letter
  if (!/^[a-z]/.test(result)) {
    result = 'my' + (result.charAt(0).toUpperCase() + result.slice(1));
  }
  
  // Remove trailing numbers
  result = result.replace(/\d+$/, '');
  
  // If resulting string is empty (edge case), provide a default
  if (!result) {
    result = 'myFixture';
  }
  
  return result;
}

/**
 * Converts a string to PascalCase
 * @param str - The string to convert
 * @returns The PascalCase version of the string
 */
export function toPascalCase(str: string): string {
  const camelCase = toCamelCase(str);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

/**
 * Converts a string to kebab-case
 * @param str - The string to convert
 * @returns The kebab-case version of the string
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Convert camelCase or PascalCase to kebab-case
    .replace(/[\s_]+/g, '-') // Convert spaces and underscores to hyphens
    .replace(/[^\w-]/g, '') // Remove special characters except hyphens
    .toLowerCase();
}

/**
 * Converts a string to snake_case
 * @param str - The string to convert
 * @returns The snake_case version of the string
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2') // Convert camelCase or PascalCase to snake_case
    .replace(/[\s-]+/g, '_') // Convert spaces and hyphens to underscores
    .replace(/[^\w_]/g, '') // Remove special characters except underscores
    .toLowerCase();
}

/**
 * Converts a string to a valid file name
 * @param str - The string to convert
 * @param extension - Optional file extension to add (without leading dot)
 * @returns A valid file name
 */
export function toValidFileName(str: string, extension?: string): string {
  // Replace invalid file name characters with underscores
  const validName = str
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // Replace invalid chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .trim();
  
  return extension ? `${validName}.${extension}` : validName;
}

/**
 * Truncates a string to a specified length and adds ellipsis if needed
 * @param str - The string to truncate
 * @param maxLength - Maximum length of the string
 * @returns Truncated string with ellipsis if needed
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
} 