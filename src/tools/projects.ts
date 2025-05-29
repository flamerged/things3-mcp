// ABOUTME: Project management tools for Things3 integration
// ABOUTME: Provides list, get, create, update, and complete operations with caching

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CacheAwareBase } from './cache-aware-base.js';
import { 
  ProjectsListParams, 
  ProjectsGetParams,
  ProjectsCreateParams,
  ProjectsCreateResult,
  ProjectsUpdateParams,
  ProjectsCompleteParams,
  Project
} from '../types/index.js';
import { 
  listProjects, 
  getProjectById, 
  createProject, 
  updateProject, 
  completeProject 
} from '../templates/applescript-templates.js';
import { isoToAppleScriptDate } from '../utils/date-handler.js';
import { AppleScriptBridge } from '../utils/applescript.js';

export class ProjectTools extends CacheAwareBase {
  private static readonly CACHE_KEY = 'projects:list';
  private static readonly CACHE_TTL = 300000; // 5 minutes
  private bridge: AppleScriptBridge;
  
  constructor() {
    super();
    this.bridge = new AppleScriptBridge();
  }

  /**
   * List all projects with optional filtering
   */
  async listProjects(params: ProjectsListParams): Promise<{ projects: Project[] }> {
    const cacheKey = `${ProjectTools.CACHE_KEY}:${params.areaId || 'all'}:${params.includeCompleted || false}`;
    
    // Try to get from cache
    const cached = this.cacheManager.get<Project[]>(cacheKey);
    if (cached) {
      return { projects: cached };
    }

    // Generate and execute AppleScript
    const script = listProjects(params.areaId, params.includeCompleted);
    const result = await this.bridge.execute(script);
    
    // Parse the JSON response
    const projects: Project[] = JSON.parse(result);
    
    // Cache the results
    this.cacheManager.set(cacheKey, projects, ProjectTools.CACHE_TTL);
    
    return { projects };
  }

  /**
   * Get detailed information about a specific project
   */
  async getProject(params: ProjectsGetParams): Promise<{ project: Project }> {
    const script = getProjectById(params.id);
    const result = await this.bridge.execute(script);
    
    if (result === 'null') {
      throw new Error(`Project with id "${params.id}" not found`);
    }
    
    const project: Project = JSON.parse(result);
    return { project };
  }

  /**
   * Create a new project
   */
  async createProject(params: ProjectsCreateParams): Promise<ProjectsCreateResult> {
    // Convert dates to AppleScript format if provided
    const whenDate = params.whenDate ? 
      isoToAppleScriptDate(params.whenDate) : undefined;
    const deadline = params.deadline ? 
      isoToAppleScriptDate(params.deadline) : undefined;
    
    const script = createProject(
      params.name,
      params.notes,
      whenDate,
      deadline,
      params.tags,
      params.areaId,
      params.headings
    );
    
    const id = await this.bridge.execute(script);
    
    // Invalidate cache since we've added a new project
    this.cacheManager.invalidatePattern(ProjectTools.CACHE_KEY);
    
    return { id, success: true };
  }

  /**
   * Update an existing project
   */
  async updateProject(params: ProjectsUpdateParams): Promise<{ success: boolean }> {
    const updates: Record<string, unknown> = {};
    
    // Only include properties that are being updated
    if (params.name !== undefined) updates['name'] = params.name;
    if (params.notes !== undefined) updates['notes'] = params.notes;
    if (params.tags !== undefined) updates['tags'] = params.tags;
    if (params.areaId !== undefined) updates['areaId'] = params.areaId;
    
    // Convert dates if provided
    if (params.whenDate !== undefined) {
      updates['whenDate'] = params.whenDate ? 
        isoToAppleScriptDate(params.whenDate) : null;
    }
    if (params.deadline !== undefined) {
      updates['deadline'] = params.deadline ? 
        isoToAppleScriptDate(params.deadline) : null;
    }
    
    const script = updateProject(params.id, updates);
    await this.bridge.execute(script);
    
    // Invalidate cache since we've modified a project
    this.cacheManager.invalidatePattern(ProjectTools.CACHE_KEY);
    
    return { success: true };
  }

  /**
   * Complete a project
   */
  async completeProject(params: ProjectsCompleteParams): Promise<{ success: boolean }> {
    const script = completeProject(params.id);
    const result = await this.bridge.execute(script);
    
    const success = result === 'true';
    
    if (success) {
      // Invalidate cache since we've modified a project
      this.cacheManager.invalidatePattern(ProjectTools.CACHE_KEY);
    }
    
    return { success };
  }

  /**
   * Get all project tools for registration
   */
  static getTools(projectTools: ProjectTools): Tool[] {
    return [
      {
        name: 'projects_list',
        description: 'List all projects in Things3',
        inputSchema: {
          type: 'object',
          properties: {
            areaId: { 
              type: 'string',
              description: 'Filter projects by area ID'
            },
            includeCompleted: { 
              type: 'boolean',
              description: 'Include completed projects in the list'
            }
          }
        },
        handler: async (params: unknown) => projectTools.listProjects(params as ProjectsListParams)
      },
      {
        name: 'projects_get',
        description: 'Get detailed information about a specific project',
        inputSchema: {
          type: 'object',
          properties: {
            id: { 
              type: 'string',
              description: 'The project ID'
            }
          },
          required: ['id']
        },
        handler: async (params: unknown) => projectTools.getProject(params as ProjectsGetParams)
      },
      {
        name: 'projects_create',
        description: 'Create a new project in Things3',
        inputSchema: {
          type: 'object',
          properties: {
            name: { 
              type: 'string',
              description: 'The project name'
            },
            notes: { 
              type: 'string',
              description: 'Optional notes for the project'
            },
            whenDate: { 
              type: 'string',
              description: 'When to start the project (ISO 8601 date)'
            },
            deadline: { 
              type: 'string',
              description: 'Project deadline (ISO 8601 date)'
            },
            tags: { 
              type: 'array',
              items: { type: 'string' },
              description: 'Tags to assign to the project'
            },
            areaId: { 
              type: 'string',
              description: 'Area to assign the project to'
            },
            headings: { 
              type: 'array',
              items: { type: 'string' },
              description: 'Section headings to create within the project'
            }
          },
          required: ['name']
        },
        handler: async (params: unknown) => projectTools.createProject(params as ProjectsCreateParams)
      },
      {
        name: 'projects_update',
        description: 'Update an existing project',
        inputSchema: {
          type: 'object',
          properties: {
            id: { 
              type: 'string',
              description: 'The project ID to update'
            },
            name: { 
              type: 'string',
              description: 'New project name'
            },
            notes: { 
              type: ['string', 'null'],
              description: 'New notes (null to clear)'
            },
            whenDate: { 
              type: ['string', 'null'],
              description: 'New start date (ISO 8601, null to clear)'
            },
            deadline: { 
              type: ['string', 'null'],
              description: 'New deadline (ISO 8601, null to clear)'
            },
            tags: { 
              type: 'array',
              items: { type: 'string' },
              description: 'Replace all tags with these tags'
            },
            areaId: { 
              type: ['string', 'null'],
              description: 'Move to new area (null to remove from area)'
            }
          },
          required: ['id']
        },
        handler: async (params: unknown) => projectTools.updateProject(params as ProjectsUpdateParams)
      },
      {
        name: 'projects_complete',
        description: 'Mark a project as completed',
        inputSchema: {
          type: 'object',
          properties: {
            id: { 
              type: 'string',
              description: 'The project ID to complete'
            }
          },
          required: ['id']
        },
        handler: async (params: unknown) => projectTools.completeProject(params as ProjectsCompleteParams)
      }
    ];
  }
}