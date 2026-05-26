/**
 * risk-assessor.js - 风险评估模块
 * 评估投资风险、生成风险预警
 */

/**
 * 评估单一品种风险
 * @param {object} holding - 持仓品种
 * @param {object} marketData - 市场数据
 * @returns {object} 风险评估结果
 */
function assessSingleRisk(holding, marketData = {}) {
  const warnings = [];
  let riskScore = 0;

  // 亏损检查
  const pnlRate = holding.costPrice > 0
    ? (holding.currentPrice - holding.costPrice) / holding.costPrice
    : 0;

  if (pnlRate < -0.1) {
    warnings.push({ level: 'high', message: `亏损${(pnlRate * 100).toFixed(1)}%，超过10%止损线` });
    riskScore += 40;
  } else if (pnlRate < -0.05) {
    warnings.push({ level: 'medium', message: `亏损${(pnlRate * 100).toFixed(1)}%，接近止损线` });
    riskScore += 20;
  }

  // 波动率检查
  if (marketData.volatility && marketData.volatility > 0.03) {
    warnings.push({ level: 'medium', message: '近期波动率较高' });
    riskScore += 15;
  }

  // 估值检查
  if (marketData.pe && marketData.pe > 100) {
    warnings.push({ level: 'medium', message: '估值偏高，PE超过100' });
    riskScore += 15;
  }

  let riskLevel = 'low';
  if (riskScore >= 40) riskLevel = 'high';
  else if (riskScore >= 20) riskLevel = 'medium';

  return {
    code: holding.code,
    name: holding.name,
    riskLevel,
    riskScore,
    warnings,
    pnlRate
  };
}

/**
 * 评估整体持仓风险
 * @param {object} portfolio - 持仓数据
 * @returns {object} 整体风险评估
 */
function assessOverallRisk(portfolio) {
  const holdings = portfolio.holdings || [];
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  const totalAssets = totalValue + (portfolio.cash || 0);

  const warnings = [];
  let overallRisk = 'low';

  // 1. 集中度风险
  const maxWeight = holdings.reduce((max, h) => {
    const weight = totalValue > 0 ? (h.shares * h.currentPrice / totalValue) : 0;
    return Math.max(max, weight);
  }, 0);

  if (maxWeight > 0.5) {
    warnings.push({ level: 'high', message: `单一品种仓位超过50%，集中度过高` });
    overallRisk = 'high';
  } else if (maxWeight > 0.3) {
    warnings.push({ level: 'medium', message: `单一品种仓位超过30%，建议分散` });
    if (overallRisk !== 'high') overallRisk = 'medium';
  }

  // 2. 现金比例风险
  const cashRatio = totalAssets > 0 ? portfolio.cash / totalAssets : 0;
  if (cashRatio < 0.05) {
    warnings.push({ level: 'medium', message: '现金比例低于5%，流动性风险' });
    if (overallRisk !== 'high') overallRisk = 'medium';
  }

  // 3. 品种数量风险
  if (holdings.length === 1) {
    warnings.push({ level: 'low', message: '仅持有1只品种，建议分散投资' });
  }

  // 4. 行业集中度（简单检查）
  const types = {};
  holdings.forEach(h => {
    const type = h.type || 'unknown';
    types[type] = (types[type] || 0) + h.shares * h.currentPrice;
  });

  return {
    overallRisk,
    totalAssets,
    totalValue,
    cash: portfolio.cash,
    cashRatio,
    holdingCount: holdings.length,
    maxWeight,
    warnings,
    detail: `整体风险：${overallRisk === 'high' ? '高' : overallRisk === 'medium' ? '中' : '低'}，总资产${totalAssets.toFixed(2)}，持仓${holdings.length}只，最大仓位${(maxWeight * 100).toFixed(1)}%`
  };
}

/**
 * 生成止损止盈提醒
 * @param {object} portfolio - 持仓数据
 * @param {object} thresholds - 阈值设置
 * @returns {object} 提醒列表
 */
function generateAlerts(portfolio, thresholds = {}) {
  const { stopLoss = -0.08, takeProfit = 0.2 } = thresholds;
  const alerts = [];

  (portfolio.holdings || []).forEach(h => {
    const pnlRate = h.costPrice > 0
      ? (h.currentPrice - h.costPrice) / h.costPrice
      : 0;

    if (pnlRate <= stopLoss) {
      alerts.push({
        type: 'stop_loss',
        level: 'high',
        code: h.code,
        name: h.name,
        pnlRate,
        message: `${h.name}亏损${(pnlRate * 100).toFixed(1)}%，触发止损线（${(stopLoss * 100).toFixed(0)}%）`
      });
    } else if (pnlRate >= takeProfit) {
      alerts.push({
        type: 'take_profit',
        level: 'info',
        code: h.code,
        name: h.name,
        pnlRate,
        message: `${h.name}盈利${(pnlRate * 100).toFixed(1)}%，达到止盈线（${(takeProfit * 100).toFixed(0)}%）`
      });
    }
  });

  return { alerts, hasAlerts: alerts.length > 0 };
}

module.exports = {
  assessSingleRisk,
  assessOverallRisk,
  generateAlerts
};
