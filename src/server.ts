// ABOUTME: Main MCP server implementation for Things3 integration
// ABOUTME: Handles tool registration and request routing

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { 
  AreasCreateParams, AreasDeleteParams,
  TagsCreateParams, TagsAddParams, TagsRemoveParams, TagsDeleteParams,
  BulkMoveParams, BulkUpdateDatesParams,
  LogbookSearchParams
} from './types/tools.js';
import { ToolRegistry } from './base/tool-registry.js';
import { TodosTools } from './tools/todos.js';
import { ProjectTools } from './tools/projects.js';
import { AreaTools } from './tools/areas.js';
import { TagTools } from './tools/tags.js';
import { BulkTools } from './tools/bulk.js';
import { LogbookTools } from './tools/logbook.js';
import { SystemTools } from './tools/system.js';
import { createLogger } from './utils/logger.js';

export class Things3Server {
  private server: Server;
  private transport: StdioServerTransport;
  private logger = createLogger('things3');
  private registry: ToolRegistry;
  public todosTools: TodosTools;
  public projectTools: ProjectTools;
  public areaTools: AreaTools;
  public tagTools: TagTools;
  public bulkTools: BulkTools;
  public logbookTools: LogbookTools;
  public systemTools: SystemTools;

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
    this.registry = new ToolRegistry();
    
    // Initialize tool handlers
    this.todosTools = new TodosTools();
    this.projectTools = new ProjectTools();
    this.areaTools = new AreaTools();
    this.tagTools = new TagTools();
    this.bulkTools = new BulkTools();
    this.logbookTools = new LogbookTools();
    this.systemTools = new SystemTools();
    
    this.registerTools();
  }

  private registerTools(): void {
    this.logger.info('Registering Things3 tools...');
    
    // Register refactored tools with the registry
    this.registry.registerTool(this.todosTools);
    this.registry.registerTool(this.projectTools);
    
    // Get legacy tools (to be refactored later)
    const areaTools = AreaTools.getTools(this.areaTools);
    const tagTools = TagTools.getTools(this.tagTools);
    const bulkTools = this.bulkTools.getTools();
    const logbookTools = this.logbookTools.getTools();
    const systemTools = this.systemTools.getTools();
    
    const legacyTools = [...areaTools, ...tagTools, ...bulkTools, ...logbookTools, ...systemTools];
    
    // Combine registry tools and legacy tools for capabilities
    const allTools = [...this.registry.getToolDefinitions(), ...legacyTools];
    
    // Update server capabilities
    this.server.registerCapabilities({
      tools: Object.fromEntries(
        allTools.map(tool => [tool.name, tool])
      ),
    });
    
    // Register handler for tools/list request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: allTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });
    
    // Register the handler for all tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      // Try to handle with registry first (for refactored tools)
      const handler = this.registry.getHandler(name);
      if (handler) {
        const result = await this.registry.executeTool(name, args);
        return { toolResult: result };
      }
      
      // Fall back to switch statement for non-refactored tools
      switch (name) {
        
        // Area tools
        case 'areas_list':
          return { toolResult: await this.areaTools.listAreas() };
        case 'areas_create':
          return { toolResult: await this.areaTools.createArea(args as unknown as AreasCreateParams) };
        case 'areas_delete':
          return { toolResult: await this.areaTools.deleteAreas(args as unknown as AreasDeleteParams) };
        
        // Tag tools
        case 'tags_list':
          return { toolResult: await this.tagTools.listTags() };
        case 'tags_create':
          return { toolResult: await this.tagTools.createTag(args as unknown as TagsCreateParams) };
        case 'tags_add':
          return { toolResult: await this.tagTools.addTags(args as unknown as TagsAddParams) };
        case 'tags_remove':
          return { toolResult: await this.tagTools.removeTags(args as unknown as TagsRemoveParams) };
        case 'tags_delete':
          return { toolResult: await this.tagTools.deleteTags(args as unknown as TagsDeleteParams) };
        
        // Bulk tools
        case 'bulk_move':
          return { toolResult: await this.bulkTools.move(args as unknown as BulkMoveParams) };
        case 'bulk_updateDates':
          return { toolResult: await this.bulkTools.updateDates(args as unknown as BulkUpdateDatesParams) };
        
        // Logbook tools
        case 'logbook_search':
          return { toolResult: await this.logbookTools.search(args as unknown as LogbookSearchParams) };
        
        // System tools
        case 'system_launch':
          return { toolResult: await this.systemTools.launch() };
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
    
    this.logger.info(`Registered ${this.registry.getToolCount()} refactored tools`);
    this.logger.info(`Registered ${legacyTools.length} legacy tools`);
    this.logger.info(`Total tools registered: ${allTools.length}`);
  }

  async start(): Promise<void> {
    await this.server.connect(this.transport);
  }

  async stop(): Promise<void> {
    await this.server.close();
  }

}