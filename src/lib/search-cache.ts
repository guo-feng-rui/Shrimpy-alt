// Simple in-memory cache for search results to improve performance
export class SearchCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  // Generate cache key from search parameters
  private static generateKey(query: string, userId: string, goal?: any): string {
    const goalKey = goal ? JSON.stringify(goal) : '';
    return `${userId}:${query.toLowerCase().trim()}:${goalKey}`;
  }

  // Get cached search results if still valid
  static get(query: string, userId: string, goal?: any): any | null {
    const key = this.generateKey(query, userId, goal);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if cache has expired
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    console.log('🔍 Cache hit for search:', query);
    return cached.data;
  }

  // Cache search results
  static set(query: string, userId: string, data: any, goal?: any, ttlMs?: number): void {
    const key = this.generateKey(query, userId, goal);
    const ttl = ttlMs || this.DEFAULT_TTL;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    console.log('🔍 Cached search results for:', query);
    
    // Clean up old entries periodically
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  // Remove expired entries
  private static cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((value, key) => {
      if (now > value.timestamp + value.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log('🔍 Cleaned up search cache, entries remaining:', this.cache.size);
  }

  // Clear all cache entries for a user (useful when user data changes)
  static clearUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log('🔍 Cleared cache for user:', userId);
  }

  // Clear all cache
  static clearAll(): void {
    this.cache.clear();
    console.log('🔍 Cleared all search cache');
  }

  // Get cache statistics
  static getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Could implement hit rate tracking if needed
    };
  }
}