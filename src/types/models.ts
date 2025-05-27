// ABOUTME: TypeScript interfaces for Things3 data models
// ABOUTME: Defines all core data structures used throughout the application

/**
 * Represents a TODO item in Things3
 */
export interface TodoItem {
  /** Unique identifier for the TODO */
  id: string;
  
  /** Title of the TODO */
  title: string;
  
  /** Optional notes/description */
  notes?: string;
  
  /** When to work on this TODO (ISO 8601 datetime) */
  whenDate?: string;
  
  /** Deadline for this TODO (ISO 8601 datetime) */
  deadline?: string;
  
  /** Whether the TODO is completed */
  completed: boolean;
  
  /** Tags associated with this TODO */
  tags: string[];
  
  /** ID of the project this TODO belongs to */
  projectId?: string;
  
  /** ID of the area this TODO belongs to */
  areaId?: string;
  
  /** Checklist items within this TODO */
  checklistItems?: ChecklistItem[];
  
  /** Reminder settings for this TODO */
  reminder?: Reminder;
}

/**
 * Represents a checklist item within a TODO
 */
export interface ChecklistItem {
  /** Unique identifier for the checklist item */
  id: string;
  
  /** Title of the checklist item */
  title: string;
  
  /** Whether the checklist item is completed */
  completed: boolean;
}

/**
 * Represents reminder settings for a TODO
 */
export interface Reminder {
  /** Absolute datetime for the reminder (ISO 8601) */
  dateTime?: string;
  
  /** Whether the reminder is relative to the deadline */
  relativeToDeadline?: boolean;
  
  /** Whether the reminder is relative to the when date */
  relativeToWhen?: boolean;
  
  /** Minutes before deadline (when relativeToDeadline is true) */
  minutesBeforeDeadline?: number;
  
  /** Minutes before when date (when relativeToWhen is true) */
  minutesBeforeWhen?: number;
}

/**
 * Represents a project in Things3
 */
export interface Project {
  /** Unique identifier for the project */
  id: string;
  
  /** Name of the project */
  name: string;
  
  /** Optional notes/description */
  notes?: string;
  
  /** ID of the area this project belongs to */
  areaId?: string;
  
  /** Whether the project is completed */
  completed: boolean;
  
  /** Headings within the project for organization */
  headings?: Heading[];
}

/**
 * Represents a heading within a project
 */
export interface Heading {
  /** Unique identifier for the heading */
  id: string;
  
  /** Title of the heading */
  title: string;
}

/**
 * Represents an area in Things3
 */
export interface Area {
  /** Unique identifier for the area */
  id: string;
  
  /** Name of the area */
  name: string;
  
  /** Whether the area is visible */
  visible: boolean;
}

/**
 * Represents a tag in Things3
 */
export interface Tag {
  /** Unique identifier for the tag */
  id: string;
  
  /** Name of the tag */
  name: string;
  
  /** ID of the parent tag (for nested tags) */
  parentTagId?: string;
}