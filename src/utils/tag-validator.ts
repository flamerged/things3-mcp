// ABOUTME: Tag validation and cleaning utilities for Things3 integration
// ABOUTME: Handles tag name validation, character cleaning, and hierarchy parsing

/**
 * Characters that are not allowed in Things3 tag names
 */
const INVALID_TAG_CHARS = /[,;]/g;

/**
 * Maximum length for a tag name in Things3
 */
const MAX_TAG_LENGTH = 255;

/**
 * Validate a tag name for Things3
 * @param tagName The tag name to validate
 * @returns True if valid, false otherwise
 */
export function isValidTagName(tagName: string): boolean {
  if (!tagName || typeof tagName !== 'string') {
    return false;
  }
  
  const trimmed = tagName.trim();
  
  // Check for empty or too long names
  if (trimmed.length === 0 || trimmed.length > MAX_TAG_LENGTH) {
    return false;
  }
  
  // Check for invalid characters
  if (INVALID_TAG_CHARS.test(trimmed)) {
    return false;
  }
  
  return true;
}

/**
 * Clean a tag name by removing invalid characters
 * @param tagName The tag name to clean
 * @returns Cleaned tag name
 */
export function cleanTagName(tagName: string): string {
  if (!tagName || typeof tagName !== 'string') {
    return '';
  }
  
  // Remove invalid characters
  let cleaned = tagName.replace(INVALID_TAG_CHARS, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  // Truncate if too long
  if (cleaned.length > MAX_TAG_LENGTH) {
    cleaned = cleaned.substring(0, MAX_TAG_LENGTH);
  }
  
  return cleaned;
}

/**
 * Parse a tag path in the format "Parent/Child"
 * @param tagPath The tag path to parse
 * @returns Object with parent and child tag names
 */
export function parseTagPath(tagPath: string): { parent: string | null; child: string } {
  if (!tagPath || typeof tagPath !== 'string') {
    return { parent: null, child: '' };
  }
  
  const parts = tagPath.split('/').map(p => p.trim()).filter(p => p.length > 0);
  
  if (parts.length === 0) {
    return { parent: null, child: '' };
  }
  
  if (parts.length === 1) {
    return { parent: null, child: parts[0] || '' };
  }
  
  // Take the last part as the child and the second-to-last as the parent
  // This handles cases like "Grandparent/Parent/Child"
  return {
    parent: parts[parts.length - 2] || null,
    child: parts[parts.length - 1] || ''
  };
}

/**
 * Build a tag path from parent and child names
 * @param parent Parent tag name (optional)
 * @param child Child tag name
 * @returns Tag path in "Parent/Child" format
 */
export function buildTagPath(parent: string | null | undefined, child: string): string {
  const cleanedChild = cleanTagName(child);
  
  if (!cleanedChild) {
    return '';
  }
  
  if (!parent) {
    return cleanedChild;
  }
  
  const cleanedParent = cleanTagName(parent);
  
  if (!cleanedParent) {
    return cleanedChild;
  }
  
  return `${cleanedParent}/${cleanedChild}`;
}

/**
 * Validate an array of tag names
 * @param tags Array of tag names
 * @returns Object with valid and invalid tags
 */
export function validateTags(tags: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  for (const tag of tags) {
    if (isValidTagName(tag)) {
      valid.push(tag);
    } else {
      invalid.push(tag);
    }
  }
  
  return { valid, invalid };
}

/**
 * Clean an array of tag names
 * @param tags Array of tag names
 * @returns Array of cleaned tag names (empty strings removed)
 */
export function cleanTags(tags: string[]): string[] {
  return tags
    .map(tag => cleanTagName(tag))
    .filter(tag => tag.length > 0);
}

/**
 * Convert tag names to a comma-separated string for AppleScript
 * @param tags Array of tag names
 * @returns Comma-separated string of cleaned tag names
 */
export function tagsToAppleScriptString(tags: string[]): string {
  const cleaned = cleanTags(tags);
  return cleaned.join(',');
}

/**
 * Parse a comma-separated string of tags from AppleScript
 * @param tagString Comma-separated tag string
 * @returns Array of tag names
 */
export function parseAppleScriptTagString(tagString: string): string[] {
  if (!tagString || typeof tagString !== 'string') {
    return [];
  }
  
  return tagString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}