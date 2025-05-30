// ABOUTME: Bulk operation tools for Things3 TODOs
// ABOUTME: Provides bulk move and bulk date update operations

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BulkMoveParams, BulkUpdateDatesParams } from '../types/tools.js';
import { urlSchemeHandler } from '../utils/url-scheme.js';

export class BulkTools {
  constructor() {
    // Using URL scheme instead of AppleScript bridge
  }

  /**
   * Bulk move TODOs to a project or area
   */
  async move(params: BulkMoveParams): Promise<{ moved: number }> {
    // Ensure we have at least one destination
    if (!params.projectId && !params.areaId) {
      throw new Error('Either projectId or areaId must be specified');
    }

    // Convert single ID to array
    const todoIds = Array.isArray(params.todoIds) ? params.todoIds : [params.todoIds];

    // Use URL scheme for bulk moving TODOs
    await urlSchemeHandler.bulkMoveTodos(todoIds, params.projectId ?? undefined, params.areaId ?? undefined);
    
    return {
      moved: todoIds.length
    };
  }

  /**
   * Bulk update dates for multiple TODOs
   */
  async updateDates(params: BulkUpdateDatesParams): Promise<{ updated: number }> {
    // Convert single ID to array
    const todoIds = Array.isArray(params.todoIds) ? params.todoIds : [params.todoIds];

    // Use URL scheme for bulk updating dates
    await urlSchemeHandler.bulkUpdateDates(
      todoIds, 
      params.whenDate, 
      params.deadline
    );
    
    return {
      updated: todoIds.length
    };
  }

  /**
   * Get tool definitions for registration
   */
  getTools(): Tool[] {
    return [
      {
        name: 'bulk_move',
        description: 'Move multiple TODOs to a project or area',
        inputSchema: {
          type: 'object',
          properties: {
            todoIds: {
              oneOf: [
                {
                  type: 'string',
                  description: 'Single TODO ID'
                },
                {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of TODO IDs'
                }
              ],
              description: 'TODO ID(s) to move'
            },
            projectId: {
              type: 'string',
              description: 'The ID of the project to move the TODOs to'
            },
            areaId: {
              type: 'string',
              description: 'The ID of the area to move the TODOs to'
            }
          },
          required: ['todoIds']
        }
      },
      {
        name: 'bulk_updateDates',
        description: 'Update dates for multiple TODOs at once',
        inputSchema: {
          type: 'object',
          properties: {
            todoIds: {
              oneOf: [
                {
                  type: 'string',
                  description: 'Single TODO ID'
                },
                {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of TODO IDs'
                }
              ],
              description: 'TODO ID(s) to update'
            },
            whenDate: {
              type: ['string', 'null'],
              description: 'The when date (ISO 8601 format) - null to clear'
            },
            deadline: {
              type: ['string', 'null'],
              description: 'The deadline (ISO 8601 format) - null to clear'
            }
          },
          required: ['todoIds']
        }
      }
    ];
  }
}