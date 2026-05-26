/**
 * strategy-engine.js - 策略引擎模块
 * 基于分析结果生成投资策略和操作建议
 */

/**
 * 生成板块投资建议
 * @param {object} analysis - 板块分析结果
 * @returns {object} 投资建议
 */
function generateSectorAdvice(analysis) {
  const { technical, fundamental, sentiment } = analysis;

  const techScore = technical?.score || 50;
  const fundScore = fundamental?.score || 50;
  const sentScore = sentiment?.score || 50;

  // 加权综合评分
  const totalScore = techScore * 0.35 + fundScore * 0.35 + sentScore * 0.3;

  let action = 'hold';
  let confidence = 'medium';
  let reasoning = [];

  if (totalScore >= 70) {
    action = 'buy';
    confidence = 'high';
    reasoning.push('综合评分较高，板块基本面和技术面均向好');
  } else if (totalScore >= 60) {
    action = 'buy';
    confidence = 'medium';
    reasoning.push('综合评分偏高，可适当关注');
  } else if (totalScore <= 30) {
    action = 'avoid';
    confidence = 'high';
    reasoning.push('综合评分较低，建议回避');
  } else if (totalScore <= 40) {
    action = 'reduce';
    confidence = 'medium';
    reasoning.push('综合评分偏低，建议减仓观望');
  } else {
    action = 'hold';
    reasoning.push('综合评分中性，建议持有观望');
  }

  if (techScore < 40) reasoning.push('技术面偏弱，注意趋势风险');
  if (sentScore < 40) reasoning.push('资金面偏弱，注意资金流出');

  return {
    action,
    confidence,
    score: Math.round(totalScore),
    reasoning,
    detail: `综合评分${Math.round(totalScore)}/100，建议：${action === 'buy' ? '买入/加仓' : action === 'avoid' ? '回避' : action === 'reduce' ? '减仓' : '持有'}`
  };
}

/**
 * 生成个股投资建议
 * @param {object} analysis - 个股分析结果
 * @returns {object} 投资建议
 */
function generateStockAdvice(analysis) {
  const { technical, fundamental, sentiment } = analysis;

  const techScore = technical?.score || 50;
  const fundScore = fundamental?.score || 50;
  const sentScore = sentiment?.score || 50;

  const totalScore = techScore * 0.3 + fundScore * 0.4 + sentScore * 0.3;

  let action = 'hold';
  let position = 'medium';
  let reasoning = [];

  if (totalScore >= 75) {
    action = 'strong_buy';
    position = 'large';
    reasoning.push('四维指标均优秀，强烈推荐');
  } else if (totalScore >= 65) {
    action = 'buy';
    position = 'medium';
    reasoning.push('综合指标良好，建议买入');
  } else if (totalScore >= 50) {
    action = 'hold';
    position = 'small';
    reasoning.push('综合指标中性，建议持有');
  } else if (totalScore >= 35) {
    action = 'reduce';
    position = 'small';
    reasoning.push('综合指标偏弱，建议减仓');
  } else {
    action = 'sell';
    position = 'none';
    reasoning.push('综合指标较差，建议卖出');
  }

  // 添加具体理由
  if (fundScore >= 70) reasoning.push('基本面优秀，估值合理');
  if (techScore >= 70) reasoning.push('技术面强势，趋势向上');
  if (sentScore >= 70) reasoning.push('资金面积极，主力流入');

  return {
    action,
    position,
    score: Math.round(totalScore),
    reasoning,
    detail: `综合评分${Math.round(totalScore)}/100，建议：${getActionText(action)}`
  };
}

/**
 * 评估持仓风险
 * @param {object} portfolio - 持仓数据
 * @returns {object} 风险评估
 */
function assessPortfolioRisk(portfolio) {
  const holdings = portfolio.holdings || [];
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);

  let riskLevel = 'low';
  let warnings = [];

  // 检查集中度风险
  holdings.forEach(h => {
    const weight = totalValue > 0 ? (h.shares * h.currentPrice / totalValue) : 0;
    if (weight > 0.3) {
      warnings.push(`${h.name}仓位过重（${(weight * 100).toFixed(1)}%），建议分散投资`);
      riskLevel = 'medium';
    }
  });

  // 检查单品种亏损
  holdings.forEach(h => {
    const pnlRate = h.costPrice > 0 ? ((h.currentPrice - h.costPrice) / h.costPrice) : 0;
    if (pnlRate < -0.08) {
      warnings.push(`${h.name}亏损${(pnlRate * 100).toFixed(1)}%，已触发止损线`);
      riskLevel = 'high';
    }
  });

  // 检查现金比例
  const cashRatio = (portfolio.cash + totalValue) > 0 ? portfolio.cash / (portfolio.cash + totalValue) : 0;
  if (cashRatio < 0.1) {
    warnings.push('现金比例过低，建议保留10%以上现金');
  }

  return {
    riskLevel,
    warnings,
    cashRatio,
    holdingCount: holdings.length,
    totalValue,
    detail: `风险等级：${riskLevel === 'high' ? '高' : riskLevel === 'medium' ? '中' : '低'}，持仓${holdings.length}只，现金比例${(cashRatio * 100).toFixed(1)}%`
  };
}

function getActionText(action) {
  const map = {
    'strong_buy': '强烈买入',
    'buy': '买入/加仓',
    'hold': '持有观望',
    'reduce': '减仓',
    'sell': '卖出清仓',
    'avoid': '回避'
  };
  return map[action] || action;
}

module.exports = {
  generateSectorAdvice,
  generateStockAdvice,
  assessPortfolioRisk,
  getActionText
};
