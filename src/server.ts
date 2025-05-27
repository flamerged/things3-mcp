// ABOUTME: Main MCP server implementation for Things3 integration
// ABOUTME: Handles tool registration and request routing

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export class Things3Server {
  private server: Server;
  private transport: StdioServerTransport;

  constructor() {
    this.server = new Server(
      {
        name: 'things3-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.transport = new StdioServerTransport();
    this.registerTools();
  }

  private registerTools(): void {
    // TODO: Register all 27 tools
    console.log('Registering Things3 tools...');
  }

  async start(): Promise<void> {
    await this.server.connect(this.transport);
  }

  async stop(): Promise<void> {
    await this.server.close();
  }
}