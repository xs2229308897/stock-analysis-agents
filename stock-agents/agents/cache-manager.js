/**
 * cache-manager.js - 缓存管理模块
 * 结果缓存、缓存失效、缓存统计
 */

class CacheManager {
  constructor(config) {
    this.config = config;
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // 默认 TTL 配置
    this.defaultTTL = {
      realtime: 60000,      // 实时数据 1分钟
      financial: 86400000,  // 财务数据 1天
      analysis: 300000,     // 分析结果 5分钟
      news: 600000,         // 新闻 10分钟
      default: 300000       // 默认 5分钟
    };

    // 定期清理过期缓存
    this._cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {any} 缓存值，不存在返回 null
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    return entry.value;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（毫秒），可选
   */
  set(key, value, ttl = null) {
    const expiresAt = Date.now() + (ttl || this.defaultTTL.default);

    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      expiresAt,
      lastAccessed: Date.now(),
      accessCount: 0
    });

    this.stats.sets++;
  }

  /**
   * 设置实时数据缓存
   */
  setRealtime(key, value) {
    this.set(key, value, this.defaultTTL.realtime);
  }

  /**
   * 设置财务数据缓存
   */
  setFinancial(key, value) {
    this.set(key, value, this.defaultTTL.financial);
  }

  /**
   * 设置分析结果缓存
   */
  setAnalysis(key, value) {
    this.set(key, value, this.defaultTTL.analysis);
  }

  /**
   * 删除缓存
   */
  delete(key) {
    this.cache.delete(key);
    this.stats.deletes++;
  }

  /**
   * 清除所有缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * 获取缓存内容摘要
   */
  getSummary() {
    const summary = {};

    for (const [key, entry] of this.cache) {
      summary[key] = {
        createdAt: new Date(entry.createdAt).toISOString(),
        expiresAt: new Date(entry.expiresAt).toISOString(),
        accessCount: entry.accessCount,
        size: JSON.stringify(entry.value).length
      };
    }

    return summary;
  }

  /**
   * 带缓存的执行
   * @param {string} key - 缓存键
   @param {Function} fn - 执行函数
   * @param {number} ttl - 缓存时间
   */
  async getOrSet(key, fn, ttl = null) {
    const cached = this.get(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }

    const result = await fn();
    this.set(key, result, ttl);
    return { data: result, fromCache: false };
  }

  /**
   * 失效匹配模式的缓存
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * 销毁缓存管理器
   */
  destroy() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
    this.clear();
  }
}

module.exports = CacheManager;
