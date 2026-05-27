/**
 * leader.js - 领导Agent
 * 任务解析、调度、上下文管理
 */

const fs = require('fs');
const CollectorAgent = require('./collector');
const AnalystAgent = require('./analyst');
const AdvisorAgent = require('./advisor');
const ReportAgent = require('./report');

class LeaderAgent {
  constructor(config) {
    this.config = config;
    this.collector = new CollectorAgent(config);
    this.analyst = new AnalystAgent(config);
    this.advisor = new AdvisorAgent(config);
    this.report = new ReportAgent(config);
  }

  /**
   * 处理用户输入
   */
  async process(input) {
    const intent = this._parseIntent(input);
    const entities = this._extractEntities(input);

    let result = {};

    switch (intent.type) {
      case 'analyze':
        result = await this._handleAnalyze(entities, intent);
        break;
      case 'query':
        result = await this._handleQuery(entities, intent);
        break;
      case 'operate':
        result = this._handleOperate(input, entities);
        break;
      case 'report':
        result = await this._handleReport();
        break;
      default:
        result = { message: '未识别的指令类型' };
    }

    this._saveContext({ user: input, intent, result: result.summary || '完成' });

    return { intent, entities, ...result };
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
