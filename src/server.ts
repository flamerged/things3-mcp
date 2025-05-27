// ABOUTME: Main MCP server implementation for Things3 integration
// ABOUTME: Handles tool registration and request routing

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TodosTools } from './tools/todos.js';
import { ProjectTools } from './tools/projects.js';
import { AreaTools } from './tools/areas.js';
import { TagTools } from './tools/tags.js';

export class Things3Server {
  private server: Server;
  private transport: StdioServerTransport;
  public todosTools: TodosTools;
  public projectTools: ProjectTools;
  public areaTools: AreaTools;
  public tagTools: TagTools;

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
    this.registerTools();
  }

  private registerTools(): void {
    console.log('Registering Things3 tools...');
    
    // Get all tools
    const todoTools = TodosTools.getTools();
    const projectTools = ProjectTools.getTools(this.projectTools);
    const areaTools = AreaTools.getTools(this.areaTools);
    const tagTools = TagTools.getTools(this.tagTools);
    
    // Combine all tools
    const allTools = [...todoTools, ...projectTools, ...areaTools, ...tagTools];
    
    // Update server capabilities
    this.server.registerCapabilities({
      tools: Object.fromEntries(
        allTools.map(tool => [tool.name, tool])
      ),
    });
    
    // Register the handler for all tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        // TODO tools
        case 'todos.list':
          return { toolResult: await this.todosTools.listTodos(args as any) };
        case 'todos.get':
          return { toolResult: await this.todosTools.getTodo(args as any) };
        case 'todos.create':
          return { toolResult: await this.todosTools.createTodo(args as any) };
        case 'todos.update':
          return { toolResult: await this.todosTools.updateTodo(args as any) };
        case 'todos.complete':
          return { toolResult: await this.todosTools.completeTodos(args as any) };
        case 'todos.uncomplete':
          return { toolResult: await this.todosTools.uncompleteTodos(args as any) };
        case 'todos.delete':
          return { toolResult: await this.todosTools.deleteTodos(args as any) };
        
        // Project tools
        case 'projects.list':
          return { toolResult: await this.projectTools.listProjects(args as any) };
        case 'projects.get':
          return { toolResult: await this.projectTools.getProject(args as any) };
        case 'projects.create':
          return { toolResult: await this.projectTools.createProject(args as any) };
        case 'projects.update':
          return { toolResult: await this.projectTools.updateProject(args as any) };
        case 'projects.complete':
          return { toolResult: await this.projectTools.completeProject(args as any) };
        
        // Area tools
        case 'areas.list':
          return { toolResult: await this.areaTools.listAreas(args as any) };
        case 'areas.create':
          return { toolResult: await this.areaTools.createArea(args as any) };
        
        // Tag tools
        case 'tags.list':
          return { toolResult: await this.tagTools.listTags() };
        case 'tags.create':
          return { toolResult: await this.tagTools.createTag(args as any) };
        case 'tags.add':
          return { toolResult: await this.tagTools.addTags(args as any) };
        case 'tags.remove':
          return { toolResult: await this.tagTools.removeTags(args as any) };
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
    
    console.log(`Registered ${todoTools.length} TODO tools`);
    console.log(`Registered ${projectTools.length} Project tools`);
    console.log(`Registered ${areaTools.length} Area tools`);
    console.log(`Registered ${tagTools.length} Tag tools`);
    console.log(`Total tools registered: ${allTools.length}`);
  }

  async start(): Promise<void> {
    await this.server.connect(this.transport);
  }

  async stop(): Promise<void> {
    await this.server.close();
  }
}