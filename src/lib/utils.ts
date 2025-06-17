import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from 'uuid';

/**
 * Combines and merges class names using clsx and tailwind-merge
 * Useful for conditional classes and overriding Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to a string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Format a duration in milliseconds to a human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) {
    return str
  }
  
  return str.slice(0, length) + "..."
}

/**
 * Parse tags from a comma-separated string
 */
export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) {
    return []
  }
  
  return tags.split(",").map(tag => tag.trim()).filter(Boolean)
} 

/**
 * Sanitizes a string to create a valid folder name
 * Removes special characters and replaces spaces with hyphens
 */
export function sanitizeFolderName(name: string): string {
  // Replace spaces and special characters with hyphens, remove invalid chars
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
} 

export function generateTestResultFileName(): string {
  return `test-result-${uuidv4()}`;
} 