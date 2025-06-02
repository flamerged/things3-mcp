// ABOUTME: System utility tools for Things3 MCP server
// ABOUTME: Provides Things3 launch functionality

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AppleScriptBridge } from '../utils/applescript.js';
import * as templates from '../templates/applescript-templates.js';

export class SystemTools {
  private bridge: AppleScriptBridge;

  constructor() {
    this.bridge = new AppleScriptBridge();
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
        name: 'system_launch',
        description: 'Launch Things3 application if not already running',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }
}