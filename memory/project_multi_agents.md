---
name: Multi-Agents System
description: 已创建的多Agents股市分析系统架构，包含5个专业Agent和完整的数据/分析/决策链路
type: project
---

## 多Agents系统架构

已实现的分层调度架构：

```
用户 → 领导Agent → 信息收集Agent
                  → 信息分析Agent
                  → 投资建议Agent
                  → 报告Agent
```

**Why:** 用户希望通过自然语言交互，自动完成股市分析和投资建议的全流程。

**How to apply:**
- 用户输入自然语言指令时，通过 `skills/leader-agent/dispatcher.js` 的 `processInput()` 处理
- 持仓数据在 `data/portfolio.json`，支持自然语言更新
- 分析模块在 `skills/analyst-agent/`，包含技术面、基本面、情绪面分析
- 每日报告可通过 `skills/report-agent/daily-report.js` 生成
