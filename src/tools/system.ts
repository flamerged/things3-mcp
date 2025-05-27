// ABOUTME: System utility tools for Things3 MCP server
// ABOUTME: Provides cache refresh and Things3 launch functionality

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AppleScriptBridge } from '../utils/applescript.js';
import * as templates from '../templates/applescript-templates.js';
import { CacheManager } from '../utils/cache-manager.js';

export class SystemTools {
  private bridge: AppleScriptBridge;
  private cacheManager: CacheManager;

  constructor() {
    this.bridge = new AppleScriptBridge();
    this.cacheManager = CacheManager.getInstance();
  }

  /**
   * Refresh all caches
   */
  async refresh(): Promise<{ message: string }> {
    // Clear all caches
    this.cacheManager.clear();

    return {
      message: 'All caches have been cleared. Next requests will fetch fresh data from Things3.'
    };
  }

  /**
   * Launch Things3 application
   */
  async launch(): Promise<{ status: string; version?: string }> {
    try {
      // Ensure Things3 is running
      const launchScript = templates.ensureThings3Running();
      await this.bridge.execute(launchScript);

      // Get version info
      const versionScript = templates.getThings3Version();
      const version = await this.bridge.execute(versionScript);

      return {
        status: 'running',
        version: version.trim()
      };
    } catch (error) {
      console.error('Failed to launch Things3:', error);
      return {
        status: 'error'
      };
    }
  }

  /**
   * Get tool definitions for registration
   */
  getTools(): Tool[] {
    return [
      {
        name: 'system.refresh',
        description: 'Refresh all caches to fetch fresh data from Things3',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'system.launch',
        description: 'Launch Things3 application if not already running',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }
}