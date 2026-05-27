/**
 * error-handler.js - 错误处理模块
 * 错误分类、降级策略、用户友好提示
 */

class ErrorHandler {
  constructor(config) {
    this.config = config;
    this.errorLog = [];
    this.fallbacks = new Map();
    this._registerDefaultFallbacks();
  }

  /**
   * 注册默认降级策略
   */
  _registerDefaultFallbacks() {
    // iFinD 不可用时降级到实时行情
    this.registerFallback('ifind', async (params) => {
      return { source: 'realtime', message: 'iFinD 不可用，使用实时行情数据' };
    });

    // 实时行情不可用时降级到缓存
    this.registerFallback('realtime', async (params) => {
      return { source: 'cache', message: '实时行情不可用，使用缓存数据' };
    });
  }

  /**
   * 注册降级策略
   */
  registerFallback(source, fallbackFn) {
    this.fallbacks.set(source, fallbackFn);
  }

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @param {object} context - 错误上下文
   * @returns {object} 处理结果
   */
  handle(error, context = {}) {
    const errorType = this.classifyError(error);
    const errorEntry = {
      timestamp: new Date().toISOString(),
      type: errorType,
      message: error.message,
      context,
      stack: error.stack
    };

    this.errorLog.push(errorEntry);

    // 限制日志大小
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    return {
      type: errorType,
      userMessage: this.getUserFriendlyMessage(errorType, error),
      suggestion: this.getSuggestion(errorType, context),
      canRecover: this.canRecover(errorType),
      fallback: this.getFallback(errorType, context)
    };
  }

  /**
   * 分类错误
   */
  classifyError(error) {
    const message = error.message.toLowerCase();

    // 网络错误
    if (message.includes('timeout') || message.includes('etimedout')) {
      return 'timeout';
    }
    if (message.includes('econnrefused') || message.includes('econnreset') || message.includes('network')) {
      return 'network';
    }

    // 数据错误
    if (message.includes('json') || message.includes('parse') || message.includes('syntax')) {
      return 'data_format';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found';
    }

    // 配置错误
    if (message.includes('enoent') || message.includes('no such file')) {
      return 'file_missing';
    }
    if (message.includes('permission') || message.includes('eacces')) {
      return 'permission';
    }

    // 业务错误
    if (message.includes('持仓不足') || message.includes('余额不足')) {
      return 'insufficient';
    }
    if (message.includes('无效') || message.includes('invalid')) {
      return 'invalid_input';
    }

    return 'unknown';
  }

  /**
   * 获取用户友好消息
   */
  getUserFriendlyMessage(errorType, error) {
    const messages = {
      timeout: '请求超时，请稍后重试',
      network: '网络连接失败，请检查网络',
      data_format: '数据格式异常，请稍后重试',
      not_found: '请求的数据不存在',
      file_missing: '配置文件缺失，请运行初始化',
      permission: '权限不足，请检查文件权限',
      insufficient: '资源不足，请检查账户余额',
      invalid_input: '输入无效，请检查参数',
      unknown: '发生未知错误，请稍后重试'
    };

    return messages[errorType] || messages.unknown;
  }

  /**
   * 获取修复建议
   */
  getSuggestion(errorType, context) {
    const suggestions = {
      timeout: '检查网络连接，或增加超时时间',
      network: '检查网络连接，确认数据源服务是否可用',
      data_format: '数据源返回异常，可能是临时问题',
      not_found: '检查输入的股票代码或参数是否正确',
      file_missing: '运行 init() 初始化系统',
      permission: '检查文件读写权限',
      insufficient: '检查账户资金或持仓',
      invalid_input: '参考帮助文档检查输入格式'
    };

    return suggestions[errorType] || '请联系技术支持';
  }

  /**
   * 判断是否可恢复
   */
  canRecover(errorType) {
    const recoverable = ['timeout', 'network', 'data_format'];
    return recoverable.includes(errorType);
  }

  /**
   * 获取降级方案
   */
  getFallback(errorType, context) {
    const source = context.source;

    if (source && this.fallbacks.has(source)) {
      return {
        available: true,
        source,
        message: `将尝试使用备选数据源`
      };
    }

    if (errorType === 'timeout' || errorType === 'network') {
      return {
        available: true,
        source: 'retry',
        message: '将自动重试'
      };
    }

    return { available: false };
  }

  /**
   * 执行降级策略
   */
  async executeFallback(source, params) {
    if (!this.fallbacks.has(source)) {
      return { success: false, message: '没有可用的降级策略' };
    }

    try {
      const fallbackFn = this.fallbacks.get(source);
      const result = await fallbackFn(params);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, message: '降级策略执行失败', error: error.message };
    }
  }

  /**
   * 带降级的执行
   */
  async executeWithFallback(primaryFn, fallbackSource, params) {
    try {
      return await primaryFn(params);
    } catch (error) {
      const handled = this.handle(error, { source: fallbackSource });

      if (handled.fallback.available) {
        const fallbackResult = await this.executeFallback(fallbackSource, params);
        if (fallbackResult.success) {
          return {
            ...fallbackResult,
            fallback: true,
            originalError: error.message
          };
        }
      }

      throw { ...handled, originalError: error };
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    const stats = {};

    for (const entry of this.errorLog) {
      stats[entry.type] = (stats[entry.type] || 0) + 1;
    }

    return {
      total: this.errorLog.length,
      byType: stats,
      recent: this.errorLog.slice(-10)
    };
  }

  /**
   * 清除错误日志
   */
  clearErrorLog() {
    this.errorLog = [];
  }
}

module.exports = ErrorHandler;
