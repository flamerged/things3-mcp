// ABOUTME: Error correction system that automatically fixes common Things3 issues like date conflicts and invalid references
// ABOUTME: Provides self-correcting behavior to improve user experience and prevent errors

import {
  CorrectionType,
  CorrectionResult,
  CorrectionReport,
  CorrectionStrategy,
} from '../types/corrections.js';
import { TodosCreateParams, TodosUpdateParams } from '../types/tools.js';
import { cleanTagName } from './tag-validator.js';

/**
 * Corrects date conflicts where deadline is before when date
 */
class DateConflictCorrector implements CorrectionStrategy<any> {
  shouldCorrect(data: any): boolean {
    if (!data.whenDate || !data.deadline) return false;
    
    const whenDate = new Date(data.whenDate);
    const deadline = new Date(data.deadline);
    
    return deadline < whenDate;
  }

  correct(data: any): CorrectionResult | null {
    if (!this.shouldCorrect(data)) return null;

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
}

/**
 * Generates a title when missing
 */
class MissingTitleCorrector implements CorrectionStrategy<any> {
  shouldCorrect(data: any): boolean {
    return !data.title || data.title.trim() === '';
  }

  correct(data: any): CorrectionResult | null {
    if (!this.shouldCorrect(data)) return null;

    const originalTitle = data.title;
    
    // Try to generate title from notes
    if (data.notes && data.notes.trim()) {
      const firstLine = data.notes.trim().split('\n')[0];
      // Take first 50 characters of first line
      data.title = firstLine.substring(0, 50).trim();
      if (firstLine.length > 50) {
        data.title += '...';
      }
    } else {
      data.title = 'Untitled';
    }

    return {
      type: CorrectionType.MISSING_TITLE,
      field: 'title',
      originalValue: originalTitle,
      correctedValue: data.title,
      reason: data.notes 
        ? 'Generated title from first line of notes'
        : 'No title provided - using default',
    };
  }
}

/**
 * Handles invalid project references
 */
class InvalidProjectReferenceCorrector implements CorrectionStrategy<any> {
  private validProjectIds: Set<string> = new Set();

  setValidProjectIds(ids: string[]): void {
    this.validProjectIds = new Set(ids);
  }

  shouldCorrect(data: any): boolean {
    if (!data.projectId) return false;
    return !this.validProjectIds.has(data.projectId);
  }

  correct(data: any): CorrectionResult | null {
    if (!this.shouldCorrect(data)) return null;

    const originalProjectId = data.projectId;
    
    // Move to inbox by removing project reference
    delete data.projectId;

    return {
      type: CorrectionType.INVALID_PROJECT_REFERENCE,
      field: 'projectId',
      originalValue: originalProjectId,
      correctedValue: null,
      reason: 'Invalid project ID - item will be created in Inbox',
    };
  }
}

/**
 * Handles invalid area references
 */
class InvalidAreaReferenceCorrector implements CorrectionStrategy<any> {
  private validAreaIds: Set<string> = new Set();

  setValidAreaIds(ids: string[]): void {
    this.validAreaIds = new Set(ids);
  }

  shouldCorrect(data: any): boolean {
    if (!data.areaId) return false;
    return !this.validAreaIds.has(data.areaId);
  }

  correct(data: any): CorrectionResult | null {
    if (!this.shouldCorrect(data)) return null;

    const originalAreaId = data.areaId;
    
    // Remove invalid area reference
    delete data.areaId;

    return {
      type: CorrectionType.INVALID_AREA_REFERENCE,
      field: 'areaId',
      originalValue: originalAreaId,
      correctedValue: null,
      reason: 'Invalid area ID - reference removed',
    };
  }
}

/**
 * Cleans invalid characters from tag names
 */
class TagNameCleaner implements CorrectionStrategy<any> {
  shouldCorrect(data: any): boolean {
    if (!data.tags || !Array.isArray(data.tags)) return false;
    
    return data.tags.some((tag: string) => tag !== cleanTagName(tag));
  }

  correct(data: any): CorrectionResult | null {
    if (!this.shouldCorrect(data)) return null;

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
}

/**
 * Main error corrector that applies all correction strategies
 */
export class ErrorCorrector {
  private dateCorrector = new DateConflictCorrector();
  private titleCorrector = new MissingTitleCorrector();
  private projectCorrector = new InvalidProjectReferenceCorrector();
  private areaCorrector = new InvalidAreaReferenceCorrector();
  private tagCorrector = new TagNameCleaner();

  /**
   * Update valid project IDs for reference validation
   */
  setValidProjectIds(ids: string[]): void {
    this.projectCorrector.setValidProjectIds(ids);
  }

  /**
   * Update valid area IDs for reference validation
   */
  setValidAreaIds(ids: string[]): void {
    this.areaCorrector.setValidAreaIds(ids);
  }

  /**
   * Correct TODO creation parameters
   */
  correctTodoCreateParams(params: TodosCreateParams): CorrectionReport {
    const corrections: CorrectionResult[] = [];
    const correctedData = { ...params };

    // Apply all corrections
    const strategies = [
      this.titleCorrector,
      this.dateCorrector,
      this.projectCorrector,
      this.areaCorrector,
      this.tagCorrector,
    ];

    for (const strategy of strategies) {
      const correction = strategy.correct(correctedData);
      if (correction) {
        corrections.push(correction);
      }
    }

    return {
      hasCorrections: corrections.length > 0,
      corrections,
      correctedData,
    };
  }

  /**
   * Correct TODO update parameters
   */
  correctTodoUpdateParams(params: TodosUpdateParams): CorrectionReport {
    const corrections: CorrectionResult[] = [];
    const correctedData = { ...params };

    // For updates, we don't correct missing title (it's optional)
    const strategies = [
      this.dateCorrector,
      this.projectCorrector,
      this.areaCorrector,
      this.tagCorrector,
    ];

    for (const strategy of strategies) {
      const correction = strategy.correct(correctedData);
      if (correction) {
        corrections.push(correction);
      }
    }

    return {
      hasCorrections: corrections.length > 0,
      corrections,
      correctedData,
    };
  }

  /**
   * Log corrections for debugging
   */
  logCorrections(report: CorrectionReport): void {
    if (!report.hasCorrections) return;

    console.log('Applied corrections:');
    for (const correction of report.corrections) {
      console.log(`- ${correction.type}: ${correction.reason}`);
      console.log(`  Field: ${correction.field}`);
      console.log(`  Original: ${JSON.stringify(correction.originalValue)}`);
      console.log(`  Corrected: ${JSON.stringify(correction.correctedValue)}`);
    }
  }
}