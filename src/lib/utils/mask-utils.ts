/**
 * Masks an API key showing only the last few characters
 * @param apiKey - The API key to mask
 * @param visibleChars - Number of characters to show at the end (default: 4)
 * @returns Masked API key in format ******xxxx
 */
export function maskApiKey(apiKey: string, visibleChars: number = 4): string {
  if (!apiKey) return "";
  
  if (apiKey.length <= visibleChars) {
    return "*".repeat(apiKey.length);
  }
  
  const lastChars = apiKey.slice(-visibleChars);
  return "*".repeat(6) + lastChars;
}

/**
 * Checks if a value appears to be a masked API key
 * @param value - The value to check
 * @returns true if the value looks like a masked API key
 */
export function isMaskedApiKey(value: string): boolean {
  if (!value) return false;
  
  // Check if it matches the pattern ******xxxx (at least 6 asterisks followed by some chars)
  return /^\*{6,}.+/.test(value);
}

/**
 * Determines if an API key value should be updated
 * Returns false if the value is masked (unchanged), true if it's a new key
 * @param value - The API key value from the form
 * @returns true if the key should be updated, false if it's masked/unchanged
 */
export function shouldUpdateApiKey(value: string): boolean {
  return !isMaskedApiKey(value);
} 