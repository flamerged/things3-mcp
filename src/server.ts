// ABOUTME: Main MCP server implementation for Things3 integration
// ABOUTME: Handles tool registration and request routing

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { 
  TodosListParams, TodosGetParams, TodosCreateParams, TodosUpdateParams, 
  TodosCompleteParams, TodosUncompleteParams, TodosDeleteParams,
  ProjectsListParams, ProjectsGetParams, ProjectsCreateParams, ProjectsUpdateParams, ProjectsCompleteParams,
  AreasListParams, AreasCreateParams,
  TagsCreateParams, TagsAddParams, TagsRemoveParams,
  BulkMoveParams, BulkUpdateDatesParams,
  LogbookSearchParams
} from './types/tools.js';
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
    
    // Get all tools
    const todoTools = TodosTools.getTools();
    const projectTools = ProjectTools.getTools(this.projectTools);
    const areaTools = AreaTools.getTools(this.areaTools);
    const tagTools = TagTools.getTools(this.tagTools);
    const bulkTools = this.bulkTools.getTools();
    const logbookTools = this.logbookTools.getTools();
    const systemTools = this.systemTools.getTools();
    
    // Combine all tools
    const allTools = [...todoTools, ...projectTools, ...areaTools, ...tagTools, ...bulkTools, ...logbookTools, ...systemTools];
    
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
      
      switch (name) {
        // TODO tools
        case 'todos_list':
          return { toolResult: await this.todosTools.listTodos(args as unknown as TodosListParams) };
        case 'todos_get':
          return { toolResult: await this.todosTools.getTodo(args as unknown as TodosGetParams) };
        case 'todos_create':
          return { toolResult: await this.todosTools.createTodo(args as unknown as TodosCreateParams) };
        case 'todos_update':
          return { toolResult: await this.todosTools.updateTodo(args as unknown as TodosUpdateParams) };
        case 'todos_complete':
          return { toolResult: await this.todosTools.completeTodos(args as unknown as TodosCompleteParams) };
        case 'todos_uncomplete':
          return { toolResult: await this.todosTools.uncompleteTodos(args as unknown as TodosUncompleteParams) };
        case 'todos_delete':
          return { toolResult: await this.todosTools.deleteTodos(args as unknown as TodosDeleteParams) };
        
        // Project tools
        case 'projects_list':
          return { toolResult: await this.projectTools.listProjects(args as unknown as ProjectsListParams) };
        case 'projects_get':
          return { toolResult: await this.projectTools.getProject(args as unknown as ProjectsGetParams) };
        case 'projects_create':
          return { toolResult: await this.projectTools.createProject(args as unknown as ProjectsCreateParams) };
        case 'projects_update':
          return { toolResult: await this.projectTools.updateProject(args as unknown as ProjectsUpdateParams) };
        case 'projects_complete':
          return { toolResult: await this.projectTools.completeProject(args as unknown as ProjectsCompleteParams) };
        
        // Area tools
        case 'areas_list':
          return { toolResult: await this.areaTools.listAreas(args as unknown as AreasListParams) };
        case 'areas_create':
          return { toolResult: await this.areaTools.createArea(args as unknown as AreasCreateParams) };
        
        // Tag tools
        case 'tags_list':
          return { toolResult: await this.tagTools.listTags() };
        case 'tags_create':
          return { toolResult: await this.tagTools.createTag(args as unknown as TagsCreateParams) };
        case 'tags_add':
          return { toolResult: await this.tagTools.addTags(args as unknown as TagsAddParams) };
        case 'tags_remove':
          return { toolResult: await this.tagTools.removeTags(args as unknown as TagsRemoveParams) };
        
        // Bulk tools
        case 'bulk_move':
          return { toolResult: await this.bulkTools.move(args as unknown as BulkMoveParams) };
        case 'bulk_updateDates':
          return { toolResult: await this.bulkTools.updateDates(args as unknown as BulkUpdateDatesParams) };
        
        // Logbook tools
        case 'logbook_search':
          return { toolResult: await this.logbookTools.search(args as unknown as LogbookSearchParams) };
        
        // System tools
        case 'system_refresh':
          return { toolResult: await this.systemTools.refresh() };
        case 'system_launch':
          return { toolResult: await this.systemTools.launch() };
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
    
    this.logger.info(`Registered ${todoTools.length} TODO tools`);
    this.logger.info(`Registered ${projectTools.length} Project tools`);
    this.logger.info(`Registered ${areaTools.length} Area tools`);
    this.logger.info(`Registered ${tagTools.length} Tag tools`);
    this.logger.info(`Registered ${bulkTools.length} Bulk tools`);
    this.logger.info(`Registered ${logbookTools.length} Logbook tools`);
    this.logger.info(`Registered ${systemTools.length} System tools`);
    this.logger.info(`Total tools registered: ${allTools.length}`);
  }

  async start(): Promise<void> {
    await this.server.connect(this.transport);
  }

  async stop(): Promise<void> {
    await this.server.close();
  }
}