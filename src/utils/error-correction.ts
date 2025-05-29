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
import { createLogger } from './logger.js';

// Interfaces for correction strategies
interface DateParams {
  whenDate?: string | null | undefined;
  deadline?: string | null | undefined;
}

interface TitleParams {
  title?: string;
  notes?: string | null;
}

interface ProjectParams {
  projectId?: string | null;
}

interface AreaParams {
  areaId?: string | null;
}

interface TagParams {
  tags?: string[];
}

/**
 * Corrects date conflicts where deadline is before when date
 */
class DateConflictCorrector implements CorrectionStrategy<DateParams> {
  shouldCorrect(data: DateParams): boolean {
    if (!data.whenDate || !data.deadline) return false;
    
    const whenDate = new Date(data.whenDate);
    const deadline = new Date(data.deadline);
    
    return deadline < whenDate;
  }

  correct(data: DateParams): CorrectionResult | null {
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
class MissingTitleCorrector implements CorrectionStrategy<TitleParams> {
  shouldCorrect(data: TitleParams): boolean {
    return !data.title || data.title.trim() === '';
  }

  correct(data: TitleParams): CorrectionResult | null {
    if (!this.shouldCorrect(data)) return null;

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
}

/**
 * Handles invalid project references
 */
class InvalidProjectReferenceCorrector implements CorrectionStrategy<ProjectParams> {
  private validProjectIds: Set<string> = new Set();

  setValidProjectIds(ids: string[]): void {
    this.validProjectIds = new Set(ids);
  }

  shouldCorrect(data: ProjectParams): boolean {
    if (!data.projectId) return false;
    return !this.validProjectIds.has(data.projectId);
  }

  correct(data: ProjectParams): CorrectionResult | null {
    if (!this.shouldCorrect(data)) return null;

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
}

/**
 * Handles invalid area references
 */
class InvalidAreaReferenceCorrector implements CorrectionStrategy<AreaParams> {
  private validAreaIds: Set<string> = new Set();

  setValidAreaIds(ids: string[]): void {
    this.validAreaIds = new Set(ids);
  }

  shouldCorrect(data: AreaParams): boolean {
    if (!data.areaId) return false;
    return !this.validAreaIds.has(data.areaId);
  }

  correct(data: AreaParams): CorrectionResult | null {
    if (!this.shouldCorrect(data)) return null;

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
}

/**
 * Cleans invalid characters from tag names
 */
class TagNameCleaner implements CorrectionStrategy<TagParams> {
  shouldCorrect(data: TagParams): boolean {
    if (!data.tags || !Array.isArray(data.tags)) return false;
    
    return data.tags.some((tag: string) => tag !== cleanTagName(tag));
  }

  correct(data: TagParams): CorrectionResult | null {
    if (!this.shouldCorrect(data)) return null;

    const originalTags = [...(data.tags || [])];
    const cleanedTags = (data.tags || []).map((tag: string) => cleanTagName(tag));
    
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
  private logger = createLogger('error-correction');

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
  correctTodoCreateParams(params: TodosCreateParams): CorrectionReport<TodosCreateParams> {
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
      const correction = strategy.correct(correctedData as never);
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
  correctTodoUpdateParams(params: TodosUpdateParams): CorrectionReport<TodosUpdateParams> {
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
      const correction = strategy.correct(correctedData as never);
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
  logCorrections<T>(report: CorrectionReport<T>): void {
    if (!report.hasCorrections) return;

    this.logger.info('Applied corrections:');
    for (const correction of report.corrections) {
      this.logger.info(`- ${correction.type}: ${correction.reason}`);
      this.logger.debug(`  Field: ${correction.field}`);
      this.logger.debug(`  Original: ${JSON.stringify(correction.originalValue)}`);
      this.logger.debug(`  Corrected: ${JSON.stringify(correction.correctedValue)}`);
    }
  }
}