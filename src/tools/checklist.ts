// ABOUTME: Checklist management tools for Things3 TODOs
// ABOUTME: Provides add, update, reorder, and delete operations for checklist items

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AppleScriptBridge } from '../utils/applescript.js';
import * as templates from '../templates/applescript-templates.js';
import { 
  ChecklistAddParams, 
  ChecklistUpdateParams, 
  ChecklistReorderParams, 
  ChecklistDeleteParams
} from '../types/tools.js';
import { ChecklistItem } from '../types/models.js';

export class ChecklistTools {
  private bridge: AppleScriptBridge;

  constructor() {
    this.bridge = new AppleScriptBridge();
  }

  /**
   * Add checklist items to a TODO
   */
  async add(params: ChecklistAddParams): Promise<{ added: number }> {
    const script = templates.addChecklistItems(params.todoId, params.items);
    const result = await this.bridge.execute(script);
    
    return {
      added: parseInt(result, 10) || 0
    };
  }

  /**
   * Update a checklist item
   */
  async update(params: ChecklistUpdateParams): Promise<{ success: boolean }> {
    const updates: { title?: string; completed?: boolean } = {};
    if (params.title !== undefined) {
      updates.title = params.title;
    }
    if (params.completed !== undefined) {
      updates.completed = params.completed;
    }
    
    const script = templates.updateChecklistItem(
      params.todoId,
      params.itemIndex,
      updates
    );
    
    try {
      await this.bridge.execute(script);
      return { success: true };
    } catch (error) {
      console.error('Failed to update checklist item:', error);
      return { success: false };
    }
  }

  /**
   * Reorder checklist items
   */
  async reorder(params: ChecklistReorderParams): Promise<{ success: boolean }> {
    const script = templates.reorderChecklist(params.todoId, params.newOrder);
    
    try {
      await this.bridge.execute(script);
      return { success: true };
    } catch (error) {
      console.error('Failed to reorder checklist:', error);
      return { success: false };
    }
  }

  /**
   * Delete checklist items
   */
  async delete(params: ChecklistDeleteParams): Promise<{ deleted: number }> {
    const script = templates.deleteChecklistItems(params.todoId, params.itemIndices);
    const result = await this.bridge.execute(script);
    
    return {
      deleted: parseInt(result, 10) || 0
    };
  }

  /**
   * Get checklist items (helper method, not exposed as tool)
   */
  async getItems(todoId: string): Promise<ChecklistItem[]> {
    const script = templates.getChecklistItems(todoId);
    const result = await this.bridge.execute(script);
    
    try {
      const items = JSON.parse(result);
      return items.map((item: any) => ({
        index: item.index,
        title: item.title,
        completed: item.completed
      }));
    } catch (error) {
      console.error('Failed to parse checklist items:', error);
      return [];
    }
  }

  /**
   * Get tool definitions for registration
   */
  getTools(): Tool[] {
    return [
      {
        name: 'checklist.add',
        description: 'Add checklist items to a TODO',
        inputSchema: {
          type: 'object',
          properties: {
            todoId: {
              type: 'string',
              description: 'The ID of the TODO to add checklist items to'
            },
            items: {
              type: 'array',
              description: 'Array of checklist items to add',
              items: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'The title of the checklist item'
                  },
                  completed: {
                    type: 'boolean',
                    description: 'Whether the item is completed',
                    default: false
                  }
                },
                required: ['title']
              }
            }
          },
          required: ['todoId', 'items']
        }
      },
      {
        name: 'checklist.update',
        description: 'Update a checklist item in a TODO',
        inputSchema: {
          type: 'object',
          properties: {
            todoId: {
              type: 'string',
              description: 'The ID of the TODO containing the checklist'
            },
            itemIndex: {
              type: 'number',
              description: 'The zero-based index of the checklist item to update'
            },
            title: {
              type: 'string',
              description: 'The new title for the checklist item'
            },
            completed: {
              type: 'boolean',
              description: 'The new completion status'
            }
          },
          required: ['todoId', 'itemIndex']
        }
      },
      {
        name: 'checklist.reorder',
        description: 'Reorder checklist items in a TODO',
        inputSchema: {
          type: 'object',
          properties: {
            todoId: {
              type: 'string',
              description: 'The ID of the TODO containing the checklist'
            },
            newOrder: {
              type: 'array',
              description: 'Array of indices representing the new order (e.g., [2, 0, 1] moves item 2 to position 0)',
              items: {
                type: 'number'
              }
            }
          },
          required: ['todoId', 'newOrder']
        }
      },
      {
        name: 'checklist.delete',
        description: 'Delete checklist items from a TODO',
        inputSchema: {
          type: 'object',
          properties: {
            todoId: {
              type: 'string',
              description: 'The ID of the TODO containing the checklist'
            },
            itemIndices: {
              type: 'array',
              description: 'Array of zero-based indices of items to delete',
              items: {
                type: 'number'
              }
            }
          },
          required: ['todoId', 'itemIndices']
        }
      }
    ];
  }
}