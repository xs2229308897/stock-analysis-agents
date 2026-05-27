/**
 * memory-manager.js - 记忆管理模块
 * 会话记忆、用户偏好学习
 */

const fs = require('fs');

class MemoryManager {
  constructor(config) {
    this.config = config;
    this.sessionMemory = new Map();
    this.preferences = this._loadPreferences();
    this.interactionHistory = [];
  }

  /**
   * 保存会话记忆
   */
  saveSession(key, value) {
    this.sessionMemory.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * 获取会话记忆
   */
  getSession(key) {
    const entry = this.sessionMemory.get(key);
    if (!entry) return null;

    // 检查是否过期（默认1小时）
    const ttl = this.config.get('memory.sessionTTL', 3600000);
    if (Date.now() - entry.timestamp > ttl) {
      this.sessionMemory.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * 记录用户交互
   */
  recordInteraction(interaction) {
    this.interactionHistory.push({
      timestamp: new Date().toISOString(),
      ...interaction
    });

    // 限制历史大小
    if (this.interactionHistory.length > 100) {
      this.interactionHistory = this.interactionHistory.slice(-100);
    }

    // 学习用户偏好
    this._learnPreferences(interaction);
  }

  /**
   * 获取上次分析的板块
   */
  getLastAnalyzedSector() {
    return this.getSession('lastAnalyzedSector');
  }

  /**
   * 获取上次查询的股票
   */
  getLastQueriedStock() {
    return this.getSession('lastQueriedStock');
  }

  /**
   * 获取用户偏好
   */
  getPreferences() {
    return { ...this.preferences };
  }

  /**
   * 更新用户偏好
   */
  updatePreferences(updates) {
    this.preferences = { ...this.preferences, ...updates };
    this._savePreferences();
  }

  /**
   * 根据历史推断上下文
   */
  inferContext(currentInput) {
    const lower = currentInput.toLowerCase();
    const context = {};

    // 处理指代词
    if (lower.includes('这个') || lower.includes('该') || lower.includes('它')) {
      const lastSector = this.getLastAnalyzedSector();
      const lastStock = this.getLastQueriedStock();

      if (lastSector && (lower.includes('板块') || lower.includes('行业'))) {
        context.sector = lastSector;
      }
      if (lastStock && (lower.includes('股票') || lower.includes('个股'))) {
        context.stock = lastStock;
      }
    }

    // 根据用户偏好推断
    if (lower.includes('推荐') || lower.includes('建议')) {
      context.preferredSectors = this.preferences.focusSectors || [];
    }

    return context;
  }

  /**
   * 获取交互统计
   */
  getInteractionStats() {
    const stats = {
      total: this.interactionHistory.length,
      byType: {},
      frequentSectors: {},
      frequentStocks: {}
    };

    for (const interaction of this.interactionHistory) {
      // 按类型统计
      const type = interaction.intent?.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // 统计频繁查询的板块
      if (interaction.entities?.sectors) {
        for (const sector of interaction.entities.sectors) {
          stats.frequentSectors[sector] = (stats.frequentSectors[sector] || 0) + 1;
        }
      }
    }

    return stats;
  }

  /**
   * 清除会话记忆
   */
  clearSession() {
    this.sessionMemory.clear();
  }

  // === 内部方法 ===

  _loadPreferences() {
    const path = this.config.getContextPath();
    try {
      const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
      return data.userPreferences || this.config.get('userPreferences', {});
    } catch {
      return this.config.get('userPreferences', {});
    }
  }

  _savePreferences() {
    const path = this.config.getContextPath();
    let context = {};

    try {
      context = JSON.parse(fs.readFileSync(path, 'utf-8'));
    } catch {
      context = {};
    }

    context.userPreferences = this.preferences;
    fs.writeFileSync(path, JSON.stringify(context, null, 2));
  }

  _learnPreferences(interaction) {
    // 学习关注的板块
    if (interaction.entities?.sectors) {
      const current = this.preferences.focusSectors || [];
      for (const sector of interaction.entities.sectors) {
        if (!current.includes(sector)) {
          // 如果用户多次查询同一板块，添加到偏好
          const count = this.interactionHistory.filter(
            i => i.entities?.sectors?.includes(sector)
          ).length;

          if (count >= 3) {
            this.preferences.focusSectors = [...current, sector];
            this._savePreferences();
          }
        }
      }
    }
  }
}

module.exports = MemoryManager;
