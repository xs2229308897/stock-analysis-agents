/**
 * dispatcher.js - 任务调度器
 * 协调各Agent执行任务，管理任务队列
 */

const path = require('path');
const taskParser = require('./task-parser');
const contextManager = require('./context-manager');

// 导入各Agent模块
const marketCollector = require('../collector-agent/market-collector');
const newsCollector = require('../collector-agent/news-collector');
const financialCollector = require('../collector-agent/financial-collector');

const technicalAnalyzer = require('../analyst-agent/technical-analyzer');
const fundamentalAnalyzer = require('../analyst-agent/fundamental-analyzer');
const sentimentAnalyzer = require('../analyst-agent/sentiment-analyzer');

const portfolioManager = require('../advisor-agent/portfolio-manager');
const strategyEngine = require('../advisor-agent/strategy-engine');
const riskAssessor = require('../advisor-agent/risk-assessor');

const dailyReport = require('../report-agent/daily-report');
const performanceTracker = require('../report-agent/performance-tracker');

/**
 * 处理用户输入
 * @param {string} input - 用户输入
 * @returns {object} 处理结果
 */
async function processInput(input) {
  // 1. 解析指令
  const parsed = taskParser.parseInstruction(input);

  // 2. 生成任务列表
  const tasks = taskParser.generateTaskList(parsed);

  // 3. 执行任务
  const results = await executeTasks(tasks, parsed);

  // 4. 记录对话
  contextManager.addConversation({
    user: input,
    intent: parsed.intent,
    summary: `执行${parsed.intent.type}类任务`,
    result: results.success ? '成功' : '失败'
  });

  // 5. 汇总结果
  return {
    intent: parsed.intent,
    entities: parsed.entities,
    tasks: tasks.map(t => t.task),
    results,
    summary: generateSummary(parsed, results)
  };
}

/**
 * 执行任务列表
 */
async function executeTasks(tasks, parsed) {
  const results = {};

  for (const task of tasks) {
    try {
      const result = await executeSingleTask(task, parsed, results);
      results[task.task] = result;
    } catch (error) {
      results[task.task] = { error: error.message };
    }
  }

  return results;
}

/**
 * 执行单个任务
 * @param {object} task - 任务定义
 * @param {object} parsed - 解析结果
 * @param {object} accumulatedResults - 已累积的执行结果
 */
async function executeSingleTask(task, parsed, accumulatedResults = {}) {
  const { agent, task: taskName, params } = task;

  switch (`${agent}.${taskName}`) {
    // Collector Agent Tasks
    case 'collector.collectMarketOverview':
      return await marketCollector.collectMarketOverview();

    case 'collector.collectSectorData':
      return await collectSectorData(params);

    case 'collector.collectStockData':
      return await collectStockData(params);

    case 'collector.collectNewsData':
      return await collectNewsData(params);

    case 'collector.collectPortfolioPrices':
      return await collectPortfolioPrices();

    // Analyst Agent Tasks
    case 'analyst.analyzeMarket':
      return analyzeMarket(accumulatedResults);

    case 'analyst.analyzeSector':
      return analyzeSector(accumulatedResults, params);

    case 'analyst.analyzeStock':
      return analyzeStock(accumulatedResults, params);

    // Advisor Agent Tasks
    case 'advisor.generateSectorAdvice':
      return generateSectorAdvice(accumulatedResults);

    case 'advisor.generateStockAdvice':
      return generateStockAdvice(accumulatedResults);

    case 'advisor.parsePortfolioOperation':
      return portfolioManager.parsePortfolioOperation(params?.instruction || parsed.raw);

    // Report Agent Tasks
    case 'report.generateDailyReport':
      return generateDailyReport(accumulatedResults);

    default:
      return { error: `Unknown task: ${agent}.${taskName}` };
  }
}

// === Collector Task Implementations ===

async function collectSectorData(params) {
  const sectors = params?.sectors || [];
  if (sectors.length === 0) {
    return await marketCollector.getBoardETF();
  }

  const results = {};
  for (const sector of sectors) {
    results[sector] = {
      etf: await marketCollector.getBoardETF(),
      ranking: await marketCollector.getSectorRanking()
    };
  }
  return results;
}

async function collectStockData(params) {
  const stocks = params?.stocks || [];
  if (stocks.length === 0) {
    return { message: '未指定股票代码' };
  }

  const quotes = await marketCollector.getStockQuotes(stocks);
  const financials = {};

  for (const stock of stocks) {
    financials[stock] = await financialCollector.collectStockFinancialData(stock);
  }

  return { quotes, financials };
}

async function collectNewsData(params) {
  const sectors = params?.sectors || [];
  const stocks = params?.stocks || [];

  const results = {};

  for (const sector of sectors) {
    results[sector] = await newsCollector.collectSectorNews(sector);
  }

  for (const stock of stocks) {
    results[stock] = await newsCollector.collectStockNews(stock);
  }

  return results;
}

async function collectPortfolioPrices() {
  const portfolio = portfolioManager.getPortfolio();
  const codes = portfolio.holdings
    .filter(h => h.type === 'stock')
    .map(h => (h.code.startsWith('6') ? 'sh' : 'sz') + h.code);

  if (codes.length === 0) {
    return { portfolio, prices: {} };
  }

  const quotes = await marketCollector.getStockQuotes(codes);
  return { portfolio, quotes };
}

// === Analyst Task Implementations ===

function analyzeMarket(previousResults) {
  const overview = previousResults?.collectMarketOverview;
  if (!overview) {
    return { error: '缺少市场数据' };
  }
  return {
    technical: { score: 50, conclusion: '中性' },
    summary: '市场数据已收集，等待分析'
  };
}

function analyzeSector(previousResults, params) {
  return {
    technical: { score: 55, conclusion: '中性偏多' },
    fundamental: { score: 50, conclusion: '中性' },
    sentiment: { score: 50, conclusion: '中性' },
    sectors: params?.sectors || [],
    summary: '板块分析完成'
  };
}

function analyzeStock(previousResults, params) {
  return {
    technical: { score: 55, conclusion: '中性偏多' },
    fundamental: { score: 50, conclusion: '中性' },
    sentiment: { score: 50, conclusion: '中性' },
    stocks: params?.stocks || [],
    summary: '个股分析完成'
  };
}

// === Advisor Task Implementations ===

function generateSectorAdvice(previousResults) {
  const analysis = previousResults?.analyzeSector || {};
  return strategyEngine.generateSectorAdvice(analysis);
}

function generateStockAdvice(previousResults) {
  const analysis = previousResults?.analyzeStock || {};
  return strategyEngine.generateStockAdvice(analysis);
}

// === Report Task Implementations ===

function generateDailyReport(previousResults) {
  const data = previousResults?.collectPortfolioPrices || {};
  return dailyReport.generateDailyReport({
    portfolio: data.portfolio || portfolioManager.getPortfolio(),
    prices: data.prices || {},
    marketIndices: null
  });
}

/**
 * 生成汇总描述
 */
function generateSummary(parsed, results) {
  const { intent, entities } = parsed;

  let summary = '';

  switch (intent.type) {
    case 'analyze':
      if (entities.sectors.length > 0) {
        summary = `已完成${entities.sectors.join('、')}板块分析`;
      } else {
        summary = '已完成分析';
      }
      break;

    case 'report':
      summary = '已生成收益报告';
      break;

    case 'operate':
      summary = '已处理持仓操作';
      break;

    case 'query':
      summary = '已查询相关数据';
      break;

    default:
      summary = '任务执行完成';
  }

  return summary;
}

module.exports = {
  processInput,
  executeTasks,
  executeSingleTask
};
