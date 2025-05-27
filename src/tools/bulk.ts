// ABOUTME: Bulk operation tools for Things3 TODOs
// ABOUTME: Provides bulk move and bulk date update operations

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AppleScriptBridge } from '../utils/applescript.js';
import * as templates from '../templates/applescript-templates.js';
import { BulkMoveParams, BulkUpdateDatesParams } from '../types/tools.js';
import { isoToAppleScriptDate } from '../utils/date-handler.js';

export class BulkTools {
  private bridge: AppleScriptBridge;

  constructor() {
    this.bridge = new AppleScriptBridge();
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

    const script = templates.bulkMoveTodos(todoIds, params.projectId ?? undefined, params.areaId ?? undefined);
    const result = await this.bridge.execute(script);

    return {
      moved: parseInt(result, 10) || 0
    };
  }

  /**
   * Bulk update dates for multiple TODOs
   */
  async updateDates(params: BulkUpdateDatesParams): Promise<{ updated: number }> {
    // Convert single ID to array
    const todoIds = Array.isArray(params.todoIds) ? params.todoIds : [params.todoIds];

    // Convert dates to AppleScript format if provided
    let whenDateScript: string | null | undefined;
    let deadlineScript: string | null | undefined;

    if (params.whenDate !== undefined) {
      whenDateScript = params.whenDate ? isoToAppleScriptDate(params.whenDate) : null;
    }

    if (params.deadline !== undefined) {
      deadlineScript = params.deadline ? isoToAppleScriptDate(params.deadline) : null;
    }

    const script = templates.bulkUpdateDates(todoIds, whenDateScript, deadlineScript);
    const result = await this.bridge.execute(script);

    return {
      updated: parseInt(result, 10) || 0
    };
  }

  /**
   * Get tool definitions for registration
   */
  getTools(): Tool[] {
    return [
      {
        name: 'bulk.move',
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
        name: 'bulk.updateDates',
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