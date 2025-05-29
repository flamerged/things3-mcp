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

    // Complete all tracked projects (can't delete in Things3)
    for (const projectId of this.projectIds) {
      try {
        await this.server.projectTools.completeProject({ id: projectId });
      } catch (error) {
        errors.push(new Error(`Failed to complete project ${projectId}: ${error}`));
      }
    }
    this.projectIds.clear();

    // Clean up areas by searching and deleting test TODOs in them
    // Note: We can't delete areas in Things3, but we can clean their contents
    if (this.areaNames.size > 0) {
      try {
        const allTodos = await this.server.todosTools.listTodos({ limit: 1000 });
        const testAreaNames = Array.from(this.areaNames);
        
        // Find all areas to get their IDs
        const areas = await this.server.areaTools.listAreas({});
        const testAreas = areas.areas.filter(area => 
          testAreaNames.includes(area.name)
        );

        // Find TODOs in test areas - need to get full details
        const todosInTestAreas: string[] = [];
        for (const todo of allTodos) {
          const fullTodo = await this.server.todosTools.getTodo({ id: todo.id });
          if (fullTodo && testAreas.some(area => area.id === fullTodo.areaId)) {
            todosInTestAreas.push(todo.id);
          }
        }

        if (todosInTestAreas.length > 0) {
          await this.server.todosTools.deleteTodos({ ids: todosInTestAreas });
        }
      } catch (error) {
        errors.push(new Error(`Failed to clean up areas: ${error}`));
      }
    }
    this.areaNames.clear();

    // Clean up tags by removing them from all items
    // Note: We can't delete tags in Things3, but we can remove them from items
    if (this.tagNames.size > 0) {
      try {
        const testTagNames = Array.from(this.tagNames);
        
        // Find all items with test tags - need to get full details
        const allTodos = await this.server.todosTools.listTodos({ limit: 1000 });
        const todosWithTestTags: string[] = [];
        for (const todo of allTodos) {
          const fullTodo = await this.server.todosTools.getTodo({ id: todo.id });
          if (fullTodo && fullTodo.tags.some(tag => testTagNames.includes(tag))) {
            todosWithTestTags.push(todo.id);
          }
        }

        if (todosWithTestTags.length > 0) {
          await this.server.tagTools.removeTags({ 
            itemIds: todosWithTestTags, 
            tags: testTagNames 
          });
        }
      } catch (error) {
        errors.push(new Error(`Failed to clean up tags: ${error}`));
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