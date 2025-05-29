// ABOUTME: Integration tests for checklist functionality via URL schemes
// ABOUTME: Tests the creation of TODOs with checklist items using Things3 URL schemes

import { Things3Server } from '../../src/server.js';
import { TodosTools } from '../../src/tools/todos.js';

describe('Checklist Integration Tests', () => {
  let server: Things3Server;
  let todosTools: TodosTools;
  const createdTodoIds: string[] = [];

  beforeAll(() => {
    server = new Things3Server();
    todosTools = server.todosTools;
  });

  afterAll(async () => {
    // Clean up any created TODOs
    for (const id of createdTodoIds) {
      try {
        await todosTools.deleteTodos({ ids: [id] });
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  });

  test('should create a TODO with checklist items using URL scheme', async () => {
    const todoData = {
      title: 'Integration Test TODO with Checklist',
      notes: 'This TODO was created during integration testing',
      checklistItems: [
        'First checklist item',
        'Second checklist item', 
        'Third checklist item'
      ],
      tags: ['integration-test']
    };

    const result = await todosTools.createTodo(todoData);
    
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    
    if (result.id) {
      createdTodoIds.push(result.id);
      
      // Verify the TODO exists by searching for it
      const todos = await todosTools.listTodos({
        filter: 'inbox',
        limit: 50
      });
      
      const createdTodo = todos.find(t => t.id === result.id);
      expect(createdTodo).toBeDefined();
      expect(createdTodo?.title).toBe(todoData.title);
    }
  });

  test('should handle checklist items with special characters', async () => {
    const todoData = {
      title: 'TODO with Special Characters in Checklist',
      checklistItems: [
        'Item with "quotes"',
        'Item with & ampersand',
        'Item with émojis 🎉',
        'Item with newline\ncharacter'
      ]
    };

    const result = await todosTools.createTodo(todoData);
    
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    
    if (result.id) {
      createdTodoIds.push(result.id);
    }
  });

  test('should create TODO with checklist in a specific project', async () => {
    // First, get or create a test project
    const projectsResult = await server.projectTools.listProjects({});
    let project = projectsResult.projects.find(p => p.name === 'Integration Test Project');
    
    if (!project) {
      const projectResult = await server.projectTools.createProject({
        name: 'Integration Test Project',
        notes: 'Project for integration testing'
      });
      project = { id: projectResult.id!, name: 'Integration Test Project', completed: false };
    }

    const todoData = {
      title: 'Project TODO with Checklist',
      checklistItems: [
        'Project checklist item 1',
        'Project checklist item 2'
      ],
      projectId: project!.id
    };

    const result = await todosTools.createTodo(todoData);
    
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    
    if (result.id) {
      createdTodoIds.push(result.id);
    }

    // Clean up project
    if (project?.id) {
      await server.projectTools.completeProject({ id: project.id });
    }
  });
});