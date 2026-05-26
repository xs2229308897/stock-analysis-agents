/**
 * portfolio-manager.js - 持仓管理模块
 * 管理持仓数据、解析自然语言操作、记录交易历史
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PORTFOLIO_PATH = path.join(DATA_DIR, 'portfolio.json');
const TRANSACTIONS_PATH = path.join(DATA_DIR, 'transactions.json');

/**
 * 获取当前持仓
 * @returns {object} 持仓数据
 */
function getPortfolio() {
  try {
    const data = fs.readFileSync(PORTFOLIO_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { lastUpdated: new Date().toISOString().split('T')[0], holdings: [], cash: 0 };
  }
}

/**
 * 保存持仓数据
 * @param {object} portfolio - 持仓数据
 */
function savePortfolio(portfolio) {
  portfolio.lastUpdated = new Date().toISOString().split('T')[0];
  fs.writeFileSync(PORTFOLIO_PATH, JSON.stringify(portfolio, null, 2), 'utf-8');
}

/**
 * 获取交易历史
 * @returns {object} 交易历史
 */
function getTransactions() {
  try {
    const data = fs.readFileSync(TRANSACTIONS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { transactions: [] };
  }
}

/**
 * 记录交易
 * @param {object} transaction - 交易记录
 */
function recordTransaction(transaction) {
  const txData = getTransactions();
  transaction.id = `tx_${Date.now()}`;
  transaction.timestamp = new Date().toISOString();
  txData.transactions.push(transaction);
  fs.writeFileSync(TRANSACTIONS_PATH, JSON.stringify(txData, null, 2), 'utf-8');
}

/**
 * 解析自然语言操作指令
 * @param {string} instruction - 自然语言指令
 * @returns {object} 解析结果
 */
function parsePortfolioOperation(instruction) {
  const text = instruction.toLowerCase();

  // 买入模式
  const buyMatch = text.match(/买入\s*(\d+)\s*(?:股|份|手)?\s*(.+?)(?:\s|$|，|,)/);
  if (buyMatch) {
    return {
      action: 'buy',
      quantity: parseInt(buyMatch[1]),
      target: buyMatch[2].trim(),
      raw: instruction
    };
  }

  // 卖出模式
  const sellMatch = text.match(/卖出\s*(\d+)\s*(?:股|份|手)?\s*(.+?)(?:\s|$|，|,)/);
  if (sellMatch) {
    return {
      action: 'sell',
      quantity: parseInt(sellMatch[1]),
      target: sellMatch[2].trim(),
      raw: instruction
    };
  }

  // 加仓模式
  const addMatch = text.match(/加仓\s*(.+?)(?:\s|$|，|,)/);
  if (addMatch) {
    return {
      action: 'add',
      target: addMatch[1].trim(),
      raw: instruction
    };
  }

  // 减仓模式
  const reduceMatch = text.match(/减仓\s*(.+?)(?:\s|$|，|,)/);
  if (reduceMatch) {
    return {
      action: 'reduce',
      target: reduceMatch[1].trim(),
      raw: instruction
    };
  }

  // 查询持仓
  if (text.includes('持仓') || text.includes('仓位')) {
    return { action: 'query', raw: instruction };
  }

  return { action: 'unknown', raw: instruction };
}

/**
 * 执行买入操作
 * @param {string} code - 代码
 * @param {string} name - 名称
 * @param {number} shares - 份额
 * @param {number} price - 价格
 * @param {string} type - 类型（stock/fund）
 */
function executeBuy(code, name, shares, price, type = 'fund') {
  const portfolio = getPortfolio();

  // 查找是否已有持仓
  const existing = portfolio.holdings.find(h => h.code === code);
  if (existing) {
    // 计算新的平均成本
    const totalCost = existing.shares * existing.costPrice + shares * price;
    existing.shares += shares;
    existing.costPrice = totalCost / existing.shares;
  } else {
    portfolio.holdings.push({
      code, name, type, shares, costPrice: price, currentPrice: price
    });
  }

  // 扣除现金
  portfolio.cash -= shares * price;

  savePortfolio(portfolio);
  recordTransaction({
    action: 'buy', code, name, shares, price, amount: shares * price
  });

  return { success: true, message: `买入${name} ${shares}份，价格${price}` };
}

/**
 * 执行卖出操作
 * @param {string} code - 代码
 * @param {number} shares - 份额
 * @param {number} price - 价格
 */
function executeSell(code, shares, price) {
  const portfolio = getPortfolio();
  const existing = portfolio.holdings.find(h => h.code === code);

  if (!existing) {
    return { success: false, message: `未找到持仓${code}` };
  }

  if (existing.shares < shares) {
    return { success: false, message: `持仓不足，当前持有${existing.shares}份` };
  }

  existing.shares -= shares;
  portfolio.cash += shares * price;

  // 如果持仓为0，移除
  if (existing.shares === 0) {
    portfolio.holdings = portfolio.holdings.filter(h => h.code !== code);
  }

  savePortfolio(portfolio);
  recordTransaction({
    action: 'sell', code, name: existing.name, shares, price, amount: shares * price
  });

  return { success: true, message: `卖出${existing.name} ${shares}份，价格${price}` };
}

/**
 * 计算持仓收益
 * @returns {object} 收益数据
 */
function calculateReturns() {
  const portfolio = getPortfolio();
  let totalCost = 0;
  let totalValue = 0;

  const details = portfolio.holdings.map(h => {
    const cost = h.shares * h.costPrice;
    const value = h.shares * h.currentPrice;
    const pnl = value - cost;
    const pnlRate = cost > 0 ? (pnl / cost * 100) : 0;

    totalCost += cost;
    totalValue += value;

    return {
      code: h.code,
      name: h.name,
      shares: h.shares,
      costPrice: h.costPrice,
      currentPrice: h.currentPrice,
      cost,
      value,
      pnl,
      pnlRate
    };
  });

  return {
    totalCost,
    totalValue,
    totalPnL: totalValue - totalCost,
    totalPnLRate: totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0,
    cash: portfolio.cash,
    totalAssets: totalValue + portfolio.cash,
    holdings: details
  };
}

module.exports = {
  getPortfolio,
  savePortfolio,
  getTransactions,
  recordTransaction,
  parsePortfolioOperation,
  executeBuy,
  executeSell,
  calculateReturns
};
