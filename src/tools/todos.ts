// ABOUTME: Implementation of TODO-related tools for Things3 MCP server
// ABOUTME: Provides CRUD operations for TODOs with filtering and search

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AppleScriptBridge } from '../utils/applescript.js';
import {
  TodosListParams,
  TodosListResult,
  TodosGetParams,
  TodosCreateParams,
  TodosCreateResult,
  TodosUpdateParams,
  TodosUpdateResult,
  TodosCompleteParams,
  TodosCompleteResult,
  TodosUncompleteParams,
  TodosUncompleteResult,
  TodosDeleteParams,
  TodosDeleteResult,
  TodoItem,
  ErrorType,
  Things3Error,
} from '../types/index.js';
import * as templates from '../templates/applescript-templates.js';

/**
 * Handles all TODO-related operations
 */
export class TodosTools {
  private bridge: AppleScriptBridge;

  constructor() {
    this.bridge = new AppleScriptBridge();
  }

  /**
   * List TODOs with optional filtering
   */
  async listTodos(params: TodosListParams): Promise<TodosListResult[]> {
    try {
      // Ensure Things3 is running
      await this.bridge.ensureThings3Running();

      // Generate and execute AppleScript
      const script = templates.listTodos(params.filter, params.status, params.searchText);
      const response = await this.bridge.execute(script);
      
      // Parse response
      const todos = JSON.parse(response) as TodosListResult[];
      
      // Apply additional filtering if needed
      let filtered = todos;
      
      // Filter by project
      if (params.projectId) {
        // We'll need to fetch full details to filter by project
        // For now, this is a limitation of the list operation
      }
      
      // Filter by area
      if (params.areaId) {
        // Same limitation as project filtering
      }
      
      // Filter by tags
      if (params.tags && params.tags.length > 0) {
        // We need full details to filter by tags
      }
      
      // Apply pagination
      if (params.offset !== undefined || params.limit !== undefined) {
        const offset = params.offset || 0;
        const limit = params.limit || filtered.length;
        filtered = filtered.slice(offset, offset + limit);
      }
      
      return filtered;
    } catch (error) {
      if (error instanceof Things3Error) {
        throw error;
      }
      throw new Things3Error(
        ErrorType.UNKNOWN,
        'Failed to list TODOs',
        error
      );
    }
  }

  /**
   * Get full details of a specific TODO
   */
  async getTodo(params: TodosGetParams): Promise<TodoItem | null> {
    try {
      await this.bridge.ensureThings3Running();
      
      const script = templates.getTodoById(params.id);
      const response = await this.bridge.execute(script);
      
      if (response === 'null') {
        return null;
      }
      
      const todoData = JSON.parse(response);
      
      // Convert to TodoItem format
      const todo: TodoItem = {
        id: todoData.id,
        title: todoData.title,
        notes: todoData.notes,
        completed: todoData.completed,
        tags: todoData.tags || [],
        whenDate: todoData.whenDate,
        deadline: todoData.deadline,
        projectId: todoData.projectId,
        areaId: todoData.areaId,
        // Checklist and reminder would need additional AppleScript
        checklistItems: [],
      };
      
      return todo;
    } catch (error) {
      if (error instanceof Things3Error) {
        throw error;
      }
      throw new Things3Error(
        ErrorType.UNKNOWN,
        `Failed to get TODO ${params.id}`,
        error
      );
    }
  }

  /**
   * Create a new TODO
   */
  async createTodo(params: TodosCreateParams): Promise<TodosCreateResult> {
    try {
      await this.bridge.ensureThings3Running();
      
      // TODO: Add error correction here
      
      const script = templates.createTodo(
        params.title,
        params.notes,
        params.whenDate,
        params.deadline,
        params.tags,
        params.projectId,
        params.areaId
      );
      
      const todoId = await this.bridge.execute(script);
      
      // Handle checklist items if provided
      if (params.checklistItems && params.checklistItems.length > 0) {
        // TODO: Add checklist items via separate AppleScript
      }
      
      // Handle reminder if provided
      if (params.reminder) {
        // TODO: Add reminder via separate AppleScript
      }
      
      return {
        success: true,
        id: todoId,
        correctionsMade: [],
      };
    } catch (error) {
      if (error instanceof Things3Error) {
        throw error;
      }
      throw new Things3Error(
        ErrorType.UNKNOWN,
        'Failed to create TODO',
        error
      );
    }
  }

  /**
   * Update an existing TODO
   */
  async updateTodo(params: TodosUpdateParams): Promise<TodosUpdateResult> {
    try {
      await this.bridge.ensureThings3Running();
      
      // TODO: Add error correction here
      
      const updates: any = {};
      
      if (params.title !== undefined) updates.title = params.title;
      if (params.notes !== undefined) updates.notes = params.notes;
      if (params.whenDate !== undefined) updates.whenDate = params.whenDate;
      if (params.deadline !== undefined) updates.deadline = params.deadline;
      if (params.tags !== undefined) updates.tags = params.tags;
      if (params.projectId !== undefined) updates.projectId = params.projectId;
      if (params.areaId !== undefined) updates.areaId = params.areaId;
      
      const script = templates.updateTodo(params.id, updates);
      
      await this.bridge.execute(script);
      
      return {
        success: true,
        correctionsMade: [],
      };
    } catch (error) {
      if (error instanceof Things3Error) {
        throw error;
      }
      throw new Things3Error(
        ErrorType.UNKNOWN,
        `Failed to update TODO ${params.id}`,
        error
      );
    }
  }

  /**
   * Complete one or more TODOs
   */
  async completeTodos(params: TodosCompleteParams): Promise<TodosCompleteResult> {
    try {
      await this.bridge.ensureThings3Running();
      
      const ids = Array.isArray(params.ids) ? params.ids : [params.ids];
      const script = templates.completeTodos(ids);
      const completedCount = parseInt(await this.bridge.execute(script), 10);
      
      return {
        success: true,
        completedCount,
      };
    } catch (error) {
      if (error instanceof Things3Error) {
        throw error;
      }
      throw new Things3Error(
        ErrorType.UNKNOWN,
        'Failed to complete TODOs',
        error
      );
    }
  }

  /**
   * Uncomplete one or more TODOs
   */
  async uncompleteTodos(params: TodosUncompleteParams): Promise<TodosUncompleteResult> {
    try {
      await this.bridge.ensureThings3Running();
      
      const ids = Array.isArray(params.ids) ? params.ids : [params.ids];
      const script = templates.uncompleteTodos(ids);
      const uncompletedCount = parseInt(await this.bridge.execute(script), 10);
      
      return {
        success: true,
        uncompletedCount,
      };
    } catch (error) {
      if (error instanceof Things3Error) {
        throw error;
      }
      throw new Things3Error(
        ErrorType.UNKNOWN,
        'Failed to uncomplete TODOs',
        error
      );
    }
  }

  /**
   * Delete one or more TODOs
   */
  async deleteTodos(params: TodosDeleteParams): Promise<TodosDeleteResult> {
    try {
      await this.bridge.ensureThings3Running();
      
      const ids = Array.isArray(params.ids) ? params.ids : [params.ids];
      const script = templates.deleteTodos(ids);
      const deletedCount = parseInt(await this.bridge.execute(script), 10);
      
      return {
        success: true,
        deletedCount,
      };
    } catch (error) {
      if (error instanceof Things3Error) {
        throw error;
      }
      throw new Things3Error(
        ErrorType.UNKNOWN,
        'Failed to delete TODOs',
        error
      );
    }
  }

  /**
   * Get tool definitions for registration
   */
  static getTools(): Tool[] {
    return [
      {
        name: 'todos.list',
        description: 'List TODOs with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              enum: ['inbox', 'today', 'upcoming', 'anytime', 'someday', 'logbook'],
              description: 'Filter by TODO list',
            },
            status: {
              type: 'string',
              enum: ['open', 'completed', 'cancelled'],
              description: 'Filter by status',
            },
            projectId: {
              type: 'string',
              description: 'Filter by project ID',
            },
            areaId: {
              type: 'string',
              description: 'Filter by area ID',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags (AND operation)',
            },
            searchText: {
              type: 'string',
              description: 'Search in title and notes',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip',
            },
          },
        },
      },
      {
        name: 'todos.get',
        description: 'Get full details of a specific TODO',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'TODO ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'todos.create',
        description: 'Create a new TODO',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'TODO title',
            },
            notes: {
              type: 'string',
              description: 'TODO notes/description',
            },
            whenDate: {
              type: 'string',
              description: 'When to work on it (ISO 8601)',
            },
            deadline: {
              type: 'string',
              description: 'When it must be done (ISO 8601)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags to assign',
            },
            projectId: {
              type: 'string',
              description: 'Project to assign to',
            },
            areaId: {
              type: 'string',
              description: 'Area to assign to',
            },
            checklistItems: {
              type: 'array',
              items: { type: 'string' },
              description: 'Checklist item titles',
            },
            reminder: {
              type: 'object',
              properties: {
                dateTime: { type: 'string' },
                minutesBeforeDeadline: { type: 'number' },
                minutesBeforeWhen: { type: 'number' },
              },
              description: 'Reminder settings',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'todos.update',
        description: 'Update an existing TODO',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'TODO ID',
            },
            title: {
              type: 'string',
              description: 'New title',
            },
            notes: {
              type: ['string', 'null'],
              description: 'New notes (null to clear)',
            },
            whenDate: {
              type: ['string', 'null'],
              description: 'New when date (null to clear)',
            },
            deadline: {
              type: ['string', 'null'],
              description: 'New deadline (null to clear)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Replace all tags',
            },
            projectId: {
              type: ['string', 'null'],
              description: 'New project (null to move to Inbox)',
            },
            areaId: {
              type: ['string', 'null'],
              description: 'New area (null to move to Inbox)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'todos.complete',
        description: 'Mark TODO(s) as complete',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ],
              description: 'TODO ID(s) to complete',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'todos.uncomplete',
        description: 'Mark TODO(s) as incomplete',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ],
              description: 'TODO ID(s) to uncomplete',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'todos.delete',
        description: 'Delete TODO(s)',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ],
              description: 'TODO ID(s) to delete',
            },
          },
          required: ['ids'],
        },
      },
    ];
  }
}