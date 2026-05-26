/**
 * fundamental-analyzer.js - 基本面分析模块
 * 分析估值（PE/PB）、盈利能力（ROE）、成长性（净利润增速）
 */

/**
 * 分析估值水平
 * @param {object} financialData - 财务数据
 * @returns {object} 估值分析结果
 */
function analyzeValuation(financialData) {
  const pe = financialData.pe || financialData.PE || financialData.市盈率;
  const pb = financialData.pb || financialData.PB || financialData.市净率;

  let peLevel = 'unknown';
  let pbLevel = 'unknown';
  let peSignal = 'neutral';
  let pbSignal = 'neutral';

  if (pe !== undefined && pe !== null) {
    if (pe < 0) {
      peLevel = '亏损';
      peSignal = 'negative';
    } else if (pe < 15) {
      peLevel = '低估';
      peSignal = 'bullish';
    } else if (pe < 25) {
      peLevel = '合理';
      peSignal = 'neutral';
    } else if (pe < 50) {
      peLevel = '偏高';
      peSignal = 'caution';
    } else {
      peLevel = '高估';
      peSignal = 'bearish';
    }
  }

  if (pb !== undefined && pb !== null) {
    if (pb < 1) {
      pbLevel = '低估';
      pbSignal = 'bullish';
    } else if (pb < 3) {
      pbLevel = '合理';
      pbSignal = 'neutral';
    } else {
      pbLevel = '偏高';
      pbSignal = 'caution';
    }
  }

  return {
    pe, pb, peLevel, pbLevel, peSignal, pbSignal,
    detail: `PE=${pe || 'N/A'}（${peLevel}），PB=${pb || 'N/A'}（${pbLevel}）`
  };
}

/**
 * 分析盈利能力
 * @param {object} financialData - 财务数据
 * @returns {object} 盈利能力分析结果
 */
function analyzeProfitability(financialData) {
  const roe = financialData.roe || financialData.ROE || financialData.净资产收益率;
  const grossMargin = financialData.grossMargin || financialData.毛利率;
  const netMargin = financialData.netMargin || financialData.净利率;

  let roeLevel = 'unknown';
  let roeSignal = 'neutral';

  if (roe !== undefined && roe !== null) {
    if (roe > 20) {
      roeLevel = '优秀';
      roeSignal = 'bullish';
    } else if (roe > 10) {
      roeLevel = '良好';
      roeSignal = 'neutral';
    } else if (roe > 0) {
      roeLevel = '一般';
      roeSignal = 'caution';
    } else {
      roeLevel = '较差';
      roeSignal = 'bearish';
    }
  }

  return {
    roe, grossMargin, netMargin, roeLevel, roeSignal,
    detail: `ROE=${roe || 'N/A'}%（${roeLevel}），毛利率=${grossMargin || 'N/A'}%，净利率=${netMargin || 'N/A'}%`
  };
}

/**
 * 分析成长性
 * @param {object} financialData - 财务数据
 * @returns {object} 成长性分析结果
 */
function analyzeGrowth(financialData) {
  const profitGrowth = financialData.profitGrowth || financialData.净利润增速 || financialData.净利润增长率;
  const revenueGrowth = financialData.revenueGrowth || financialData.营收增速 || financialData.营业收入增长率;

  let growthLevel = 'unknown';
  let growthSignal = 'neutral';

  if (profitGrowth !== undefined && profitGrowth !== null) {
    if (profitGrowth > 30) {
      growthLevel = '高增长';
      growthSignal = 'bullish';
    } else if (profitGrowth > 10) {
      growthLevel = '稳定增长';
      growthSignal = 'neutral';
    } else if (profitGrowth > 0) {
      growthLevel = '低增长';
      growthSignal = 'caution';
    } else {
      growthLevel = '负增长';
      growthSignal = 'bearish';
    }
  }

  return {
    profitGrowth, revenueGrowth, growthLevel, growthSignal,
    detail: `净利润增速=${profitGrowth || 'N/A'}%（${growthLevel}），营收增速=${revenueGrowth || 'N/A'}%`
  };
}

/**
 * 生成基本面综合摘要
 * @param {object} financialData - 财务数据
 * @returns {object} 基本面分析综合结果
 */
function generateFundamentalSummary(financialData) {
  const valuation = analyzeValuation(financialData);
  const profitability = analyzeProfitability(financialData);
  const growth = analyzeGrowth(financialData);

  // 综合评分
  let score = 50;

  // 估值评分
  if (valuation.peSignal === 'bullish') score += 10;
  else if (valuation.peSignal === 'bearish') score -= 10;
  if (valuation.pbSignal === 'bullish') score += 5;
  else if (valuation.pbSignal === 'bearish') score -= 5;

  // 盈利评分
  if (profitability.roeSignal === 'bullish') score += 15;
  else if (profitability.roeSignal === 'bearish') score -= 10;

  // 成长评分
  if (growth.growthSignal === 'bullish') score += 15;
  else if (growth.growthSignal === 'bearish') score -= 10;

  score = Math.max(0, Math.min(100, score));

  let conclusion = '中性';
  if (score >= 75) conclusion = '优秀';
  else if (score >= 60) conclusion = '良好';
  else if (score >= 45) conclusion = '一般';
  else conclusion = '较差';

  return {
    score,
    conclusion,
    valuation,
    profitability,
    growth,
    summary: `基本面评分${score}/100（${conclusion}）。${valuation.detail}。${profitability.detail}。${growth.detail}`
  };
}

module.exports = {
  analyzeValuation,
  analyzeProfitability,
  analyzeGrowth,
  generateFundamentalSummary
};
