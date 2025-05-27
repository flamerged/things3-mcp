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
  
  // Build result record - simplified without when date for now
  script += '      set todoRecord to "{"';
  script += ' & "\\"id\\":\\"" & (id of t) & "\\","';
  script += ' & "\\"title\\":\\"" & (name of t) & "\\","';
  script += ' & "\\"completed\\":" & (status of t is completed)';
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
    
    -- Handle notes
    if notes of t is missing value then
      set todoRecord to todoRecord & "\\"notes\\":null,"
    else
      set todoRecord to todoRecord & "\\"notes\\":\\"" & (notes of t) & "\\","
    end if
    
    set todoRecord to todoRecord & "\\"completed\\":" & (status of t is completed) & ","
    
    -- Handle when date (activation date in Things3)
    if activation date of t is missing value then
      set todoRecord to todoRecord & "\\"whenDate\\":null,"
    else
      set todoRecord to todoRecord & "\\"whenDate\\":\\"" & (activation date of t as string) & "\\","
    end if
    
    -- Handle deadline
    if due date of t is missing value then
      set todoRecord to todoRecord & "\\"deadline\\":null,"
    else
      set todoRecord to todoRecord & "\\"deadline\\":\\"" & (due date of t as string) & "\\","
    end if
    
    -- Get tags
    set tagList to {}
    repeat with tg in tags of t
      set end of tagList to "\\"" & (name of tg) & "\\""
    end repeat
    set todoRecord to todoRecord & "\\"tags\\":[" & (my joinList(tagList, ",")) & "],"
    
    -- Get project
    if project of t is missing value then
      set todoRecord to todoRecord & "\\"projectId\\":null,"
    else
      set todoRecord to todoRecord & "\\"projectId\\":\\"" & (id of project of t) & "\\","
    end if
    
    -- Get area
    if area of t is missing value then
      set todoRecord to todoRecord & "\\"areaId\\":null"
    else
      set todoRecord to todoRecord & "\\"areaId\\":\\"" & (id of area of t) & "\\""
    end if
    
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
    script += `  set activation date of newTodo to date "${whenDate}"\n`;
  }
  
  if (deadline) {
    script += `  set due date of newTodo to date "${deadline}"\n`;
  }
  
  // Add tags if provided
  if (tags && tags.length > 0) {
    const tagNames = tags.map(tag => bridge.escapeString(tag)).join(',');
    script += `  set tag names of newTodo to "${tagNames}"\n`;
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
      script += '  set activation date of t to missing value\n';
    } else {
      script += `  set activation date of t to date "${updates.whenDate}"\n`;
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
    const tagNames = updates.tags.map(tag => bridge.escapeString(tag)).join(',');
    script += `  set tag names of t to "${tagNames}"\n`;
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

/**
 * Generate AppleScript to list projects
 */
export function listProjects(areaId?: string, includeCompleted?: boolean): string {
  let script = 'tell application "Things3"\n';
  
  // Determine which projects to list
  let projectList = 'projects';
  if (areaId) {
    const escapedAreaId = bridge.escapeString(areaId);
    projectList = `projects of area id "${escapedAreaId}"`;
  }
  
  script += `  set projectList to ${projectList}\n`;
  script += '  set results to {}\n';
  script += '  repeat with p in projectList\n';
  
  // Filter by completion status if specified
  if (includeCompleted === false) {
    script += '    if status of p is open then\n';
  }
  
  // Build result record
  script += '      set projectRecord to "{"';
  script += ' & "\\"id\\":\\"" & (id of p) & "\\","';
  script += ' & "\\"name\\":\\"" & (name of p) & "\\","';
  script += ' & "\\"completed\\":" & (status of p is completed)';
  
  // Add area if present
  script += ' & ","';
  script += ' & "\\"areaId\\":" & (if area of p is missing value then "null" else "\\"" & (id of area of p) & "\\"")';
  
  script += ' & "}"\n';
  script += '      set end of results to projectRecord\n';
  
  if (includeCompleted === false) {
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
 * Generate AppleScript to list areas
 */
export function listAreas(includeHidden?: boolean): string {
  let script = 'tell application "Things3"\n';
  script += '  set areaList to areas\n';
  script += '  set results to {}\n';
  script += '  repeat with a in areaList\n';
  
  // Filter by visibility if specified
  if (includeHidden === false) {
    script += '    if visible of a is true then\n';
  }
  
  // Build result record
  script += '      set areaRecord to "{"';
  script += ' & "\\"id\\":\\"" & (id of a) & "\\","';
  script += ' & "\\"name\\":\\"" & (name of a) & "\\","';
  script += ' & "\\"visible\\":" & (visible of a)';
  script += ' & "}"\n';
  script += '      set end of results to areaRecord\n';
  
  if (includeHidden === false) {
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
 * Generate AppleScript to get a project by ID
 */
export function getProjectById(id: string): string {
  const escapedId = bridge.escapeString(id);
  
  return `
tell application "Things3"
  try
    set p to project id "${escapedId}"
    
    set projectRecord to "{"
    set projectRecord to projectRecord & "\\"id\\":\\"" & (id of p) & "\\","
    set projectRecord to projectRecord & "\\"name\\":\\"" & (name of p) & "\\","
    
    -- Handle notes
    if notes of p is missing value then
      set projectRecord to projectRecord & "\\"notes\\":null,"
    else
      set projectRecord to projectRecord & "\\"notes\\":\\"" & (notes of p) & "\\","
    end if
    
    set projectRecord to projectRecord & "\\"completed\\":" & (status of p is completed) & ","
    
    -- Handle when date
    if activation date of p is missing value then
      set projectRecord to projectRecord & "\\"whenDate\\":null,"
    else
      set projectRecord to projectRecord & "\\"whenDate\\":\\"" & (activation date of p as string) & "\\","
    end if
    
    -- Handle deadline
    if due date of p is missing value then
      set projectRecord to projectRecord & "\\"deadline\\":null,"
    else
      set projectRecord to projectRecord & "\\"deadline\\":\\"" & (due date of p as string) & "\\","
    end if
    
    -- Get tags
    set tagList to {}
    repeat with tg in tags of p
      set end of tagList to "\\"" & (name of tg) & "\\""
    end repeat
    set projectRecord to projectRecord & "\\"tags\\":[" & (my joinList(tagList, ",")) & "],"
    
    -- Get area
    if area of p is missing value then
      set projectRecord to projectRecord & "\\"areaId\\":null,"
    else
      set projectRecord to projectRecord & "\\"areaId\\":\\"" & (id of area of p) & "\\","
    end if
    
    -- Get headings (sections within project)
    set headingsList to {}
    repeat with h in to dos of p
      if class of h is project then
        set headingRecord to "{\\"id\\":\\"" & (id of h) & "\\",\\"title\\":\\"" & (name of h) & "\\"}"
        set end of headingsList to headingRecord
      end if
    end repeat
    set projectRecord to projectRecord & "\\"headings\\":[" & (my joinList(headingsList, ",")) & "]"
    
    set projectRecord to projectRecord & "}"
    return projectRecord
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
 * Generate AppleScript to create a new project
 */
export function createProject(
  name: string,
  notes?: string,
  whenDate?: string,
  deadline?: string,
  tags?: string[],
  areaId?: string,
  headings?: string[]
): string {
  const escapedName = bridge.escapeString(name);
  const escapedNotes = notes ? bridge.escapeString(notes) : '';
  
  let script = 'tell application "Things3"\n';
  
  // Create the basic project
  script += `  set newProject to make new project with properties {name:"${escapedName}"`;
  
  if (notes) {
    script += `, notes:"${escapedNotes}"`;
  }
  
  script += '}\n';
  
  // Set dates if provided
  if (whenDate) {
    script += `  set activation date of newProject to date "${whenDate}"\n`;
  }
  
  if (deadline) {
    script += `  set due date of newProject to date "${deadline}"\n`;
  }
  
  // Add tags if provided
  if (tags && tags.length > 0) {
    const tagNames = tags.map(tag => bridge.escapeString(tag)).join(',');
    script += `  set tag names of newProject to "${tagNames}"\n`;
  }
  
  // Move to area if specified
  if (areaId) {
    script += `  move newProject to area id "${bridge.escapeString(areaId)}"\n`;
  }
  
  // Create headings if provided
  if (headings && headings.length > 0) {
    headings.forEach(heading => {
      const escapedHeading = bridge.escapeString(heading);
      script += `  make new project with properties {name:"${escapedHeading}"} at beginning of newProject\n`;
    });
  }
  
  script += '  return id of newProject\n';
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to update a project
 */
export function updateProject(
  id: string,
  updates: {
    name?: string;
    notes?: string | null;
    whenDate?: string | null;
    deadline?: string | null;
    tags?: string[];
    areaId?: string | null;
  }
): string {
  const escapedId = bridge.escapeString(id);
  
  let script = 'tell application "Things3"\n';
  script += `  set p to project id "${escapedId}"\n`;
  
  // Update basic properties
  if (updates.name !== undefined) {
    script += `  set name of p to "${bridge.escapeString(updates.name)}"\n`;
  }
  
  if (updates.notes !== undefined) {
    if (updates.notes === null) {
      script += '  set notes of p to missing value\n';
    } else {
      script += `  set notes of p to "${bridge.escapeString(updates.notes)}"\n`;
    }
  }
  
  // Update dates
  if (updates.whenDate !== undefined) {
    if (updates.whenDate === null) {
      script += '  set activation date of p to missing value\n';
    } else {
      script += `  set activation date of p to date "${updates.whenDate}"\n`;
    }
  }
  
  if (updates.deadline !== undefined) {
    if (updates.deadline === null) {
      script += '  set due date of p to missing value\n';
    } else {
      script += `  set due date of p to date "${updates.deadline}"\n`;
    }
  }
  
  // Update tags (replace all)
  if (updates.tags !== undefined) {
    const tagNames = updates.tags.map(tag => bridge.escapeString(tag)).join(',');
    script += `  set tag names of p to "${tagNames}"\n`;
  }
  
  // Move to new area
  if (updates.areaId !== undefined) {
    if (updates.areaId === null) {
      // Remove from area (move to top level)
      script += '  set area of p to missing value\n';
    } else {
      script += `  move p to area id "${bridge.escapeString(updates.areaId)}"\n`;
    }
  }
  
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to complete a project
 */
export function completeProject(id: string): string {
  const escapedId = bridge.escapeString(id);
  
  return `
tell application "Things3"
  try
    set p to project id "${escapedId}"
    if status of p is open then
      set status of p to completed
      return true
    else
      return false
    end if
  on error
    return false
  end try
end tell`;
}

/**
 * Generate AppleScript to create a new area
 */
export function createArea(name: string): string {
  const escapedName = bridge.escapeString(name);
  
  return `
tell application "Things3"
  set newArea to make new area with properties {name:"${escapedName}"}
  return id of newArea
end tell`;
}

/**
 * Generate AppleScript to create a new tag
 */
export function createTag(name: string, parentTagId?: string): string {
  const escapedName = bridge.escapeString(name);
  
  let script = 'tell application "Things3"\n';
  
  if (parentTagId) {
    const escapedParentId = bridge.escapeString(parentTagId);
    // Create as a child of an existing tag
    script += `  try\n`;
    script += `    set parentTag to tag id "${escapedParentId}"\n`;
    script += `    set newTag to make new tag with properties {name:"${escapedName}"} at parentTag\n`;
    script += `    return id of newTag\n`;
    script += `  on error\n`;
    script += `    -- If parent not found, create at top level\n`;
    script += `    set newTag to make new tag with properties {name:"${escapedName}"}\n`;
    script += `    return id of newTag\n`;
    script += `  end try\n`;
  } else {
    // Create at top level
    script += `  set newTag to make new tag with properties {name:"${escapedName}"}\n`;
    script += '  return id of newTag\n';
  }
  
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to add tags to items (TODOs or Projects)
 */
export function addTagsToItems(itemIds: string[], tags: string[]): string {
  let script = 'tell application "Things3"\n';
  script += '  set updatedCount to 0\n';
  
  // Convert tags array to comma-separated string
  const tagNames = tags.map(tag => bridge.escapeString(tag)).join(',');
  
  for (const itemId of itemIds) {
    const escapedId = bridge.escapeString(itemId);
    script += '  try\n';
    // Try as a to do first
    script += `    set item to to do id "${escapedId}"\n`;
    script += `    set currentTags to tag names of item\n`;
    script += `    if currentTags is missing value then\n`;
    script += `      set tag names of item to "${tagNames}"\n`;
    script += `    else\n`;
    script += `      set tag names of item to currentTags & "," & "${tagNames}"\n`;
    script += `    end if\n`;
    script += '    set updatedCount to updatedCount + 1\n';
    script += '  on error\n';
    script += '    try\n';
    // If not a todo, try as a project
    script += `      set item to project id "${escapedId}"\n`;
    script += `      set currentTags to tag names of item\n`;
    script += `      if currentTags is missing value then\n`;
    script += `        set tag names of item to "${tagNames}"\n`;
    script += `      else\n`;
    script += `        set tag names of item to currentTags & "," & "${tagNames}"\n`;
    script += `      end if\n`;
    script += '      set updatedCount to updatedCount + 1\n';
    script += '    end try\n';
    script += '  end try\n';
  }
  
  script += '  return updatedCount\n';
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to remove tags from items
 */
export function removeTagsFromItems(itemIds: string[], tags: string[]): string {
  let script = 'tell application "Things3"\n';
  script += '  set updatedCount to 0\n';
  
  // Create a list of tags to remove
  const tagsToRemove = tags.map(tag => `"${bridge.escapeString(tag)}"`).join(', ');
  script += `  set tagsToRemove to {${tagsToRemove}}\n`;
  
  for (const itemId of itemIds) {
    const escapedId = bridge.escapeString(itemId);
    script += '  try\n';
    // Try as a to do first
    script += `    set item to to do id "${escapedId}"\n`;
    script += '    set currentTags to tag names of item\n';
    script += '    if currentTags is not missing value then\n';
    script += '      set AppleScript\'s text item delimiters to ","\n';
    script += '      set tagList to text items of currentTags\n';
    script += '      set newTagList to {}\n';
    script += '      repeat with tagName in tagList\n';
    script += '        set tagName to (tagName as string)\n';
    script += '        if tagName is not in tagsToRemove then\n';
    script += '          set end of newTagList to tagName\n';
    script += '        end if\n';
    script += '      end repeat\n';
    script += '      set AppleScript\'s text item delimiters to ","\n';
    script += '      set newTags to newTagList as string\n';
    script += '      set AppleScript\'s text item delimiters to ""\n';
    script += '      if newTags is "" then\n';
    script += '        set tag names of item to missing value\n';
    script += '      else\n';
    script += '        set tag names of item to newTags\n';
    script += '      end if\n';
    script += '      set updatedCount to updatedCount + 1\n';
    script += '    end if\n';
    script += '  on error\n';
    script += '    try\n';
    // If not a todo, try as a project
    script += `      set item to project id "${escapedId}"\n`;
    script += '      set currentTags to tag names of item\n';
    script += '      if currentTags is not missing value then\n';
    script += '        set AppleScript\'s text item delimiters to ","\n';
    script += '        set tagList to text items of currentTags\n';
    script += '        set newTagList to {}\n';
    script += '        repeat with tagName in tagList\n';
    script += '          set tagName to (tagName as string)\n';
    script += '          if tagName is not in tagsToRemove then\n';
    script += '            set end of newTagList to tagName\n';
    script += '          end if\n';
    script += '        end repeat\n';
    script += '        set AppleScript\'s text item delimiters to ","\n';
    script += '        set newTags to newTagList as string\n';
    script += '        set AppleScript\'s text item delimiters to ""\n';
    script += '        if newTags is "" then\n';
    script += '          set tag names of item to missing value\n';
    script += '        else\n';
    script += '          set tag names of item to newTags\n';
    script += '        end if\n';
    script += '        set updatedCount to updatedCount + 1\n';
    script += '      end if\n';
    script += '    end try\n';
    script += '  end try\n';
  }
  
  script += '  return updatedCount\n';
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to list tags
 */
export function listTags(): string {
  let script = 'tell application "Things3"\n';
  script += '  set tagList to tags\n';
  script += '  set results to {}\n';
  script += '  repeat with t in tagList\n';
  
  // Build result record
  script += '    set tagRecord to "{"';
  script += ' & "\\"id\\":\\"" & (id of t) & "\\","';
  script += ' & "\\"name\\":\\"" & (name of t) & "\\""';
  
  // Add parent tag if present
  script += ' & ","';
  script += ' & "\\"parentTagId\\":" & (if parent tag of t is missing value then "null" else "\\"" & (id of parent tag of t) & "\\"")';
  
  script += ' & "}"\n';
  script += '    set end of results to tagRecord\n';
  
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
 * Generate AppleScript to add checklist items to a TODO
 */
export function addChecklistItems(
  todoId: string,
  items: Array<{ title: string; completed?: boolean }>
): string {
  const escapedId = bridge.escapeString(todoId);
  
  let script = 'tell application "Things3"\n';
  script += '  try\n';
  script += `    set targetTodo to to do id "${escapedId}"\n`;
  script += '    set addedCount to 0\n';
  
  // Add each checklist item
  for (const item of items) {
    const escapedTitle = bridge.escapeString(item.title);
    const completedStatus = item.completed ? 'true' : 'false';
    
    script += `    tell targetTodo\n`;
    script += `      make new checklist item with properties {title:"${escapedTitle}", completed:${completedStatus}}\n`;
    script += `    end tell\n`;
    script += '    set addedCount to addedCount + 1\n';
  }
  
  script += '    return addedCount\n';
  script += '  on error errorMessage\n';
  script += '    error "Failed to add checklist items: " & errorMessage\n';
  script += '  end try\n';
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to update a checklist item
 */
export function updateChecklistItem(
  todoId: string,
  itemIndex: number,
  updates: { title?: string; completed?: boolean }
): string {
  const escapedId = bridge.escapeString(todoId);
  
  let script = 'tell application "Things3"\n';
  script += '  try\n';
  script += `    set targetTodo to to do id "${escapedId}"\n`;
  script += `    set targetItem to item ${itemIndex + 1} of checklist items of targetTodo\n`;
  
  // Update properties
  if (updates.title !== undefined) {
    const escapedTitle = bridge.escapeString(updates.title);
    script += `    set title of targetItem to "${escapedTitle}"\n`;
  }
  
  if (updates.completed !== undefined) {
    script += `    set completed of targetItem to ${updates.completed ? 'true' : 'false'}\n`;
  }
  
  script += '    return "success"\n';
  script += '  on error errorMessage\n';
  script += '    error "Failed to update checklist item: " & errorMessage\n';
  script += '  end try\n';
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to reorder checklist items
 */
export function reorderChecklist(todoId: string, newOrder: number[]): string {
  const escapedId = bridge.escapeString(todoId);
  
  let script = 'tell application "Things3"\n';
  script += '  try\n';
  script += `    set targetTodo to to do id "${escapedId}"\n`;
  script += '    set checkItems to checklist items of targetTodo\n';
  script += '    set itemCount to count of checkItems\n';
  
  // Validate indices
  script += `    if ${newOrder.length} is not equal to itemCount then\n`;
  script += '      error "New order count does not match checklist item count"\n';
  script += '    end if\n';
  
  // Create temporary storage for items
  script += '    set tempItems to {}\n';
  script += '    repeat with i from 1 to itemCount\n';
  script += '      set end of tempItems to {title:title of item i of checkItems, completed:completed of item i of checkItems}\n';
  script += '    end repeat\n';
  
  // Delete all existing items
  script += '    repeat with i from itemCount to 1 by -1\n';
  script += '      delete item i of checklist items of targetTodo\n';
  script += '    end repeat\n';
  
  // Re-add items in new order
  for (let i = 0; i < newOrder.length; i++) {
    const originalIndex = (newOrder[i] ?? 0) + 1; // Convert to 1-based
    script += `    set itemData to item ${originalIndex} of tempItems\n`;
    script += '    tell targetTodo\n';
    script += '      make new checklist item with properties {title:(title of itemData), completed:(completed of itemData)}\n';
    script += '    end tell\n';
  }
  
  script += '    return "success"\n';
  script += '  on error errorMessage\n';
  script += '    error "Failed to reorder checklist: " & errorMessage\n';
  script += '  end try\n';
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to delete checklist items
 */
export function deleteChecklistItems(todoId: string, itemIndices: number[]): string {
  const escapedId = bridge.escapeString(todoId);
  // Sort indices in descending order to avoid index shifting issues
  const sortedIndices = [...itemIndices].sort((a, b) => b - a);
  
  let script = 'tell application "Things3"\n';
  script += '  try\n';
  script += `    set targetTodo to to do id "${escapedId}"\n`;
  script += '    set deletedCount to 0\n';
  
  // Delete items in reverse order
  for (const index of sortedIndices) {
    script += `    delete item ${index + 1} of checklist items of targetTodo\n`;
    script += '    set deletedCount to deletedCount + 1\n';
  }
  
  script += '    return deletedCount\n';
  script += '  on error errorMessage\n';
  script += '    error "Failed to delete checklist items: " & errorMessage\n';
  script += '  end try\n';
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to get checklist items from a TODO
 */
export function getChecklistItems(todoId: string): string {
  const escapedId = bridge.escapeString(todoId);
  
  return `
tell application "Things3"
  try
    set targetTodo to to do id "${escapedId}"
    set checklistData to {}
    set checkItems to checklist items of targetTodo
    repeat with i from 1 to count of checkItems
      set checkItem to item i of checkItems
      set itemRecord to "{\\"index\\":" & (i - 1) & ",\\"title\\":\\"" & (title of checkItem) & "\\",\\"completed\\":" & (completed of checkItem) & "}"
      set end of checklistData to itemRecord
    end repeat
    return "[" & (my joinList(checklistData, ",")) & "]"
  on error errorMessage
    error "Failed to get checklist items: " & errorMessage
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
 * Generate AppleScript to bulk move TODOs to a project or area
 */
export function bulkMoveTodos(
  todoIds: string[],
  projectId?: string,
  areaId?: string
): string {
  let script = 'tell application "Things3"\n';
  script += '  set movedCount to 0\n';
  
  for (const todoId of todoIds) {
    const escapedId = bridge.escapeString(todoId);
    script += '  try\n';
    script += `    set t to to do id "${escapedId}"\n`;
    
    if (projectId) {
      const escapedProjectId = bridge.escapeString(projectId);
      script += `    move t to project id "${escapedProjectId}"\n`;
    } else if (areaId) {
      const escapedAreaId = bridge.escapeString(areaId);
      script += `    move t to area id "${escapedAreaId}"\n`;
    } else {
      // Move to inbox if neither project nor area specified
      script += '    move t to list "Inbox"\n';
    }
    
    script += '    set movedCount to movedCount + 1\n';
    script += '  on error\n';
    script += '    -- Skip if todo not found\n';
    script += '  end try\n';
  }
  
  script += '  return movedCount\n';
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to bulk update dates for multiple TODOs
 */
export function bulkUpdateDates(
  todoIds: string[],
  whenDate?: string | null,
  deadline?: string | null
): string {
  let script = 'tell application "Things3"\n';
  script += '  set updatedCount to 0\n';
  
  for (const todoId of todoIds) {
    const escapedId = bridge.escapeString(todoId);
    script += '  try\n';
    script += `    set t to to do id "${escapedId}"\n`;
    
    // Update when date
    if (whenDate !== undefined) {
      if (whenDate === null) {
        script += '    set activation date of t to missing value\n';
      } else {
        script += `    set activation date of t to date "${whenDate}"\n`;
      }
    }
    
    // Update deadline
    if (deadline !== undefined) {
      if (deadline === null) {
        script += '    set due date of t to missing value\n';
      } else {
        script += `    set due date of t to date "${deadline}"\n`;
      }
    }
    
    script += '    set updatedCount to updatedCount + 1\n';
    script += '  on error\n';
    script += '    -- Skip if todo not found\n';
    script += '  end try\n';
  }
  
  script += '  return updatedCount\n';
  script += 'end tell';
  
  return script;
}

/**
 * Generate AppleScript to search the logbook
 */
export function searchLogbook(
  searchText?: string,
  fromDate?: string,
  toDate?: string,
  limit?: number
): string {
  let script = 'tell application "Things3"\n';
  script += '  set logbookItems to to dos of list "Logbook"\n';
  script += '  set results to {}\n';
  script += '  set resultCount to 0\n';
  const maxResults = limit || 100;
  
  script += '  repeat with t in logbookItems\n';
  script += `    if resultCount < ${maxResults} then\n`;
  
  // Apply search text filter
  if (searchText) {
    const escaped = bridge.escapeString(searchText);
    script += `      if (name of t contains "${escaped}" or notes of t contains "${escaped}") then\n`;
  }
  
  // Apply date range filter
  if (fromDate || toDate) {
    script += '        set completionDate to completion date of t\n';
    script += '        if completionDate is not missing value then\n';
    
    if (fromDate) {
      script += `          if completionDate ≥ date "${fromDate}" then\n`;
    }
    
    if (toDate) {
      script += `            if completionDate ≤ date "${toDate}" then\n`;
    }
  }
  
  // Build result record
  script += '              set todoRecord to "{"';
  script += ' & "\\"id\\":\\"" & (id of t) & "\\","';
  script += ' & "\\"title\\":\\"" & (name of t) & "\\","';
  
  // Handle notes
  script += ' & "\\"notes\\":" & (if notes of t is missing value then "null" else "\\"" & (notes of t) & "\\"") & ","';
  
  // Handle completion date
  script += ' & "\\"completionDate\\":" & (if completion date of t is missing value then "null" else "\\"" & (completion date of t as string) & "\\"") & ","';
  
  // Get project name if available
  script += ' & "\\"projectName\\":" & (if project of t is missing value then "null" else "\\"" & (name of project of t) & "\\"")';
  
  script += ' & "}"\n';
  script += '              set end of results to todoRecord\n';
  script += '              set resultCount to resultCount + 1\n';
  
  // Close date range filters
  if (toDate) {
    script += '            end if\n';
  }
  if (fromDate) {
    script += '          end if\n';
  }
  if (fromDate || toDate) {
    script += '        end if\n';
  }
  
  // Close search text filter
  if (searchText) {
    script += '      end if\n';
  }
  
  script += '    end if\n';
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
 * Generate AppleScript to ensure Things3 is running
 */
export function ensureThings3Running(): string {
  return `
tell application "System Events"
  set isRunning to (count of (every process whose name is "Things3")) > 0
end tell

if not isRunning then
  tell application "Things3"
    activate
    delay 2 -- Wait for Things3 to fully launch
  end tell
end if

return "running"`;
}

/**
 * Generate AppleScript to get Things3 version
 */
export function getThings3Version(): string {
  return `
tell application "Things3"
  return version
end tell`;
}