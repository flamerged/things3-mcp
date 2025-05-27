// ABOUTME: Cache manager for storing frequently accessed data with TTL support
// ABOUTME: Improves performance by caching projects, areas, and tags

import { CacheKey } from '../types/index.js';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
}

/**
 * Cache manager with TTL support for Things3 data
 */
export class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
  };
  
  // Default TTL: 5 minutes (300 seconds)
  private readonly defaultTTL = 300 * 1000;

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }
    
    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds (optional)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      data: value,
      expiresAt,
    });
    
    this.stats.sets++;
  }

  /**
   * Invalidate a specific cache entry
   * @param key Cache key to invalidate
   */
  invalidate(key: string): void {
    if (this.cache.delete(key)) {
      this.stats.evictions++;
    }
  }

  /**
   * Invalidate all cache entries matching a pattern
   * @param pattern Pattern to match (e.g., "projects:*")
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.stats.evictions++;
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.evictions += size;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size
   * @returns Number of entries in cache
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.stats.evictions++;
    }
  }

  /**
   * Get TTL for specific cache types
   * @returns TTL in milliseconds
   */
  static getTTL(): number {
    // All cache types use 5 minutes for now
    return 300 * 1000;
  }

  /**
   * Generate cache key for projects
   * @param filters Optional filters
   * @returns Cache key
   */
  static getProjectsCacheKey(filters?: { areaId?: string; includeCompleted?: boolean }): string {
    if (!filters || (!filters.areaId && filters.includeCompleted === undefined)) {
      return CacheKey.PROJECTS;
    }
    
    const parts: string[] = [CacheKey.PROJECTS];
    if (filters.areaId) parts.push(`area:${filters.areaId}`);
    if (filters.includeCompleted !== undefined) parts.push(`completed:${filters.includeCompleted}`);
    
    return parts.join(':');
  }

  /**
   * Generate cache key for areas
   * @param includeHidden Whether to include hidden areas
   * @returns Cache key
   */
  static getAreasCacheKey(includeHidden?: boolean): string {
    if (includeHidden === undefined) return CacheKey.AREAS;
    return `${CacheKey.AREAS}:hidden:${includeHidden}`;
  }

  /**
   * Generate cache key for tags
   * @returns Cache key
   */
  static getTagsCacheKey(): string {
    return CacheKey.TAGS;
  }
}