// ABOUTME: AppleScript template functions for generating Things3 commands
// ABOUTME: Provides type-safe template generation for all Things3 operations

import { AppleScriptBridge } from '../utils/applescript.js';
import { TodoFilter, TodoStatus } from '../types/index.js';

const bridge = new AppleScriptBridge();

/**
 * Generate AppleScript to list TODOs with filtering
 */
export function listTodos(
  filter?: TodoFilter,
  status?: TodoStatus,
  searchText?: string
): string {
  let script = 'tell application "Things3"\n';
  
  // Determine which list to query
  let listName = 'to dos';
  if (filter) {
    switch (filter) {
      case 'inbox':
        listName = 'to dos of list "Inbox"';
        break;
      case 'today':
        listName = 'to dos of list "Today"';
        break;
      case 'upcoming':
        listName = 'to dos of list "Upcoming"';
        break;
      case 'anytime':
        listName = 'to dos of list "Anytime"';
        break;
      case 'someday':
        listName = 'to dos of list "Someday"';
        break;
      case 'logbook':
        listName = 'to dos of list "Logbook"';
        break;
    }
  }
  
  script += `  set todoList to ${listName}\n`;
  script += '  set results to {}\n';
  script += '  repeat with t in todoList\n';
  
  // Apply status filter
  if (status) {
    if (status === 'open') {
      script += '    if status of t is open then\n';
    } else if (status === 'completed') {
      script += '    if status of t is completed then\n';
    } else if (status === 'cancelled') {
      script += '    if status of t is canceled then\n';
    }
  }
  
  // Apply search text filter
  if (searchText) {
    const escaped = bridge.escapeString(searchText);
    script += `    if (name of t contains "${escaped}" or notes of t contains "${escaped}") then\n`;
  }
  
  // Build result record
  script += '      set todoRecord to "{"';
  script += ' & "\\"id\\":\\"" & (id of t) & "\\","';
  script += ' & "\\"title\\":\\"" & (name of t) & "\\","';
  script += ' & "\\"completed\\":" & (status of t is completed)';
  
  // Add when date if present
  script += ' & ","';
  script += ' & "\\"whenDate\\":" & (if when date of t is missing value then "null" else "\\"" & (when date of t as string) & "\\"")';
  
  script += ' & "}"\n';
  script += '      set end of results to todoRecord\n';
  
  // Close conditionals
  if (searchText) {
    script += '    end if\n';
  }
  if (status) {
    script += '    end if\n';
  }
  
  script += '  end repeat\n';
  script += '  return "[" & (my joinList(results, ",")) & "]"\n';
  script += 'end tell\n\n';
  
  // Add helper function for joining lists
  script += 'on joinList(lst, delim)\n';
  script += '  set AppleScript\'s text item delimiters to delim\n';
  script += '  set txt to lst as text\n';
  script += '  set AppleScript\'s text item delimiters to ""\n';
  script += '  return txt\n';
  script += 'end joinList';
  
  return script;
}

/**
 * Generate AppleScript to get a TODO by ID
 */
export function getTodoById(id: string): string {
  const escapedId = bridge.escapeString(id);
  
  return `
tell application "Things3"
  try
    set t to to do id "${escapedId}"
    
    set todoRecord to "{"
    set todoRecord to todoRecord & "\\"id\\":\\"" & (id of t) & "\\","
    set todoRecord to todoRecord & "\\"title\\":\\"" & (name of t) & "\\","
    set todoRecord to todoRecord & "\\"notes\\":" & (if notes of t is missing value then "null" else "\\"" & (notes of t) & "\\"") & ","
    set todoRecord to todoRecord & "\\"completed\\":" & (status of t is completed) & ","
    set todoRecord to todoRecord & "\\"whenDate\\":" & (if when date of t is missing value then "null" else "\\"" & (when date of t as string) & "\\"") & ","
    set todoRecord to todoRecord & "\\"deadline\\":" & (if due date of t is missing value then "null" else "\\"" & (due date of t as string) & "\\"") & ","
    
    -- Get tags
    set tagList to {}
    repeat with tg in tags of t
      set end of tagList to "\\"" & (name of tg) & "\\""
    end repeat
    set todoRecord to todoRecord & "\\"tags\\":[" & (my joinList(tagList, ",")) & "],"
    
    -- Get project
    set todoRecord to todoRecord & "\\"projectId\\":" & (if project of t is missing value then "null" else "\\"" & (id of project of t) & "\\"") & ","
    
    -- Get area
    set todoRecord to todoRecord & "\\"areaId\\":" & (if area of t is missing value then "null" else "\\"" & (id of area of t) & "\\"")
    
    set todoRecord to todoRecord & "}"
    return todoRecord
  on error
    return "null"
  end try
end tell

on joinList(lst, delim)
  set AppleScript's text item delimiters to delim
  set txt to lst as text
  set AppleScript's text item delimiters to ""
  return txt
end joinList`;
}

/**
 * Generate AppleScript to create a new TODO
 */
export function createTodo(
  title: string,
  notes?: string,
  whenDate?: string,
  deadline?: string,
  tags?: string[],
  projectId?: string,
  areaId?: string
): string {
  const escapedTitle = bridge.escapeString(title);
  const escapedNotes = notes ? bridge.escapeString(notes) : '';
  
  let script = 'tell application "Things3"\n';
  
  // Create the basic todo
  script += `  set newTodo to make new to do with properties {name:"${escapedTitle}"`;
  
  if (notes) {
    script += `, notes:"${escapedNotes}"`;
  }
  
  script += '}\n';
  
  // Set dates if provided
  if (whenDate) {
    script += `  set when date of newTodo to date "${whenDate}"\n`;
  }
  
  if (deadline) {
    script += `  set due date of newTodo to date "${deadline}"\n`;
  }
  
  // Add tags if provided
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      const escapedTag = bridge.escapeString(tag);
      script += `  set tagRef to tag "${escapedTag}"\n`;
      script += '  add tagRef to tags of newTodo\n';
    }
  }
  
  // Move to project or area if specified
  if (projectId) {
    script += `  move newTodo to project id "${bridge.escapeString(projectId)}"\n`;
  } else if (areaId) {
    script += `  move newTodo to area id "${bridge.escapeString(areaId)}"\n`;
  }
  
  script += '  return id of newTodo\n';
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to update a TODO
 */
export function updateTodo(
  id: string,
  updates: {
    title?: string;
    notes?: string | null;
    whenDate?: string | null;
    deadline?: string | null;
    tags?: string[];
    projectId?: string | null;
    areaId?: string | null;
  }
): string {
  const escapedId = bridge.escapeString(id);
  
  let script = 'tell application "Things3"\n';
  script += `  set t to to do id "${escapedId}"\n`;
  
  // Update basic properties
  if (updates.title !== undefined) {
    script += `  set name of t to "${bridge.escapeString(updates.title)}"\n`;
  }
  
  if (updates.notes !== undefined) {
    if (updates.notes === null) {
      script += '  set notes of t to missing value\n';
    } else {
      script += `  set notes of t to "${bridge.escapeString(updates.notes)}"\n`;
    }
  }
  
  // Update dates
  if (updates.whenDate !== undefined) {
    if (updates.whenDate === null) {
      script += '  set when date of t to missing value\n';
    } else {
      script += `  set when date of t to date "${updates.whenDate}"\n`;
    }
  }
  
  if (updates.deadline !== undefined) {
    if (updates.deadline === null) {
      script += '  set due date of t to missing value\n';
    } else {
      script += `  set due date of t to date "${updates.deadline}"\n`;
    }
  }
  
  // Update tags (replace all)
  if (updates.tags !== undefined) {
    script += '  set tags of t to {}\n';
    for (const tag of updates.tags) {
      const escapedTag = bridge.escapeString(tag);
      script += `  set tagRef to tag "${escapedTag}"\n`;
      script += '  add tagRef to tags of t\n';
    }
  }
  
  // Move to new project/area
  if (updates.projectId !== undefined) {
    if (updates.projectId === null) {
      script += '  move t to list "Inbox"\n';
    } else {
      script += `  move t to project id "${bridge.escapeString(updates.projectId)}"\n`;
    }
  } else if (updates.areaId !== undefined) {
    if (updates.areaId === null) {
      script += '  move t to list "Inbox"\n';
    } else {
      script += `  move t to area id "${bridge.escapeString(updates.areaId)}"\n`;
    }
  }
  
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to complete TODOs
 */
export function completeTodos(ids: string[]): string {
  let script = 'tell application "Things3"\n';
  script += '  set completedCount to 0\n';
  
  for (const id of ids) {
    const escapedId = bridge.escapeString(id);
    script += '  try\n';
    script += `    set t to to do id "${escapedId}"\n`;
    script += '    if status of t is open then\n';
    script += '      set status of t to completed\n';
    script += '      set completedCount to completedCount + 1\n';
    script += '    end if\n';
    script += '  end try\n';
  }
  
  script += '  return completedCount\n';
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to uncomplete TODOs
 */
export function uncompleteTodos(ids: string[]): string {
  let script = 'tell application "Things3"\n';
  script += '  set uncompletedCount to 0\n';
  
  for (const id of ids) {
    const escapedId = bridge.escapeString(id);
    script += '  try\n';
    script += `    set t to to do id "${escapedId}"\n`;
    script += '    if status of t is completed then\n';
    script += '      set status of t to open\n';
    script += '      set uncompletedCount to uncompletedCount + 1\n';
    script += '    end if\n';
    script += '  end try\n';
  }
  
  script += '  return uncompletedCount\n';
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to delete TODOs
 */
export function deleteTodos(ids: string[]): string {
  let script = 'tell application "Things3"\n';
  script += '  set deletedCount to 0\n';
  
  for (const id of ids) {
    const escapedId = bridge.escapeString(id);
    script += '  try\n';
    script += `    set t to to do id "${escapedId}"\n`;
    script += '    delete t\n';
    script += '    set deletedCount to deletedCount + 1\n';
    script += '  end try\n';
  }
  
  script += '  return deletedCount\n';
  script += 'end tell';
  
  return script;
}