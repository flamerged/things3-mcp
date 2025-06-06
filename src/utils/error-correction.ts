// ABOUTME: Error correction system that automatically fixes common Things3 issues like date conflicts and invalid references
// ABOUTME: Provides self-correcting behavior to improve user experience and prevent errors

import {
  CorrectionType,
  CorrectionResult,
  CorrectionReport,
} from '../types/corrections.js';
import { TodosCreateParams, TodosUpdateParams } from '../types/tools.js';
import { cleanTagName } from './tag-validator.js';
import { createLogger } from './logger.js';
import type { AppleScriptBridge } from './applescript.js';

const logger = createLogger('error-correction');

// Cache for valid IDs
let validProjectIds: Set<string> = new Set();
let validAreaIds: Set<string> = new Set();

/**
 * Update valid project IDs for reference validation
 */
export function setValidProjectIds(ids: string[]): void {
  validProjectIds = new Set(ids);
}

/**
 * Update valid area IDs for reference validation
 */
export function setValidAreaIds(ids: string[]): void {
  validAreaIds = new Set(ids);
}

/**
 * Refresh valid project and area IDs by fetching current data
 */
export async function refreshValidIds(bridge?: AppleScriptBridge): Promise<void> {
  try {
    // Use provided bridge or import and create new one
    let scriptBridge = bridge;
    if (!scriptBridge) {
      const { AppleScriptBridge } = await import('../utils/applescript.js');
      scriptBridge = new AppleScriptBridge();
    }
    
    const templates = await import('../templates/applescript-templates.js');
    
    // Get current projects
    const projectScript = templates.listProjects();
    const projectResponse = await scriptBridge.execute(projectScript);
    const projects = JSON.parse(projectResponse);
    const projectIds = projects.map((p: { id: string }) => p.id);
    setValidProjectIds(projectIds);
    
    // Get current areas
    const areaScript = templates.listAreas();
    const areaResponse = await scriptBridge.execute(areaScript);
    const areas = JSON.parse(areaResponse);
    const areaIds = areas.map((a: { id: string }) => a.id);
    setValidAreaIds(areaIds);
    
  } catch (error) {
    logger.warn('Failed to refresh valid IDs:', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Correct date conflicts where deadline is before when date
 */
function correctDateConflict(data: { whenDate?: string | null; deadline?: string | null }): CorrectionResult | null {
  if (!data.whenDate || !data.deadline) return null;
  
  const whenDate = new Date(data.whenDate);
  const deadline = new Date(data.deadline);
  
  if (deadline >= whenDate) return null;

  const originalWhenDate = data.whenDate;
  const originalDeadline = data.deadline;
  
  // Swap the dates
  data.whenDate = originalDeadline;
  data.deadline = originalWhenDate;

  return {
    type: CorrectionType.DATE_CONFLICT,
    field: 'whenDate/deadline',
    originalValue: { whenDate: originalWhenDate, deadline: originalDeadline },
    correctedValue: { whenDate: data.whenDate, deadline: data.deadline },
    reason: 'Deadline cannot be before when date - dates have been swapped',
  };
}

/**
 * Generate a title when missing
 */
function correctMissingTitle(data: { title?: string; notes?: string | null }): CorrectionResult | null {
  if (data.title && data.title.trim() !== '') return null;

  const originalTitle = data.title;
  
  // Try to generate title from notes
  if (data.notes && typeof data.notes === 'string' && data.notes.trim()) {
    const firstLine = data.notes.trim().split('\n')[0];
    if (firstLine) {
      // Take first 50 characters of first line
      data.title = firstLine.substring(0, 50).trim();
      if (firstLine.length > 50) {
        data.title += '...';
      }
    } else {
      data.title = 'Untitled';
    }
  } else {
    data.title = 'Untitled';
  }

  return {
    type: CorrectionType.MISSING_TITLE,
    field: 'title',
    originalValue: originalTitle,
    correctedValue: data.title,
    reason: (data.notes && typeof data.notes === 'string' && data.notes.trim())
      ? 'Generated title from first line of notes'
      : 'No title provided - using default',
  };
}

/**
 * Handle invalid project references
 */
function correctInvalidProjectReference(data: { projectId?: string | null }): CorrectionResult | null {
  if (!data.projectId) return null;
  // Temporarily disable project validation if no valid IDs are cached
  if (validProjectIds.size === 0) return null;
  if (validProjectIds.has(data.projectId)) return null;

  const originalProjectId = data.projectId;
  
  // Move to inbox by removing project reference
  data.projectId = null;

  return {
    type: CorrectionType.INVALID_PROJECT_REFERENCE,
    field: 'projectId',
    originalValue: originalProjectId,
    correctedValue: null,
    reason: 'Invalid project ID - item will be created in Inbox',
  };
}

/**
 * Handle invalid area references
 */
function correctInvalidAreaReference(data: { areaId?: string | null }): CorrectionResult | null {
  if (!data.areaId) return null;
  if (validAreaIds.has(data.areaId)) return null;

  const originalAreaId = data.areaId;
  
  // Remove invalid area reference
  data.areaId = null;

  return {
    type: CorrectionType.INVALID_AREA_REFERENCE,
    field: 'areaId',
    originalValue: originalAreaId,
    correctedValue: null,
    reason: 'Invalid area ID - reference removed',
  };
}

/**
 * Clean invalid characters from tag names
 */
function correctTagNames(data: { tags?: string[] }): CorrectionResult | null {
  if (!data.tags || !Array.isArray(data.tags)) return null;
  
  const needsCleaning = data.tags.some((tag: string) => tag !== cleanTagName(tag));
  if (!needsCleaning) return null;

  const originalTags = [...data.tags];
  const cleanedTags = data.tags.map((tag: string) => cleanTagName(tag));
  
  // Remove duplicates after cleaning
  data.tags = [...new Set(cleanedTags)];

  return {
    type: CorrectionType.INVALID_TAG_NAME,
    field: 'tags',
    originalValue: originalTags,
    correctedValue: data.tags,
    reason: 'Removed invalid characters from tag names',
  };
}

/**
 * Correct TODO creation parameters
 */
export function correctTodoCreateParams(params: TodosCreateParams): CorrectionReport<TodosCreateParams> {
  const corrections: CorrectionResult[] = [];
  const correctedData = { ...params };

  // Apply all corrections
  const titleCorrection = correctMissingTitle(correctedData);
  if (titleCorrection) corrections.push(titleCorrection);

  const dateCorrection = correctDateConflict(correctedData);
  if (dateCorrection) corrections.push(dateCorrection);

  const projectCorrection = correctInvalidProjectReference(correctedData);
  if (projectCorrection) corrections.push(projectCorrection);

  const areaCorrection = correctInvalidAreaReference(correctedData);
  if (areaCorrection) corrections.push(areaCorrection);

  const tagCorrection = correctTagNames(correctedData);
  if (tagCorrection) corrections.push(tagCorrection);

  return {
    hasCorrections: corrections.length > 0,
    corrections,
    correctedData,
  };
}

/**
 * Correct TODO update parameters
 */
export function correctTodoUpdateParams(params: TodosUpdateParams): CorrectionReport<TodosUpdateParams> {
  const corrections: CorrectionResult[] = [];
  const correctedData = { ...params };

  // For updates, we don't correct missing title (it's optional)
  const dateCorrection = correctDateConflict(correctedData);
  if (dateCorrection) corrections.push(dateCorrection);

  const projectCorrection = correctInvalidProjectReference(correctedData);
  if (projectCorrection) corrections.push(projectCorrection);

  const areaCorrection = correctInvalidAreaReference(correctedData);
  if (areaCorrection) corrections.push(areaCorrection);

  const tagCorrection = correctTagNames(correctedData);
  if (tagCorrection) corrections.push(tagCorrection);

  return {
    hasCorrections: corrections.length > 0,
    corrections,
    correctedData,
  };
}

/**
 * Log corrections for debugging
 */
export function logCorrections<T>(report: CorrectionReport<T>): void {
  if (!report.hasCorrections) return;

  logger.info('Applied corrections:');
  for (const correction of report.corrections) {
    logger.info(`- ${correction.type}: ${correction.reason}`);
    logger.debug(`  Field: ${correction.field}`);
    logger.debug(`  Original: ${JSON.stringify(correction.originalValue)}`);
    logger.debug(`  Corrected: ${JSON.stringify(correction.correctedValue)}`);
  }
}