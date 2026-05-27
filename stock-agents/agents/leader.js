/**
 * leader.js - 领导Agent
 * 任务解析、调度、上下文管理、健康检查、工具管理
 */

const fs = require('fs');
const CollectorAgent = require('./collector');
const AnalystAgent = require('./analyst');
const AdvisorAgent = require('./advisor');
const ReportAgent = require('./report');
const HealthChecker = require('./health-checker');
const ToolInstaller = require('./tool-installer');
const TaskQueue = require('./task-queue');
const ErrorHandler = require('./error-handler');
const MemoryManager = require('./memory-manager');
const CacheManager = require('./cache-manager');
const Logger = require('./logger');
const AgentRegistry = require('./agent-registry');

class LeaderAgent {
  constructor(config) {
    this.config = config;
    this.collector = new CollectorAgent(config);
    this.analyst = new AnalystAgent(config);
    this.advisor = new AdvisorAgent(config);
    this.report = new ReportAgent(config);
    this.healthChecker = new HealthChecker(config);
    this.toolInstaller = new ToolInstaller(config);
    this.taskQueue = new TaskQueue({
      maxConcurrent: config.get('taskQueue.maxConcurrent', 3),
      defaultTimeout: config.get('taskQueue.defaultTimeout', 30000),
      defaultRetries: config.get('taskQueue.defaultRetries', 3)
    });
    this.errorHandler = new ErrorHandler(config);
    this.memory = new MemoryManager(config);
    this.cache = new CacheManager(config);
    this.logger = new Logger(config);
    this.registry = new AgentRegistry(config);
    this._initialized = false;
  }

  /**
   * 初始化系统（启动时调用）
   * 检查配置、自动修复、报告状态
   */
  async init() {
    console.log('=== 系统初始化 ===\n');

    // 1. 运行健康检查
    const health = await this.healthChecker.runAllChecks();
    console.log(`健康检查: ${health.summary}\n`);

    // 2. 显示检查结果
    if (health.passed.length > 0) {
      console.log('✓ 通过:');
      health.passed.forEach(p => console.log(`  - ${p.message}`));
    }

    if (health.warnings.length > 0) {
      console.log('\n⚠ 警告:');
      health.warnings.forEach(w => console.log(`  - ${w.message}`));
    }

    if (health.failed.length > 0) {
      console.log('\n✗ 失败:');
      health.failed.forEach(f => console.log(`  - ${f.message}`));
    }

    // 3. 自动修复可修复的问题
    if (health.warnings.some(w => w.details?.autoFix)) {
      console.log('\n正在自动修复...');
      const fixResult = await this.healthChecker.autoFix();
      if (fixResult.fixed.length > 0) {
        console.log('已修复:');
        fixResult.fixed.forEach(f => console.log(`  ✓ ${f}`));
      }
    }

    // 4. 生成工具推荐报告
    const installReport = this.toolInstaller.generateInstallReport();
    if (installReport.missing.length > 0) {
      console.log('\n--- 可选工具 ---');
      console.log(`已安装: ${installReport.installed.length} 个`);
      console.log(`可安装: ${installReport.missing.length} 个`);

      const highPriority = installReport.missing.filter(t => t.priority === 'high');
      if (highPriority.length > 0) {
        console.log('\n推荐安装（高优先级）:');
        highPriority.forEach(t => console.log(`  - ${t.name}: ${t.description}`));
      }
    }

    // 5. 获取修复建议
    const suggestions = this.healthChecker.getFixSuggestions();
    if (suggestions.length > 0) {
      console.log('\n--- 修复建议 ---');
      suggestions.forEach(s => {
        console.log(`[${s.priority}] ${s.message}`);
        console.log(`  修复: ${s.fix}`);
        if (s.url) console.log(`  参考: ${s.url}`);
      });
    }

    this._initialized = true;
    console.log('\n=== 初始化完成 ===\n');

    return {
      healthy: health.healthy,
      health,
      installReport,
      suggestions
    };
  }

  /**
   * 快速健康检查（不输出日志）
   */
  async quickCheck() {
    const health = await this.healthChecker.runAllChecks();
    return {
      healthy: health.healthy,
      failed: health.failed.length,
      warnings: health.warnings.length,
      summary: health.summary
    };
  }

  /**
   * 获取工具推荐
   * @param {string} taskType - 任务类型
   */
  getToolRecommendations(taskType) {
    return this.toolInstaller.getRecommendations(taskType);
  }

  /**
   * 生成安装指南
   */
  getInstallGuide() {
    return this.toolInstaller.generateInstallGuide();
  }

  /**
   * 自动安装推荐工具
   */
  async autoInstallTools(category = null) {
    return await this.toolInstaller.autoInstall(category);
  }

  /**
   * 处理用户输入
   */
  async process(input) {
    const intent = this._parseIntent(input);
    const entities = this._extractEntities(input);

    // 推断上下文（处理指代词等）
    const inferredContext = this.memory.inferContext(input);
    const mergedEntities = { ...entities, ...inferredContext };

    let result = {};

    switch (intent.type) {
      case 'analyze':
        result = await this._handleAnalyze(mergedEntities, intent);
        break;
      case 'query':
        result = await this._handleQuery(mergedEntities, intent);
        break;
      case 'operate':
        result = this._handleOperate(input, mergedEntities);
        break;
      case 'report':
        result = await this._handleReport();
        break;
      case 'install':
        result = await this._handleInstall(mergedEntities);
        break;
      case 'health':
        result = await this._handleHealthCheck();
        break;
      default:
        result = { message: '未识别的指令类型' };
    }

    // 记录交互
    this.memory.recordInteraction({ user: input, intent, entities: mergedEntities });

    this._saveContext({ user: input, intent, result: result.summary || '完成' });

    return { intent, entities: mergedEntities, ...result };
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    return { message: '缓存已清除' };
  }

  /**
   * 获取用户偏好
   */
  getUserPreferences() {
    return this.memory.getPreferences();
  }

  /**
   * 更新用户偏好
   */
  updateUserPreferences(updates) {
    this.memory.updatePreferences(updates);
    return { message: '偏好已更新' };
  }

  /**
   * 获取交互统计
   */
  getInteractionStats() {
    return this.memory.getInteractionStats();
  }

  /**
   * 获取日志
   */
  getLogs(options = {}) {
    return this.logger.getLogs(options);
  }

  /**
   * 获取日志统计
   */
  getLogStats() {
    return this.logger.getStats();
  }

  /**
   * 保存日志到文件
   */
  saveLogs() {
    return this.logger.saveToFile();
  }

  /**
   * 清理旧日志
   */
  cleanupLogs(daysToKeep = 7) {
    return this.logger.cleanupOldLogs(daysToKeep);
  }

  /**
   * 注册新Agent
   */
  registerAgent(id, agentInfo) {
    this.registry.register(id, agentInfo);
    this.logger.info(`注册Agent: ${id}`, { type: 'registry', agentId: id });
    return { message: `Agent ${id} 已注册` };
  }

  /**
   * 注销Agent
   */
  unregisterAgent(id) {
    const result = this.registry.unregister(id);
    if (result) {
      this.logger.info(`注销Agent: ${id}`, { type: 'registry', agentId: id });
      return { message: `Agent ${id} 已注销` };
    }
    return { message: `Agent ${id} 不存在` };
  }

  /**
   * 获取所有Agent
   */
  getRegisteredAgents() {
    return this.registry.getAllAgents();
  }

  /**
   * 获取Agent能力
   */
  getAgentCapabilities() {
    return this.registry.getCapabilities();
  }

  /**
   * 检查Agent健康状态
   */
  async checkAgentHealth(id) {
    return await this.registry.checkHealth(id);
  }

  /**
   * 获取Agent注册报告
   */
  getAgentReport() {
    return this.registry.generateReport();
  }

  /**
   * 使用任务队列并行执行多个任务
   * @param {Array} tasks - 任务数组
   * @returns {object} 执行结果
   */
  async executeTasks(tasks) {
    return await this.taskQueue.executeParallel(tasks);
  }

  /**
   * 获取任务队列状态
   */
  getTaskQueueStatus() {
    return this.taskQueue.getQueueStatus();
  }

  /**
   * 取消所有任务
   */
  cancelAllTasks() {
    this.taskQueue.cancelAll();
    return { message: '已取消所有任务' };
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    return this.errorHandler.getErrorStats();
  }

  /**
   * 清除错误日志
   */
  clearErrorLog() {
    this.errorHandler.clearErrorLog();
    return { message: '错误日志已清除' };
  }

  /**
   * 带错误处理的执行
   */
  async executeWithErrorHandling(fn, params, fallbackSource) {
    try {
      return await this.errorHandler.executeWithFallback(fn, fallbackSource, params);
    } catch (error) {
      const handled = this.errorHandler.handle(error, { source: fallbackSource });
      return {
        error: true,
        type: handled.type,
        message: handled.userMessage,
        suggestion: handled.suggestion
      };
    }
  }

  /**
   * 解析意图
   */
  _parseIntent(text) {
    const lower = text.toLowerCase();

    if (lower.includes('分析') || lower.includes('研判')) {
      if (lower.includes('板块') || lower.includes('行业')) return { type: 'analyze', subType: 'sector' };
      if (lower.includes('大盘') || lower.includes('指数')) return { type: 'analyze', subType: 'market' };
      return { type: 'analyze', subType: 'stock' };
    }

    if (lower.includes('查看') || lower.includes('查询') || lower.includes('查一下')) {
      if (lower.includes('持仓')) return { type: 'query', subType: 'portfolio' };
      return { type: 'query', subType: 'data' };
    }

    if (lower.includes('买入') || lower.includes('卖出') || lower.includes('加仓') || lower.includes('减仓')) {
      return { type: 'operate', subType: 'trade' };
    }

    if (lower.includes('报告') || lower.includes('收益')) {
      return { type: 'report', subType: 'daily' };
    }

    if (lower.includes('安装') || lower.includes('配置工具') || lower.includes('添加工具')) {
      return { type: 'install', subType: 'tool' };
    }

    if (lower.includes('检查') || lower.includes('健康') || lower.includes('状态')) {
      return { type: 'health', subType: 'check' };
    }

    return { type: 'unknown' };
  }

  /**
   * 提取实体
   */
  _extractEntities(text) {
    const sectors = ['半导体', '芯片', 'AI', '人工智能', '算力', '电网', '电力', '新能源',
      '光伏', '锂电', '汽车', '医药', '消费', '白酒', '银行', '券商', '军工', '5G', '通信'];
    const foundSectors = sectors.filter(s => text.includes(s));

    return { sectors: foundSectors };
  }

  /**
   * 处理分析请求
   */
  async _handleAnalyze(entities, intent) {
    const result = { summary: '' };

    if (intent.subType === 'market') {
      result.market = await this.collector.getMarketOverview();
      result.summary = '已完成大盘分析';
    }

    if (intent.subType === 'sector' && entities.sectors.length > 0) {
      result.sectors = entities.sectors;
      result.summary = `已完成${entities.sectors.join('、')}板块分析`;
    }

    return result;
  }

  /**
   * 处理查询请求
   */
  async _handleQuery(entities, intent) {
    if (intent.subType === 'portfolio') {
      const returns = this.advisor.calculateReturns();
      return { portfolio: returns, summary: '已查询持仓' };
    }

    return { summary: '已查询数据' };
  }

  /**
   * 处理操作请求
   */
  _handleOperate(input, entities) {
    const operation = this.advisor.parseOperation(input);

    if (operation.action === 'query') {
      const returns = this.advisor.calculateReturns();
      return { portfolio: returns, summary: '已查询持仓' };
    }

    return { operation, summary: `已解析${operation.action}操作` };
  }

  /**
   * 处理报告请求
   */
  async _handleReport() {
    const report = await this.report.generateDailyReport();
    return { report, summary: '已生成收益报告' };
  }

  /**
   * 处理工具安装请求
   */
  async _handleInstall(entities) {
    const category = entities.installCategory || null;
    const result = await this.autoInstallTools(category);
    return {
      installResult: result,
      summary: result.success ? '工具安装完成' : '部分工具安装失败'
    };
  }

  /**
   * 处理健康检查请求
   */
  async _handleHealthCheck() {
    const health = await this.healthChecker.runAllChecks();
    const suggestions = this.healthChecker.getFixSuggestions();
    return {
      health,
      suggestions,
      summary: health.summary
    };
  }

  /**
   * 保存上下文
   */
  _saveContext(entry) {
    const path = this.config.getContextPath();
    let context = { conversationHistory: [] };
    try { context = JSON.parse(fs.readFileSync(path, 'utf-8')); } catch {}

    context.conversationHistory.push({
      timestamp: new Date().toISOString(),
      ...entry
    });

    if (context.conversationHistory.length > 50) {
      context.conversationHistory = context.conversationHistory.slice(-50);
    }

    fs.writeFileSync(path, JSON.stringify(context, null, 2), 'utf-8');
  }
}

module.exports = LeaderAgent;
