// ABOUTME: Type definitions for all Things3 MCP tool parameters and return types
// ABOUTME: Includes parameter interfaces and return types for all 27 tools

/**
 * Common filter options for listing TODOs
 */
export type TodoFilter = 'inbox' | 'today' | 'upcoming' | 'anytime' | 'someday' | 'logbook';

/**
 * Status filter for TODOs
 */
export type TodoStatus = 'open' | 'completed' | 'cancelled';

/**
 * Common response indicating success/failure
 */
export interface OperationResult {
  success: boolean;
  error?: string;
}

// ========== TODO Management Tools (1-7) ==========

/**
 * Parameters for todos.list tool
 */
export interface TodosListParams {
  filter?: TodoFilter;
  status?: TodoStatus;
  projectId?: string;
  areaId?: string;
  tags?: string[];
  searchText?: string;
  limit?: number;
  offset?: number;
}

/**
 * Return type for todos.list tool
 */
export interface TodosListResult {
  id: string;
  title: string;
  whenDate?: string;
  completed: boolean;
}

/**
 * Parameters for todos.get tool
 */
export interface TodosGetParams {
  id: string;
}

/**
 * Parameters for todos.create tool
 */
export interface TodosCreateParams {
  title: string;
  notes?: string;
  whenDate?: string;
  deadline?: string;
  tags?: string[];
  projectId?: string;
  areaId?: string;
  checklistItems?: string[];
  reminder?: {
    dateTime?: string;
    minutesBeforeDeadline?: number;
    minutesBeforeWhen?: number;
  };
}

/**
 * Return type for todos.create tool
 */
export interface TodosCreateResult extends OperationResult {
  id?: string;
  correctionsMade?: string[];
}

/**
 * Parameters for todos.update tool
 */
export interface TodosUpdateParams {
  id: string;
  title?: string;
  notes?: string;
  whenDate?: string | null;
  deadline?: string | null;
  tags?: string[];
  projectId?: string | null;
  areaId?: string | null;
}

/**
 * Return type for todos.update tool
 */
export interface TodosUpdateResult extends OperationResult {
  correctionsMade?: string[];
}

/**
 * Parameters for todos.complete tool
 */
export interface TodosCompleteParams {
  ids: string | string[];
}

/**
 * Return type for todos.complete tool
 */
export interface TodosCompleteResult extends OperationResult {
  completedCount: number;
}

/**
 * Parameters for todos.uncomplete tool
 */
export interface TodosUncompleteParams {
  ids: string | string[];
}

/**
 * Return type for todos.uncomplete tool
 */
export interface TodosUncompleteResult extends OperationResult {
  uncompletedCount: number;
}

/**
 * Parameters for todos.delete tool
 */
export interface TodosDeleteParams {
  ids: string | string[];
}

/**
 * Return type for todos.delete tool
 */
export interface TodosDeleteResult extends OperationResult {
  deletedCount: number;
}

// ========== Checklist Management Tools (8-11) ==========

/**
 * Parameters for checklist.add tool
 */
export interface ChecklistAddParams {
  todoId: string;
  items: Array<{
    title: string;
    completed?: boolean;
  }>;
}

/**
 * Return type for checklist.add tool
 */
export interface ChecklistAddResult extends OperationResult {
  addedCount: number;
}

/**
 * Parameters for checklist.update tool
 */
export interface ChecklistUpdateParams {
  todoId: string;
  itemIndex: number;
  title?: string;
  completed?: boolean;
}

/**
 * Parameters for checklist.reorder tool
 */
export interface ChecklistReorderParams {
  todoId: string;
  newOrder: number[];
}

/**
 * Parameters for checklist.delete tool
 */
export interface ChecklistDeleteParams {
  todoId: string;
  itemIndices: number[];
}

/**
 * Return type for checklist.delete tool
 */
export interface ChecklistDeleteResult extends OperationResult {
  deletedCount: number;
}

// ========== Project Management Tools (12-16) ==========

/**
 * Parameters for projects.list tool
 */
export interface ProjectsListParams {
  areaId?: string;
  includeCompleted?: boolean;
}

/**
 * Return type for projects.list tool
 */
export interface ProjectsListResult {
  id: string;
  name: string;
  areaId?: string;
  completed: boolean;
}

/**
 * Parameters for projects.get tool
 */
export interface ProjectsGetParams {
  id: string;
}

/**
 * Parameters for projects.create tool
 */
export interface ProjectsCreateParams {
  name: string;
  notes?: string;
  areaId?: string;
  headings?: string[];
}

/**
 * Return type for projects.create tool
 */
export interface ProjectsCreateResult extends OperationResult {
  id?: string;
}

/**
 * Parameters for projects.update tool
 */
export interface ProjectsUpdateParams {
  id: string;
  name?: string;
  notes?: string;
  areaId?: string | null;
}

/**
 * Parameters for projects.complete tool
 */
export interface ProjectsCompleteParams {
  id: string;
}

// ========== Area Management Tools (17-18) ==========

/**
 * Parameters for areas.list tool
 */
export interface AreasListParams {
  includeHidden?: boolean;
}

/**
 * Return type for areas.list tool
 */
export interface AreasListResult {
  id: string;
  name: string;
  visible: boolean;
}

/**
 * Parameters for areas.create tool
 */
export interface AreasCreateParams {
  name: string;
}

/**
 * Return type for areas.create tool
 */
export interface AreasCreateResult extends OperationResult {
  id?: string;
}

// ========== Tag Management Tools (19-22) ==========

/**
 * Return type for tags.list tool
 */
export interface TagsListResult {
  id: string;
  name: string;
  parentTagId?: string;
}

/**
 * Parameters for tags.create tool
 */
export interface TagsCreateParams {
  name: string;
  parentTagId?: string;
}

/**
 * Return type for tags.create tool
 */
export interface TagsCreateResult extends OperationResult {
  id?: string;
}

/**
 * Parameters for tags.add tool
 */
export interface TagsAddParams {
  itemIds: string[];
  tags: string[];
}

/**
 * Return type for tags.add tool
 */
export interface TagsAddResult extends OperationResult {
  updatedCount: number;
}

/**
 * Parameters for tags.remove tool
 */
export interface TagsRemoveParams {
  itemIds: string[];
  tags: string[];
}

/**
 * Return type for tags.remove tool
 */
export interface TagsRemoveResult extends OperationResult {
  updatedCount: number;
}

// ========== Bulk Operation Tools (23-24) ==========

/**
 * Parameters for bulk.move tool
 */
export interface BulkMoveParams {
  todoIds: string | string[];
  projectId?: string | null;
  areaId?: string | null;
}

/**
 * Return type for bulk.move tool
 */
export interface BulkMoveResult extends OperationResult {
  movedCount: number;
}

/**
 * Parameters for bulk.updateDates tool
 */
export interface BulkUpdateDatesParams {
  todoIds: string | string[];
  whenDate?: string | null;
  deadline?: string | null;
}

/**
 * Return type for bulk.updateDates tool
 */
export interface BulkUpdateDatesResult extends OperationResult {
  updatedCount: number;
}

// ========== Logbook Tools (25) ==========

/**
 * Parameters for logbook.search tool
 */
export interface LogbookSearchParams {
  searchText?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

/**
 * Return type for logbook.search tool
 */
export interface LogbookSearchResult {
  id: string;
  title: string;
  completedDate: string;
  projectName?: string;
}

// ========== System Tools (26-27) ==========

/**
 * Return type for system.refresh tool
 */
export interface SystemRefreshResult extends OperationResult {
  refreshed: string[];
}

/**
 * Return type for system.launch tool
 */
export interface SystemLaunchResult extends OperationResult {
  wasAlreadyRunning: boolean;
}