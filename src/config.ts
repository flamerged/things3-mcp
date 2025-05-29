// ABOUTME: Configuration management system with environment variable support
// ABOUTME: Centralizes all configuration settings with validation and defaults

import { config as dotenvConfig } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenvConfig();

interface CacheConfig {
  projects: { ttl: number };
  areas: { ttl: number };
  tags: { ttl: number };
}

interface PoolConfig {
  minSize: number;
  maxSize: number;
  idleTimeout: number;
  acquireTimeout: number;
}

interface TimeoutConfig {
  applescript: number;
  operation: number;
}

interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  file?: string | undefined;
}

interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface Config {
  // Server settings
  server: {
    name: string;
    version: string;
  };
  
  // Cache settings
  cache: CacheConfig;
  
  // Connection pool settings
  pool: PoolConfig;
  
  // Timeout settings
  timeouts: TimeoutConfig;
  
  // Logging settings
  log: LogConfig;
  
  // Retry settings
  retry: RetryConfig;
  
  // Performance settings
  performance: {
    enablePool: boolean;
    enableBatching: boolean;
    batchSize: number;
    batchDelay: number;
    enableTiming: boolean;
  };
  
  // Feature flags
  features: {
    errorCorrection: boolean;
    autoLaunchThings3: boolean;
    validateTags: boolean;
  };
}

/**
 * Parse boolean environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Parse integer environment variable
 */
function parseInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse log level
 */
function parseLogLevel(value: string | undefined): Config['log']['level'] {
  const validLevels = ['debug', 'info', 'warn', 'error'];
  const level = value?.toLowerCase();
  return validLevels.includes(level || '') ? level as Config['log']['level'] : 'info';
}

/**
 * Get package version
 */
function getVersion(): string {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageData.version || '0.1.0';
  } catch {
    return '0.1.0';
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  const env = process.env;
  return {
    server: {
      name: env['MCP_SERVER_NAME'] || 'things3-mcp-server',
      version: getVersion()
    },
    
    cache: {
      projects: {
        ttl: parseInt(env['CACHE_PROJECTS_TTL'], 300000) // 5 minutes
      },
      areas: {
        ttl: parseInt(env['CACHE_AREAS_TTL'], 300000) // 5 minutes
      },
      tags: {
        ttl: parseInt(env['CACHE_TAGS_TTL'], 300000) // 5 minutes
      }
    },
    
    pool: {
      minSize: parseInt(env['POOL_MIN_SIZE'], 2),
      maxSize: parseInt(env['POOL_MAX_SIZE'], 5),
      idleTimeout: parseInt(env['POOL_IDLE_TIMEOUT'], 60000), // 1 minute
      acquireTimeout: parseInt(env['POOL_ACQUIRE_TIMEOUT'], 5000) // 5 seconds
    },
    
    timeouts: {
      applescript: parseInt(env['TIMEOUT_APPLESCRIPT'], 30000), // 30 seconds
      operation: parseInt(env['TIMEOUT_OPERATION'], 60000) // 60 seconds
    },
    
    log: {
      level: parseLogLevel(env['LOG_LEVEL']),
      format: env['LOG_FORMAT'] === 'json' ? 'json' : 'text',
      file: env['LOG_FILE']
    },
    
    retry: {
      maxAttempts: parseInt(env['RETRY_MAX_ATTEMPTS'], 3),
      backoffMultiplier: parseFloat(env['RETRY_BACKOFF_MULTIPLIER'] || '2'),
      initialDelay: parseInt(env['RETRY_INITIAL_DELAY'], 1000), // 1 second
      maxDelay: parseInt(env['RETRY_MAX_DELAY'], 30000) // 30 seconds
    },
    
    performance: {
      enablePool: parseBoolean(env['PERF_ENABLE_POOL'], true),
      enableBatching: parseBoolean(env['PERF_ENABLE_BATCHING'], true),
      batchSize: parseInt(env['PERF_BATCH_SIZE'], 10),
      batchDelay: parseInt(env['PERF_BATCH_DELAY'], 100), // 100ms
      enableTiming: parseBoolean(env['PERF_ENABLE_TIMING'], true)
    },
    
    features: {
      errorCorrection: parseBoolean(env['FEATURE_ERROR_CORRECTION'], true),
      autoLaunchThings3: parseBoolean(env['FEATURE_AUTO_LAUNCH'], true),
      validateTags: parseBoolean(env['FEATURE_VALIDATE_TAGS'], true)
    }
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: Config): void {
  // Validate pool settings
  if (config.pool.minSize > config.pool.maxSize) {
    throw new Error('Pool minSize cannot be greater than maxSize');
  }
  
  if (config.pool.minSize < 0 || config.pool.maxSize < 1) {
    throw new Error('Pool sizes must be positive');
  }
  
  // Validate cache TTLs
  const minTTL = 1000; // 1 second
  const maxTTL = 3600000; // 1 hour
  
  for (const [key, { ttl }] of Object.entries(config.cache)) {
    if (ttl < minTTL || ttl > maxTTL) {
      throw new Error(`Cache TTL for ${key} must be between ${minTTL}ms and ${maxTTL}ms`);
    }
  }
  
  // Validate retry settings
  if (config.retry.maxAttempts < 1) {
    throw new Error('Retry maxAttempts must be at least 1');
  }
  
  if (config.retry.backoffMultiplier < 1) {
    throw new Error('Retry backoffMultiplier must be at least 1');
  }
}

/**
 * Get singleton configuration instance
 */
let configInstance: Config | null = null;

export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
    validateConfig(configInstance);
  }
  return configInstance;
}

/**
 * Reset configuration (mainly for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Update configuration at runtime
 */
export function updateConfig(updates: Partial<Config>): void {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  
  // Deep merge updates
  configInstance = deepMerge(configInstance, updates) as Config;
  validateConfig(configInstance!);
}

/**
 * Deep merge objects
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// Export default configuration
export default getConfig();