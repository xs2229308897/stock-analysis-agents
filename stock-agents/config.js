/**
 * config.js - 配置管理
 * 支持项目级配置覆盖
 */

const path = require('path');
const fs = require('fs');

const DEFAULT_CONFIG = {
  // 数据目录
  dataDir: path.join(process.cwd(), 'data'),

  // iFinD 配置
  ifind: {
    enabled: true,
    scriptPath: null, // 自动检测
    rateLimit: 2 // 每秒最大请求数
  },

  // 实时行情配置
  realtime: {
    enabled: true,
    scriptPath: null // 自动检测
  },

  // 持仓文件
  portfolioFile: 'portfolio.json',
  transactionsFile: 'transactions.json',
  contextFile: 'context.json',
  performanceFile: 'performance.json',

  // 风险控制
  risk: {
    stopLoss: -0.08,    // 止损线 -8%
    takeProfit: 0.20,   // 止盈线 +20%
    maxPosition: 0.30,  // 单品种最大仓位 30%
    minCash: 0.05       // 最低现金比例 5%
  },

  // 用户偏好
  userPreferences: {
    focusSectors: ['半导体', 'AI算力', '电网'],
    riskTolerance: 'medium',
    investmentStyle: 'value+growth'
  }
};

class Config {
  constructor(options = {}) {
    this.options = { ...DEFAULT_CONFIG, ...options };
    this._loadProjectConfig();
  }

  /**
   * 加载项目级配置
   */
  _loadProjectConfig() {
    const configPath = path.join(process.cwd(), 'stock-agents.config.js');
    if (fs.existsSync(configPath)) {
      try {
        const projectConfig = require(configPath);
        this.options = { ...this.options, ...projectConfig };
      } catch (e) {
        // 忽略配置加载错误
      }
    }
  }

  /**
   * 获取配置值
   */
  get(key, defaultValue) {
    const keys = key.split('.');
    let value = this.options;
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    return value !== undefined ? value : defaultValue;
  }

  /**
   * 获取数据文件路径
   */
  getDataPath(filename) {
    const dir = this.get('dataDir');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, filename);
  }

  /**
   * 获取portfolio.json路径
   */
  getPortfolioPath() {
    return this.getDataPath(this.get('portfolioFile'));
  }

  /**
   * 获取transactions.json路径
   */
  getTransactionsPath() {
    return this.getDataPath(this.get('transactionsFile'));
  }

  /**
   * 获取context.json路径
   */
  getContextPath() {
    return this.getDataPath(this.get('contextFile'));
  }

  /**
   * 获取iFinD脚本路径
   */
  getIFinDScriptPath() {
    const customPath = this.get('ifind.scriptPath');
    if (customPath) return customPath;

    // 自动检测常见位置
    const possiblePaths = [
      path.join(process.cwd(), '.claude', 'skills', 'ifind-finance-data-1.1.0', 'call-node.js'),
      path.join(__dirname, '..', '.claude', 'skills', 'ifind-finance-data-1.1.0', 'call-node.js'),
      path.join(process.home, '.claude', 'skills', 'ifind-finance-data-1.1.0', 'call-node.js')
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }

    return null;
  }

  /**
   * 获取实时行情脚本路径
   */
  getRealtimeScriptPath() {
    const customPath = this.get('realtime.scriptPath');
    if (customPath) return customPath;

    const possiblePaths = [
      path.join(process.cwd(), 'tools', 'realtime-quote.js'),
      path.join(__dirname, '..', 'tools', 'realtime-quote.js')
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }

    return null;
  }
}

module.exports = Config;
