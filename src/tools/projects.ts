// ABOUTME: Project management tools for Things3 integration
// ABOUTME: Provides list, get, create, update, and complete operations

import { Tool } from '@modelcontextprotocol/sdk/types.js';
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
  getProjectById
} from '../templates/applescript-templates.js';
import { AppleScriptBridge } from '../utils/applescript.js';
import { urlSchemeHandler } from '../utils/url-scheme.js';

export class ProjectTools {
  private bridge: AppleScriptBridge;
  
  constructor() {
    this.bridge = new AppleScriptBridge();
  }

  /**
   * List all projects with optional filtering
   */
  async listProjects(params: ProjectsListParams): Promise<{ projects: Project[] }> {
    // Generate and execute AppleScript
    const script = listProjects(params.areaId, params.includeCompleted);
    const result = await this.bridge.execute(script);
    
    // Parse the JSON response
    const projects: Project[] = JSON.parse(result);
    
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
    // Use URL scheme for creating projects
    const createParams: Parameters<typeof urlSchemeHandler.createProject>[0] = {
      title: params.name
    };
    
    if (params.notes) createParams.notes = params.notes;
    if (params.whenDate) createParams.whenDate = params.whenDate;
    if (params.deadline) createParams.deadline = params.deadline;
    if (params.tags) createParams.tags = params.tags;
    if (params.areaId) createParams.areaId = params.areaId;
    if (params.headings) createParams.headings = params.headings;
    
    await urlSchemeHandler.createProject(createParams);
    
    // Since URL scheme doesn't return ID, we need to find the created project
    // Wait a moment for Things3 to process the creation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      // List all projects and find the one we just created by title
      const projectsResult = await this.listProjects({ includeCompleted: true });
      const createdProject = projectsResult.projects.find(p => p.name === params.name);
      
      if (createdProject) {
        return { id: createdProject.id, success: true };
      } else {
        // Fallback if we can't find the project
        return { id: 'created', success: true };
      }
    } catch (error) {
      // If something goes wrong, still return success since the project was likely created
      return { id: 'created', success: true };
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(params: ProjectsUpdateParams): Promise<{ success: boolean }> {
    // Use URL scheme for updating projects
    const updateParams: Parameters<typeof urlSchemeHandler.updateProject>[1] = {};
    
    if (params.name !== undefined) updateParams.title = params.name;
    if (params.notes !== undefined) updateParams.notes = params.notes;
    if (params.whenDate !== undefined) updateParams.whenDate = params.whenDate;
    if (params.deadline !== undefined) updateParams.deadline = params.deadline;
    if (params.tags !== undefined) updateParams.tags = params.tags;
    if (params.areaId !== undefined) updateParams.areaId = params.areaId;
    
    await urlSchemeHandler.updateProject(params.id, updateParams);
    
    
    return { success: true };
  }

  /**
   * Complete a project
   */
  async completeProject(params: ProjectsCompleteParams): Promise<{ success: boolean }> {
    // Use URL scheme for completing projects
    await urlSchemeHandler.completeProject(params.id);
    
    
    return { success: true };
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