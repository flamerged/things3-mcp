// ABOUTME: Registry for automatic tool routing without manual switch statements
// ABOUTME: Maps tool names to their handlers dynamically

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolHandler } from './tool-base.js';
import { createLogger } from '../utils/logger.js';

/**
 * Registry for managing all tool implementations
 * Eliminates the need for manual switch statements
 */
export class ToolRegistry {
  private tools = new Map<string, ToolHandler>();
  private toolDefinitions: Tool[] = [];
  private logger = createLogger('registry');

  /**
   * Register a tool implementation
   */
  registerTool(toolClass: BaseTool): void {
    const registrations = toolClass.getToolRegistrations();
    
    for (const registration of registrations) {
      if (this.tools.has(registration.name)) {
        throw new Error(`Tool ${registration.name} is already registered`);
      }
      
      this.tools.set(registration.name, registration.handler);
      this.toolDefinitions.push(registration.toolDefinition);
      this.logger.debug(`Registered tool: ${registration.name}`);
    }
  }

  /**
   * Get handler for a tool by name
   */
  getHandler(toolName: string): ToolHandler | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get all registered tool definitions
   */
  getToolDefinitions(): Tool[] {
    return [...this.toolDefinitions];
  }

  /**
   * Get count of registered tools
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Execute a tool by name with arguments
   */
  async executeTool(name: string, args: any): Promise<any> {
    const handler = this.getHandler(name);
    
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      return await handler(args);
    } catch (error) {
      this.logger.error(`Error executing tool ${name}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}