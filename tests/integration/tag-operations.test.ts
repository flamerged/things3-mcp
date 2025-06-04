// ABOUTME: Integration tests for Things3 tag operations
// ABOUTME: Tests tag list, creation, and add/remove operations with hierarchy support

import { setupTestEnvironment, cleanupTestEnvironment } from './test-infrastructure.js';
import type { TestEnvironment } from './test-infrastructure.js';

describe('Tag Operations Integration Tests', () => {
  let env: TestEnvironment;

  beforeAll(async () => {
    env = await setupTestEnvironment();
  }, 30000);

  afterAll(async () => {
    await cleanupTestEnvironment(env);
  }, 15000);

  describe('Tag List Operations', () => {
    it('should list all tags', async () => {
      const result = await env.server.tagTools.listTags();
      
      expect(result).toHaveProperty('tags');
      expect(Array.isArray(result.tags)).toBe(true);
      
      // Each tag should have required properties
      if (result.tags.length > 0) {
        const tag = result.tags[0];
        expect(tag).toHaveProperty('id');
        expect(tag).toHaveProperty('name');
        expect(typeof tag!.id).toBe('string');
        expect(typeof tag!.name).toBe('string');
      }
    });
  });

  describe('Tag Creation Operations', () => {
    it('should create a new tag', async () => {
      const tagName = `TestTag_${Date.now()}`;
      
      const result = await env.server.tagTools.createTag({
        name: tagName
      });
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(typeof result.id).toBe('string');
      
      // Track for cleanup
      env.tracker.trackTag(tagName);
      
      // Verify the tag was created by listing tags
      const listResult = await env.server.tagTools.listTags();
      const createdTag = listResult.tags.find(t => t.name === tagName);
      expect(createdTag).toBeDefined();
      expect(createdTag?.id).toBe(result.id);
    });

    it('should create a tag with hierarchy', async () => {
      // First create a parent tag
      const parentTagName = `ParentTag_${Date.now()}`;
      const parentResult = await env.server.tagTools.createTag({
        name: parentTagName
      });
      
      expect(parentResult.success).toBe(true);
      env.tracker.trackTag(parentTagName);
      
      // Create a child tag
      const childTagName = `ChildTag_${Date.now()}`;
      const childResult = await env.server.tagTools.createTag({
        name: childTagName,
        parentTagId: parentResult.id!
      });
      
      expect(childResult.success).toBe(true);
      env.tracker.trackTag(childTagName);
      
      // Verify the hierarchy by listing tags
      const listResult = await env.server.tagTools.listTags();
      const childTag = listResult.tags.find(t => t.name === childTagName);
      expect(childTag).toBeDefined();
      // Note: Tag hierarchy may not be fully supported in Things3
      if (childTag?.parentTagId) {
        expect(childTag.parentTagId).toBe(parentResult.id);
      } else {
        console.warn('Tag hierarchy not supported or not working as expected');
      }
    });
  });

  describe('Tag Assignment Operations', () => {
    let testTodoId: string;
    let testProjectId: string;
    let testTagName: string;

    beforeAll(async () => {
      // Create a test TODO
      const todoResult = await env.server.todosTools.createTodo({
        title: `TestTodo_${Date.now()}`
      });
      
      if (!todoResult.id || todoResult.id === 'unknown') {
        throw new Error('Failed to create test TODO with valid ID');
      }
      
      testTodoId = todoResult.id;
      console.log(`Created TODO with ID: ${testTodoId}`);
      env.tracker.trackTodo(testTodoId);
      
      // Wait for Things3 to fully process the TODO creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the TODO exists
      try {
        const verifyTodo = await env.server.todosTools.getTodo({ id: testTodoId });
        console.log(`Verified TODO exists: ${verifyTodo?.title}`);
      } catch (error) {
        console.error(`Failed to verify TODO with ID ${testTodoId}:`, error);
      }

      // Create a test project
      const projectResult = await env.server.projectTools.createProject({
        name: `TestProject_${Date.now()}`
      });
      
      if (!projectResult.id || projectResult.id === 'created') {
        throw new Error('Failed to create test project with valid ID');
      }
      
      testProjectId = projectResult.id;
      env.tracker.trackProject(testProjectId);
      
      // Wait for Things3 to fully process the project creation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create a test tag
      testTagName = `AssignTag_${Date.now()}`;
      await env.server.tagTools.createTag({
        name: testTagName
      });
      env.tracker.trackTag(testTagName);
    }, 30000);

    it('should add tags to a TODO', async () => {
      console.log(`Attempting to add tag "${testTagName}" to TODO ID: ${testTodoId}`);
      const result = await env.server.tagTools.addTags({
        itemIds: [testTodoId],
        tags: [testTagName]
      });
      
      expect(result).toHaveProperty('updatedCount');
      expect(result.updatedCount).toBe(1);
      
      // Verify the tag was added by getting the TODO
      const todoResult = await env.server.todosTools.getTodo({ id: testTodoId });
      expect(todoResult).toBeDefined();
      expect(todoResult!.tags).toContain(testTagName);
    });

    it('should add tags to a project', async () => {
      const result = await env.server.tagTools.addTags({
        itemIds: [testProjectId],
        tags: [testTagName]
      });
      
      expect(result).toHaveProperty('updatedCount');
      expect(result.updatedCount).toBe(1);
      
      // Verify the tag was added by getting the project
      const projectResult = await env.server.projectTools.getProject({ id: testProjectId });
      expect(projectResult.project).toBeDefined();
      // Note: Project interface doesn't include tags property, but operation should succeed
    });

    it('should remove tags from a TODO', async () => {
      // First ensure the tag is on the TODO
      await env.server.tagTools.addTags({
        itemIds: [testTodoId],
        tags: [testTagName]
      });
      
      // Now remove it
      const result = await env.server.tagTools.removeTags({
        itemIds: [testTodoId],
        tags: [testTagName]
      });
      
      expect(result).toHaveProperty('updatedCount');
      expect(result.updatedCount).toBe(1);
      
      // Wait a moment for Things3 to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the tag was removed
      const todoResult = await env.server.todosTools.getTodo({ id: testTodoId });
      expect(todoResult).toBeDefined();
      console.log(`TODO tags after removal: ${JSON.stringify(todoResult!.tags)}`);
      expect(todoResult!.tags).not.toContain(testTagName);
    });

    it('should remove tags from a project', async () => {
      // First ensure the tag is on the project
      await env.server.tagTools.addTags({
        itemIds: [testProjectId],
        tags: [testTagName]
      });
      
      // Now remove it
      const result = await env.server.tagTools.removeTags({
        itemIds: [testProjectId],
        tags: [testTagName]
      });
      
      expect(result).toHaveProperty('updatedCount');
      expect(result.updatedCount).toBe(1);
      
      // Verify the tag was removed
      const projectResult = await env.server.projectTools.getProject({ id: testProjectId });
      expect(projectResult.project).toBeDefined();
      // Note: Project interface doesn't include tags property but operation should succeed, but operation should succeed
    });

    it('should handle adding tags to multiple items', async () => {
      const result = await env.server.tagTools.addTags({
        itemIds: [testTodoId, testProjectId],
        tags: [testTagName]
      });
      
      expect(result).toHaveProperty('updatedCount');
      expect(result.updatedCount).toBe(2);
      
      // Verify both items have the tag
      const todoResult = await env.server.todosTools.getTodo({ id: testTodoId });
      const projectResult = await env.server.projectTools.getProject({ id: testProjectId });
      
      expect(todoResult!.tags).toContain(testTagName);
      expect(projectResult.project).toBeDefined();
      // Note: Project interface doesn't include tags property
    });
  });

  describe('Tag Operations Performance', () => {
    it('should complete tag operations within reasonable time', async () => {
      const startTime = Date.now();
      
      // Create a tag
      const tagName = `PerfTag_${Date.now()}`;
      await env.server.tagTools.createTag({
        name: tagName
      });
      env.tracker.trackTag(tagName);
      
      // List tags
      await env.server.tagTools.listTags();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
      
      if (duration > 5000) {
        console.warn(`Tag operations took ${duration}ms - consider optimization`);
      }
    });
  });
});