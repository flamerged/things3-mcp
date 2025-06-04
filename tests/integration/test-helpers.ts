// ABOUTME: Test helper utilities for integration tests
// ABOUTME: Provides resource tracking and cleanup functionality for Things3 tests

import { Things3Server } from '../../src/server.js';

/**
 * Test resource tracker for cleanup
 */
export class TestResourceTracker {
  private todoIds: Set<string> = new Set();
  private projectIds: Set<string> = new Set();
  private areaNames: Set<string> = new Set();
  private tagNames: Set<string> = new Set();
  private server: Things3Server;

  constructor(server: Things3Server) {
    this.server = server;
  }

  /**
   * Track a TODO for cleanup
   */
  trackTodo(id: string): void {
    this.todoIds.add(id);
  }

  /**
   * Track multiple TODOs for cleanup
   */
  trackTodos(ids: string[]): void {
    ids.forEach(id => this.todoIds.add(id));
  }

  /**
   * Track a project for cleanup
   */
  trackProject(id: string): void {
    this.projectIds.add(id);
  }

  /**
   * Track an area for cleanup
   */
  trackArea(name: string): void {
    this.areaNames.add(name);
  }

  /**
   * Track a tag for cleanup
   */
  trackTag(name: string): void {
    this.tagNames.add(name);
  }

  /**
   * Clean up all tracked resources
   */
  async cleanup(): Promise<void> {
    const errors: Error[] = [];

    // Delete all tracked TODOs
    if (this.todoIds.size > 0) {
      try {
        const todoIdArray = Array.from(this.todoIds);
        console.log(`Cleaning up ${todoIdArray.length} test TODOs...`);
        await this.server.todosTools.deleteTodos({ ids: todoIdArray });
        this.todoIds.clear();
      } catch (error) {
        errors.push(new Error(`Failed to delete TODOs: ${error}`));
      }
    }

    // Delete all tracked projects
    if (this.projectIds.size > 0) {
      try {
        const projectIdsArray = Array.from(this.projectIds);
        const result = await this.server.projectTools.deleteProjects({ ids: projectIdsArray });
        console.log(`      Deleted ${result.deletedCount} projects...`);
      } catch (error) {
        errors.push(new Error(`Failed to delete projects: ${error}`));
      }
    }
    this.projectIds.clear();

    // Delete all tracked areas (now possible with AppleScript!)
    if (this.areaNames.size > 0) {
      try {
        const testAreaNames = Array.from(this.areaNames);
        
        // Find all areas to get their IDs
        const areas = await this.server.areaTools.listAreas();
        const testAreas = areas.areas.filter(area => 
          testAreaNames.includes(area.name)
        );
        
        if (testAreas.length > 0) {
          const areaIds = testAreas.map(area => area.id);
          const result = await this.server.areaTools.deleteAreas({ ids: areaIds });
          console.log(`      Deleted ${result.deletedCount} areas...`);
        }
      } catch (error) {
        errors.push(new Error(`Failed to delete areas: ${error}`));
      }
    }
    this.areaNames.clear();

    // Delete all tracked tags completely from Things3
    if (this.tagNames.size > 0) {
      try {
        const testTagNames = Array.from(this.tagNames);
        console.log(`      Deleting ${testTagNames.length} tags...`);
        
        const result = await this.server.tagTools.deleteTags({ names: testTagNames });
        console.log(`      Deleted ${result.deletedCount} tags`);
      } catch (error) {
        errors.push(new Error(`Failed to delete tags: ${error}`));
      }
    }
    this.tagNames.clear();

    // Log any errors that occurred during cleanup
    if (errors.length > 0) {
      console.warn('Cleanup errors:', errors);
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats(): { todos: number; projects: number; areas: number; tags: number } {
    return {
      todos: this.todoIds.size,
      projects: this.projectIds.size,
      areas: this.areaNames.size,
      tags: this.tagNames.size
    };
  }
}

/**
 * Generate unique test identifiers
 */
export function generateTestId(prefix: string = 'TEST'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Wait for Things3 to process operations
 */
export async function waitForThings3(ms: number = 500): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}