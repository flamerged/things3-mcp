// ABOUTME: Area management tools for Things3 integration
// ABOUTME: Provides list and create operations for areas with caching

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CacheAwareBase } from './cache-aware-base.js';
import { 
  AreasListParams, 
  AreasCreateParams,
  AreasCreateResult,
  Area
} from '../types/index.js';
import { listAreas, createArea } from '../templates/applescript-templates.js';
import { AppleScriptBridge } from '../utils/applescript.js';

export class AreaTools extends CacheAwareBase {
  private static readonly CACHE_KEY = 'areas:list';
  private static readonly CACHE_TTL = 300000; // 5 minutes
  private bridge: AppleScriptBridge;
  
  constructor() {
    super();
    this.bridge = new AppleScriptBridge();
  }

  /**
   * List all areas with optional filtering
   */
  async listAreas(params: AreasListParams): Promise<{ areas: Area[] }> {
    const cacheKey = `${AreaTools.CACHE_KEY}:${params.includeHidden || false}`;
    
    // Try to get from cache
    const cached = this.cacheManager.get<Area[]>(cacheKey);
    if (cached) {
      return { areas: cached };
    }

    // Generate and execute AppleScript
    const script = listAreas(params.includeHidden);
    const result = await this.bridge.execute(script);
    
    // Parse the JSON response
    const areas: Area[] = JSON.parse(result);
    
    // Cache the results
    this.cacheManager.set(cacheKey, areas, AreaTools.CACHE_TTL);
    
    return { areas };
  }

  /**
   * Create a new area
   */
  async createArea(params: AreasCreateParams): Promise<AreasCreateResult> {
    const script = createArea(params.name);
    const id = await this.bridge.execute(script);
    
    // Invalidate cache since we've added a new area
    this.cacheManager.invalidatePattern(AreaTools.CACHE_KEY);
    
    return { id, success: true };
  }

  /**
   * Get all area tools for registration
   */
  static getTools(areaTools: AreaTools): Tool[] {
    return [
      {
        name: 'areas.list',
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
        handler: async (params: unknown) => areaTools.listAreas(params as AreasListParams)
      },
      {
        name: 'areas.create',
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
      }
    ];
  }
}