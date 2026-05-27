/**
 * advisor.js - 投资建议Agent
 * 持仓管理、策略制定、风险评估
 */

const fs = require('fs');

class AdvisorAgent {
  constructor(config) {
    this.config = config;
  }

  /**
   * 获取当前持仓
   */
  getPortfolio() {
    const path = this.config.getPortfolioPath();
    try {
      const data = fs.readFileSync(path, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { lastUpdated: new Date().toISOString().split('T')[0], holdings: [], cash: 0 };
    }
  }

  /**
   * 保存持仓
   */
  savePortfolio(portfolio) {
    portfolio.lastUpdated = new Date().toISOString().split('T')[0];
    const path = this.config.getPortfolioPath();
    fs.writeFileSync(path, JSON.stringify(portfolio, null, 2), 'utf-8');
  }

  /**
   * 记录交易
   */
  recordTransaction(transaction) {
    const path = this.config.getTransactionsPath();
    let txData = { transactions: [] };
    try {
      txData = JSON.parse(fs.readFileSync(path, 'utf-8'));
    } catch {}

    transaction.id = `tx_${Date.now()}`;
    transaction.timestamp = new Date().toISOString();
    txData.transactions.push(transaction);
    fs.writeFileSync(path, JSON.stringify(txData, null, 2), 'utf-8');
  }

  /**
   * 解析持仓操作指令
   */
  parseOperation(instruction) {
    const text = instruction.toLowerCase();

    const buyMatch = text.match(/买入\s*(\d+)\s*(?:股|份|手)?\s*(.+?)(?:\s|$|，|,)/);
    if (buyMatch) return { action: 'buy', quantity: parseInt(buyMatch[1]), target: buyMatch[2].trim() };

    const sellMatch = text.match(/卖出\s*(\d+)\s*(?:股|份|手)?\s*(.+?)(?:\s|$|，|,)/);
    if (sellMatch) return { action: 'sell', quantity: parseInt(sellMatch[1]), target: sellMatch[2].trim() };

    if (text.includes('持仓') || text.includes('仓位')) return { action: 'query' };

    return { action: 'unknown' };
  }

  /**
   * 执行买入
   */
  executeBuy(code, name, shares, price, type = 'fund') {
    const portfolio = this.getPortfolio();
    const existing = portfolio.holdings.find(h => h.code === code);

    if (existing) {
      const totalCost = existing.shares * existing.costPrice + shares * price;
      existing.shares += shares;
      existing.costPrice = totalCost / existing.shares;
    } else {
      portfolio.holdings.push({ code, name, type, shares, costPrice: price, currentPrice: price });
    }

    portfolio.cash -= shares * price;
    this.savePortfolio(portfolio);
    this.recordTransaction({ action: 'buy', code, name, shares, price, amount: shares * price });

    return { success: true, message: `买入${name} ${shares}份，价格${price}` };
  }

  /**
   * 执行卖出
   */
  executeSell(code, shares, price) {
    const portfolio = this.getPortfolio();
    const existing = portfolio.holdings.find(h => h.code === code);

    if (!existing) return { success: false, message: `未找到持仓${code}` };
    if (existing.shares < shares) return { success: false, message: `持仓不足，当前持有${existing.shares}份` };

    existing.shares -= shares;
    portfolio.cash += shares * price;
    if (existing.shares === 0) portfolio.holdings = portfolio.holdings.filter(h => h.code !== code);

    this.savePortfolio(portfolio);
    this.recordTransaction({ action: 'sell', code, name: existing.name, shares, price, amount: shares * price });

    return { success: true, message: `卖出${existing.name} ${shares}份，价格${price}` };
  }

  /**
   * 计算收益
   */
  calculateReturns() {
    const portfolio = this.getPortfolio();
    let totalCost = 0, totalValue = 0;

    const details = portfolio.holdings.map(h => {
      const cost = h.shares * h.costPrice;
      const value = h.shares * h.currentPrice;
      const pnl = value - cost;
      totalCost += cost;
      totalValue += value;
      return { ...h, cost, value, pnl, pnlRate: cost > 0 ? (pnl / cost * 100) : 0 };
    });

    return {
      totalCost, totalValue,
      totalPnL: totalValue - totalCost,
      totalPnLRate: totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0,
      cash: portfolio.cash,
      totalAssets: totalValue + portfolio.cash,
      holdings: details
    };
  }

  /**
   * 生成投资建议
   */
  generateAdvice(analysis) {
    const { technical, fundamental, sentiment } = analysis;
    const techScore = technical?.score || 50;
    const fundScore = fundamental?.score || 50;
    const sentScore = sentiment?.score || 50;
    const totalScore = techScore * 0.35 + fundScore * 0.35 + sentScore * 0.3;

    let action = 'hold';
    if (totalScore >= 70) action = 'buy';
    else if (totalScore <= 30) action = 'avoid';
    else if (totalScore <= 40) action = 'reduce';

    return {
      action,
      score: Math.round(totalScore),
      detail: `综合评分${Math.round(totalScore)}/100，建议：${action === 'buy' ? '买入' : action === 'avoid' ? '回避' : action === 'reduce' ? '减仓' : '持有'}`
    };
  }

  /**
   * 评估风险
   */
  assessRisk() {
    const portfolio = this.getPortfolio();
    const holdings = portfolio.holdings || [];
    const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
    const warnings = [];
    let riskLevel = 'low';

    holdings.forEach(h => {
      const weight = totalValue > 0 ? (h.shares * h.currentPrice / totalValue) : 0;
      if (weight > 0.3) {
        warnings.push(`${h.name}仓位过重（${(weight * 100).toFixed(1)}%）`);
        riskLevel = 'medium';
      }

      const pnlRate = h.costPrice > 0 ? ((h.currentPrice - h.costPrice) / h.costPrice) : 0;
      if (pnlRate < this.config.get('risk.stopLoss')) {
        warnings.push(`${h.name}亏损${(pnlRate * 100).toFixed(1)}%，触发止损线`);
        riskLevel = 'high';
      }
    });

    return { riskLevel, warnings, holdingCount: holdings.length, totalValue };
  }
}

module.exports = AdvisorAgent;
