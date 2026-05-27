---
name: stock-agents
description: 多Agents股市分析系统 - 支持自然语言交互的智能投资助手
---

# 股市分析助手 - 多Agents系统

通过自然语言与系统交互，完成股市分析和投资管理。

## 使用方法

```javascript
const StockAgents = require('./stock-agents');

const agents = new StockAgents({
  dataDir: './data',  // 数据存储目录
  risk: {
    stopLoss: -0.08,  // 止损线
    takeProfit: 0.20  // 止盈线
  }
});

// 自然语言交互
const result = await agents.process('分析半导体板块走势');
console.log(result);

// 获取持仓
const portfolio = agents.getPortfolio();

// 生成报告
const report = await agents.generateDailyReport();
```

## 支持的指令

| 指令类型 | 示例 |
|---------|------|
| 分析 | "分析半导体板块走势"、"查看茅台的财务数据" |
| 操作 | "买入1000份人工智能ETF联接C，价格1.25" |
| 查询 | "查看持仓" |
| 报告 | "生成今日收益报告" |

## 单独使用各Agent

```javascript
const { CollectorAgent, AnalystAgent, AdvisorAgent, ReportAgent } = require('./stock-agents');

// 信息收集
const collector = new CollectorAgent(config);
const market = await collector.getMarketOverview();

// 分析
const analyst = new AnalystAgent(config);
const technical = analyst.generateTechnicalSummary(klineData);

// 投资建议
const advisor = new AdvisorAgent(config);
const advice = advisor.generateAdvice(analysis);

// 报告
const report = new ReportAgent(config);
const dailyReport = await report.generateDailyReport();
```
