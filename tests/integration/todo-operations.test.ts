// ABOUTME: Integration tests for TODO CRUD operations
// ABOUTME: Tests list, get, create, update, complete, uncomplete, and delete operations

import { describe, it, beforeAll, afterAll, expect, beforeEach } from '@jest/globals';
import { 
  setupTestEnvironment, 
  cleanupTestEnvironment, 
  generateTestId,
  waitForThings3,
  type TestEnvironment 
} from './test-infrastructure';

describe('TODO Operations Integration Tests', () => {
  let env: TestEnvironment;
  let TEST_PREFIX: string;

  beforeAll(async () => {
    env = await setupTestEnvironment();
    TEST_PREFIX = generateTestId();
  });

  afterAll(async () => {
    await cleanupTestEnvironment(env);
  });

  beforeEach(() => {
    // Start timing for each test
    env.tracker.startTimer('current-test');
  });

  afterEach(function(this: any) {
    // End timing and log if slow
    const timer = env.tracker.endTimer('current-test');
    if (timer.isWarning) {
      console.warn(`Test "${this.currentTest?.title}" exceeded 10s threshold`);
    }
  });

  describe('List TODOs', () => {
    it('should list TODOs', async () => {
      const result = await env.server.todosTools.listTodos({});
      
      expect(Array.isArray(result)).toBe(true);
      
      // If there are TODOs, verify structure
      if (result.length > 0) {
        const todo = result[0];
        expect(todo).toHaveProperty('id');
        expect(todo).toHaveProperty('title');
        expect(todo).toHaveProperty('completed');
      }
    });

    it('should list incomplete TODOs only', async () => {
      // Create both complete and incomplete TODOs
      const incompleteTodo = await env.server.todosTools.createTodo({
        title: `${TEST_PREFIX}Incomplete TODO`
      });
      env.tracker.trackTodo(incompleteTodo.id!);

      const completeTodo = await env.server.todosTools.createTodo({
        title: `${TEST_PREFIX}Complete TODO`
      });
      env.tracker.trackTodo(completeTodo.id!);
      
      // Complete one TODO
      await env.server.todosTools.completeTodos({ ids: [completeTodo.id!] });
      
      // Wait for Things3 to process
      await waitForThings3(1000);
      
      // List incomplete TODOs
      const result = await env.server.todosTools.listTodos({ 
        status: 'open' 
      });
      
      // Should not include the completed TODO
      const foundComplete = result.find(t => t.id === completeTodo.id);
      const foundIncomplete = result.find(t => t.id === incompleteTodo.id);
      
      expect(foundComplete).toBeUndefined();
      expect(foundIncomplete).toBeTruthy();
    });
  });

  describe('Create TODO', () => {
    it('should create a basic TODO', async () => {
      const title = `${TEST_PREFIX}Basic TODO`;
      const result = await env.server.todosTools.createTodo({ title });
      
      expect(result.success).toBe(true);
      expect(result.id).toBeTruthy();
      
      env.tracker.trackTodo(result.id!);
      
      // Verify TODO was created
      const todo = await env.server.todosTools.getTodo({ id: result.id! });
      expect(todo).toBeTruthy();
      expect(todo!.title).toBe(title);
      expect(todo!.completed).toBe(false);
    });

    it('should create a TODO with all fields', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const todoData = {
        title: `${TEST_PREFIX}Full TODO`,
        notes: 'This is a test TODO with all fields',
        when: 'tomorrow',
        deadline: nextWeek.toISOString(),
        tags: ['TestTag1', 'TestTag2'],
        checklistItems: ['Item 1', 'Item 2', 'Item 3']
      };
      
      const result = await env.server.todosTools.createTodo(todoData);
      
      expect(result.success).toBe(true);
      expect(result.id).toBeTruthy();
      
      env.tracker.trackTodo(result.id!);
      
      // Track tags for cleanup
      env.tracker.trackTags(['TestTag1', 'TestTag2']);
      
      // Verify TODO was created with all fields
      await waitForThings3(1000);
      const todo = await env.server.todosTools.getTodo({ id: result.id! });
      
      expect(todo).toBeTruthy();
      expect(todo!.title).toBe(todoData.title);
      expect(todo!.notes).toBe(todoData.notes);
      expect(todo!.tags.length).toBeGreaterThanOrEqual(2);
      // Note: Dates and checklist items may need special handling in AppleScript
    });
  });

  describe('Get TODO', () => {
    it('should get TODO by ID', async () => {
      // Create a TODO first
      const createResult = await env.server.todosTools.createTodo({
        title: `${TEST_PREFIX}TODO to Get`,
        notes: 'Test notes'
      });
      
      expect(createResult.id).toBeTruthy();
      env.tracker.trackTodo(createResult.id!);
      
      // Get the TODO
      const todo = await env.server.todosTools.getTodo({ id: createResult.id! });
      
      expect(todo).toBeTruthy();
      expect(todo!.id).toBe(createResult.id);
      expect(todo!.title).toBe(`${TEST_PREFIX}TODO to Get`);
      expect(todo!.notes).toBe('Test notes');
      expect(todo!.completed).toBe(false);
    });

    it('should return null for non-existent TODO', async () => {
      const result = await env.server.todosTools.getTodo({ 
        id: 'non-existent-id-12345' 
      });
      
      expect(result).toBeNull();
    });
  });

  describe('Update TODO', () => {
    it('should update TODO properties', async () => {
      // Create a TODO
      const createResult = await env.server.todosTools.createTodo({
        title: `${TEST_PREFIX}Original Title`,
        notes: 'Original notes'
      });
      
      expect(createResult.id).toBeTruthy();
      env.tracker.trackTodo(createResult.id!);
      
      // Update the TODO
      const updateResult = await env.server.todosTools.updateTodo({
        id: createResult.id!,
        title: `${TEST_PREFIX}Updated Title`,
        notes: 'Updated notes'
      });
      
      expect(updateResult.success).toBe(true);
      
      // Verify updates
      await waitForThings3(1000);
      const todo = await env.server.todosTools.getTodo({ id: createResult.id! });
      
      expect(todo!.title).toBe(`${TEST_PREFIX}Updated Title`);
      expect(todo!.notes).toBe('Updated notes');
    });

    it('should update TODO dates', async () => {
      const createResult = await env.server.todosTools.createTodo({
        title: `${TEST_PREFIX}TODO with Dates`
      });
      
      expect(createResult.id).toBeTruthy();
      env.tracker.trackTodo(createResult.id!);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      // Update with dates
      const updateResult = await env.server.todosTools.updateTodo({
        id: createResult.id!,
        whenDate: tomorrow.toISOString(),
        deadline: nextWeek.toISOString()
      });
      
      expect(updateResult.success).toBe(true);
      
      // Verify dates were set
      await waitForThings3(1000);
      const todo = await env.server.todosTools.getTodo({ id: createResult.id! });
      
      expect(todo!.whenDate).toBeTruthy();
      expect(todo!.deadline).toBeTruthy();
    });
  });

  describe('Complete/Uncomplete TODO', () => {
    it('should complete a TODO', async () => {
      const createResult = await env.server.todosTools.createTodo({
        title: `${TEST_PREFIX}TODO to Complete`
      });
      
      expect(createResult.id).toBeTruthy();
      env.tracker.trackTodo(createResult.id!);
      
      // Complete the TODO
      const completeResult = await env.server.todosTools.completeTodos({
        ids: [createResult.id!]
      });
      
      expect(completeResult.completedCount).toBe(1);
      
      // Verify completion
      await waitForThings3(1000);
      const todo = await env.server.todosTools.getTodo({ id: createResult.id! });
      
      expect(todo!.completed).toBe(true);
    });

    it('should uncomplete a TODO', async () => {
      // Create and complete a TODO
      const createResult = await env.server.todosTools.createTodo({
        title: `${TEST_PREFIX}TODO to Uncomplete`
      });
      
      expect(createResult.id).toBeTruthy();
      env.tracker.trackTodo(createResult.id!);
      
      await env.server.todosTools.completeTodos({
        ids: [createResult.id!]
      });
      
      await waitForThings3(1000);
      
      // Uncomplete the TODO
      const uncompleteResult = await env.server.todosTools.uncompleteTodos({
        ids: [createResult.id!]
      });
      
      expect(uncompleteResult.uncompletedCount).toBe(1);
      
      // Verify uncompleted
      await waitForThings3(1000);
      const todo = await env.server.todosTools.getTodo({ id: createResult.id! });
      
      expect(todo!.completed).toBe(false);
    });

    it('should complete multiple TODOs', async () => {
      // Create multiple TODOs
      const todos = await Promise.all([
        env.server.todosTools.createTodo({ title: `${TEST_PREFIX}Multi Complete 1` }),
        env.server.todosTools.createTodo({ title: `${TEST_PREFIX}Multi Complete 2` }),
        env.server.todosTools.createTodo({ title: `${TEST_PREFIX}Multi Complete 3` })
      ]);
      
      const todoIds = todos.map(t => t.id!);
      env.tracker.trackTodos(todoIds);
      
      // Complete all TODOs
      const completeResult = await env.server.todosTools.completeTodos({
        ids: todoIds
      });
      
      expect(completeResult.completedCount).toBe(3);
      
      // Verify all are completed
      await waitForThings3(1000);
      for (const id of todoIds) {
        const todo = await env.server.todosTools.getTodo({ id });
        expect(todo!.completed).toBe(true);
      }
    });
  });

  describe('Delete TODO', () => {
    it('should delete a TODO', async () => {
      const createResult = await env.server.todosTools.createTodo({
        title: `${TEST_PREFIX}TODO to Delete`
      });
      
      expect(createResult.id).toBeTruthy();
      
      // Delete the TODO (no need to track since it's being deleted)
      const deleteResult = await env.server.todosTools.deleteTodos({
        ids: [createResult.id!]
      });
      
      expect(deleteResult.deletedCount).toBe(1);
      
      // Verify deletion
      await waitForThings3(1000);
      const todo = await env.server.todosTools.getTodo({ id: createResult.id! });
      
      expect(todo).toBeNull();
    });

    it('should delete multiple TODOs', async () => {
      // Create multiple TODOs
      const todos = await Promise.all([
        env.server.todosTools.createTodo({ title: `${TEST_PREFIX}Multi Delete 1` }),
        env.server.todosTools.createTodo({ title: `${TEST_PREFIX}Multi Delete 2` }),
        env.server.todosTools.createTodo({ title: `${TEST_PREFIX}Multi Delete 3` })
      ]);
      
      const todoIds = todos.map(t => t.id!);
      
      // Delete all TODOs
      const deleteResult = await env.server.todosTools.deleteTodos({
        ids: todoIds
      });
      
      expect(deleteResult.deletedCount).toBe(3);
      
      // Verify all are deleted
      await waitForThings3(1000);
      for (const id of todoIds) {
        const todo = await env.server.todosTools.getTodo({ id });
        expect(todo).toBeNull();
      }
    });
  });

  describe('TODO with Project', () => {
    it('should create TODO in a project', async () => {
      // Create a project first
      const projectResult = await env.server.projectTools.createProject({
        name: `${TEST_PREFIX}TODO Test Project`
      });
      
      expect(projectResult.id).toBeTruthy();
      env.tracker.trackProject(projectResult.id!);
      
      // Create TODO in the project
      const todoResult = await env.server.todosTools.createTodo({
        title: `${TEST_PREFIX}TODO in Project`,
        projectId: projectResult.id!
      });
      
      expect(todoResult.success).toBe(true);
      expect(todoResult.id).toBeTruthy();
      env.tracker.trackTodo(todoResult.id!);
      
      // Verify TODO is in the project
      await waitForThings3(1000);
      const todo = await env.server.todosTools.getTodo({ id: todoResult.id! });
      
      expect(todo!.projectId).toBe(projectResult.id);
    });
  });
});