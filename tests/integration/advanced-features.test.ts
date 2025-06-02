// ABOUTME: Integration tests for Things3 advanced features
// ABOUTME: Tests logbook search, error correction, and system tools

import { setupTestEnvironment, cleanupTestEnvironment } from './test-infrastructure.js';
import type { TestEnvironment } from './test-infrastructure.js';

describe('Advanced Features Integration Tests', () => {
  let env: TestEnvironment;

  beforeAll(async () => {
    env = await setupTestEnvironment();
  }, 30000);

  afterAll(async () => {
    await cleanupTestEnvironment(env);
  }, 15000);

  describe('Logbook Search Operations', () => {
    beforeAll(async () => {
      // Create some completed TODOs for logbook testing
      const todoIds: string[] = [];
      
      // Create and complete TODOs
      for (let i = 0; i < 3; i++) {
        const result = await env.server.todosTools.createTodo({
          title: `LogbookTest_${i}_${Date.now()}`,
          notes: `Test notes for logbook item ${i}`
        });
        todoIds.push(result.id!);
        env.tracker.trackTodo(result.id!);
      }
      
      // Complete the TODOs to move them to logbook
      await env.server.todosTools.completeTodos({ ids: todoIds });
      
      // Wait a bit for Things3 to process the completions
      await new Promise(resolve => setTimeout(resolve, 2000));
    }, 30000);

    it('should search logbook without filters', async () => {
      const result = await env.server.logbookTools.search({});
      
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      
      // Each item should have required properties
      if (result.items.length > 0) {
        const item = result.items[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('completed');
        expect(item!.completed).toBe(true);
      }
    });

    it('should search logbook with text filter', async () => {
      const searchText = 'LogbookTest';
      const result = await env.server.logbookTools.search({
        searchText: searchText
      });
      
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
      
      // All returned items should contain the search text
      result.items.forEach(item => {
        expect(item.title).toContain(searchText);
      });
    });

    it('should respect logbook search limit', async () => {
      const limit = 5;
      const result = await env.server.logbookTools.search({
        limit: limit
      });
      
      expect(result).toHaveProperty('items');
      expect(result.items.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('Error Correction Features', () => {
    it('should correct date conflicts automatically', async () => {
      // Create TODO with deadline before when date (conflict)
      const result = await env.server.todosTools.createTodo({
        title: 'TODO with date conflict',
        whenDate: '2024-12-25',
        deadline: '2024-12-20' // Deadline before when date
      });
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('correctionsMade');
      expect(result.correctionsMade?.some(c => c.includes('date_conflict'))).toBe(true);
      
      env.tracker.trackTodo(result.id!);
      
      // Verify the dates were swapped
      const todo = await env.server.todosTools.getTodo({ id: result.id! });
      expect(todo).toBeDefined();
      // The dates should be corrected (swapped)
      expect(todo!.whenDate).toContain('20'); // Should contain the earlier date
      expect(todo!.deadline).toContain('25'); // Should contain the later date
    });

    it('should generate title from notes when title is missing', async () => {
      // Create TODO without title
      const result = await env.server.todosTools.createTodo({
        title: '', // Empty title
        notes: 'This TODO has no title but has notes'
      });
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('correctionsMade');
      expect(result.correctionsMade?.some(c => c.includes('missing_title'))).toBe(true);
      
      env.tracker.trackTodo(result.id!);
      
      // Verify the title was generated from notes
      const todo = await env.server.todosTools.getTodo({ id: result.id! });
      expect(todo).toBeDefined();
      expect(todo!.title).toBe('This TODO has no title but has notes');
    });

    it('should handle invalid project references gracefully', async () => {
      // Create TODO with invalid project ID
      const result = await env.server.todosTools.createTodo({
        title: 'TODO with invalid project',
        projectId: 'invalid-project-id-12345'
      });
      
      expect(result).toHaveProperty('id');
      // Should succeed despite invalid project ID
      expect(result.success).toBe(true);
      
      env.tracker.trackTodo(result.id!);
      
      // Verify the TODO was created (likely in inbox)
      const todo = await env.server.todosTools.getTodo({ id: result.id! });
      expect(todo).toBeDefined();
      expect(todo!.title).toBe('TODO with invalid project');
    });
  });


  describe('System Tools Operations', () => {
    it('should ensure Things3 is running', async () => {
      const result = await env.server.systemTools.launch();
      
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('running');
      expect(result).toHaveProperty('version');
      expect(typeof result.version).toBe('string');
      expect(result.version).toMatch(/^\d+\.\d+/); // Version format like "3.17"
    });
  });

  describe('Advanced Features Performance', () => {
    it('should complete all advanced operations within reasonable time', async () => {
      const startTime = Date.now();
      
      // Perform various advanced operations
      await env.server.logbookTools.search({ limit: 10 });
      await env.server.systemTools.launch();
      await env.server.projectTools.listProjects({});
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
      
      if (duration > 5000) {
        console.warn(`Advanced operations took ${duration}ms - consider optimization`);
      }
    });
  });
});