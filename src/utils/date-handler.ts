// ABOUTME: Date handling utilities for converting between ISO 8601 and AppleScript dates
// ABOUTME: Handles timezone conversions and date validation for Things3 integration

/**
 * Convert ISO 8601 date string to AppleScript date format
 * @param isoDate ISO 8601 date string
 * @returns AppleScript-compatible date string
 */
export function isoToAppleScriptDate(isoDate: string): string {
  const date = new Date(isoDate);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  
  // AppleScript expects numeric format like "5/29/2025"
  const month = date.getMonth() + 1; // getMonth() is 0-based
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month}/${day}/${year}`;
}

/**
 * Convert AppleScript date string to ISO 8601 format
 * @param appleScriptDate AppleScript date string
 * @returns ISO 8601 date string
 */
export function appleScriptDateToIso(appleScriptDate: string): string {
  // Handle "missing value" or empty dates
  if (!appleScriptDate || appleScriptDate === 'missing value') {
    return '';
  }
  
  // Parse AppleScript date format "January 1, 2024 at 12:00:00 PM"
  // Replace " at " with ", " for standard parsing
  const normalizedDate = appleScriptDate.replace(' at ', ', ');
  
  const date = new Date(normalizedDate);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid AppleScript date: ${appleScriptDate}`);
  }
  
  return date.toISOString();
}

/**
 * Validate an ISO 8601 date string
 * @param isoDate ISO 8601 date string
 * @returns True if valid
 */
export function isValidIsoDate(isoDate: string): boolean {
  if (!isoDate) return false;
  
  const date = new Date(isoDate);
  return !isNaN(date.getTime());
}

/**
 * Get current date in ISO 8601 format
 * @returns Current date as ISO string
 */
export function getCurrentIsoDate(): string {
  return new Date().toISOString();
}

/**
 * Add days to a date
 * @param isoDate Base date in ISO 8601 format
 * @param days Number of days to add (can be negative)
 * @returns New date in ISO 8601 format
 */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/**
 * Check if one date is before another
 * @param date1 First date in ISO 8601 format
 * @param date2 Second date in ISO 8601 format
 * @returns True if date1 is before date2
 */
export function isBefore(date1: string, date2: string): boolean {
  return new Date(date1) < new Date(date2);
}

/**
 * Check if one date is after another
 * @param date1 First date in ISO 8601 format
 * @param date2 Second date in ISO 8601 format
 * @returns True if date1 is after date2
 */
export function isAfter(date1: string, date2: string): boolean {
  return new Date(date1) > new Date(date2);
}

/**
 * Get the start of today in ISO 8601 format
 * @returns Today at midnight in ISO format
 */
export function getStartOfToday(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

/**
 * Get the end of today in ISO 8601 format
 * @returns Today at 23:59:59.999 in ISO format
 */
export function getEndOfToday(): string {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}

/**
 * Parse relative date strings (e.g., "tomorrow", "next week")
 * @param relativeDate Relative date string
 * @returns ISO 8601 date string
 */
export function parseRelativeDate(relativeDate: string): string {
  const now = new Date();
  const lowercase = relativeDate.toLowerCase().trim();
  
  switch (lowercase) {
    case 'today':
      return now.toISOString();
      
    case 'tomorrow':
      return addDays(now.toISOString(), 1);
      
    case 'yesterday':
      return addDays(now.toISOString(), -1);
      
    case 'next week':
      return addDays(now.toISOString(), 7);
      
    case 'next month':
      now.setMonth(now.getMonth() + 1);
      return now.toISOString();
      
    default:
      // Try to parse as a regular date
      const parsed = new Date(relativeDate);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
      throw new Error(`Cannot parse relative date: ${relativeDate}`);
  }
}