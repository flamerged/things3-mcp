// ABOUTME: Tag management tools for Things3 integration
// ABOUTME: Provides list, create, add, and remove operations with hierarchy support

import { BaseTool, ToolRegistration } from '../base/tool-base.js';
import { 
  TagsCreateParams,
  TagsCreateResult,
  TagsAddParams,
  TagsAddResult,
  TagsRemoveParams,
  TagsRemoveResult,
  TagsDeleteParams,
  TagsDeleteResult,
  Tag
} from '../types/index.js';
import { 
  listTags, 
  createTag,
  addTagsToItems,
  removeTagsFromItems,
  deleteTags
} from '../templates/applescript-templates.js';
import { 
  cleanTagName, 
  cleanTags
} from '../utils/tag-validator.js';

export class TagTools extends BaseTool {
  constructor() {
    super('tags');
  }

  /**
   * Override ensureTagsExist to provide the actual implementation
   * This avoids circular dependencies while still providing the functionality
   */
  protected async ensureTagsExist(tags: string[]): Promise<void> {
    if (!tags || tags.length === 0) return;
    
    try {
      // Get existing tags
      const existingTagsResult = await this.listTags();
      const existingTagNames = new Set(existingTagsResult.tags.map((tag: { name: string }) => tag.name));
      
      // Find missing tags
      const missingTags = tags.filter(tag => !existingTagNames.has(tag));
      
      if (missingTags.length > 0) {
        this.logger.info(`Creating ${missingTags.length} missing tags: ${missingTags.join(', ')}`);
        
        // Create missing tags
        for (const tagName of missingTags) {
          await this.createTag({ name: tagName });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to ensure tags exist, continuing with operation', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
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

    // Ensure all tags exist before adding them
    await this.ensureTagsExist(cleanedTags);

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
   * Delete tags completely from Things3
   */
  async deleteTags(params: TagsDeleteParams): Promise<TagsDeleteResult> {
    // Convert single tag name to array
    const tagNames = Array.isArray(params.names) ? params.names : [params.names];
    
    // Clean tag names
    const cleanedNames = tagNames.map(name => name.trim()).filter(name => name.length > 0);
    
    if (cleanedNames.length === 0) {
      return {
        success: false,
        deletedCount: 0,
        error: 'No valid tag names provided'
      };
    }

    try {
      // Use AppleScript to delete tags
      const script = deleteTags(cleanedNames);
      const result = await this.bridge.execute(script);
      
      const deletedCount = parseInt(result.trim()) || 0;
      
      this.logger.info(`Deleted ${deletedCount} tags: ${cleanedNames.join(', ')}`);
      
      return {
        success: deletedCount > 0,
        deletedCount: deletedCount
      };
    } catch (error) {
      this.logger.warn('Failed to delete tags', { 
        tagNames: cleanedNames,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return {
        success: false,
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Failed to delete tags'
      };
    }
  }

  /**
   * Get tool registrations for the registry
   */
  getToolRegistrations(): ToolRegistration[] {
    return [
      {
        name: 'tags_list',
        handler: this.listTags.bind(this),
        toolDefinition: {
          name: 'tags_list',
          description: 'List all tags in Things3 with hierarchy information',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        name: 'tags_create',
        handler: this.createTag.bind(this),
        toolDefinition: {
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
          }
        }
      },
      {
        name: 'tags_add',
        handler: this.addTags.bind(this),
        toolDefinition: {
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
          }
        }
      },
      {
        name: 'tags_remove',
        handler: this.removeTags.bind(this),
        toolDefinition: {
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
          }
        }
      },
      {
        name: 'tags_delete',
        handler: this.deleteTags.bind(this),
        toolDefinition: {
          name: 'tags_delete',
          description: 'Delete tags completely from Things3',
          inputSchema: {
            type: 'object',
            properties: {
              names: {
                oneOf: [
                  { type: 'string' },
                  { type: 'array', items: { type: 'string' } }
                ],
                description: 'Tag name(s) to delete completely from Things3'
              }
            },
            required: ['names']
          }
        }
      }
    ];
  }
}