# Things3 MCP Server

A powerful MCP (Model Context Protocol) server that provides comprehensive integration with Things3 on macOS. This server enables AI assistants and other MCP clients to interact with Things3 through 23 specialized tools, offering complete task management capabilities with intelligent caching and error correction.

## Features

- **Complete Things3 Integration**: 23 tools covering all aspects of Things3
- **TODO Management**: Create, read, update, delete, complete, and uncomplete tasks
- **Project & Area Management**: Full project lifecycle support with area organization
- **Tag System**: Hierarchical tag support with bulk tag operations
- **Bulk Operations**: Efficiently move or update multiple items at once
- **Smart Caching**: 5-minute TTL caching for projects, areas, and tags
- **Error Correction**: Automatic fixing of common issues (date conflicts, missing titles)
- **Logbook Search**: Search completed items with date range filtering
- **Performance Optimized**: Connection pooling and AppleScript optimization

## Requirements

- **macOS** (Things3 is macOS-only)
- **Node.js** >= 16.0.0
- **Things3** app installed
- **AppleScript** access enabled in System Settings

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/things3-mcp.git
cd things3-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### For Claude Desktop

1. Open Claude Desktop configuration:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: Not applicable (Things3 is macOS-only)

2. Add the Things3 MCP server:
   ```json
   {
     "mcpServers": {
       "things3": {
         "command": "node",
         "args": ["/absolute/path/to/things3-mcp/dist/index.js"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

3. Restart Claude Desktop

### For Other MCP Clients

Configure your MCP client to run:
```bash
node /path/to/things3-mcp/dist/index.js
```

Or use npm:
```bash
cd /path/to/things3-mcp && npm start
```

## Available Tools

### TODO Tools (7)

#### `todos_list`
List TODOs with flexible filtering options.

**Parameters:**
- `filter`: `"inbox"` | `"today"` | `"upcoming"` | `"anytime"` | `"someday"` | `"logbook"` (optional)
- `searchText`: Search within titles and notes (optional)

**Example:**
```json
{
  "filter": "today",
  "searchText": "meeting"
}
```

#### `todos_get`
Get detailed information about a specific TODO.

**Parameters:**
- `id`: The TODO's unique identifier (required)

#### `todos_create`
Create a new TODO with full property support.

**Parameters:**
- `title`: Task title (required)
- `notes`: Additional notes (optional)
- `whenDate`: ISO 8601 date string for scheduling (optional)
- `deadline`: ISO 8601 date string for due date (optional)
- `tags`: Array of tag names (optional)
- `checklistItems`: Array of checklist item titles (optional) *
- `projectId`: Assign to project (optional)
- `areaId`: Assign to area (optional)

**Example:**
```json
{
  "title": "Review Q4 Report",
  "notes": "Focus on revenue metrics",
  "whenDate": "2024-12-15T09:00:00Z",
  "deadline": "2024-12-20T17:00:00Z",
  "tags": ["work", "urgent"],
  "checklistItems": ["Review revenue", "Check expenses", "Update forecast"],
  "projectId": "project-id-here"
}
```

\* **Note on Checklists**: When `checklistItems` are provided, the TODO is created using Things3's URL scheme instead of AppleScript. This approach has some limitations:
- Things3 may briefly come to the foreground
- The created TODO's ID cannot be directly retrieved, so the server searches for it by title
- If multiple TODOs have identical titles, the wrong TODO might be returned
- URL scheme support must be enabled in Things3 settings (Settings → General → Enable Things URLs)

#### `todos_update`
Update an existing TODO's properties.

**Parameters:**
- `id`: TODO identifier (required)
- All parameters from `todos_create` (optional)

#### `todos_complete`
Mark one or more TODOs as complete.

**Parameters:**
- `ids`: Single ID or array of IDs (required)

#### `todos_uncomplete`
Mark one or more TODOs as incomplete.

**Parameters:**
- `ids`: Single ID or array of IDs (required)

#### `todos_delete`
Delete one or more TODOs permanently.

**Parameters:**
- `ids`: Single ID or array of IDs (required)

### Project Tools (5)

#### `projects_list`
List projects with optional filtering.

**Parameters:**
- `areaId`: Filter by area (optional)
- `includeCompleted`: Include completed projects (optional, default: false)

#### `projects_get`
Get detailed project information.

**Parameters:**
- `id`: Project identifier (required)

#### `projects_create`
Create a new project.

**Parameters:**
- `name`: Project name (required)
- `notes`: Project description (optional)
- `areaId`: Assign to area (optional)
- `whenDate`: Start date (optional)
- `deadline`: Due date (optional)
- `tags`: Array of tag names (optional)
- `headings`: Array of section headings (optional)

#### `projects_update`
Update project properties.

**Parameters:**
- `id`: Project identifier (required)
- All parameters from `projects_create` except `headings` (optional)

#### `projects_complete`
Mark a project as complete.

**Parameters:**
- `id`: Project identifier (required)

### Area Tools (2)

#### `areas_list`
List all areas.

**Parameters:**
- `includeHidden`: Include hidden areas (optional, default: false)

#### `areas_create`
Create a new area.

**Parameters:**
- `name`: Area name (required)

### Tag Tools (4)

#### `tags_list`
List all tags with hierarchy information.

**Returns:** Array of tags with `parentTagId` for nested tags

#### `tags_create`
Create a new tag.

**Parameters:**
- `name`: Tag name (required)
- `parentTagId`: Parent tag for nesting (optional)

#### `tags_add`
Add tags to items.

**Parameters:**
- `itemIds`: Single ID or array of TODO/Project IDs (required)
- `tags`: Array of tag names to add (required)

#### `tags_remove`
Remove tags from items.

**Parameters:**
- `itemIds`: Single ID or array of TODO/Project IDs (required)
- `tags`: Array of tag names to remove (required)

### Bulk Tools (2)

#### `bulk_move`
Move multiple TODOs to a project or area.

**Parameters:**
- `todoIds`: Array of TODO IDs (required)
- `projectId`: Target project (optional)
- `areaId`: Target area (optional)

#### `bulk_updateDates`
Update dates for multiple TODOs.

**Parameters:**
- `todoIds`: Array of TODO IDs (required)
- `whenDate`: New scheduled date or null to clear (optional)
- `deadline`: New deadline or null to clear (optional)

### Logbook Tool (1)

#### `logbook_search`
Search completed items in the logbook.

**Parameters:**
- `searchText`: Search in titles and notes (optional)
- `fromDate`: Start date for range (optional)
- `toDate`: End date for range (optional)
- `limit`: Maximum results (optional, default: 50)

### System Tools (2)

#### `system_refresh`
Manually refresh all caches.

#### `system_launch`
Ensure Things3 is running and ready.

## Error Correction

The server automatically corrects common issues:

- **Date Conflicts**: Swaps when/deadline if deadline is before scheduled date
- **Missing Titles**: Generates title from notes or uses "Untitled"
- **Invalid References**: Moves items to Inbox if project/area doesn't exist
- **Tag Names**: Cleans special characters that Things3 doesn't support

## Usage Examples

### With Claude Desktop

```
Human: Create a new project for the website redesign with tasks for planning, design, and implementation

Claude: I'll create a website redesign project with those tasks for you.

[Creates project and tasks using the Things3 MCP tools]
```

### Direct Tool Usage

Create a TODO:
```json
{
  "tool": "todos_create",
  "parameters": {
    "title": "Prepare presentation",
    "notes": "Include Q4 metrics and projections",
    "whenDate": "2024-12-10T14:00:00Z",
    "tags": ["work", "presentation"]
  }
}
```

List today's tasks:
```json
{
  "tool": "todos_list",
  "parameters": {
    "filter": "today"
  }
}
```

## Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# Run in development mode with watch
npm run dev

# Run tests
npm test

# Run integration tests (requires Things3)
npm run test:integration

# Lint code
npm run lint

# Type check
npm run type-check
```

### Project Structure

```
things3-mcp/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP server implementation
│   ├── config.ts         # Configuration management
│   ├── tools/            # Tool implementations
│   │   ├── todos.ts      # TODO operations
│   │   ├── projects.ts   # Project operations
│   │   ├── areas.ts      # Area operations
│   │   ├── tags.ts       # Tag operations
│   │   ├── bulk.ts       # Bulk operations
│   │   ├── logbook.ts    # Logbook search
│   │   └── system.ts     # System utilities
│   ├── templates/        # AppleScript templates
│   ├── utils/            # Utility functions
│   │   ├── applescript.ts     # AppleScript bridge
│   │   ├── cache-manager.ts   # Caching system
│   │   ├── error-correction.ts # Error correction
│   │   └── date-handler.ts    # Date formatting
│   └── types/            # TypeScript definitions
├── tests/
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
└── dist/                # Compiled JavaScript
```

## Troubleshooting

### Things3 Not Responding
1. Ensure Things3 is installed and running
2. Check AppleScript permissions in System Settings > Privacy & Security > Privacy > Automation
3. Grant your terminal or IDE permission to control Things3

### Permission Errors
- macOS may require you to grant automation permissions
- Run this command to test AppleScript access:
  ```bash
  osascript -e 'tell application "Things3" to return name of first to do'
  ```

### MCP Connection Issues
1. Verify the path in your configuration is absolute
2. Check that the server builds successfully: `npm run build`
3. Look for error messages in your MCP client's logs
4. Try running the server directly: `node dist/index.js`

### Date Format Issues
- Dates must be in ISO 8601 format (e.g., "2024-12-25T10:00:00Z")
- The server automatically handles timezone conversion
- If dates appear incorrect, check your system's date format settings

### Performance Issues
- The server caches projects, areas, and tags for 5 minutes
- Use `system_refresh` to manually clear caches if needed
- For large operations, use bulk tools instead of individual operations

## Known Limitations

1. **Checklist Items**: 
   - Things3's AppleScript API doesn't support checklist manipulation
   - We use URL schemes as a workaround when creating TODOs with checklists
   - This may cause Things3 to briefly come to the foreground
   - Existing checklist items cannot be modified after creation
2. **Project Deletion**: Projects cannot be deleted via AppleScript, only completed
3. **Reminder Details**: Limited reminder information available through AppleScript
4. **Tag Hierarchy**: Tag parent-child relationships are read-only
5. **URL Scheme Limitations**: 
   - When using URL schemes (for checklists), the newly created TODO's ID cannot be directly retrieved
   - The server performs a search to find the created TODO, which may fail if multiple TODOs have identical titles

## Contributing

Contributions are welcome! Please follow conventional commit format and ensure all tests pass before submitting pull requests.

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/anthropics/mcp)
- Integrates with [Things3](https://culturedcode.com/things/) by Cultured Code
- Inspired by the MCP community and various automation tools