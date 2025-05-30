// ABOUTME: Things3 URL scheme handler for all write operations
// ABOUTME: Replaces AppleScript for create, update, complete, and delete operations

import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from './logger.js';

const execAsync = promisify(exec);

/**
 * Things3 URL scheme operations
 */
export enum Things3Operation {
  ADD = 'add',
  ADD_PROJECT = 'add-project',
  UPDATE = 'update',
  UPDATE_PROJECT = 'update-project',
  SHOW = 'show',
  SEARCH = 'search',
  JSON = 'json'
}

/**
 * Things3 JSON data types
 */
export enum Things3ItemType {
  TODO = 'to-do',
  PROJECT = 'project',
  HEADING = 'heading',
  CHECKLIST_ITEM = 'checklist-item'
}

/**
 * Extended attributes interface that supports auth-token
 */
interface Things3AttributesWithAuth {
  [key: string]: any;
  'auth-token'?: string;
}

export class URLSchemeHandler {
  private logger = createLogger('url-scheme');

  /**
   * Get auth token from environment variable
   */
  private getAuthToken(): string | undefined {
    return process.env['THINGS3_AUTH_TOKEN'];
  }
  
  /**
   * Execute a Things3 URL scheme command
   */
  async execute(url: string): Promise<void> {
    try {
      // Use 'open' command on macOS to handle URL schemes
      const command = `open "${url}"`;
      this.logger.debug(`Executing URL scheme: ${url.substring(0, 200)}...`);
      
      await execAsync(command);
      
      // Give Things3 more time to process the URL and create the TODO
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      this.logger.error('Failed to execute URL scheme', error as Error);
      throw new Error(`URL scheme execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Build a URL for a simple operation
   */
  private buildUrl(operation: Things3Operation, params: Record<string, any>): string {
    const baseUrl = `things:///${operation}`;
    const urlParams = new URLSearchParams();
    
    // Add auth token if available
    const authToken = this.getAuthToken();
    if (authToken) {
      urlParams.append('auth-token', authToken);
    }
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          // Handle arrays (e.g., tags)
          urlParams.append(key, value.join(','));
        } else if (typeof value === 'boolean') {
          // Handle booleans
          urlParams.append(key, value ? 'true' : 'false');
        } else {
          // Handle strings and numbers
          urlParams.append(key, String(value));
        }
      }
    });
    
    // URLSearchParams encodes spaces as '+' but Things3 expects '%20'
    const queryString = urlParams.toString().replace(/\+/g, '%20');
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Build a JSON-based URL for complex operations
   */
  private buildJsonUrl(items: any[]): string {
    const jsonData = JSON.stringify(items);
    const encodedData = encodeURIComponent(jsonData);
    
    // Add auth token as URL parameter for JSON operations
    const authToken = this.getAuthToken();
    if (authToken) {
      return `things:///json?data=${encodedData}&auth-token=${authToken}`;
    }
    
    return `things:///json?data=${encodedData}`;
  }

  /**
   * Convert ISO date to Things3 format
   */
  private formatDateForUrl(isoDate: string | null | undefined): string | undefined {
    if (!isoDate) return undefined;
    
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return undefined;
      
      const today = new Date();
      
      // Check if it's today
      if (this.isSameDay(date, today)) {
        return 'today';
      }
      
      // Check if it's tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (this.isSameDay(date, tomorrow)) {
        return 'tomorrow';
      }
      
      // Return YYYY-MM-DD format
      return date.toISOString().split('T')[0];
    } catch (error) {
      this.logger.warn('Failed to format date for URL', { date: isoDate, error });
      return undefined;
    }
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
  
  /**
   * Create a TODO using URL scheme
   */
  async createTodo(params: {
    title: string;
    notes?: string;
    whenDate?: string;
    deadline?: string;
    tags?: string[];
    checklistItems?: string[];
    projectId?: string;
    areaId?: string;
  }): Promise<void> {
    if (params.checklistItems && params.checklistItems.length > 0) {
      // Use JSON format for complex todos with checklists
      const attributes: Things3AttributesWithAuth = {
        title: params.title,
        notes: params.notes,
        when: this.formatDateForUrl(params.whenDate),
        deadline: this.formatDateForUrl(params.deadline),
        tags: params.tags,
        'list-id': params.projectId || params.areaId,
        'checklist-items': params.checklistItems.map(title => ({
          type: Things3ItemType.CHECKLIST_ITEM,
          attributes: { title }
        }))
      };

      // Add auth token for create operations with checklists
      const authToken = this.getAuthToken();
      if (authToken) {
        attributes['auth-token'] = authToken;
      }
      
      const todo = {
        type: Things3ItemType.TODO,
        attributes
      };
      
      // Remove undefined values
      Object.keys(todo.attributes).forEach(key => {
        if (todo.attributes[key] === undefined) {
          delete todo.attributes[key];
        }
      });
      
      const url = this.buildJsonUrl([todo]);
      await this.execute(url);
    } else {
      // Use simple URL format for basic todos
      const url = this.buildUrl(Things3Operation.ADD, {
        title: params.title,
        notes: params.notes,
        when: this.formatDateForUrl(params.whenDate),
        deadline: this.formatDateForUrl(params.deadline),
        tags: params.tags?.join(','),
        'list-id': params.projectId || params.areaId
      });
      await this.execute(url);
    }
  }

  /**
   * Update a TODO using URL scheme
   */
  async updateTodo(id: string, params: {
    title?: string;
    notes?: string;
    whenDate?: string | null;
    deadline?: string | null;
    tags?: string[];
    completed?: boolean;
    canceled?: boolean;
    listId?: string | null;
  }): Promise<void> {
    const attributes: Things3AttributesWithAuth = {
      title: params.title,
      notes: params.notes,
      when: params.whenDate === null ? '' : this.formatDateForUrl(params.whenDate),
      deadline: params.deadline === null ? '' : this.formatDateForUrl(params.deadline),
      tags: params.tags,
      completed: params.completed,
      canceled: params.canceled,
      'list-id': params.listId === null ? '' : params.listId
    };

    // Add auth token for update operations (required by Things3)
    const authToken = this.getAuthToken();
    if (authToken) {
      attributes['auth-token'] = authToken;
    }
    
    const todo = {
      type: Things3ItemType.TODO,
      id,
      operation: 'update' as const,
      attributes
    };
    
    // Remove undefined values
    Object.keys(todo.attributes).forEach(key => {
      if (todo.attributes[key] === undefined) {
        delete todo.attributes[key];
      }
    });
    
    const url = this.buildJsonUrl([todo]);
    await this.execute(url);
  }

  /**
   * Complete multiple TODOs
   */
  async completeTodos(ids: string[]): Promise<void> {
    const authToken = this.getAuthToken();
    const todos = ids.map(id => {
      const attributes: Things3AttributesWithAuth = { completed: true };
      if (authToken) {
        attributes['auth-token'] = authToken;
      }
      return {
        type: Things3ItemType.TODO,
        id,
        operation: 'update' as const,
        attributes
      };
    });
    
    const url = this.buildJsonUrl(todos);
    await this.execute(url);
  }

  /**
   * Uncomplete multiple TODOs
   */
  async uncompleteTodos(ids: string[]): Promise<void> {
    const authToken = this.getAuthToken();
    const todos = ids.map(id => {
      const attributes: Things3AttributesWithAuth = { completed: false };
      if (authToken) {
        attributes['auth-token'] = authToken;
      }
      return {
        type: Things3ItemType.TODO,
        id,
        operation: 'update' as const,
        attributes
      };
    });
    
    const url = this.buildJsonUrl(todos);
    await this.execute(url);
  }

  /**
   * Cancel multiple TODOs
   */
  async cancelTodos(ids: string[]): Promise<void> {
    const authToken = this.getAuthToken();
    const todos = ids.map(id => {
      const attributes: Things3AttributesWithAuth = { canceled: true };
      if (authToken) {
        attributes['auth-token'] = authToken;
      }
      return {
        type: Things3ItemType.TODO,
        id,
        operation: 'update' as const,
        attributes
      };
    });
    
    const url = this.buildJsonUrl(todos);
    await this.execute(url);
  }

  /**
   * Create a project using URL scheme
   */
  async createProject(params: {
    title: string;
    notes?: string;
    whenDate?: string;
    deadline?: string;
    tags?: string[];
    area?: string;
    areaId?: string;
    headings?: string[];
  }): Promise<void> {
    const items: any[] = [];
    
    // Add headings as items
    if (params.headings) {
      params.headings.forEach(heading => {
        items.push({
          type: Things3ItemType.HEADING,
          attributes: { title: heading }
        });
      });
    }
    
    const attributes: Things3AttributesWithAuth = {
      title: params.title,
      notes: params.notes,
      when: this.formatDateForUrl(params.whenDate),
      deadline: this.formatDateForUrl(params.deadline),
      tags: params.tags,
      area: params.area,
      'area-id': params.areaId,
      items: items.length > 0 ? items : undefined
    };

    // Add auth token for create operations
    const authToken = this.getAuthToken();
    if (authToken) {
      attributes['auth-token'] = authToken;
    }
    
    const project = {
      type: Things3ItemType.PROJECT,
      attributes
    };
    
    // Remove undefined values
    Object.keys(project.attributes).forEach(key => {
      if (project.attributes[key] === undefined) {
        delete project.attributes[key];
      }
    });
    
    const url = this.buildJsonUrl([project]);
    await this.execute(url);
  }

  /**
   * Update a project using URL scheme
   */
  async updateProject(id: string, params: {
    title?: string;
    notes?: string;
    whenDate?: string | null;
    deadline?: string | null;
    tags?: string[];
    completed?: boolean;
    canceled?: boolean;
    areaId?: string | null;
  }): Promise<void> {
    const attributes: Things3AttributesWithAuth = {
      title: params.title,
      notes: params.notes,
      when: params.whenDate === null ? '' : this.formatDateForUrl(params.whenDate),
      deadline: params.deadline === null ? '' : this.formatDateForUrl(params.deadline),
      tags: params.tags,
      completed: params.completed,
      canceled: params.canceled,
      'area-id': params.areaId === null ? '' : params.areaId
    };

    // Add auth token for update operations (required by Things3)
    const authToken = this.getAuthToken();
    if (authToken) {
      attributes['auth-token'] = authToken;
    }
    
    const project = {
      type: Things3ItemType.PROJECT,
      id,
      operation: 'update' as const,
      attributes
    };
    
    // Remove undefined values
    Object.keys(project.attributes).forEach(key => {
      if (project.attributes[key] === undefined) {
        delete project.attributes[key];
      }
    });
    
    const url = this.buildJsonUrl([project]);
    await this.execute(url);
  }

  /**
   * Complete a project
   */
  async completeProject(id: string): Promise<void> {
    const attributes: Things3AttributesWithAuth = { completed: true };
    
    // Add auth token for update operations (required by Things3)
    const authToken = this.getAuthToken();
    if (authToken) {
      attributes['auth-token'] = authToken;
    }
    
    const project = {
      type: Things3ItemType.PROJECT,
      id,
      operation: 'update' as const,
      attributes
    };
    
    const url = this.buildJsonUrl([project]);
    await this.execute(url);
  }

  /**
   * Batch move TODOs to a different project/area
   */
  async bulkMoveTodos(todoIds: string[], projectId?: string, areaId?: string): Promise<void> {
    const listId = projectId || areaId || '';
    const authToken = this.getAuthToken();
    
    const todos = todoIds.map(id => {
      const attributes: Things3AttributesWithAuth = { 'list-id': listId };
      if (authToken) {
        attributes['auth-token'] = authToken;
      }
      return {
        type: Things3ItemType.TODO,
        id,
        operation: 'update' as const,
        attributes
      };
    });
    
    const url = this.buildJsonUrl(todos);
    await this.execute(url);
  }

  /**
   * Batch update dates for multiple TODOs
   */
  async bulkUpdateDates(todoIds: string[], whenDate?: string | null, deadline?: string | null): Promise<void> {
    const authToken = this.getAuthToken();
    
    const todos = todoIds.map(id => {
      const attributes: Things3AttributesWithAuth = {
        when: whenDate === null ? '' : this.formatDateForUrl(whenDate),
        deadline: deadline === null ? '' : this.formatDateForUrl(deadline)
      };
      if (authToken) {
        attributes['auth-token'] = authToken;
      }
      return {
        type: Things3ItemType.TODO,
        id,
        operation: 'update' as const,
        attributes
      };
    });
    
    const url = this.buildJsonUrl(todos);
    await this.execute(url);
  }

  // Keep the old method name for backward compatibility
  async createTodoWithChecklist(params: {
    title: string;
    notes?: string;
    whenDate?: string;
    deadline?: string;
    tags?: string[];
    checklistItems: string[];
    projectId?: string;
    areaId?: string;
  }): Promise<void> {
    return this.createTodo(params);
  }
  
  /**
   * Add checklist items to an existing TODO
   */
  async addChecklistItems(todoId: string, items: string[]): Promise<void> {
    // Use JSON format to append checklist items
    const attributes: Things3AttributesWithAuth = {
      'append-checklist-items': items.map(title => ({
        type: Things3ItemType.CHECKLIST_ITEM,
        attributes: { title }
      }))
    };

    // Add auth token for update operations (required by Things3)
    const authToken = this.getAuthToken();
    if (authToken) {
      attributes['auth-token'] = authToken;
    }
    
    const todo = {
      type: Things3ItemType.TODO,
      id: todoId,
      operation: 'update' as const,
      attributes
    };
    
    const url = this.buildJsonUrl([todo]);
    await this.execute(url);
  }
  
  /**
   * Parse Things3 URL callback response
   */
  parseCallbackResponse(url: string): { id?: string; error?: string } {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    const result: { id?: string; error?: string } = {};
    
    const id = params.get('x-things-id');
    if (id) result.id = id;
    
    const error = params.get('x-error');
    if (error) result.error = error;
    
    return result;
  }
}

/**
 * Singleton instance
 */
export const urlSchemeHandler = new URLSchemeHandler();