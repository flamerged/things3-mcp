# Things3 MCP Server Implementation Plan

## Phase 1: Blueprint and Architecture

### Overall Project Structure
The Things3 MCP Server will be built as a Node.js/TypeScript application that:
1. Implements the MCP (Model Context Protocol) server specification
2. Communicates with Things3 via AppleScript through the `osascript` command
3. Provides 27 tools for comprehensive Things3 integration
4. Includes smart caching, error correction, and performance optimizations

### Key Components
1. **MCP Server Core**: Handles protocol communication and tool registration
2. **AppleScript Bridge**: Executes AppleScript commands and handles responses
3. **Data Models**: TypeScript interfaces for type safety
4. **Cache Manager**: TTL-based caching for projects, areas, and tags
5. **Error Handler**: Self-correcting behavior for common issues
6. **Tool Implementations**: 27 tools organized by category

## Phase 2: Iterative Development Chunks

### Chunk 1: Foundation and Core Infrastructure
- Project setup with TypeScript
- Basic MCP server implementation
- AppleScript bridge foundation
- Core data models
- Error handling framework

### Chunk 2: Basic TODO Operations
- List TODOs tool
- Get TODO details tool
- Create TODO tool with basic properties
- Complete/uncomplete TODO tools

### Chunk 3: TODO Management Enhancement
- Update TODO tool
- Delete TODO tool
- Date/time handling utilities
- Self-correction for common errors

### Chunk 4: Project and Area Management
- List projects tool (with caching)
- Get project details tool
- Create/update project tools
- List areas tool (with caching)
- Create area tool

### Chunk 5: Tag System
- List tags tool (with caching)
- Create tag tool
- Add/remove tags from items tools
- Tag hierarchy support

### Chunk 6: Advanced Features
- Checklist management tools
- Bulk operations tools
- Logbook search tool
- System utilities (refresh, launch)

### Chunk 7: Performance and Polish
- Cache manager implementation
- AppleScript optimization
- Connection pooling
- Integration testing

## Phase 3: Small Implementation Steps

### Step 1: Project Initialization
- Initialize npm project
- Install MCP SDK and TypeScript
- Configure TypeScript
- Set up project structure
- Create basic package.json scripts

### Step 2: Core MCP Server
- Implement basic MCP server class
- Set up tool registration system
- Create server entry point
- Add basic logging

### Step 3: Data Models
- Define TypeScript interfaces
- Create type definitions file
- Add validation utilities
- Implement model converters

### Step 4: AppleScript Bridge Foundation
- Create AppleScript executor class
- Implement command builder
- Add response parser
- Handle basic errors

### Step 5: First TODO Tool (List)
- Implement todos.list tool
- Create AppleScript template
- Parse response data
- Add basic filtering

### Step 6: Cache Manager Setup
- Create cache manager class
- Implement TTL logic
- Add cache invalidation
- Wire into relevant tools

### Step 7: Error Correction Framework
- Create error handler class
- Implement correction strategies
- Add logging for corrections
- Test with edge cases

### Step 8: Complete TODO CRUD
- Implement remaining TODO tools
- Add date handling
- Integrate error correction
- Test full CRUD cycle

### Step 9: Project/Area Tools
- Implement all project tools
- Implement all area tools
- Add caching integration
- Test relationships

### Step 10: Tag System
- Implement tag tools
- Add hierarchy support
- Integrate with items
- Test tag operations

### Step 11: Advanced Features
- Implement checklist tools
- Add bulk operations
- Create logbook search
- Add system utilities

### Step 12: Final Integration
- Wire all components together
- Add comprehensive error handling
- Implement performance optimizations
- Create documentation

## Phase 4: Test-Driven Implementation Prompts

### Prompt 1: Project Setup and Core Infrastructure

```text
I need to create a new MCP (Model Context Protocol) server for Things3 integration. Please help me set up the initial project structure with TypeScript.

Requirements:
1. Initialize a new Node.js project with TypeScript support
2. Install necessary dependencies: @modelcontextprotocol/sdk, typescript, @types/node
3. Create a proper TypeScript configuration for a Node.js project
4. Set up the basic directory structure: src/, src/types/, src/tools/, src/utils/
5. Create the package.json with appropriate scripts for building and running
6. Add a basic .gitignore file

Please provide:
- Complete package.json with all dependencies and scripts
- tsconfig.json with appropriate settings
- Basic directory structure
- Initial index.ts file that imports MCP SDK

Focus on getting the foundation right with proper TypeScript configuration and project structure.
```

### Prompt 2: MCP Server Implementation

```text
Building on the project setup, I need to implement the core MCP server class that will handle all Things3 operations.

Requirements:
1. Create a Things3Server class that extends or implements the MCP server interface
2. Set up the server to handle tool registration
3. Implement a method to register all 27 tools (start with placeholder registrations)
4. Create proper server initialization with error handling
5. Add logging capability using console.log for now

Create these files:
- src/server.ts - Main server class
- src/index.ts - Entry point that instantiates and starts the server
- src/types/index.ts - Basic type definitions for the server

The server should:
- Initialize properly
- Register tools (even if empty implementations)
- Handle graceful shutdown
- Log important events

Include proper TypeScript types and error handling throughout.
```

### Prompt 3: Data Models and Type Definitions

```text
I need to create comprehensive TypeScript interfaces for all Things3 data models based on the specification.

Create src/types/models.ts with interfaces for:
1. TodoItem (with all properties including dates, tags, checklist items)
2. ChecklistItem
3. Reminder
4. Project (with headings)
5. Heading
6. Area
7. Tag

Also create src/types/tools.ts with:
1. Parameter types for each tool (e.g., TodosListParams, TodosCreateParams)
2. Return types for each tool
3. Common types like Filter, Status enums

Ensure:
- All dates use string type (ISO 8601)
- Optional properties are properly marked
- Arrays are typed correctly
- Include helpful JSDoc comments

These types will be used throughout the application for type safety.
```

### Prompt 4: AppleScript Bridge Foundation

```text
I need to create an AppleScript bridge that will execute commands and parse responses for Things3 integration.

Create src/utils/applescript.ts with:
1. An AppleScriptBridge class that uses child_process to execute osascript
2. Methods for:
   - execute(script: string): Promise<string>
   - executeWithTimeout(script: string, timeout: number): Promise<string>
   - escapeString(str: string): string (for safely embedding strings in AppleScript)
   - parseResponse(response: string): any (basic parsing of AppleScript output)

Also create src/utils/applescript-templates.ts with:
1. Template functions that generate AppleScript code
2. Start with basic templates for:
   - listTodos(filter?: string)
   - getTodoById(id: string)
   - createTodo(title: string, notes?: string)

Include:
- Proper error handling for execution failures
- Timeout handling (default 30 seconds)
- Response parsing that handles AppleScript's output format
- Tests or example usage

Make sure the bridge is reusable and handles common AppleScript quirks.
```

### Prompt 5: First Working Tool - List TODOs

```text
Now I need to implement the first fully functional tool: todos.list

Building on previous code, implement:

1. In src/tools/todos.ts:
   - Create TodosTools class
   - Implement listTodos method that:
     - Accepts filtering parameters
     - Generates appropriate AppleScript using templates
     - Executes via AppleScriptBridge
     - Parses and returns typed results
     - Handles errors gracefully

2. Update src/utils/applescript-templates.ts:
   - Create comprehensive listTodos template that handles all filters
   - Support for: inbox, today, upcoming, anytime, someday, logbook
   - Include search text filtering
   - Return id, title, when date, and completed status

3. Update src/server.ts:
   - Register the todos.list tool properly
   - Wire up the TodosTools class

4. Add src/utils/date-handler.ts:
   - Create utilities for date conversion between JS and AppleScript formats

Include error handling for:
- Things3 not running
- Invalid filter values
- AppleScript execution errors

Test the implementation with a simple example that lists today's todos.
```

### Prompt 6: Cache Manager Implementation

```text
I need to implement a caching system for projects, areas, and tags to improve performance.

Create src/utils/cache-manager.ts with:

1. A CacheManager class that:
   - Stores data with TTL (time-to-live)
   - Supports get, set, and invalidate operations
   - Handles automatic expiration
   - Provides cache statistics

2. Cache configuration for:
   - Projects: 5-minute TTL
   - Areas: 5-minute TTL  
   - Tags: 5-minute TTL

3. Methods:
   - get<T>(key: string): T | null
   - set<T>(key: string, value: T, ttl?: number): void
   - invalidate(key: string): void
   - invalidatePattern(pattern: string): void
   - clear(): void

Also create src/tools/cache-aware-base.ts:
- Base class for tools that use caching
- Helper methods for cache integration
- Automatic cache invalidation on updates

Update existing code to:
- Make project/area/tag list operations use the cache
- Invalidate cache on create/update/delete operations

Include proper TypeScript generics and comprehensive error handling.
```

### Prompt 7: Error Correction Framework

```text
I need to implement the self-correcting error handling system for common Things3 issues.

Create src/utils/error-correction.ts with:

1. ErrorCorrector class that handles:
   - Date conflicts (deadline < when date)
   - Missing titles
   - Invalid project/area references
   - Invalid tag names

2. Correction strategies:
   - DateConflictCorrector: Swaps when/deadline if needed
   - MissingTitleCorrector: Generates from notes or uses "Untitled"
   - InvalidReferenceCorrector: Moves to Inbox
   - TagNameCleaner: Removes invalid characters

3. Integration points:
   - Pre-validation before AppleScript execution
   - Post-execution correction if needed
   - Logging of all corrections made

Create src/types/corrections.ts:
- CorrectionResult interface
- CorrectionType enum
- Detailed correction reporting

Update todos.create and todos.update to:
- Use error correction
- Return correction details in response
- Log corrections for debugging

Include unit tests or examples showing each correction type in action.
```

### Prompt 8: Complete TODO CRUD Operations

```text
I need to implement the remaining TODO operations to complete the CRUD functionality.

Implement in src/tools/todos.ts:

1. getTodo(id: string)
   - Fetch complete TODO details
   - Include all properties (checklist, reminder, etc.)
   - Handle not found errors

2. createTodo(params: TodosCreateParams)
   - Support all parameters from spec
   - Integrate error correction
   - Handle project/area assignment
   - Support checklist items in creation
   - Return created TODO id

3. updateTodo(id: string, params: TodosUpdateParams)
   - Support partial updates
   - Handle null values (to clear fields)
   - Integrate error correction
   - Validate tag updates

4. completeTodo(ids: string | string[])
   - Support single or multiple IDs
   - Return completion count
   - Handle already completed items

5. uncompleteTodo(ids: string | string[])
   - Support single or multiple IDs
   - Return uncompleted count

6. deleteTodo(ids: string | string[])
   - Support single or multiple IDs
   - Return deletion count
   - Handle not found gracefully

Update AppleScript templates for each operation with proper error handling.

Ensure all methods are properly registered as tools in the server.
```

### Prompt 9: Project and Area Management

```text
I need to implement all project and area management tools with caching support.

Create src/tools/projects.ts with:
1. listProjects(params)
   - Use cache manager
   - Filter by area if specified
   - Include/exclude completed
   
2. getProject(id)
   - Full project details
   - Include headings
   
3. createProject(params)
   - Support area assignment
   - Create with headings
   - Invalidate cache
   
4. updateProject(id, params)
   - Update properties
   - Invalidate cache
   
5. completeProject(id)
   - Mark as complete
   - Invalidate cache

Create src/tools/areas.ts with:
1. listAreas(params)
   - Use cache manager
   - Include/exclude hidden
   
2. createArea(name)
   - Create new area
   - Invalidate cache

Update AppleScript templates:
- Add project-specific templates
- Add area-specific templates
- Handle Things3's project/area model

Ensure proper cache invalidation and error handling throughout.
```

### Prompt 10: Tag System Implementation

```text
I need to implement the complete tag system with hierarchy support and caching.

Create src/tools/tags.ts with:

1. listTags()
   - Use cache manager
   - Include parent-child relationships
   - Return flat array with parentTagId

2. createTag(params)
   - Support nested tags (parentTagId)
   - Handle invalid characters
   - Invalidate cache

3. addTags(itemIds, tags)
   - Bulk add tags to items
   - Support both TODO and project items
   - Return updated count

4. removeTags(itemIds, tags)
   - Bulk remove tags from items
   - Support both TODO and project items
   - Return updated count

AppleScript considerations:
- Things3 uses "tag names" not IDs internally
- Handle tag hierarchy properly
- Escape tag names with special characters

Create src/utils/tag-validator.ts:
- Validate tag names
- Clean invalid characters
- Handle tag path parsing (Parent/Child format)

Ensure all tag operations properly update the cache and handle Things3's tag model.
```

### Prompt 11: Advanced Features Implementation

```text
I need to implement the remaining advanced features: checklists, bulk operations, logbook, and system tools.

Create src/tools/checklist.ts:
1. addChecklistItems(todoId, items)
2. updateChecklistItem(todoId, itemId, params)
3. reorderChecklist(todoId, itemIds)
4. deleteChecklistItems(todoId, itemIds)

Create src/tools/bulk.ts:
1. bulkMove(todoIds, projectId, areaId)
   - Move multiple TODOs at once
2. bulkUpdateDates(todoIds, whenDate, deadline)
   - Update dates for multiple TODOs

Create src/tools/logbook.ts:
1. searchLogbook(params)
   - Search completed items
   - Support date ranges
   - Include project names

Create src/tools/system.ts:
1. refreshCache()
   - Manually refresh all caches
2. launchThings3()
   - Ensure Things3 is running
   - Wait for ready state

Update AppleScript templates for:
- Complex checklist operations
- Bulk operations efficiency
- Logbook queries
- Application control

Focus on performance for bulk operations and proper Things3 app lifecycle handling.
```

### Prompt 12: Final Integration and Optimization

```text
I need to complete the final integration, wire everything together, and add optimizations.

Tasks:

1. Update src/server.ts:
   - Register all 27 tools properly
   - Add comprehensive error handling
   - Implement graceful shutdown
   - Add request logging

2. Create src/utils/connection-pool.ts:
   - Pool AppleScript processes
   - Reuse connections for performance
   - Handle process lifecycle

3. Create src/utils/performance.ts:
   - Batch similar operations
   - Pre-compile AppleScript templates
   - Add operation timing

4. Update src/index.ts:
   - Add command-line argument parsing
   - Support different log levels
   - Handle process signals properly

5. Create src/config.ts:
   - Centralize configuration
   - Support environment variables
   - Configure timeouts, cache TTLs, etc.

6. Add error recovery:
   - Retry failed operations
   - Handle Things3 crashes
   - Recover from AppleScript timeouts

7. Create README.md with:
   - Installation instructions
   - Tool documentation
   - Usage examples
   - Troubleshooting guide

Ensure the server is production-ready with proper logging, error handling, and performance optimizations.
```

## Summary

This plan breaks down the Things3 MCP Server into 12 manageable implementation steps, each building on the previous one. The prompts are designed to:

1. Start with foundational setup
2. Build core functionality incrementally  
3. Add features in logical groups
4. Integrate caching and error correction throughout
5. End with optimization and polish

Each prompt:
- Has clear, specific requirements
- Builds on previous work
- Includes error handling and edge cases
- Results in working, tested code
- Avoids large complexity jumps

The implementation follows MCP best practices and Things3's AppleScript capabilities while maintaining performance through caching and optimization strategies.