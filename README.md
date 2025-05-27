# Things3 MCP Server

An MCP (Model Context Protocol) server that provides comprehensive integration with Things3 on macOS using AppleScript for optimal performance.

## Features

- Complete Things3 integration with 27 tools
- TODO management (create, update, complete, delete)
- Project and Area management
- Tag system with hierarchy support
- Checklist management
- Bulk operations
- Smart caching for improved performance
- Self-correcting error handling

## Requirements

- macOS (Things3 is macOS only)
- Node.js >= 16.0.0
- Things3 app installed
- AppleScript access enabled in System Preferences

## Installation

```bash
npm install
npm run build
```

## Usage with Claude Desktop

1. Build the server:
   ```bash
   npm run build
   ```

2. Add the server to your Claude Desktop configuration file:
   
   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   
   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

3. Add the following to your configuration:
   ```json
   {
     "mcpServers": {
       "things3": {
         "command": "node",
         "args": ["/path/to/mcp-things3/dist/index.js"]
       }
     }
   }
   ```
   
   Replace `/path/to/mcp-things3` with the actual path to your installation.

4. Restart Claude Desktop

5. The Things3 tools will now be available in Claude's tool menu

## Usage with Other MCP Clients

### Running as a Standalone Server

```bash
npm start
```

The server will start and listen for MCP connections. Configure your MCP client to connect to the server using the appropriate transport method.

### Integration with MCP-Compatible Applications

Most MCP clients support configuration through:

1. **Direct Command Execution**: Point to the built server
   ```json
   {
     "command": "node",
     "args": ["dist/index.js"]
   }
   ```

2. **NPM Script**: Use the npm start command
   ```json
   {
     "command": "npm",
     "args": ["start"],
     "cwd": "/path/to/mcp-things3"
   }
   ```

## Example Usage in Claude

Once configured, you can use natural language to interact with Things3:

- "Create a new TODO to review the quarterly report by Friday"
- "Show me all TODOs for today"
- "Mark the 'Send email to team' task as complete"
- "Create a new project called 'Website Redesign' with three tasks"
- "Add a 'urgent' tag to all TODOs due today"

## Troubleshooting

### Things3 Not Responding
- Ensure Things3 is installed and running
- Check that AppleScript access is enabled in System Preferences > Security & Privacy > Privacy > Automation

### Permission Errors
- Grant Terminal/your IDE permission to control Things3 in System Preferences
- Restart the application after granting permissions

### MCP Connection Issues
- Verify the path in your configuration is correct
- Check that the server builds successfully with `npm run build`
- Look for error messages in Claude's developer console

## Development

```bash
npm run dev    # Run with TypeScript watch mode
npm test       # Run tests
npm run lint   # Run ESLint
```

## License

MIT