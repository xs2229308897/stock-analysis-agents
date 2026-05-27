# stock-agents

多Agents股市分析系统 - 可复用的智能投资助手工具包

## 安装

将 `stock-agents` 目录复制到你的项目中，或通过相对路径引用。

## 快速开始

### 1. 初始化项目

```bash
cd your-project
node stock-agents/scripts/init.js
```

这会创建：
- `data/` 目录及默认数据文件
- `stock-agents.config.js` 配置文件

### 2. 配置（可选）

编辑 `stock-agents.config.js`：

```javascript
module.exports = {
  dataDir: './data',
  ifind: {
    enabled: true,
    scriptPath: '/path/to/ifind/call-node.js'
  },
  risk: {
    stopLoss: -0.08,
    takeProfit: 0.20
  }
};
```

### 3. 使用

```javascript
const StockAgents = require('./stock-agents');

const agents = new StockAgents();

// 自然语言交互
const result = await agents.process('分析半导体板块走势');

// 获取持仓
const portfolio = agents.getPortfolio();

// 生成报告
const report = await agents.generateDailyReport();
```

## API

### StockAgents

主类，协调所有Agent。

```javascript
const agents = new StockAgents(options);

// 处理用户输入
await agents.process(input);

// 获取持仓
agents.getPortfolio();

// 获取大盘行情
await agents.getMarketOverview();

// 生成报告
await agents.generateDailyReport();
```

### CollectorAgent

信息收集Agent。

```javascript
const { CollectorAgent } = require('./stock-agents');
const collector = new CollectorAgent(config);

// 大盘指数
collector.getMarketIndices();

// 个股行情
collector.getStockQuotes(['sh600519', 'sz000858']);

// 板块ETF
collector.getBoardETF();

// 新闻搜索
await collector.searchNews('半导体', '2026-05-01', '2026-05-27');

// 财务数据
await collector.getStockFinancials('茅台的ROE、PE');
```

### AnalystAgent

信息分析Agent。

```javascript
const { AnalystAgent } = require('./stock-agents');
const analyst = new AnalystAgent(config);

// 均线分析
analyst.analyzeMovingAverage(klineData);

// MACD分析
analyst.analyzeMACD(klineData);

// 估值分析
analyst.analyzeValuation({ pe: 25, pb: 3 });

// 技术面摘要
analyst.generateTechnicalSummary(klineData);

// 基本面摘要
analyst.generateFundamentalSummary(financialData);
```

### AdvisorAgent

投资建议Agent。

```javascript
const { AdvisorAgent } = require('./stock-agents');
const advisor = new AdvisorAgent(config);

// 获取持仓
advisor.getPortfolio();

// 买入
advisor.executeBuy('012733', '人工智能ETF联接C', 1000, 1.25, 'fund');

// 卖出
advisor.executeSell('012733', 500, 1.35);

// 计算收益
advisor.calculateReturns();

// 风险评估
advisor.assessRisk();
```

### ReportAgent

报告Agent。

```javascript
const { ReportAgent } = require('./stock-agents');
const report = new ReportAgent(config);

// 生成报告
await report.generateDailyReport();

// 记录收益
report.recordPerformance({ date: '2026-05-27', totalAssets: 100000 });

// 检查异常
report.checkAbnormalChanges(0.03);
```

## 目录结构

```
stock-agents/
├── index.js          # 主入口
├── config.js         # 配置管理
├── agents/
│   ├── leader.js     # 领导Agent
│   ├── collector.js  # 信息收集Agent
│   ├── analyst.js    # 信息分析Agent
│   ├── advisor.js    # 投资建议Agent
│   └── report.js     # 报告Agent
├── scripts/
│   ├── init.js       # 初始化脚本
│   └── test.js       # 测试脚本
├── SKILL.md          # Claude Code技能说明
└── README.md         # 本文档
```

## 数据文件

初始化后会在项目中创建：

```
data/
├── portfolio.json      # 持仓数据
├── transactions.json   # 交易历史
├── context.json        # 上下文记忆
├── performance.json    # 收益记录
└── reports/            # 生成的报告
```

## 风险提示

> 股市有风险，投资需谨慎。本工具仅供学习和参考，不构成投资建议。
