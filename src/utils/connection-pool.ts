// ABOUTME: Manages a pool of AppleScript processes for improved performance
// ABOUTME: Reuses processes to avoid startup overhead and provides lifecycle management

import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';

interface PooledProcess {
  process: ChildProcess;
  busy: boolean;
  lastUsed: number;
  id: number;
}

interface PoolOptions {
  minSize?: number;
  maxSize?: number;
  idleTimeout?: number;
  acquireTimeout?: number;
}

export class AppleScriptPool extends EventEmitter {
  private pool: PooledProcess[] = [];
  private waitingQueue: ((process: PooledProcess) => void)[] = [];
  private processCounter = 0;
  private options: Required<PoolOptions>;
  private checkInterval?: NodeJS.Timeout;

  constructor(options: PoolOptions = {}) {
    super();
    this.options = {
      minSize: options.minSize ?? 2,
      maxSize: options.maxSize ?? 5,
      idleTimeout: options.idleTimeout ?? 60000, // 1 minute
      acquireTimeout: options.acquireTimeout ?? 5000 // 5 seconds
    };
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Create minimum number of processes
    const promises = [];
    for (let i = 0; i < this.options.minSize; i++) {
      promises.push(this.createProcess());
    }
    await Promise.all(promises);
    
    // Start idle check interval
    this.checkInterval = setInterval(() => this.checkIdleProcesses(), 10000);
  }

  private async createProcess(): Promise<PooledProcess> {
    const id = ++this.processCounter;
    const process = spawn('osascript', ['-i'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const pooledProcess: PooledProcess = {
      process,
      busy: false,
      lastUsed: Date.now(),
      id
    };
    
    // Handle process errors
    process.on('error', (error) => {
      this.emit('error', { id, error });
      this.removeProcess(pooledProcess);
    });
    
    process.on('exit', (code) => {
      this.emit('exit', { id, code });
      this.removeProcess(pooledProcess);
    });
    
    this.pool.push(pooledProcess);
    this.emit('created', { id });
    
    return pooledProcess;
  }

  async acquire(): Promise<PooledProcess> {
    // Try to find an idle process
    const idleProcess = this.pool.find(p => !p.busy && p.process.exitCode === null);
    
    if (idleProcess) {
      idleProcess.busy = true;
      idleProcess.lastUsed = Date.now();
      return idleProcess;
    }
    
    // Create new process if pool not at max
    if (this.pool.length < this.options.maxSize) {
      const newProcess = await this.createProcess();
      newProcess.busy = true;
      newProcess.lastUsed = Date.now();
      return newProcess;
    }
    
    // Wait for a process to become available
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.indexOf(resolveFunc);
        if (index > -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new Error('Timeout acquiring AppleScript process'));
      }, this.options.acquireTimeout);
      
      const resolveFunc = (process: PooledProcess) => {
        clearTimeout(timeout);
        process.busy = true;
        process.lastUsed = Date.now();
        resolve(process);
      };
      
      this.waitingQueue.push(resolveFunc);
    });
  }

  release(pooledProcess: PooledProcess): void {
    pooledProcess.busy = false;
    pooledProcess.lastUsed = Date.now();
    
    // Check if anyone is waiting
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift();
      if (waiter) {
        waiter(pooledProcess);
      }
    }
  }

  async execute(script: string): Promise<string> {
    const pooledProcess = await this.acquire();
    
    try {
      return await this.executeOnProcess(pooledProcess, script);
    } finally {
      this.release(pooledProcess);
    }
  }

  private executeOnProcess(pooledProcess: PooledProcess, script: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const { process } = pooledProcess;
      let output = '';
      let error = '';
      let timeout: NodeJS.Timeout;
      
      const cleanup = () => {
        clearTimeout(timeout);
        process.stdout?.removeListener('data', onData);
        process.stderr?.removeListener('data', onError);
      };
      
      const onData = (data: Buffer) => {
        output += data.toString();
      };
      
      const onError = (data: Buffer) => {
        error += data.toString();
      };
      
      // Set up timeout
      timeout = setTimeout(() => {
        cleanup();
        reject(new Error('AppleScript execution timeout'));
      }, 30000);
      
      process.stdout?.on('data', onData);
      process.stderr?.on('data', onError);
      
      // Write script and EOF marker
      process.stdin?.write(script + '\n');
      process.stdin?.write('return "END_OF_SCRIPT"\n');
      
      // Wait for completion marker
      const checkCompletion = setInterval(() => {
        if (output.includes('END_OF_SCRIPT')) {
          clearInterval(checkCompletion);
          cleanup();
          
          // Remove the marker from output
          const result = output.replace(/END_OF_SCRIPT\s*$/, '').trim();
          
          if (error) {
            reject(new Error(`AppleScript error: ${error}`));
          } else {
            resolve(result);
          }
        }
      }, 50);
    });
  }

  private removeProcess(pooledProcess: PooledProcess): void {
    const index = this.pool.indexOf(pooledProcess);
    if (index > -1) {
      this.pool.splice(index, 1);
    }
    
    // Kill process if still running
    if (pooledProcess.process.exitCode === null) {
      pooledProcess.process.kill();
    }
    
    // Ensure minimum pool size
    if (this.pool.length < this.options.minSize) {
      this.createProcess().catch(err => 
        this.emit('error', { error: err, context: 'maintaining minimum pool size' })
      );
    }
  }

  private checkIdleProcesses(): void {
    const now = Date.now();
    const idleProcesses = this.pool.filter(p => 
      !p.busy && 
      (now - p.lastUsed) > this.options.idleTimeout &&
      this.pool.length > this.options.minSize
    );
    
    for (const process of idleProcesses) {
      this.emit('idle-timeout', { id: process.id });
      this.removeProcess(process);
    }
  }

  async shutdown(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Kill all processes
    for (const pooledProcess of this.pool) {
      if (pooledProcess.process.exitCode === null) {
        pooledProcess.process.kill();
      }
    }
    
    this.pool = [];
    this.waitingQueue = [];
  }

  getStats() {
    return {
      poolSize: this.pool.length,
      busyProcesses: this.pool.filter(p => p.busy).length,
      idleProcesses: this.pool.filter(p => !p.busy).length,
      waitingQueue: this.waitingQueue.length,
      processes: this.pool.map(p => ({
        id: p.id,
        busy: p.busy,
        lastUsed: p.lastUsed,
        alive: p.process.exitCode === null
      }))
    };
  }
}