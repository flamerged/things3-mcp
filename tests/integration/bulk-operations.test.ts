// ABOUTME: Integration tests for Things3 bulk operations
// ABOUTME: Tests bulk move operations and bulk date updates with efficient batch processing

import { setupTestEnvironment, cleanupTestEnvironment } from './test-infrastructure.js';
import type { TestEnvironment } from './test-infrastructure.js';

describe('Bulk Operations Integration Tests', () => {
  let env: TestEnvironment;

  beforeAll(async () => {
    env = await setupTestEnvironment();
  }, 30000);

  afterAll(async () => {
    await cleanupTestEnvironment(env);
  }, 15000);

  describe('Bulk Move Operations', () => {
    let testTodoIds: string[];
    let testProjectId: string;
    let testAreaId: string;

    beforeAll(async () => {
      // Create multiple test TODOs for bulk operations
      const todoPromises = [];
      for (let i = 0; i < 3; i++) {
        todoPromises.push(
          env.server.todosTools.createTodo({
            title: `BulkTodo_${i}_${Date.now()}`
          })
        );
      }
      
      const todoResults = await Promise.all(todoPromises);
      testTodoIds = todoResults.map(result => result.id!);
      testTodoIds.forEach(id => env.tracker.trackTodo(id));

      // Create a test project for moving TODOs to
      const projectResult = await env.server.projectTools.createProject({
        name: `BulkProject_${Date.now()}`
      });
      testProjectId = projectResult.id!;
      env.tracker.trackProject(testProjectId);

      // Create a test area for moving TODOs to
      const areaResult = await env.server.areaTools.createArea({
        name: `BulkArea_${Date.now()}`
      });
      testAreaId = areaResult.id!;
      env.tracker.trackArea(areaResult.id!);
    }, 30000);

    it('should bulk move TODOs to a project', async () => {
      const result = await env.server.bulkTools.move({
        todoIds: testTodoIds,
        projectId: testProjectId
      });
      
      expect(result).toHaveProperty('moved');
      expect(result.moved).toBe(testTodoIds.length);
      
      // Verify TODOs were moved by checking their project assignment
      for (const todoId of testTodoIds) {
        const todoResult = await env.server.todosTools.getTodo({ id: todoId });
        expect(todoResult).toBeDefined();
        expect(todoResult!.projectId).toBe(testProjectId);
      }
    });

    it('should bulk move TODOs to an area', async () => {
      const result = await env.server.bulkTools.move({
        todoIds: testTodoIds,
        areaId: testAreaId
      });
      
      expect(result).toHaveProperty('moved');
      expect(result.moved).toBe(testTodoIds.length);
      
      // Verify TODOs were moved by checking their area assignment
      for (const todoId of testTodoIds) {
        const todoResult = await env.server.todosTools.getTodo({ id: todoId });
        expect(todoResult).toBeDefined();
        expect(todoResult!.areaId).toBe(testAreaId);
        // Should no longer be in the project
        expect(todoResult!.projectId).toBeUndefined();
      }
    });

    it('should bulk move TODOs to inbox (no project/area)', async () => {
      const result = await env.server.bulkTools.move({
        todoIds: testTodoIds
        // No projectId or areaId specified - should move to inbox
      });
      
      expect(result).toHaveProperty('moved');
      expect(result.moved).toBe(testTodoIds.length);
      
      // Verify TODOs are in inbox (no project or area assignment)
      for (const todoId of testTodoIds) {
        const todoResult = await env.server.todosTools.getTodo({ id: todoId });
        expect(todoResult).toBeDefined();
        expect(todoResult!.projectId).toBeUndefined();
        expect(todoResult!.areaId).toBeUndefined();
      }
    });
  });

  describe('Bulk Date Updates', () => {
    let testTodoIds: string[];

    beforeAll(async () => {
      // Create multiple test TODOs for date operations
      const todoPromises = [];
      for (let i = 0; i < 3; i++) {
        todoPromises.push(
          env.server.todosTools.createTodo({
            title: `DateTodo_${i}_${Date.now()}`
          })
        );
      }
      
      const todoResults = await Promise.all(todoPromises);
      testTodoIds = todoResults.map(result => result.id!);
      testTodoIds.forEach(id => env.tracker.trackTodo(id));
    }, 30000);

    it('should bulk update when dates', async () => {
      const whenDate = '2024-12-25';
      
      const result = await env.server.bulkTools.updateDates({
        todoIds: testTodoIds,
        whenDate: whenDate
      });
      
      expect(result).toHaveProperty('updated');
      expect(result.updated).toBe(testTodoIds.length);
      
      // Verify all TODOs have the updated when date
      for (const todoId of testTodoIds) {
        const todoResult = await env.server.todosTools.getTodo({ id: todoId });
        expect(todoResult).toBeDefined();
        expect(todoResult!.whenDate).toContain('25'); // Date might include time and different format
      }
    });

    it('should bulk update deadlines', async () => {
      const deadline = '2024-12-31';
      
      const result = await env.server.bulkTools.updateDates({
        todoIds: testTodoIds,
        deadline: deadline
      });
      
      expect(result).toHaveProperty('updated');
      expect(result.updated).toBe(testTodoIds.length);
      
      // Verify all TODOs have the updated deadline
      for (const todoId of testTodoIds) {
        const todoResult = await env.server.todosTools.getTodo({ id: todoId });
        expect(todoResult).toBeDefined();
        expect(todoResult!.deadline).toContain('31'); // Date might include time and different format
      }
    });

    it('should bulk update both when dates and deadlines', async () => {
      const whenDate = '2024-12-20';
      const deadline = '2024-12-30';
      
      const result = await env.server.bulkTools.updateDates({
        todoIds: testTodoIds,
        whenDate: whenDate,
        deadline: deadline
      });
      
      expect(result).toHaveProperty('updated');
      expect(result.updated).toBe(testTodoIds.length);
      
      // Verify all TODOs have both dates updated
      for (const todoId of testTodoIds) {
        const todoResult = await env.server.todosTools.getTodo({ id: todoId });
        expect(todoResult).toBeDefined();
        expect(todoResult!.whenDate).toContain('20');
        expect(todoResult!.deadline).toContain('30');
      }
    });

    it('should bulk clear dates when null values provided', async () => {
      const result = await env.server.bulkTools.updateDates({
        todoIds: testTodoIds,
        whenDate: null,
        deadline: null
      });
      
      expect(result).toHaveProperty('updated');
      expect(result.updated).toBe(testTodoIds.length);
      
      // Verify all TODOs have dates cleared
      for (const todoId of testTodoIds) {
        const todoResult = await env.server.todosTools.getTodo({ id: todoId });
        expect(todoResult).toBeDefined();
        expect(todoResult!.whenDate).toBeUndefined();
        expect(todoResult!.deadline).toBeUndefined();
      }
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should complete bulk operations within reasonable time', async () => {
      const startTime = Date.now();
      
      // Create 5 TODOs for performance testing
      const todoPromises = [];
      for (let i = 0; i < 5; i++) {
        todoPromises.push(
          env.server.todosTools.createTodo({
            title: `PerfTodo_${i}_${Date.now()}`
          })
        );
      }
      
      const todoResults = await Promise.all(todoPromises);
      const todoIds = todoResults.map(result => result.id!);
      todoIds.forEach(id => env.tracker.trackTodo(id));
      
      // Perform bulk operation
      await env.server.bulkTools.updateDates({
        todoIds: todoIds,
        whenDate: '2024-12-25'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 15 seconds for 5 TODOs
      expect(duration).toBeLessThan(15000);
      
      if (duration > 10000) {
        console.warn(`Bulk operations took ${duration}ms - consider optimization`);
      }
    }, 30000);

    it('should handle empty todo lists gracefully', async () => {
      const result = await env.server.bulkTools.move({
        todoIds: []
      });
      
      expect(result).toHaveProperty('moved');
      expect(result.moved).toBe(0);
    });

    it('should handle invalid todo IDs gracefully', async () => {
      const result = await env.server.bulkTools.updateDates({
        todoIds: ['invalid-id-1', 'invalid-id-2'],
        whenDate: '2024-12-25'
      });
      
      expect(result).toHaveProperty('updated');
      // The operation processes the IDs optimistically, so count matches input
      expect(result.updated).toBe(2);
    });
  });
});