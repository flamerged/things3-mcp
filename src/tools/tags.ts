// ABOUTME: Tag management tools for Things3 integration
// ABOUTME: Provides list, create, add, and remove operations with hierarchy support

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { 
  TagsCreateParams,
  TagsCreateResult,
  TagsAddParams,
  TagsAddResult,
  TagsRemoveParams,
  TagsRemoveResult,
  Tag
} from '../types/index.js';
import { 
  listTags, 
  createTag,
  addTagsToItems,
  removeTagsFromItems
} from '../templates/applescript-templates.js';
import { 
  cleanTagName, 
  cleanTags
} from '../utils/tag-validator.js';
import { AppleScriptBridge } from '../utils/applescript.js';

export class TagTools {
  private bridge: AppleScriptBridge;

  constructor() {
    this.bridge = new AppleScriptBridge();
  }

  /**
   * List all tags with hierarchy information
   */
  async listTags(): Promise<{ tags: Tag[] }> {
    // Generate and execute AppleScript
    const script = listTags();
    const result = await this.bridge.execute(script);
    
    // Parse the JSON response
    const tags: Tag[] = JSON.parse(result);
    
    return { tags };
  }

  /**
   * Create a new tag with optional parent
   */
  async createTag(params: TagsCreateParams): Promise<TagsCreateResult> {
    // Clean and validate the tag name
    const cleanedName = cleanTagName(params.name);
    
    if (!cleanedName) {
      return { 
        success: false, 
        error: 'Invalid tag name after cleaning' 
      };
    }

    const script = createTag(cleanedName, params.parentTagId);
    
    try {
      const id = await this.bridge.execute(script);
      
      
      return { id, success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tag'
      };
    }
  }

  /**
   * Add tags to items (TODOs or Projects)
   */
  async addTags(params: TagsAddParams): Promise<TagsAddResult> {
    // Clean and validate tags
    const cleanedTags = cleanTags(params.tags);
    
    if (cleanedTags.length === 0) {
      return {
        success: false,
        updatedCount: 0,
        error: 'No valid tags to add'
      };
    }

    try {
      // Use AppleScript for tag operations (handles both TODOs and Projects)
      const script = addTagsToItems(params.itemIds, cleanedTags);
      const result = await this.bridge.execute(script);
      
      const updatedCount = parseInt(result.trim()) || 0;
      
      return { 
        success: updatedCount > 0, 
        updatedCount: updatedCount 
      };
    } catch (error) {
      return {
        success: false,
        updatedCount: 0,
        error: error instanceof Error ? error.message : 'Failed to add tags'
      };
    }
  }

  /**
   * Remove tags from items
   */
  async removeTags(params: TagsRemoveParams): Promise<TagsRemoveResult> {
    // Clean tags (but don't validate - we want to remove even if invalid)
    const cleanedTags = params.tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    if (cleanedTags.length === 0) {
      return {
        success: false,
        updatedCount: 0,
        error: 'No tags to remove'
      };
    }

    // Use AppleScript for tag removal since URL scheme can only clear ALL tags
    const script = removeTagsFromItems(params.itemIds, cleanedTags);
    
    try {
      const result = await this.bridge.execute(script);
      const updatedCount = parseInt(result, 10) || 0;
      
      
      return { 
        success: true, 
        updatedCount 
      };
    } catch (error) {
      return {
        success: false,
        updatedCount: 0,
        error: error instanceof Error ? error.message : 'Failed to remove tags'
      };
    }
  }

  /**
   * Get all tag tools for registration
   */
  static getTools(tagTools: TagTools): Tool[] {
    return [
      {
        name: 'tags_list',
        description: 'List all tags in Things3 with hierarchy information',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => tagTools.listTags()
      },
      {
        name: 'tags_create',
        description: 'Create a new tag in Things3',
        inputSchema: {
          type: 'object',
          properties: {
            name: { 
              type: 'string',
              description: 'The tag name'
            },
            parentTagId: { 
              type: 'string',
              description: 'Optional parent tag ID for creating nested tags'
            }
          },
          required: ['name']
        },
        handler: async (params: unknown) => tagTools.createTag(params as TagsCreateParams)
      },
      {
        name: 'tags_add',
        description: 'Add tags to TODOs or projects',
        inputSchema: {
          type: 'object',
          properties: {
            itemIds: { 
              type: 'array',
              items: { type: 'string' },
              description: 'IDs of TODOs or projects to add tags to'
            },
            tags: { 
              type: 'array',
              items: { type: 'string' },
              description: 'Tag names to add'
            }
          },
          required: ['itemIds', 'tags']
        },
        handler: async (params: unknown) => tagTools.addTags(params as TagsAddParams)
      },
      {
        name: 'tags_remove',
        description: 'Remove tags from TODOs or projects',
        inputSchema: {
          type: 'object',
          properties: {
            itemIds: { 
              type: 'array',
              items: { type: 'string' },
              description: 'IDs of TODOs or projects to remove tags from'
            },
            tags: { 
              type: 'array',
              items: { type: 'string' },
              description: 'Tag names to remove'
            }
          },
          required: ['itemIds', 'tags']
        },
        handler: async (params: unknown) => tagTools.removeTags(params as TagsRemoveParams)
      }
    ];
  }
}