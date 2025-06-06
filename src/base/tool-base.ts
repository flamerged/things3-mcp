// ABOUTME: Base class for all tools providing common functionality and registration
// ABOUTME: Eliminates code duplication across tool implementations

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AppleScriptBridge } from '../utils/applescript.js';
import { createLogger } from '../utils/logger.js';

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

  constructor(protected toolName: string) {
    this.bridge = new AppleScriptBridge();
    this.logger = createLogger(toolName);
  }

  /**
   * Ensure tags exist in Things3, creating them if necessary
   * Common functionality extracted from multiple tool classes
   * Note: This will be overridden by TagTools to avoid circular dependencies
   */
  protected async ensureTagsExist(tags: string[]): Promise<void> {
    if (!tags || tags.length === 0) return;
    
    // This is a placeholder implementation - concrete tools should implement tag creation logic
    // The TagTools class will override this method with the actual implementation
    this.logger.warn('ensureTagsExist called on base class - should be overridden by concrete implementation');
  }

  /**
   * Get all tool registrations for this tool class
   * Must be implemented by each tool class
   */
  abstract getToolRegistrations(): ToolRegistration[];
}