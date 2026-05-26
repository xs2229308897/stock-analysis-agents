/**
 * task-parser.js - 自然语言任务解析模块
 * 解析用户指令，识别意图和参数
 */

/**
 * 解析用户指令
 * @param {string} input - 用户输入
 * @returns {object} 解析结果
 */
function parseInstruction(input) {
  const text = input.trim();

  // 检测指令类型
  const intent = detectIntent(text);
  const entities = extractEntities(text);

  return {
    raw: text,
    intent,
    entities,
    template: matchTemplate(intent, entities),
    confidence: intent.confidence
  };
}

/**
 * 检测用户意图
 */
function detectIntent(text) {
  const lower = text.toLowerCase();

  // 查询类
  if (lower.includes('查看') || lower.includes('查询') || lower.includes('查一下') || lower.includes('看看')) {
    if (lower.includes('财务') || lower.includes('roe') || lower.includes('pe')) {
      return { type: 'query', subType: 'financial', confidence: 0.9 };
    }
    if (lower.includes('行情') || lower.includes('价格') || lower.includes('涨跌')) {
      return { type: 'query', subType: 'market', confidence: 0.9 };
    }
    if (lower.includes('持仓') || lower.includes('仓位')) {
      return { type: 'query', subType: 'portfolio', confidence: 0.9 };
    }
    return { type: 'query', subType: 'general', confidence: 0.7 };
  }

  // 分析类
  if (lower.includes('分析') || lower.includes('研判') || lower.includes('评估')) {
    if (lower.includes('板块') || lower.includes('行业')) {
      return { type: 'analyze', subType: 'sector', confidence: 0.9 };
    }
    if (lower.includes('大盘') || lower.includes('指数') || lower.includes('市场')) {
      return { type: 'analyze', subType: 'market', confidence: 0.9 };
    }
    return { type: 'analyze', subType: 'stock', confidence: 0.8 };
  }

  // 投资建议类
  if (lower.includes('建议') || lower.includes('推荐') || lower.includes('策略')) {
    return { type: 'advise', subType: 'recommendation', confidence: 0.9 };
  }

  // 操作类
  if (lower.includes('买入') || lower.includes('买入') || lower.includes('加仓')) {
    return { type: 'operate', subType: 'buy', confidence: 0.95 };
  }
  if (lower.includes('卖出') || lower.includes('减仓') || lower.includes('清仓')) {
    return { type: 'operate', subType: 'sell', confidence: 0.95 };
  }

  // 报告类
  if (lower.includes('报告') || lower.includes('收益') || lower.includes('盈亏')) {
    return { type: 'report', subType: 'daily', confidence: 0.9 };
  }

  // 监控类
  if (lower.includes('监控') || lower.includes('提醒') || lower.includes('预警')) {
    return { type: 'monitor', subType: 'alert', confidence: 0.8 };
  }

  return { type: 'unknown', subType: null, confidence: 0.3 };
}

/**
 * 提取实体信息
 */
function extractEntities(text) {
  const entities = {
    stocks: [],
    sectors: [],
    metrics: [],
    quantities: [],
    prices: []
  };

  // 提取股票代码
  const codeMatch = text.match(/[sh|sz]\d{6}|\d{6}/gi);
  if (codeMatch) {
    entities.stocks = codeMatch.map(c => c.toLowerCase());
  }

  // 提取板块名称
  const sectorKeywords = ['半导体', '芯片', 'AI', '人工智能', '算力', '电网', '电力', '新能源',
    '光伏', '锂电', '汽车', '医药', '消费', '白酒', '银行', '券商', '地产', '科技',
    '军工', '航天', '机器人', '5G', '通信', '计算机', '软件', '游戏', '传媒'];
  sectorKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      entities.sectors.push(keyword);
    }
  });

  // 提取数量
  const qtyMatch = text.match(/(\d+)\s*(?:股|份|手|元)/g);
  if (qtyMatch) {
    entities.quantities = qtyMatch.map(q => parseInt(q));
  }

  // 提取价格
  const priceMatch = text.match(/(?:价格|价)\s*(\d+\.?\d*)/g);
  if (priceMatch) {
    entities.prices = priceMatch.map(p => parseFloat(p.replace(/[价格]/g, '')));
  }

  // 提取指标
  const metricKeywords = ['ROE', 'PE', 'PB', 'ROA', '净利润', '营收', '毛利率', '净利率',
    '涨跌幅', '换手率', '市盈率', '市净率', 'MACD', 'KDJ', '均线'];
  metricKeywords.forEach(m => {
    if (text.toUpperCase().includes(m.toUpperCase())) {
      entities.metrics.push(m);
    }
  });

  return entities;
}

/**
 * 匹配任务模板
 */
function matchTemplate(intent, entities) {
  switch (intent.type) {
    case 'analyze':
      if (intent.subType === 'sector' && entities.sectors.length > 0) {
        return 'sector_analysis';
      }
      if (intent.subType === 'market') {
        return 'market_analysis';
      }
      return 'stock_analysis';

    case 'report':
      return 'daily_report';

    case 'operate':
      return 'portfolio_update';

    case 'advise':
      return 'full_analysis';

    case 'query':
      if (intent.subType === 'portfolio') {
        return null; // 直接查询，不需要模板
      }
      if (entities.sectors.length > 0) {
        return 'sector_analysis';
      }
      return 'stock_analysis';

    default:
      return null;
  }
}

/**
 * 生成任务列表
 * @param {object} parsed - 解析结果
 * @returns {Array} 任务列表
 */
function generateTaskList(parsed) {
  const { template, entities } = parsed;

  if (!template) {
    // 简单查询，直接返回
    return [{
      id: 'task_1',
      agent: 'collector',
      task: 'collectStockData',
      params: { query: parsed.raw }
    }];
  }

  // 根据模板生成任务
  const templates = {
    'market_analysis': [
      { agent: 'collector', task: 'collectMarketOverview' },
      { agent: 'analyst', task: 'analyzeMarket' }
    ],
    'sector_analysis': [
      { agent: 'collector', task: 'collectSectorData', params: { sectors: entities.sectors } },
      { agent: 'collector', task: 'collectNewsData', params: { sectors: entities.sectors } },
      { agent: 'analyst', task: 'analyzeSector', params: { sectors: entities.sectors } },
      { agent: 'advisor', task: 'generateSectorAdvice', params: { sectors: entities.sectors } }
    ],
    'stock_analysis': [
      { agent: 'collector', task: 'collectStockData', params: { stocks: entities.stocks } },
      { agent: 'collector', task: 'collectNewsData', params: { stocks: entities.stocks } },
      { agent: 'analyst', task: 'analyzeStock', params: { stocks: entities.stocks } },
      { agent: 'advisor', task: 'generateStockAdvice' }
    ],
    'daily_report': [
      { agent: 'collector', task: 'collectPortfolioPrices' },
      { agent: 'report', task: 'generateDailyReport' }
    ],
    'portfolio_update': [
      { agent: 'advisor', task: 'parsePortfolioOperation', params: { instruction: parsed.raw } }
    ],
    'full_analysis': [
      { agent: 'collector', task: 'collectMarketOverview' },
      { agent: 'collector', task: 'collectSectorData' },
      { agent: 'analyst', task: 'analyzeMarket' },
      { agent: 'analyst', task: 'analyzeSector' },
      { agent: 'advisor', task: 'generateSectorAdvice' }
    ]
  };

  const tasks = templates[template] || [];
  return tasks.map((t, i) => ({
    id: `task_${i + 1}`,
    ...t
  }));
}

module.exports = {
  parseInstruction,
  detectIntent,
  extractEntities,
  matchTemplate,
  generateTaskList
};
