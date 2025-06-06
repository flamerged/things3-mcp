// ABOUTME: Base class for all tools providing common functionality and registration
// ABOUTME: Eliminates code duplication across tool implementations

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AppleScriptBridge } from '../utils/applescript.js';
import { createLogger } from '../utils/logger.js';
import { TagTools } from '../tools/tags.js';

/**
 * Tool handler function type
 */
export type ToolHandler = (args: any) => Promise<any>;

/**
 * Tool registration info
 */
export interface ToolRegistration {
  name: string;
  handler: ToolHandler;
  toolDefinition: Tool;
}

/**
 * Abstract base class for all tool implementations
 */
export abstract class BaseTool {
  protected bridge: AppleScriptBridge;
  protected logger: ReturnType<typeof createLogger>;
  private tagTools?: TagTools;

  constructor(protected toolName: string) {
    this.bridge = new AppleScriptBridge();
    this.logger = createLogger(toolName);
  }

  /**
   * Get or create tag tools instance (lazy initialization to avoid circular dependencies)
   */
  protected getTagTools(): TagTools {
    if (!this.tagTools) {
      this.tagTools = new TagTools();
    }
    return this.tagTools;
  }

  /**
   * Ensure tags exist in Things3, creating them if necessary
   * Common functionality extracted from multiple tool classes
   */
  protected async ensureTagsExist(tags: string[]): Promise<void> {
    if (!tags || tags.length === 0) return;
    
    try {
      const tagTools = this.getTagTools();
      
      // Get existing tags
      const existingTagsResult = await tagTools.listTags();
      const existingTagNames = new Set(existingTagsResult.tags.map((tag: { name: string }) => tag.name));
      
      // Find missing tags
      const missingTags = tags.filter(tag => !existingTagNames.has(tag));
      
      if (missingTags.length > 0) {
        this.logger.info(`Creating ${missingTags.length} missing tags: ${missingTags.join(', ')}`);
        
        // Create missing tags
        for (const tagName of missingTags) {
          await tagTools.createTag({ name: tagName });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to ensure tags exist, continuing with operation', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Get all tool registrations for this tool class
   * Must be implemented by each tool class
   */
  abstract getToolRegistrations(): ToolRegistration[];
}