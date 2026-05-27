/**
 * logger.js - 日志模块
 * 操作日志、性能监控、日志文件
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor(config) {
    this.config = config;
    this.logLevel = config.get('logLevel', 'info');
    this.logDir = config.getDataPath('logs');
    this.logs = [];
    this.performance = new Map();

    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };

    this._ensureLogDir();
  }

  /**
   * 调试日志
   */
  debug(message, data = null) {
    this._log('debug', message, data);
  }

  /**
   * 信息日志
   */
  info(message, data = null) {
    this._log('info', message, data);
  }

  /**
   * 警告日志
   */
  warn(message, data = null) {
    this._log('warn', message, data);
  }

  /**
   * 错误日志
   */
  error(message, data = null) {
    this._log('error', message, data);
  }

  /**
   * 记录用户操作
   */
  logOperation(operation, details = {}) {
    this.info(`操作: ${operation}`, {
      type: 'operation',
      ...details
    });
  }

  /**
   * 记录任务执行
   */
  logTask(taskName, status, details = {}) {
    const level = status === 'failed' ? 'error' : 'info';
    this[level](`任务 ${taskName}: ${status}`, {
      type: 'task',
      taskName,
      status,
      ...details
    });
  }

  /**
   * 记录 API 调用
   */
  logAPICall(source, endpoint, duration, success) {
    this.info(`API 调用: ${source}/${endpoint}`, {
      type: 'api',
      source,
      endpoint,
      duration,
      success
    });
  }

  /**
   * 开始性能计时
   */
  startTimer(label) {
    this.performance.set(label, {
      start: Date.now(),
      label
    });
  }

  /**
   * 结束性能计时
   */
  endTimer(label) {
    const entry = this.performance.get(label);
    if (!entry) return null;

    const duration = Date.now() - entry.start;
    this.performance.delete(label);

    this.debug(`性能: ${label} 耗时 ${duration}ms`);

    return duration;
  }

  /**
   * 获取日志
   */
  getLogs(options = {}) {
    let logs = [...this.logs];

    if (options.level) {
      logs = logs.filter(l => l.level === options.level);
    }

    if (options.type) {
      logs = logs.filter(l => l.data?.type === options.type);
    }

    if (options.limit) {
      logs = logs.slice(-options.limit);
    }

    return logs;
  }

  /**
   * 获取今日日志文件路径
   */
  getTodayLogPath() {
    const today = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${today}.log`);
  }

  /**
   * 保存日志到文件
   */
  saveToFile() {
    const logPath = this.getTodayLogPath();
    const content = this.logs.map(l => this._formatLogEntry(l)).join('\n');

    fs.writeFileSync(logPath, content, 'utf-8');
    return logPath;
  }

  /**
   * 获取日志统计
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byType: {}
    };

    for (const log of this.logs) {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

      if (log.data?.type) {
        stats.byType[log.data.type] = (stats.byType[log.data.type] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * 清除内存日志
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * 清理旧日志文件
   */
  cleanupOldLogs(daysToKeep = 7) {
    if (!fs.existsSync(this.logDir)) return 0;

    const files = fs.readdirSync(this.logDir);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    let cleaned = 0;
    for (const file of files) {
      if (!file.endsWith('.log')) continue;

      const dateStr = file.replace('.log', '');
      const fileDate = new Date(dateStr);

      if (fileDate < cutoff) {
        fs.unlinkSync(path.join(this.logDir, file));
        cleaned++;
      }
    }

    return cleaned;
  }

  // === 内部方法 ===

  _log(level, message, data = null) {
    if (this.levels[level] < this.levels[this.logLevel]) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    this.logs.push(entry);

    // 限制内存日志大小
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // 输出到控制台
    this._consoleLog(entry);
  }

  _consoleLog(entry) {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;

    switch (entry.level) {
      case 'error':
        console.error(`${prefix} ${entry.message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${entry.message}`);
        break;
      case 'debug':
        if (this.logLevel === 'debug') {
          console.log(`${prefix} ${entry.message}`);
        }
        break;
      default:
        console.log(`${prefix} ${entry.message}`);
    }
  }

  _formatLogEntry(entry) {
    let line = `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}`;

    if (entry.data) {
      line += ` | ${JSON.stringify(entry.data)}`;
    }

    return line;
  }

  _ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
}

module.exports = Logger;
