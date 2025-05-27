# Things3 MCP Server Specification

## Overview
An MCP (Model Context Protocol) server that provides comprehensive integration with Things3 on macOS using AppleScript for optimal performance.

## Core Requirements

### Technology Stack
- **Interface**: AppleScript for Things3 communication
- **Platform**: macOS only (Things3 requirement)
- **Error Handling**: Self-correcting behavior for common errors
- **Caching**: Smart caching for projects, areas, and tags with 5-minute refresh

### Data Models

#### TODO Item
```typescript
interface TodoItem {
  id: string;
  title: string;
  notes?: string;
  whenDate?: DateTime;  // When to work on it (supports time)
  deadline?: DateTime;  // When it must be done (supports time)
  completed: boolean;
  tags: string[];
  projectId?: string;
  areaId?: string;
  checklistItems?: ChecklistItem[];
  reminder?: Reminder;
}

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

interface Reminder {
  dateTime: DateTime;
  relativeToDeadline?: boolean;  // If true, relative to deadline
  relativeToWhen?: boolean;       // If true, relative to when date
}
```

#### Project
```typescript
interface Project {
  id: string;
  name: string;
  notes?: string;
  areaId?: string;
  completed: boolean;
  headings?: Heading[];
}

interface Heading {
  id: string;
  title: string;
}
```

#### Area
```typescript
interface Area {
  id: string;
  name: string;
  visible: boolean;
}
```

#### Tag
```typescript
interface Tag {
  id: string;
  name: string;
  parentTagId?: string;  // For nested tags
}
```

## Tool Definitions

### TODO Management Tools

#### 1. `todos.list`
Lists TODOs with filtering options (lightweight).
```typescript
Parameters:
- filter?: "inbox" | "today" | "upcoming" | "anytime" | "someday" | "logbook"
- status?: "open" | "completed" | "cancelled"
- projectId?: string
- areaId?: string
- tags?: string[]  // Multiple tags for AND filtering
- searchText?: string
- limit?: number
- offset?: number

Returns: Array<{id: string, title: string, whenDate?: DateTime, completed: boolean}>
```

#### 2. `todos.get`
Fetches complete details for a specific TODO.
```typescript
Parameters:
- id: string

Returns: TodoItem (full details)
```

#### 3. `todos.create`
Creates a new TODO with self-correction.
```typescript
Parameters:
- title: string
- notes?: string
- whenDate?: DateTime
- deadline?: DateTime
- tags?: string[]
- projectId?: string
- areaId?: string
- checklistItems?: string[]  // Array of titles
- reminder?: {
    dateTime?: DateTime,
    minutesBeforeDeadline?: number,
    minutesBeforeWhen?: number
  }

Returns: {id: string, success: boolean, correctionsMade?: string[]}
```

#### 4. `todos.update`
Updates an existing TODO.
```typescript
Parameters:
- id: string
- title?: string
- notes?: string
- whenDate?: DateTime | null  // null to clear
- deadline?: DateTime | null
- tags?: string[]  // Replaces all tags
- projectId?: string | null
- areaId?: string | null

Returns: {success: boolean, correctionsMade?: string[]}
```

#### 5. `todos.complete`
Marks TODO(s) as complete.
```typescript
Parameters:
- ids: string | string[]

Returns: {success: boolean, completedCount: number}
```

#### 6. `todos.uncomplete`
Marks TODO(s) as incomplete.
```typescript
Parameters:
- ids: string | string[]

Returns: {success: boolean, uncompletedCount: number}
```

#### 7. `todos.delete`
Deletes TODO(s).
```typescript
Parameters:
- ids: string | string[]

Returns: {success: boolean, deletedCount: number}
```

### Checklist Management Tools

#### 8. `checklist.add`
Adds checklist items to a TODO.
```typescript
Parameters:
- todoId: string
- items: string[]  // Array of titles

Returns: {success: boolean, addedCount: number}
```

#### 9. `checklist.update`
Updates a checklist item.
```typescript
Parameters:
- todoId: string
- checklistItemId: string
- title?: string
- completed?: boolean

Returns: {success: boolean}
```

#### 10. `checklist.reorder`
Reorders checklist items.
```typescript
Parameters:
- todoId: string
- checklistItemIds: string[]  // New order

Returns: {success: boolean}
```

#### 11. `checklist.delete`
Deletes checklist items.
```typescript
Parameters:
- todoId: string
- checklistItemIds: string[]

Returns: {success: boolean, deletedCount: number}
```

### Project Management Tools

#### 12. `projects.list`
Lists all projects (cached).
```typescript
Parameters:
- areaId?: string
- includeCompleted?: boolean

Returns: Array<{id: string, name: string, areaId?: string, completed: boolean}>
```

#### 13. `projects.get`
Gets full project details.
```typescript
Parameters:
- id: string

Returns: Project (full details)
```

#### 14. `projects.create`
Creates a new project.
```typescript
Parameters:
- name: string
- notes?: string
- areaId?: string
- headings?: string[]  // Heading titles

Returns: {id: string, success: boolean}
```

#### 15. `projects.update`
Updates a project.
```typescript
Parameters:
- id: string
- name?: string
- notes?: string
- areaId?: string | null

Returns: {success: boolean}
```

#### 16. `projects.complete`
Completes a project.
```typescript
Parameters:
- id: string

Returns: {success: boolean}
```

### Area Management Tools

#### 17. `areas.list`
Lists all areas (cached).
```typescript
Parameters:
- includeHidden?: boolean

Returns: Array<{id: string, name: string, visible: boolean}>
```

#### 18. `areas.create`
Creates a new area.
```typescript
Parameters:
- name: string

Returns: {id: string, success: boolean}
```

### Tag Management Tools

#### 19. `tags.list`
Lists all tags (cached).
```typescript
Returns: Array<{id: string, name: string, parentTagId?: string}>
```

#### 20. `tags.create`
Creates a new tag.
```typescript
Parameters:
- name: string
- parentTagId?: string

Returns: {id: string, success: boolean}
```

#### 21. `tags.add`
Adds tags to multiple items.
```typescript
Parameters:
- itemIds: string[]
- tags: string[]

Returns: {success: boolean, updatedCount: number}
```

#### 22. `tags.remove`
Removes tags from multiple items.
```typescript
Parameters:
- itemIds: string[]
- tags: string[]

Returns: {success: boolean, updatedCount: number}
```

### Bulk Operation Tools

#### 23. `bulk.move`
Moves multiple TODOs to a project/area.
```typescript
Parameters:
- todoIds: string[]
- projectId?: string | null
- areaId?: string | null

Returns: {success: boolean, movedCount: number}
```

#### 24. `bulk.updateDates`
Updates dates for multiple TODOs.
```typescript
Parameters:
- todoIds: string[]
- whenDate?: DateTime | null
- deadline?: DateTime | null

Returns: {success: boolean, updatedCount: number}
```

### Logbook Tools

#### 25. `logbook.search`
Searches completed items.
```typescript
Parameters:
- searchText?: string
- completedAfter?: DateTime
- completedBefore?: DateTime
- projectId?: string
- tags?: string[]
- limit?: number

Returns: Array<{
  id: string, 
  title: string, 
  completedDate: DateTime,
  projectName?: string
}>
```

### System Tools

#### 26. `system.refresh`
Manually refreshes cached data.
```typescript
Returns: {success: boolean, refreshed: string[]}  // List of cache types refreshed
```

#### 27. `system.launch`
Ensures Things3 is running.
```typescript
Returns: {success: boolean, wasAlreadyRunning: boolean}
```

## Implementation Notes

### AppleScript Integration
- Use `osascript` command-line tool for AppleScript execution
- Implement proper escaping for string parameters
- Handle AppleScript timeouts (30 second default)

### Error Handling & Self-Correction
1. **Date conflicts**: If deadline < whenDate, automatically swap them
2. **Missing titles**: Generate from first line of notes or use "Untitled"
3. **Invalid project/area**: Move to Inbox and log correction
4. **Invalid tag names**: Clean special characters that Things3 doesn't support

### Caching Strategy
```typescript
interface CacheConfig {
  projects: { ttl: 300 },  // 5 minutes
  areas: { ttl: 300 },     // 5 minutes  
  tags: { ttl: 300 },      // 5 minutes
  
  // Invalidate on:
  // - Create/update operations for respective types
  // - Manual refresh call
  // - TTL expiration
}
```

### Performance Optimizations
1. Batch AppleScript commands where possible
2. Use lightweight list operations by default
3. Implement connection pooling for AppleScript processes
4. Pre-compile frequently used AppleScript templates

### Things3 Launch Handling
```typescript
async function ensureThings3Running() {
  if (!isThings3Running()) {
    try {
      await launchThings3();
      await waitForReady(maxWait: 5000);
    } catch (error) {
      throw new Error("Failed to launch Things3: " + error.message);
    }
  }
}
```

### Date/Time Handling
- Support full ISO 8601 datetime strings
- Convert to Things3's expected AppleScript date format
- Handle timezone conversions appropriately

### Example AppleScript Templates

#### Create TODO
```applescript
tell application "Things3"
  set newTodo to make new to do with properties {name:"$TITLE", notes:"$NOTES"}
  set when date of newTodo to date "$WHEN_DATE"
  set due date of newTodo to date "$DEADLINE"
  move newTodo to project "$PROJECT_NAME"
  return id of newTodo
end tell
```

#### Query with Tags
```applescript
tell application "Things3"
  set matchingTodos to {}
  repeat with t in to dos
    set todoTags to tag names of t
    if {"$TAG1", "$TAG2"} is in todoTags then
      set end of matchingTodos to {id:id of t, name:name of t}
    end if
  end repeat
  return matchingTodos
end tell
```

## Security Considerations
- No authentication required (local macOS only)
- Relies on macOS user permissions for Things3 access
- No sensitive data transmission over network

## Testing Recommendations
1. Unit tests for AppleScript command generation
2. Integration tests with Things3 test database
3. Performance tests for bulk operations
4. Cache invalidation tests
5. Error correction scenario tests

## Future Enhancements (Not in initial scope)
- Recurring task support
- File attachment handling
- Quick Entry integration
- Natural language date parsing
- Siri Shortcuts integration

---

This specification provides a complete blueprint for implementing the Things3 MCP server with all requested features, optimized for performance and usability.
