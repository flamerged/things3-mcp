// ABOUTME: Things3 URL scheme handler for operations not supported by AppleScript
// ABOUTME: Primarily used for checklist manipulation which AppleScript doesn't support

import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from './logger.js';

const execAsync = promisify(exec);

export class URLSchemeHandler {
  private logger = createLogger('url-scheme');
  
  /**
   * Execute a Things3 URL scheme command
   */
  async execute(url: string): Promise<void> {
    try {
      // Use 'open' command on macOS to handle URL schemes
      const command = `open "${url}"`;
      this.logger.debug(`Executing URL scheme: ${url}`);
      
      await execAsync(command);
      
      // Give Things3 more time to process the URL and create the TODO
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      this.logger.error('Failed to execute URL scheme', error as Error);
      throw new Error(`URL scheme execution failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create a new TODO with checklist items
   */
  async createTodoWithChecklist(params: {
    title: string;
    notes?: string;
    whenDate?: string;
    deadline?: string;
    tags?: string[];
    checklistItems: string[];
    projectId?: string;
    areaId?: string;
  }): Promise<void> {
    const urlParams = new URLSearchParams();
    urlParams.append('title', params.title);
    
    if (params.notes) {
      urlParams.append('notes', params.notes);
    }
    
    if (params.whenDate) {
      urlParams.append('when', params.whenDate);
    }
    
    if (params.deadline) {
      urlParams.append('deadline', params.deadline);
    }
    
    if (params.tags && params.tags.length > 0) {
      urlParams.append('tags', params.tags.join(','));
    }
    
    if (params.projectId) {
      urlParams.append('list-id', params.projectId);
    } else if (params.areaId) {
      urlParams.append('list-id', params.areaId);
    }
    
    // Add checklist items
    if (params.checklistItems && params.checklistItems.length > 0) {
      urlParams.append('checklist-items', params.checklistItems.join('\n'));
    }
    
    // URLSearchParams encodes spaces as '+' but Things3 expects '%20'
    const url = `things:///add?${urlParams.toString().replace(/\+/g, '%20')}`;
    this.logger.info(`Creating TODO with URL: ${url}`);
    await this.execute(url);
  }
  
  /**
   * Add checklist items to an existing TODO
   */
  async addChecklistItems(todoId: string, items: string[], authToken?: string): Promise<void> {
    const urlParams = new URLSearchParams();
    urlParams.append('id', todoId);
    urlParams.append('append-checklist-items', items.join('\n'));
    
    // Auth token is required for updates
    if (authToken) {
      urlParams.append('auth-token', authToken);
    }
    
    const url = `things:///update?${urlParams.toString()}`;
    await this.execute(url);
  }
  
  /**
   * Create TODO using JSON format (more flexible)
   */
  async createTodoWithJSON(data: {
    title: string;
    notes?: string;
    when?: string;
    deadline?: string;
    tags?: string[];
    checklistItems?: Array<{
      title: string;
      completed?: boolean;
    }>;
    listId?: string;
  }): Promise<void> {
    const todo = {
      type: 'to-do',
      attributes: {
        title: data.title,
        notes: data.notes,
        when: data.when,
        deadline: data.deadline,
        tags: data.tags,
        'list-id': data.listId,
        'checklist-items': data.checklistItems?.map(item => ({
          type: 'checklist-item',
          attributes: {
            title: item.title,
            completed: item.completed || false
          }
        }))
      }
    };
    
    // Remove undefined values
    Object.keys(todo.attributes).forEach(key => {
      if (todo.attributes[key as keyof typeof todo.attributes] === undefined) {
        delete todo.attributes[key as keyof typeof todo.attributes];
      }
    });
    
    const jsonData = JSON.stringify([todo]);
    const encodedData = encodeURIComponent(jsonData);
    const url = `things:///json?data=${encodedData}`;
    
    await this.execute(url);
  }
  
  /**
   * Parse Things3 URL callback response
   */
  parseCallbackResponse(url: string): { id?: string; error?: string } {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    const result: { id?: string; error?: string } = {};
    
    const id = params.get('x-things-id');
    if (id) result.id = id;
    
    const error = params.get('x-error');
    if (error) result.error = error;
    
    return result;
  }
}

/**
 * Singleton instance
 */
export const urlSchemeHandler = new URLSchemeHandler();