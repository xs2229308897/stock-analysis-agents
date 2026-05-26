/**
 * daily-report.js - 每日报告生成模块
 * 生成每日收益报告
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

/**
 * 生成每日收益报告
 * @param {object} data - 包含持仓、行情等数据
 * @returns {object} 报告内容
 */
function generateDailyReport(data) {
  const { portfolio, prices, marketIndices } = data;
  const today = new Date().toISOString().split('T')[0];

  // 计算持仓收益
  let totalCost = 0;
  let totalValue = 0;

  const holdings = (portfolio.holdings || []).map(h => {
    const currentPrice = prices?.[h.code] || h.currentPrice;
    const cost = h.shares * h.costPrice;
    const value = h.shares * currentPrice;
    const pnl = value - cost;
    const pnlRate = cost > 0 ? (pnl / cost * 100) : 0;

    totalCost += cost;
    totalValue += value;

    return {
      code: h.code,
      name: h.name,
      type: h.type,
      shares: h.shares,
      costPrice: h.costPrice,
      currentPrice,
      value,
      pnl,
      pnlRate
    };
  });

  const totalPnL = totalValue - totalCost;
  const totalPnLRate = totalCost > 0 ? (totalPnL / totalCost * 100) : 0;
  const totalAssets = totalValue + (portfolio.cash || 0);

  // 生成报告
  const report = {
    date: today,
    generatedAt: new Date().toISOString(),
    summary: {
      totalAssets,
      totalValue,
      cash: portfolio.cash || 0,
      totalPnL,
      totalPnLRate
    },
    holdings,
    marketOverview: marketIndices || null,
    text: formatReportText({
      date: today,
      totalAssets,
      totalValue,
      cash: portfolio.cash || 0,
      totalPnL,
      totalPnLRate,
      holdings,
      marketIndices
    })
  };

  // 保存报告
  saveReport(report);

  return report;
}

/**
 * 格式化报告文本
 */
function formatReportText(data) {
  const { date, totalAssets, totalValue, cash, totalPnL, totalPnLRate, holdings, marketIndices } = data;

  let text = `# 每日收益报告 - ${date}\n\n`;

  // 账户总览
  text += `## 账户总览\n`;
  text += `- 总资产：${totalAssets.toFixed(2)} 元\n`;
  text += `- 持仓市值：${totalValue.toFixed(2)} 元\n`;
  text += `- 可用资金：${cash.toFixed(2)} 元\n`;
  text += `- 当日盈亏：${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} 元（${totalPnLRate >= 0 ? '+' : ''}${totalPnLRate.toFixed(2)}%）\n\n`;

  // 市场行情
  if (marketIndices) {
    text += `## 市场行情\n`;
    if (marketIndices.shangzheng) {
      text += `- 上证指数：${marketIndices.shangzheng.price}（${marketIndices.shangzheng.change}）\n`;
    }
    if (marketIndices.shenzheng) {
      text += `- 深证成指：${marketIndices.shenzheng.price}（${marketIndices.shenzheng.change}）\n`;
    }
    if (marketIndices.chuangye) {
      text += `- 创业板指：${marketIndices.chuangye.price}（${marketIndices.chuangye.change}）\n`;
    }
    text += '\n';
  }

  // 持仓明细
  if (holdings.length > 0) {
    text += `## 持仓明细\n\n`;
    text += `| 品种 | 持有份额 | 成本价 | 现价 | 盈亏 | 盈亏率 |\n`;
    text += `|------|---------|--------|------|------|--------|\n`;

    holdings.forEach(h => {
      const pnlStr = h.pnl >= 0 ? `+${h.pnl.toFixed(2)}` : h.pnl.toFixed(2);
      const rateStr = h.pnlRate >= 0 ? `+${h.pnlRate.toFixed(2)}%` : `${h.pnlRate.toFixed(2)}%`;
      text += `| ${h.name} | ${h.shares} | ${h.costPrice.toFixed(4)} | ${h.currentPrice.toFixed(4)} | ${pnlStr} | ${rateStr} |\n`;
    });
    text += '\n';
  }

  // 风险提示
  text += `---\n`;
  text += `> 股市有风险，投资需谨慎。以上分析仅供参考，不构成投资建议。\n`;

  return text;
}

/**
 * 保存报告到文件
 */
function saveReport(report) {
  const reportsDir = path.join(DATA_DIR, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filename = `report_${report.date}.json`;
  fs.writeFileSync(path.join(reportsDir, filename), JSON.stringify(report, null, 2), 'utf-8');
}

/**
 * 获取历史报告
 * @param {string} date - 日期
 * @returns {object|null} 报告数据
 */
function getReport(date) {
  const filepath = path.join(DATA_DIR, 'reports', `report_${date}.json`);
  try {
    const data = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

module.exports = {
  generateDailyReport,
  getReport,
  formatReportText
};
