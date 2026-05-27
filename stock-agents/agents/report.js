/**
 * report.js - 报告Agent
 * 生成每日收益报告、追踪收益
 */

const fs = require('fs');
const path = require('path');

class ReportAgent {
  constructor(config) {
    this.config = config;
  }

  /**
   * 生成每日报告
   */
  async generateDailyReport(data = {}) {
    const portfolio = data.portfolio || this._getPortfolio();
    const prices = data.prices || {};
    const today = new Date().toISOString().split('T')[0];

    let totalCost = 0, totalValue = 0;

    const holdings = (portfolio.holdings || []).map(h => {
      const currentPrice = prices[h.code] || h.currentPrice;
      const cost = h.shares * h.costPrice;
      const value = h.shares * currentPrice;
      const pnl = value - cost;
      totalCost += cost;
      totalValue += value;
      return { ...h, currentPrice, value, pnl, pnlRate: cost > 0 ? (pnl / cost * 100) : 0 };
    });

    const totalPnL = totalValue - totalCost;
    const totalPnLRate = totalCost > 0 ? (totalPnL / totalCost * 100) : 0;
    const totalAssets = totalValue + (portfolio.cash || 0);

    const report = {
      date: today,
      generatedAt: new Date().toISOString(),
      summary: { totalAssets, totalValue, cash: portfolio.cash || 0, totalPnL, totalPnLRate },
      holdings,
      text: this._formatReport(today, totalAssets, totalValue, portfolio.cash, totalPnL, totalPnLRate, holdings)
    };

    this._saveReport(report);
    return report;
  }

  /**
   * 记录每日收益
   */
  recordPerformance(dailyData) {
    const path = this.config.getDataPath(this.config.get('performanceFile'));
    let perf = { daily: [] };
    try { perf = JSON.parse(fs.readFileSync(path, 'utf-8')); } catch {}

    const existingIndex = perf.daily.findIndex(d => d.date === dailyData.date);
    if (existingIndex >= 0) perf.daily[existingIndex] = dailyData;
    else perf.daily.push(dailyData);

    if (perf.daily.length > 90) perf.daily = perf.daily.slice(-90);

    fs.writeFileSync(path, JSON.stringify(perf, null, 2), 'utf-8');
  }

  /**
   * 计算累计收益
   */
  calculateCumulativeReturns() {
    const path = this.config.getDataPath(this.config.get('performanceFile'));
    let perf = { daily: [] };
    try { perf = JSON.parse(fs.readFileSync(path, 'utf-8')); } catch {}

    const daily = perf.daily || [];
    if (daily.length === 0) return { days: 0, totalReturn: 0, totalReturnRate: 0 };

    const first = daily[0];
    const last = daily[daily.length - 1];
    const totalReturn = (last.totalAssets || 0) - (first.totalAssets || 0);

    return {
      days: daily.length,
      startDate: first.date,
      endDate: last.date,
      totalReturn,
      totalReturnRate: first.totalAssets > 0 ? (totalReturn / first.totalAssets * 100) : 0
    };
  }

  /**
   * 检查异常波动
   */
  checkAbnormalChanges(threshold = 0.03) {
    const portfolio = this._getPortfolio();
    const alerts = [];

    (portfolio.holdings || []).forEach(h => {
      const pnlRate = h.costPrice > 0 ? ((h.currentPrice - h.costPrice) / h.costPrice) : 0;
      if (Math.abs(pnlRate) > threshold) {
        alerts.push({
          code: h.code,
          name: h.name,
          pnlRate,
          type: pnlRate > 0 ? '上涨' : '下跌',
          message: `${h.name}${pnlRate > 0 ? '上涨' : '下跌'}${(Math.abs(pnlRate) * 100).toFixed(1)}%`
        });
      }
    });

    return alerts;
  }

  // === 私有方法 ===

  _getPortfolio() {
    const path = this.config.getPortfolioPath();
    try { return JSON.parse(fs.readFileSync(path, 'utf-8')); }
    catch { return { holdings: [], cash: 0 }; }
  }

  _formatReport(date, totalAssets, totalValue, cash, totalPnL, totalPnLRate, holdings) {
    let text = `# 每日收益报告 - ${date}\n\n`;
    text += `## 账户总览\n`;
    text += `- 总资产：${totalAssets.toFixed(2)} 元\n`;
    text += `- 持仓市值：${totalValue.toFixed(2)} 元\n`;
    text += `- 可用资金：${cash.toFixed(2)} 元\n`;
    text += `- 当日盈亏：${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} 元（${totalPnLRate >= 0 ? '+' : ''}${totalPnLRate.toFixed(2)}%）\n\n`;

    if (holdings.length > 0) {
      text += `## 持仓明细\n\n`;
      text += `| 品种 | 持有份额 | 成本价 | 现价 | 盈亏 | 盈亏率 |\n`;
      text += `|------|---------|--------|------|------|--------|\n`;
      holdings.forEach(h => {
        text += `| ${h.name} | ${h.shares} | ${h.costPrice.toFixed(4)} | ${h.currentPrice.toFixed(4)} | ${h.pnl >= 0 ? '+' : ''}${h.pnl.toFixed(2)} | ${h.pnlRate >= 0 ? '+' : ''}${h.pnlRate.toFixed(2)}% |\n`;
      });
    }

    text += `\n> 股市有风险，投资需谨慎。以上分析仅供参考，不构成投资建议。\n`;
    return text;
  }

  _saveReport(report) {
    const dir = this.config.getDataPath('reports');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `report_${report.date}.json`), JSON.stringify(report, null, 2), 'utf-8');
  }
}

module.exports = ReportAgent;
