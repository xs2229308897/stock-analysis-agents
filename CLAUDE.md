# 股市分析助手

本项目用于 A 股市场实时数据分析和投资研判。

## 多Agents系统

本项目采用分层调度架构，通过多个专业化Agent协同工作：

```
用户 → 领导Agent（调度层）
        ├── 信息收集Agent（数据层）
        ├── 信息分析Agent（分析层）
        ├── 投资建议Agent（决策层）
        └── 报告Agent（输出层）
```

### Agent说明

| Agent | 技能路径 | 职责 |
|-------|---------|------|
| 领导Agent | `skills/leader-agent/` | 解析指令、任务调度、上下文管理 |
| 信息收集Agent | `skills/collector-agent/` | 行情、新闻、财务数据收集 |
| 信息分析Agent | `skills/analyst-agent/` | 技术面、基本面、情绪面分析 |
| 投资建议Agent | `skills/advisor-agent/` | 持仓管理、策略制定、风险评估 |
| 报告Agent | `skills/report-agent/` | 每日报告、收益追踪 |

### 使用方式

用自然语言与系统交互：
- "分析半导体板块，给出投资建议"
- "查看茅台的财务数据"
- "买入1000份人工智能ETF联接C"
- "生成今日收益报告"

### 持仓管理

持仓数据存储在 `data/portfolio.json`，支持自然语言操作：
- "买入1000份012733，价格1.25"
- "卖出500份012733，价格1.35"
- "查看持仓"

## 数据工具

### 1. 实时行情（盘中使用）
- **脚本**: `node tools/realtime-quote.js`
- **数据源**: 新浪财经实时行情 API
- **特点**: 盘中实时数据，秒级更新

用法：
```bash
# 大盘指数
node tools/realtime-quote.js

# 个股查询（股票代码格式：sh600519,sz000858）
node tools/realtime-quote.js sh600519,sz000858

# 板块 ETF 行情
node tools/realtime-quote.js --board

# 输出 JSON 格式
node tools/realtime-quote.js --json
```

股票代码规则：上证 `sh` + 6位代码，深证 `sz` + 6位代码。

### 2. iFinD 深度数据（盘后/深度分析使用）
- **工具**: `ifind-finance-data` skill
- **脚本路径**: `.claude/skills/ifind-finance-data-1.1.0/call-node.js`
- **数据源**: 同花顺 iFinD
- **特点**: 日频数据（15:05后更新），覆盖财务、新闻、板块、宏观等

**重要**: iFinD 日频数据在盘中（15:05前）查询今日数据时，涨跌幅/成交额等字段为空。盘中请优先使用实时行情脚本。

**调用模板**（Node.js，无需额外依赖）：
```bash
node -e "
const { call } = require('./.claude/skills/ifind-finance-data-1.1.0/call-node.js');
async function main() {
    const r = await call('server_type', 'tool_name', { query: '...' });
    console.log(JSON.stringify(r, null, 2));
}
main().catch(console.error);
"
```

**server_type 取值**: `stock`(股票)、`fund`(基金)、`edb`(宏观)、`news`(新闻)、`bond`(债券)、`global_stock`(港美股)、`index`(指数板块)

**常用查询示例**：
```bash
# 板块涨跌排行
call('index', 'sector_data', { query: '申万一级行业板块今日涨跌幅' })

# 个股财务数据
call('stock', 'get_stock_financials', { query: '茅台的ROE、PE' })

# 宏观经济指标
call('edb', 'get_edb_data', { query: '制造业PMI、CPI同比 202601-202605' })

# 新闻检索
call('news', 'search_news', { query: 'A股热点', time_start: '2026-05-01', time_end: '2026-05-25', size: 10 })

# 基金业绩查询
call('fund', 'get_fund_market_performance', { query: '人工智能ETF联接基金近一个月收益率' })

# 智能选股
call('stock', 'search_stocks', { query: '今日涨幅排名前20的股票' })
```

**并发限制**: 免费用户每秒最多 2 个请求，个人版 5 个，企业版 10 个。多个 iFinD 查询之间加 500ms 延迟。

### 3. 数据保存工具（历史对比）
- **脚本**: `tools/save-daily-data.js`
- **功能**: 保存每日盘中数据，支持与昨日数据对比
- **数据存储**: `data/daily/YYYY-MM-DD.json`

用法：
```javascript
const { saveDailyData, loadYesterdayData } = require('./tools/save-daily-data.js');

// 保存当前数据
saveDailyData({
    type: 'market_index',
    data: { /* 大盘数据 */ }
});

// 加载昨日数据
const yesterdayData = loadYesterdayData();
```

**说明**: 由于 iFinD 日频数据在盘中无法提供历史分时数据，本工具通过保存每日数据实现历史对比功能。

### 4. 其他 MCP 工具
- `aktools` — AKShare 金融数据
- `china-market-data` — 中国市场综合数据
- `china-stock-mcp` — 中国股票数据

## 数据源选择策略

| 时段 | 主数据源 | 辅助数据源 |
|------|---------|-----------|
| 9:30-15:00（盘中） | realtime-quote.js | iFinD（宏观/新闻/个股财务） |
| 15:05 后（盘后） | iFinD | realtime-quote.js（收盘价确认） |

## 分析流程

当用户要求分析股市时，按以下步骤执行：

### Step 1: 大盘总览
1. 运行 `node tools/realtime-quote.js` 获取三大指数实时行情
2. 分析涨跌幅、成交量、多空力量

### Step 2: 板块热点
1. 运行 `node tools/realtime-quote.js --board` 获取板块 ETF 行情
2. 用 iFinD 查询行业板块涨跌排行：`call("index", "sector_data", {"query": "今日各行业板块涨跌幅排行"})`
3. 识别当日热点板块和资金流入方向

### Step 2.5: 板块深度分析（用户指定板块时）
1. 用 iFinD 查询板块近 20 日走势：`call("index", "sector_data", {"query": "XX板块过去20个交易日的涨跌幅"})`
2. 用 iFinD 查询板块驱动事件：`call("news", "search_news", {"query": "XX板块相关最新消息", "size": 5})`
3. 分析龙头个股表现（实时行情 + iFinD 财务数据）
4. 结合技术面/基本面/资金面/消息面给出板块研判
5. 给出操作建议（持有/低吸/回避）

### Step 3: 个股分析（如用户指定个股）
1. 运行 `node tools/realtime-quote.js shXXXXXX,szXXXXXX` 获取实时行情
2. 用 iFinD 查询财务数据：`call("stock", "get_stock_financials", {"query": "股票简称的ROE、PE、净利润增速"})`
3. 用 iFinD 查询技术指标：`call("stock", "get_stock_info", {"query": "股票简称近20日K线数据"})`
4. 用 iFinD 查询相关新闻：`call("news", "search_news", {"query": "股票相关最新消息", "size": 5})`

### Step 4: 基金推荐（用户要求时）
1. 用 iFinD 查询相关主题基金：`call("fund", "get_fund_market_performance", {"query": "XX主题ETF联接基金近一个月收益率"})`
2. 筛选标准：基金规模 > 10亿、近1月/3月/今年收益率排序
3. 区分 A 份额（长期持有）和 C 份额（短期交易）
4. 列出对比表格，给出选择建议
5. 必须附带基金风险提示

### Step 5: 综合研判
结合四个维度给出分析：
- **技术面**: 均线、MACD、KDJ、成交量
- **基本面**: 估值（PE/PB）、盈利能力（ROE）、成长性
- **资金面**: 主力资金流向、北向资金、成交量变化
- **消息面**: 政策、行业新闻、公司公告

## 盘中快速刷新模式

当用户要求"刷新数据"或"获取最新行情"时，三步并行执行（互相独立，可同时发起）：

```
并行调用：
├── node tools/realtime-quote.js          → 大盘指数
├── node tools/realtime-quote.js --board   → 板块 ETF
└── iFinD 查询（按需）                     → 板块/个股/新闻
```

输出时需对比上次数据，标注趋势变化。

## 盘中定时监控

当用户要求"定时刷新"或"持续监控"时：

1. **设置定时任务**: 使用 CronCreate，推荐间隔 10 分钟
2. **每次刷新内容**: 大盘指数 + 板块 ETF + 异常检测
3. **趋势对比**: 对比上次数据，标注变化趋势
4. **异常提醒标准**:
   - 单板块涨跌幅超 3% → 标注提醒
   - 大盘指数单次变动超 1% → 标注提醒
   - 涨停/跌停个股集中出现 → 标注提醒
5. **收盘后处理**: 15:00 后提醒用户取消定时任务

### 趋势对比标注规范

每次刷新数据后，输出对比表格：

| 指标 | 上次 | 本次 | 趋势 |
|------|------|------|------|
| 上证指数 | +0.35% | +0.60% | 加速 ↑ |
| 半导体ETF | +5.48% | +6.17% | 加速 ↑ |
| 游戏ETF | -3.30% | -3.05% | 回暖 ↑ |
| 医药ETF | -1.74% | -1.74% | 持平 → |

**趋势标注**:
- **加速 ↑** — 涨幅扩大或跌幅扩大
- **减速 ↓** — 涨幅缩小或跌幅缩小
- **翻转 ↕** — 涨变跌或跌变涨
- **持平 →** — 变化幅度 < 0.05bp

**异常信号**需单独标注级别：高 / 中 / 低

## 分析报告格式

每次完整分析应包含以下 8 个部分：

1. **大盘全景**: 三大指数 + 科创50 表现、成交额、市场情绪
2. **板块 ETF 涨跌排行**: 领涨/领跌 ETF 列表、成交额
3. **核心驱动事件**: 当日重大消息/政策/事件
4. **涨停/跌停分析**: 涨幅前 20 个股分析、跌停原因
5. **重点个股解析**: 用户指定或市场核心标的的详细数据
6. **资金流向判断**: 主力流入/流出方向
7. **技术面研判**: 关键支撑位/压力位、趋势判断
8. **综合研判与投资建议**: 推荐方向 + 回避方向 + 操作策略

## 风险提示（必须）

每次给出投资建议时，**必须**附带风险提示：
> 股市有风险，投资需谨慎。以上分析仅供参考，不构成投资建议。建议结合个人风险承受能力做出决策。

每次推荐基金时，**必须**附带基金风险提示：
> 基金有风险，投资需谨慎。基金过往业绩不代表未来表现。以上分析仅供参考，不构成投资建议。
