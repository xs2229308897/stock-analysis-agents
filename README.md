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
- **健康检查**：启动时自动检查依赖和配置
- **错误降级**：数据源不可用时自动切换备选方案
- **结果缓存**：智能缓存分析结果，提升响应速度
- **日志监控**：完整的操作日志和性能监控

## Agent说明

| Agent | 职责 |
|-------|------|
| 领导Agent | 解析用户指令、任务调度、上下文管理、健康检查 |
| 信息收集Agent | 实时行情、新闻资讯、财务数据收集 |
| 信息分析Agent | 技术面（均线/MACD）、基本面（PE/ROE）、情绪面分析 |
| 投资建议Agent | 持仓管理、策略制定、风险评估 |
| 报告Agent | 每日收益报告、收益追踪 |

## 安装方式

### 前置要求

- [Node.js](https://nodejs.org/) >= 16.0.0
- [Claude Code](https://claude.ai/code) CLI 或桌面应用
- [Git](https://git-scm.com/)（可选，用于克隆仓库）

### Windows 安装

#### 方式一：使用 PowerShell（推荐）

```powershell
# 1. 安装 Node.js（如果未安装）
# 访问 https://nodejs.org/ 下载并安装 LTS 版本
# 或使用 winget：
winget install OpenJS.NodeJS.LTS

# 2. 安装 Git（如果未安装）
winget install Git.Git

# 3. 克隆仓库
git clone https://github.com/xs2229308897/stock-analysis-agents.git
cd stock-analysis-agents

# 4. 安装依赖（如有）
npm install

# 5. 配置 iFinD API 密钥
copy .mcp.json.example .mcp.json
# 用记事本打开 .mcp.json，填入你的 iFinD Authorization
notepad .mcp.json
```

#### 方式二：使用 CMD

```cmd
:: 1. 安装 Node.js
:: 访问 https://nodejs.org/ 下载并安装

:: 2. 克隆仓库
git clone https://github.com/xs2229308897/stock-analysis-agents.git
cd stock-analysis-agents

:: 3. 配置
copy .mcp.json.example .mcp.json
notepad .mcp.json
```

#### 方式三：直接下载 ZIP

1. 访问 https://github.com/xs2229308897/stock-analysis-agents
2. 点击绿色 "Code" 按钮 → "Download ZIP"
3. 解压到任意目录
4. 复制 `.mcp.json.example` 为 `.mcp.json` 并填入 API 密钥

### macOS / Linux 安装

```bash
# 1. 安装 Node.js
# macOS: brew install node
# Linux: sudo apt install nodejs npm 或 sudo yum install nodejs npm

# 2. 克隆仓库
git clone https://github.com/xs2229308897/stock-analysis-agents.git
cd stock-analysis-agents

# 3. 配置
cp .mcp.json.example .mcp.json
# 编辑 .mcp.json 填入 iFinD Authorization
nano .mcp.json
```

### 配置 API 密钥

1. 访问 [iFinD官网](https://www.51ifind.com) 注册并获取 API 密钥
2. 编辑 `.mcp.json`，找到 `ifind-finance-data` 的 `Authorization` 字段：
   ```json
   {
     "mcpServers": {
       "ifind-finance-data": {
         "env": {
           "Authorization": "你的API密钥"
         }
       }
     }
   }
   ```
3. 保存文件

## 使用方式

### 启动 Claude Code

```bash
# 在项目目录下启动 Claude Code
claude
```

### 自然语言指令示例

```javascript
// 大盘分析
"分析今日大盘走势"
"查看三大指数行情"

// 板块分析
"分析半导体板块走势"
"AI板块最近表现如何"

// 个股分析
"查看茅台的财务数据"
"分析宁德时代的技术面"

// 持仓管理
"买入1000份人工智能ETF联接C，价格1.25"
"卖出500份012733，价格1.35"
"查看我的持仓"

// 报告生成
"生成今日收益报告"
"查看本月收益情况"

// 系统管理
"检查系统健康状态"
"查看缓存统计"
```

## 目录结构

```
stock-analysis-agents/
├── skills/                          # Claude Code 技能
│   ├── leader-agent/                # 领导Agent技能
│   ├── collector-agent/             # 信息收集Agent技能
│   ├── analyst-agent/               # 信息分析Agent技能
│   ├── advisor-agent/               # 投资建议Agent技能
│   └── report-agent/                # 报告Agent技能
├── stock-agents/                    # 可复用工具包
│   ├── index.js                     # 入口文件
│   ├── config.js                    # 配置管理
│   └── agents/
│       ├── leader.js                # 领导Agent（集成所有增强模块）
│       ├── collector.js             # 信息收集Agent
│       ├── analyst.js               # 信息分析Agent
│       ├── advisor.js               # 投资建议Agent
│       ├── report.js                # 报告Agent
│       ├── health-checker.js        # 健康检查模块
│       ├── tool-installer.js        # 工具安装模块
│       ├── task-queue.js            # 任务队列模块
│       ├── error-handler.js         # 错误处理模块
│       ├── memory-manager.js        # 记忆管理模块
│       ├── cache-manager.js         # 缓存管理模块
│       ├── logger.js                # 日志模块
│       └── agent-registry.js        # Agent注册模块
├── data/
│   ├── portfolio.json               # 持仓数据
│   ├── transactions.json            # 交易历史
│   ├── context.json                 # 上下文记忆
│   └── daily/                       # 每日数据快照
├── config/
│   ├── agents-config.json           # Agent配置
│   └── task-templates.json          # 任务模板
├── tools/
│   ├── realtime-quote.js            # 实时行情工具
│   └── save-daily-data.js           # 每日数据保存工具
├── .mcp.json.example                # MCP配置模板
├── CLAUDE.md                        # Claude Code项目指令
└── README.md                        # 本文件
```

## 数据源

| 数据源 | 类型 | 更新频率 | 说明 |
|--------|------|---------|------|
| 新浪财经API | 实时行情 | 实时 | 盘中使用，秒级更新 |
| 同花顺iFinD | 深度数据 | 日频 | 盘后使用，覆盖财务/新闻/板块/宏观 |
| AKShare | 辅助数据 | 日频 | 备用数据源 |

## 领导Agent增强功能

领导Agent已集成以下增强模块：

| 模块 | 功能 |
|------|------|
| **健康检查** | 启动时自动检查Node.js版本、数据目录、脚本可用性、MCP配置 |
| **工具安装** | 推荐并自动安装缺失的MCP/工具 |
| **任务队列** | 并行执行独立任务、超时处理、失败重试（指数退避） |
| **错误处理** | 错误分类、用户友好提示、自动降级（iFinD→实时→缓存） |
| **记忆管理** | 会话记忆、用户偏好学习、指代词推断 |
| **缓存管理** | TTL缓存（实时1分钟/分析5分钟/财务1天）、命中率统计 |
| **日志监控** | 操作日志、性能计时、日志文件轮转 |
| **Agent注册** | 动态注册新Agent、能力发现、健康检查 |

## 常见问题

### Q: 启动时提示 "iFinD 脚本不可用"

A: 这是正常提示，iFinD 是可选的深度数据源。系统会自动降级使用实时行情脚本。如需使用 iFinD，请配置 `.mcp.json` 中的 API 密钥。

### Q: Windows 上路径报错

A: 确保使用 Node.js >= 16.0.0，路径中避免使用中文字符。

### Q: 如何更新到最新版本？

A: 在项目目录下执行：
```bash
git pull origin main
```

## 风险提示

> 股市有风险，投资需谨慎。本系统仅供学习和参考，不构成投资建议。建议结合个人风险承受能力做出决策。

## 许可证

MIT License
