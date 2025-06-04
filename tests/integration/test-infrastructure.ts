// ABOUTME: Shared test infrastructure for Things3 MCP integration tests
// ABOUTME: Provides reusable setup/teardown, timing utilities, and enhanced resource tracking

import { Things3Server } from '../../src/server';
import { AppleScriptBridge } from '../../src/utils/applescript';

export interface TestTimer {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  isWarning?: boolean;
}

export interface TestEnvironment {
  server: Things3Server;
  bridge: AppleScriptBridge;
  tracker: EnhancedTestResourceTracker;
}

export interface ResourceStats {
  todos: number;
  projects: number;
  areas: number;
  tags: number;
  totalResources: number;
  executionTime?: number;
}

export class EnhancedTestResourceTracker {
  private todos = new Set<string>();
  private projects = new Set<string>();
  private areas = new Set<string>();
  private tags = new Set<string>();
  private testTimers = new Map<string, TestTimer>();
  private server: Things3Server;
  private environmentStartTime: number;

  constructor(server: Things3Server) {
    this.server = server;
    this.environmentStartTime = Date.now();
  }

  trackTodo(id: string): void {
    this.todos.add(id);
  }

  trackTodos(ids: string[]): void {
    ids.forEach(id => this.todos.add(id));
  }

  trackProject(id: string): void {
    this.projects.add(id);
  }

  trackArea(name: string): void {
    this.areas.add(name);
  }

  trackTag(name: string): void {
    this.tags.add(name);
  }

  trackTags(names: string[]): void {
    names.forEach(name => this.tags.add(name));
  }

  startTimer(timerName: string): void {
    this.testTimers.set(timerName, {
      name: timerName,
      startTime: Date.now()
    });
  }

  endTimer(timerName: string): TestTimer {
    const timer = this.testTimers.get(timerName);
    if (!timer) {
      throw new Error(`Timer '${timerName}' was not started`);
    }

    timer.endTime = Date.now();
    timer.duration = timer.endTime - timer.startTime;
    timer.isWarning = timer.duration > 10000; // Warn if > 10 seconds

    if (timer.isWarning) {
      console.warn(`⚠️  Test '${timerName}' took ${(timer.duration / 1000).toFixed(2)}s (> 10s threshold)`);
    }

    return timer;
  }

  getTimingReport(): string {
    const timers = Array.from(this.testTimers.values());
    const totalTime = Date.now() - this.environmentStartTime;
    
    let report = '\n=== Test Timing Report ===\n';
    report += `Total execution time: ${(totalTime / 1000).toFixed(2)}s\n\n`;

    const completedTimers = timers.filter(t => t.duration !== undefined);
    if (completedTimers.length === 0) {
      report += 'No completed test timers recorded.\n';
      return report;
    }

    // Sort by duration (slowest first)
    completedTimers.sort((a, b) => (b.duration || 0) - (a.duration || 0));

    report += 'Test durations:\n';
    completedTimers.forEach(timer => {
      const icon = timer.isWarning ? '⚠️ ' : '✓ ';
      report += `${icon}${timer.name}: ${(timer.duration! / 1000).toFixed(2)}s\n`;
    });

    const warnings = completedTimers.filter(t => t.isWarning);
    if (warnings.length > 0) {
      report += `\n⚠️  ${warnings.length} test(s) exceeded 10s threshold\n`;
    }

    return report;
  }

  getStats(): ResourceStats {
    return {
      todos: this.todos.size,
      projects: this.projects.size,
      areas: this.areas.size,
      tags: this.tags.size,
      totalResources: this.todos.size + this.projects.size + this.areas.size + this.tags.size,
      executionTime: Date.now() - this.environmentStartTime
    };
  }

  async cleanup(): Promise<void> {
    const stats = this.getStats();
    console.log(`\n🧹 Starting cleanup of ${stats.totalResources} test resources...`);

    let cleaned = 0;
    let failed = 0;

    // Delete TODOs
    if (this.todos.size > 0) {
      try {
        const todoIds = Array.from(this.todos);
        console.log(`  Deleting ${todoIds.length} TODOs...`);
        await this.server.todosTools.deleteTodos({ ids: todoIds });
        cleaned += todoIds.length;
        this.todos.clear();
      } catch (error) {
        console.error('  ❌ Failed to delete some TODOs:', error);
        failed += this.todos.size;
      }
    }

    // Note: Projects, areas, and tags don't have delete operations in Things3
    // We'll track them but manual cleanup may be needed
    if (this.projects.size > 0) {
      console.log(`  🚨 Note: ${this.projects.size} test projects created - manual cleanup may be needed`);
      console.log(`     Projects: ${Array.from(this.projects).join(', ')}`);
    }
    this.projects.clear();

    if (this.areas.size > 0) {
      console.log(`  🚨 Note: ${this.areas.size} test areas created - manual cleanup may be needed`);
      console.log(`     Areas: ${Array.from(this.areas).join(', ')}`);
    }
    this.areas.clear();

    if (this.tags.size > 0) {
      console.log(`  🚨 Note: ${this.tags.size} test tags created - manual cleanup may be needed`);
      console.log(`     Tags: ${Array.from(this.tags).join(', ')}`);
    }
    this.tags.clear();

    console.log(`✅ Cleanup complete: ${cleaned} cleaned, ${failed} failed`);
    console.log(this.getTimingReport());
  }

  // Support for parallel test execution
  merge(other: EnhancedTestResourceTracker): void {
    other.todos.forEach(id => this.todos.add(id));
    other.projects.forEach(id => this.projects.add(id));
    other.areas.forEach(name => this.areas.add(name));
    other.tags.forEach(name => this.tags.add(name));
    
    // Merge timers
    other.testTimers.forEach((timer, name) => {
      if (!this.testTimers.has(name)) {
        this.testTimers.set(name, timer);
      }
    });
  }
}

export async function setupTestEnvironment(): Promise<TestEnvironment> {
  console.log('\n🔧 Setting up test environment...');
  
  const server = new Things3Server();
  const bridge = new AppleScriptBridge();
  const tracker = new EnhancedTestResourceTracker(server);

  // Ensure Things3 is running
  try {
    await bridge.ensureThings3Running();
    console.log('✅ Things3 is running');
  } catch (error) {
    console.error('❌ Things3 is not available. Integration tests cannot run.');
    console.error('Please ensure Things3 is installed and running on macOS.');
    console.error('Error:', error);
    throw new Error('Things3 is not available for testing');
  }


  console.log('✅ Test environment ready\n');
  
  return { server, bridge, tracker };
}

export async function cleanupTestEnvironment(env: TestEnvironment): Promise<void> {
  console.log('\n🧹 Cleaning up test environment...');
  
  try {
    await env.tracker.cleanup();
  } catch (error) {
    console.error('❌ Cleanup encountered errors:', error);
    // Continue with cleanup even if some operations fail
  }

  const stats = env.tracker.getStats();
  console.log(`\n📊 Final statistics:`);
  console.log(`  Total resources tracked: ${stats.totalResources}`);
  console.log(`  Total execution time: ${((stats.executionTime || 0) / 1000).toFixed(2)}s`);
  console.log('✅ Test environment cleanup complete\n');
}

// Test timing utilities
export function startTestTimer(): TestTimer {
  return {
    name: 'test',
    startTime: Date.now()
  };
}

export function endTestTimer(timer: TestTimer, testName?: string): TestTimer {
  timer.endTime = Date.now();
  timer.duration = timer.endTime - timer.startTime;
  timer.isWarning = timer.duration > 10000;
  
  if (testName) {
    timer.name = testName;
  }

  if (timer.isWarning) {
    console.warn(`⚠️  Test '${timer.name}' took ${(timer.duration / 1000).toFixed(2)}s (> 10s threshold)`);
  }

  return timer;
}

export function logTestDuration(testName: string, duration: number): void {
  const seconds = (duration / 1000).toFixed(2);
  const icon = duration > 10000 ? '⚠️ ' : '✓ ';
  console.log(`${icon}${testName}: ${seconds}s`);
}

// Helper to generate unique test IDs
export function generateTestId(): string {
  return `TEST_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_`;
}

// Helper to wait for Things3 to process operations
export async function waitForThings3(ms: number = 1000): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}