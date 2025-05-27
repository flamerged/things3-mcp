// ABOUTME: Performance utilities for optimizing AppleScript execution
// ABOUTME: Includes batching, template pre-compilation, and execution timing

interface TimingResult {
  operation: string;
  duration: number;
  timestamp: number;
}

interface BatchOperation<T, R> {
  id: string;
  operation: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

export class PerformanceMonitor {
  private timings: TimingResult[] = [];
  private maxTimings = 1000;

  /**
   * Start timing an operation
   * @returns A function to stop timing and record the result
   */
  startTimer(operation: string): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.recordTiming({
        operation,
        duration,
        timestamp: Date.now()
      });
    };
  }

  /**
   * Time an async operation
   */
  async timeOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const stopTimer = this.startTimer(operation);
    try {
      return await fn();
    } finally {
      stopTimer();
    }
  }

  /**
   * Record a timing result
   */
  private recordTiming(timing: TimingResult): void {
    this.timings.push(timing);
    
    // Keep only recent timings
    if (this.timings.length > this.maxTimings) {
      this.timings = this.timings.slice(-this.maxTimings);
    }
  }

  /**
   * Get timing statistics
   */
  getStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
  } {
    const relevantTimings = operation
      ? this.timings.filter(t => t.operation === operation)
      : this.timings;
    
    if (relevantTimings.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0
      };
    }
    
    const durations = relevantTimings.map(t => t.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    const p95Index = Math.floor(durations.length * 0.95);
    
    return {
      count: durations.length,
      avgDuration: sum / durations.length,
      minDuration: durations[0] ?? 0,
      maxDuration: durations[durations.length - 1] ?? 0,
      p95Duration: durations[p95Index] || durations[durations.length - 1] || 0
    };
  }

  /**
   * Clear all timing data
   */
  clear(): void {
    this.timings = [];
  }
}

/**
 * Template compiler for pre-compiling AppleScript templates
 */
export class TemplateCompiler {
  private compiledTemplates = new Map<string, CompiledTemplate>();

  /**
   * Compile a template for faster execution
   */
  compile(name: string, template: string): CompiledTemplate {
    const compiled = new CompiledTemplate(template);
    this.compiledTemplates.set(name, compiled);
    return compiled;
  }

  /**
   * Get a compiled template
   */
  get(name: string): CompiledTemplate | undefined {
    return this.compiledTemplates.get(name);
  }

  /**
   * Execute a compiled template with parameters
   */
  execute(name: string, params: Record<string, unknown>): string {
    const template = this.compiledTemplates.get(name);
    if (!template) {
      throw new Error(`Template ${name} not found`);
    }
    return template.render(params);
  }
}

/**
 * Compiled template for fast parameter substitution
 */
export class CompiledTemplate {
  private parts: string[];
  private params: string[];

  constructor(template: string) {
    // Parse template to extract parameter placeholders
    const regex = /\$\{([^}]+)\}/g;
    this.parts = [];
    this.params = [];
    
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      this.parts.push(template.substring(lastIndex, match.index));
      this.params.push(match[1] ?? '');
      lastIndex = match.index + match[0].length;
    }
    
    this.parts.push(template.substring(lastIndex));
  }

  /**
   * Render the template with given parameters
   */
  render(params: Record<string, unknown>): string {
    let result = this.parts[0] ?? '';
    
    for (let i = 0; i < this.params.length; i++) {
      const paramName = this.params[i];
      if (!paramName) continue;
      
      const value = params[paramName];
      
      if (value === undefined) {
        throw new Error(`Missing parameter: ${paramName}`);
      }
      
      const nextPart = this.parts[i + 1];
      result += String(value) + (nextPart ?? '');
    }
    
    return result;
  }
}

/**
 * Batch executor for combining multiple operations
 */
export class BatchExecutor<T, R> {
  private queue: BatchOperation<T, R>[] = [];
  private batchSize: number;
  private batchDelay: number;
  private timer?: NodeJS.Timeout | undefined;
  private processFn: (operations: T[]) => Promise<R[]>;

  constructor(options: {
    batchSize: number;
    batchDelay: number;
    processFn: (operations: T[]) => Promise<R[]>;
  }) {
    this.batchSize = options.batchSize;
    this.batchDelay = options.batchDelay;
    this.processFn = options.processFn;
  }

  /**
   * Add an operation to the batch queue
   */
  async execute(operation: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: Math.random().toString(36).substr(2, 9),
        operation,
        resolve,
        reject
      });
      
      this.scheduleBatch();
    });
  }

  /**
   * Schedule batch execution
   */
  private scheduleBatch(): void {
    // If we've reached batch size, execute immediately
    if (this.queue.length >= this.batchSize) {
      this.executeBatch();
      return;
    }
    
    // Otherwise, schedule execution after delay
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.executeBatch();
      }, this.batchDelay);
    }
  }

  /**
   * Execute the current batch
   */
  private async executeBatch(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    
    if (this.queue.length === 0) return;
    
    // Take current batch
    const batch = this.queue.splice(0, this.batchSize);
    const operations = batch.map(b => b.operation);
    
    try {
      const results = await this.processFn(operations);
      
      // Resolve individual promises
      for (let i = 0; i < batch.length; i++) {
        const batchItem = batch[i];
        if (!batchItem) continue;
        
        if (i < results.length) {
          batchItem.resolve(results[i] as R);
        } else {
          batchItem.reject(new Error('Batch operation returned fewer results than expected'));
        }
      }
    } catch (error) {
      // Reject all promises in the batch
      for (const item of batch) {
        item.reject(error as Error);
      }
    }
    
    // Schedule next batch if there are more items
    if (this.queue.length > 0) {
      this.scheduleBatch();
    }
  }

  /**
   * Flush any pending operations
   */
  async flush(): Promise<void> {
    while (this.queue.length > 0) {
      await this.executeBatch();
    }
  }
}

/**
 * Script optimizer for combining multiple AppleScript operations
 */
export class ScriptOptimizer {
  /**
   * Combine multiple TODO operations into a single script
   */
  static combineTodoOperations(operations: Array<{
    type: 'complete' | 'uncomplete' | 'delete';
    ids: string[];
  }>): string {
    const lines: string[] = ['tell application "Things3"'];
    
    for (const op of operations) {
      const idList = op.ids.map(id => `"${id}"`).join(', ');
      
      switch (op.type) {
        case 'complete':
          lines.push(`  repeat with todoId in {${idList}}`);
          lines.push('    set t to to do id todoId');
          lines.push('    set status of t to completed');
          lines.push('  end repeat');
          break;
          
        case 'uncomplete':
          lines.push(`  repeat with todoId in {${idList}}`);
          lines.push('    set t to to do id todoId');
          lines.push('    set status of t to open');
          lines.push('  end repeat');
          break;
          
        case 'delete':
          lines.push(`  repeat with todoId in {${idList}}`);
          lines.push('    delete to do id todoId');
          lines.push('  end repeat');
          break;
      }
    }
    
    lines.push('end tell');
    return lines.join('\n');
  }

  /**
   * Combine multiple tag operations
   */
  static combineTagOperations(operations: Array<{
    type: 'add' | 'remove';
    itemIds: string[];
    tags: string[];
  }>): string {
    const lines: string[] = ['tell application "Things3"'];
    
    for (const op of operations) {
      const itemList = op.itemIds.map(id => `"${id}"`).join(', ');
      const tagList = op.tags.map(tag => `"${tag}"`).join(', ');
      
      lines.push(`  repeat with itemId in {${itemList}}`);
      lines.push('    try');
      lines.push('      set t to to do id itemId');
      
      if (op.type === 'add') {
        lines.push(`      repeat with tagName in {${tagList}}`);
        lines.push('        set tag names of t to (tag names of t) & tagName');
        lines.push('      end repeat');
      } else {
        lines.push('      set currentTags to tag names of t');
        lines.push(`      repeat with tagName in {${tagList}}`);
        lines.push('        set currentTags to my removeFromList(currentTags, tagName)');
        lines.push('      end repeat');
        lines.push('      set tag names of t to currentTags');
      }
      
      lines.push('    end try');
      lines.push('  end repeat');
    }
    
    // Add helper function for tag removal
    if (operations.some(op => op.type === 'remove')) {
      lines.push('');
      lines.push('  on removeFromList(theList, theItem)');
      lines.push('    set newList to {}');
      lines.push('    repeat with i in theList');
      lines.push('      if i is not equal to theItem then');
      lines.push('        set end of newList to i');
      lines.push('      end if');
      lines.push('    end repeat');
      lines.push('    return newList');
      lines.push('  end removeFromList');
    }
    
    lines.push('end tell');
    return lines.join('\n');
  }
}