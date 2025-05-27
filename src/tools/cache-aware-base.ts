// ABOUTME: Base class for tools that use caching functionality
// ABOUTME: Provides helper methods for cache integration and automatic invalidation

import { CacheManager, CacheStats } from '../utils/cache-manager.js';
import { CacheKey } from '../types/index.js';

/**
 * Base class for tools that utilize caching
 */
export abstract class CacheAwareBase {
  protected cacheManager: CacheManager;

  constructor(cacheManager?: CacheManager) {
    this.cacheManager = cacheManager || new CacheManager();
  }

  /**
   * Get the cache manager instance
   * @returns Cache manager
   */
  getCacheManager(): CacheManager {
    return this.cacheManager;
  }

  /**
   * Try to get data from cache, or fetch and cache it
   * @param key Cache key
   * @param fetcher Function to fetch data if not cached
   * @param ttl Optional TTL override
   * @returns Cached or fetched data
   */
  protected async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = this.cacheManager.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetcher();
    
    // Cache the result
    this.cacheManager.set(key, data, ttl);
    
    return data;
  }

  /**
   * Invalidate cache entries when data is modified
   * @param type Type of cache to invalidate
   * @param specificKey Optional specific key to invalidate
   */
  protected invalidateCache(type: CacheKey, specificKey?: string): void {
    if (specificKey) {
      this.cacheManager.invalidate(specificKey);
    } else {
      // Invalidate all entries of this type
      this.cacheManager.invalidatePattern(`${type}:*`);
      this.cacheManager.invalidate(type);
    }
  }

  /**
   * Invalidate project cache
   * @param areaId Optional area ID to invalidate specific cache
   */
  protected invalidateProjectCache(areaId?: string): void {
    if (areaId) {
      // Invalidate specific area's project cache
      this.cacheManager.invalidatePattern(`${CacheKey.PROJECTS}:area:${areaId}:*`);
    } else {
      // Invalidate all project caches
      this.cacheManager.invalidatePattern(`${CacheKey.PROJECTS}*`);
    }
  }

  /**
   * Invalidate area cache
   */
  protected invalidateAreaCache(): void {
    this.cacheManager.invalidatePattern(`${CacheKey.AREAS}*`);
  }

  /**
   * Invalidate tag cache
   */
  protected invalidateTagCache(): void {
    this.cacheManager.invalidate(CacheKey.TAGS);
  }

  /**
   * Clear all caches
   */
  protected clearAllCaches(): void {
    this.cacheManager.clear();
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  protected getCacheStats(): CacheStats {
    return this.cacheManager.getStats();
  }

  /**
   * Clean up expired cache entries
   */
  protected cleanupCache(): void {
    this.cacheManager.cleanup();
  }
}