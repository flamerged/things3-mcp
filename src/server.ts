// ABOUTME: Main MCP server implementation for Things3 integration
// ABOUTME: Handles tool registration and request routing

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TodosTools } from './tools/todos.js';

export class Things3Server {
  private server: Server;
  private transport: StdioServerTransport;
  public todosTools: TodosTools;

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
    this.registerTools();
  }

  private registerTools(): void {
    console.log('Registering Things3 tools...');
    
    // Register TODO tools
    const todoTools = TodosTools.getTools();
    
    // Update server capabilities
    this.server.registerCapabilities({
      tools: Object.fromEntries(
        todoTools.map(tool => [tool.name, tool])
      ),
    });
    
    // Register the handler for all tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
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
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
    
    console.log(`Registered ${todoTools.length} TODO tools`);
  }

  async start(): Promise<void> {
    await this.server.connect(this.transport);
  }

  async stop(): Promise<void> {
    await this.server.close();
  }
}