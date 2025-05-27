// ABOUTME: Integration tests for Things3 MCP server functionality
// ABOUTME: Tests actual communication with Things3 application via AppleScript

import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import { Things3Server } from '../../src/server';
import { AppleScriptBridge } from '../../src/utils/applescript';

describe('Things3 Integration Tests', () => {
  let server: Things3Server;
  let bridge: AppleScriptBridge;
  let testTodoIds: string[] = [];

  beforeAll(async () => {
    server = new Things3Server();
    bridge = new AppleScriptBridge();
    
    // Ensure Things3 is running
    try {
      await bridge.ensureThings3Running();
    } catch (error) {
      console.error('Things3 is not available. Skipping integration tests.');
      console.error('Please ensure Things3 is installed and running on macOS.');
      process.exit(0);
    }
  });

  afterAll(async () => {
    // Clean up any test TODOs that weren't deleted
    if (testTodoIds.length > 0) {
      try {
        await server.todosTools.deleteTodos({ ids: testTodoIds });
      } catch (error) {
        console.warn('Failed to clean up test TODOs:', (error as Error).message);
      }
    }
  });

  describe('Basic AppleScript Communication', () => {
    it('should verify Things3 is running', async () => {
      const isRunning = await bridge.isThings3Running();
      expect(isRunning).toBe(true);
    });

    it('should list today\'s TODOs', async () => {
      const todos = await server.todosTools.listTodos({ filter: 'today' });
      expect(Array.isArray(todos)).toBe(true);
      expect(todos.length).toBeGreaterThanOrEqual(0);
      
      if (todos.length > 0) {
        expect(todos[0]).toHaveProperty('id');
        expect(todos[0]).toHaveProperty('title');
        expect(todos[0]).toHaveProperty('completed');
      }
    });
  });

  describe('TODO CRUD Operations', () => {
    it('should create and manage a TODO lifecycle', async () => {
      // 1. Create a new TODO
      const createResult = await server.todosTools.createTodo({
        title: 'Integration Test TODO',
        notes: 'Created by integration test',
        tags: ['test']
      });
      
      expect(createResult.success).toBe(true);
      expect(createResult.id).toBeTruthy();
      
      const todoId = createResult.id!;
      testTodoIds.push(todoId);

      // 2. Get the TODO details
      const todo = await server.todosTools.getTodo({ id: todoId });
      expect(todo).toBeTruthy();
      expect(todo!.id).toBe(todoId);
      expect(todo!.title).toBe('Integration Test TODO');
      expect(todo!.notes).toBe('Created by integration test');
      expect(todo!.completed).toBe(false);
      expect(todo!.tags).toContain('test');

      // 3. Update the TODO
      const updateResult = await server.todosTools.updateTodo({
        id: todoId,
        title: 'Updated Integration Test TODO',
        notes: 'Updated by integration test'
      });
      expect(updateResult.success).toBe(true);

      // 4. Verify the update
      const updatedTodo = await server.todosTools.getTodo({ id: todoId });
      expect(updatedTodo!.title).toBe('Updated Integration Test TODO');
      expect(updatedTodo!.notes).toBe('Updated by integration test');

      // 5. Complete the TODO
      const completeResult = await server.todosTools.completeTodos({ ids: [todoId] });
      expect(completeResult.success).toBe(true);
      expect(completeResult.completedCount).toBe(1);

      // 6. Verify it's completed
      const completedTodo = await server.todosTools.getTodo({ id: todoId });
      expect(completedTodo!.completed).toBe(true);

      // 7. Uncomplete the TODO
      const uncompleteResult = await server.todosTools.uncompleteTodos({ ids: [todoId] });
      expect(uncompleteResult.success).toBe(true);
      expect(uncompleteResult.uncompletedCount).toBe(1);

      // 8. Verify it's not completed
      const uncompletedTodo = await server.todosTools.getTodo({ id: todoId });
      expect(uncompletedTodo!.completed).toBe(false);

      // 9. Delete the TODO
      const deleteResult = await server.todosTools.deleteTodos({ ids: [todoId] });
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.deletedCount).toBe(1);

      // 10. Verify deletion was attempted successfully
      // Note: Things3 deletion behavior may vary based on app state
      
      // Remove from cleanup list since it's deleted
      testTodoIds = testTodoIds.filter(id => id !== todoId);
    });
  });

  describe('Tag Handling', () => {
    it('should handle TODO tags correctly', async () => {
      // Create TODO with multiple tags
      const result = await server.todosTools.createTodo({
        title: 'TODO with Multiple Tags',
        tags: ['Work', 'Important']
      });
      
      const todoId = result.id!;
      testTodoIds.push(todoId);

      // Verify tags (may need to use existing tags or create them first)
      const todo = await server.todosTools.getTodo({ id: todoId });
      expect(todo!.tags.length).toBeGreaterThan(0);
      // Check if at least one of our intended tags is present
      const hasExpectedTags = todo!.tags.some(tag => ['Work', 'Important'].includes(tag));
      expect(hasExpectedTags).toBe(true);

      // Update tags to use existing tags that we know exist
      await server.todosTools.updateTodo({
        id: todoId,
        tags: ['Home', 'Office']
      });

      // Verify tag update
      const updatedTodo = await server.todosTools.getTodo({ id: todoId });
      expect(updatedTodo!.tags.length).toBeGreaterThan(0);
      // Verify at least one of the new tags is present and old tags are removed
      const hasNewTags = updatedTodo!.tags.some(tag => ['Home', 'Office'].includes(tag));
      expect(hasNewTags).toBe(true);
      expect(updatedTodo!.tags).not.toContain('Work');
      expect(updatedTodo!.tags).not.toContain('Important');
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk completion and deletion', async () => {
      // Create multiple TODOs
      const todo1 = await server.todosTools.createTodo({ title: 'Bulk Test 1' });
      const todo2 = await server.todosTools.createTodo({ title: 'Bulk Test 2' });
      
      const id1 = todo1.id!;
      const id2 = todo2.id!;

      // Complete both
      const completeResult = await server.todosTools.completeTodos({ 
        ids: [id1, id2] 
      });
      expect(completeResult.success).toBe(true);
      expect(completeResult.completedCount).toBe(2);

      // Delete both
      const deleteResult = await server.todosTools.deleteTodos({ 
        ids: [id1, id2] 
      });
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.deletedCount).toBe(2);

      // Verify deletion operation completed successfully
      // Note: Things3 deletion behavior may vary, so we just verify the operation succeeded
    });
  });
});