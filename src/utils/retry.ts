// ABOUTME: Retry logic and recovery mechanisms for handling transient failures
// ABOUTME: Implements exponential backoff and intelligent error recovery strategies

import { getConfig } from '../config.js';
import { createLogger } from './logger.js';
import { ErrorType, Things3Error } from '../types/index.js';
import { AppleScriptBridge } from './applescript.js';

const logger = createLogger('Retry');

interface RetryOptions {
  maxAttempts?: number;
  backoffMultiplier?: number;
  initialDelay?: number;
  maxDelay?: number;
  retryableErrors?: ErrorType[];
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retryable error types
 */
const DEFAULT_RETRYABLE_ERRORS: ErrorType[] = [
  ErrorType.TIMEOUT,
  ErrorType.APPLESCRIPT_ERROR,
  ErrorType.THINGS_NOT_RUNNING
];

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = getConfig().retry;
  
  const {
    maxAttempts = config.maxAttempts,
    backoffMultiplier = config.backoffMultiplier,
    initialDelay = config.initialDelay,
    maxDelay = config.maxDelay,
    retryableErrors = DEFAULT_RETRYABLE_ERRORS,
    onRetry
  } = options;
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      if (!isRetryableError(error, retryableErrors)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );
      
      logger.debug(`Retrying after ${delay}ms (attempt ${attempt}/${maxAttempts})`, {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, error as Error);
      }
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // All attempts failed
  throw new Things3Error(
    ErrorType.MAX_RETRIES,
    `Operation failed after ${maxAttempts} attempts`,
    { originalError: lastError }
  );
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown, retryableTypes: ErrorType[]): boolean {
  if (error instanceof Things3Error) {
    return retryableTypes.includes(error.type);
  }
  
  // Check for specific error messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network or timeout errors
    if (message.includes('timeout') || 
        message.includes('timed out') ||
        message.includes('econnrefused')) {
      return true;
    }
    
    // AppleScript specific errors that might be transient
    if (message.includes('applescript') && 
        (message.includes('execution failed') || 
         message.includes("can't get"))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Recovery strategies for specific error types
 */
export class ErrorRecovery {
  private bridge: AppleScriptBridge;
  
  constructor(bridge: AppleScriptBridge) {
    this.bridge = bridge;
  }
  
  /**
   * Attempt to recover from an error
   */
  async recover(error: Error): Promise<boolean> {
    logger.info('Attempting error recovery', { 
      error: error.message,
      type: error instanceof Things3Error ? error.type : 'unknown'
    });
    
    if (error instanceof Things3Error) {
      switch (error.type) {
        case ErrorType.THINGS_NOT_RUNNING:
          return await this.recoverThingsNotRunning();
          
        case ErrorType.TIMEOUT:
          return await this.recoverTimeout();
          
        case ErrorType.INVALID_REFERENCE:
          return await this.recoverInvalidReference();
          
        default:
          return false;
      }
    }
    
    return false;
  }
  
  /**
   * Recover from Things3 not running
   */
  private async recoverThingsNotRunning(): Promise<boolean> {
    try {
      logger.info('Things3 not running, attempting to launch...');
      
      const launched = await this.bridge.ensureThings3Running();
      
      if (launched) {
        logger.info('Successfully launched Things3');
        // Give Things3 extra time to fully initialize
        await sleep(3000);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to launch Things3', error as Error);
      return false;
    }
  }
  
  /**
   * Recover from timeout errors
   */
  private async recoverTimeout(): Promise<boolean> {
    logger.info('Recovering from timeout, checking Things3 status...');
    
    try {
      // Check if Things3 is responsive
      const isRunning = await this.bridge.isThings3Running();
      
      if (!isRunning) {
        // Try to launch Things3
        return await this.recoverThingsNotRunning();
      }
      
      // Things3 is running but slow, wait a bit
      logger.info('Things3 is running but slow, waiting before retry...');
      await sleep(2000);
      return true;
      
    } catch {
      return false;
    }
  }
  
  /**
   * Recover from invalid reference errors
   */
  private async recoverInvalidReference(): Promise<boolean> {
    logger.info('Invalid reference detected, will use fallback behavior');
    // This is handled by error correction, so just return true
    // to indicate the operation can be retried
    return true;
  }
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000 // 1 minute
  ) {}
  
  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceLastFailure > this.timeout) {
        // Try to close the circuit
        this.state = 'half-open';
        logger.debug('Circuit breaker moving to half-open state');
      } else {
        throw new Things3Error(
          ErrorType.CIRCUIT_OPEN,
          'Circuit breaker is open due to repeated failures'
        );
      }
    }
    
    try {
      const result = await fn();
      
      // Success - reset the circuit
      if (this.state === 'half-open') {
        logger.info('Circuit breaker closing after successful operation');
      }
      
      this.state = 'closed';
      this.failureCount = 0;
      
      return result;
      
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  /**
   * Record a failure
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      logger.warn('Circuit breaker opened due to repeated failures', {
        failureCount: this.failureCount,
        threshold: this.threshold
      });
    }
  }
  
  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
  
  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    logger.info('Circuit breaker reset');
  }
}

/**
 * Decorator for adding retry logic to class methods
 */
export function Retry(options?: RetryOptions) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      return withRetry(
        () => originalMethod.apply(this, args),
        options
      );
    };
    
    return descriptor;
  };
}