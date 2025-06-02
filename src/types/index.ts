// ABOUTME: Main export file for all type definitions
// ABOUTME: Re-exports all types from models and tools modules

export * from './models.js';
export * from './tools.js';

/**
 * Error types that can occur during operations
 */
export enum ErrorType {
  THINGS_NOT_RUNNING = 'THINGS_NOT_RUNNING',
  APPLESCRIPT_ERROR = 'APPLESCRIPT_ERROR',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
  INVALID_REFERENCE = 'INVALID_REFERENCE',
  MAX_RETRIES = 'MAX_RETRIES',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
}

/**
 * Custom error class for Things3 MCP operations
 */
export class Things3Error extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'Things3Error';
  }
}


/**
 * Configuration options for the server
 */
export interface ServerConfig {
  /** Timeout for AppleScript execution in milliseconds */
  appleScriptTimeout?: number;
  
  /** Cache TTL in seconds */
  cacheTTL?: number;
  
  /** Whether to enable debug logging */
  debug?: boolean;
  
  /** Maximum number of retries for failed operations */
  maxRetries?: number;
}