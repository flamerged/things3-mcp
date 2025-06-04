// ABOUTME: Area management tools for Things3 integration
// ABOUTME: Provides list and create operations for areas

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { 
  AreasCreateParams,
  AreasCreateResult,
  AreasDeleteParams,
  AreasDeleteResult,
  Area
} from '../types/index.js';
import { listAreas, createArea, deleteAreas } from '../templates/applescript-templates.js';
import { AppleScriptBridge } from '../utils/applescript.js';

export class AreaTools {
  private bridge: AppleScriptBridge;
  
  constructor() {
    this.bridge = new AppleScriptBridge();
  }

  /**
   * List all areas with optional filtering
   */
  async listAreas(): Promise<{ areas: Area[] }> {
    // Generate and execute AppleScript
    const script = listAreas();
    const result = await this.bridge.execute(script);
    
    // Parse the JSON response
    const areas: Area[] = JSON.parse(result);
    
    return { areas };
  }

  /**
   * Create a new area
   */
  async createArea(params: AreasCreateParams): Promise<AreasCreateResult> {
    const script = createArea(params.name);
    const id = await this.bridge.execute(script);
    
    
    return { id, success: true };
  }

  /**
   * Delete areas
   */
  async deleteAreas(params: AreasDeleteParams): Promise<AreasDeleteResult> {
    try {
      const ids = Array.isArray(params.ids) ? params.ids : [params.ids];
      
      // Use AppleScript for actual deletion
      const script = deleteAreas(ids);
      const result = await this.bridge.execute(script);
      
      const deletedCount = parseInt(result.trim()) || 0;
      
      return {
        success: deletedCount > 0,
        deletedCount: deletedCount,
      };
    } catch (error) {
      return {
        success: false,
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all area tools for registration
   */
  static getTools(areaTools: AreaTools): Tool[] {
    return [
      {
        name: 'areas_list',
        description: 'List all areas in Things3',
        inputSchema: {
          type: 'object',
          properties: {
            includeHidden: { 
              type: 'boolean',
              description: 'Include hidden areas in the list'
            }
          }
        },
        handler: async () => areaTools.listAreas()
      },
      {
        name: 'areas_create',
        description: 'Create a new area in Things3',
        inputSchema: {
          type: 'object',
          properties: {
            name: { 
              type: 'string',
              description: 'The name of the area to create'
            }
          },
          required: ['name']
        },
        handler: async (params: unknown) => areaTools.createArea(params as AreasCreateParams)
      },
      {
        name: 'areas_delete',
        description: 'Delete areas in Things3 (moves to trash)',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Area ID or array of area IDs to delete'
            }
          },
          required: ['ids']
        },
        handler: async (params: unknown) => areaTools.deleteAreas(params as AreasDeleteParams)
      }
    ];
  }
}