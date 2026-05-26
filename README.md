# 股市分析助手 - 多Agents系统

基于 Claude Code 的多Agent协作系统，用于A股市场实时数据分析和投资研判。

## 系统架构

```
用户 → 领导Agent（调度层）
        ├── 信息收集Agent（数据层）
        ├── 信息分析Agent（分析层）
        ├── 投资建议Agent（决策层）
        └── 报告Agent（输出层）
```

## 功能特性

- **自然语言交互**：用中文描述需求，系统自动执行分析
- **智能任务调度**：领导Agent自动拆解任务并分配给专业Agent
- **多维度分析**：技术面、基本面、情绪面综合研判
- **持仓管理**：支持自然语言买入/卖出/查询操作
- **每日报告**：自动生成收益报告

## Agent说明

| Agent | 职责 |
|-------|------|
| 领导Agent | 解析用户指令、任务调度、上下文管理 |
| 信息收集Agent | 实时行情、新闻资讯、财务数据收集 |
| 信息分析Agent | 技术面（均线/MACD）、基本面（PE/ROE）、情绪面分析 |
| 投资建议Agent | 持仓管理、策略制定、风险评估 |
| 报告Agent | 每日收益报告、收益追踪 |

## 使用方式

```javascript
// 自然语言指令示例
"分析半导体板块走势"
"查看茅台的财务数据"
"买入1000份人工智能ETF联接C，价格1.25"
"生成今日收益报告"
```

## 目录结构

```
├── skills/
│   ├── leader-agent/        # 领导Agent
│   ├── collector-agent/     # 信息收集Agent
│   ├── analyst-agent/       # 信息分析Agent
│   ├── advisor-agent/       # 投资建议Agent
│   └── report-agent/        # 报告Agent
├── data/
│   ├── portfolio.json       # 持仓数据
│   ├── transactions.json    # 交易历史
│   └── context.json         # 上下文记忆
├── config/
│   ├── agents-config.json   # Agent配置
│   └── task-templates.json  # 任务模板
└── tools/
    └── realtime-quote.js    # 实时行情工具
```

## 配置说明

1. 复制 `.mcp.json.example` 为 `.mcp.json`
2. 在 [iFinD官网](https://www.51ifind.com) 获取API密钥
3. 将密钥填入 `.mcp.json` 的 `Authorization` 字段

## 数据源

- **实时行情**：新浪财经API
- **深度数据**：同花顺iFinD（股票、基金、宏观、新闻等）
- **辅助数据**：AKShare、china-market-data

## 风险提示

> 股市有风险，投资需谨慎。本系统仅供学习和参考，不构成投资建议。
