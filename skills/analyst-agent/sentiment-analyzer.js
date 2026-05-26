/**
 * sentiment-analyzer.js - 情绪面分析模块
 * 分析资金流向、北向资金、市场情绪
 */

/**
 * 分析资金流向
 * @param {object} flowData - 资金流向数据
 * @returns {object} 资金流向分析结果
 */
function analyzeCapitalFlow(flowData) {
  if (!flowData) {
    return { signal: 'unknown', detail: '无资金流向数据' };
  }

  const mainInflow = flowData.mainInflow || flowData.主力净流入 || 0;
  const retailInflow = flowData.retailInflow || flowData.散户净流入 || 0;

  let signal = 'neutral';
  let detail = '';

  if (mainInflow > 0 && mainInflow > Math.abs(retailInflow)) {
    signal = 'bullish';
    detail = `主力净流入${formatAmount(mainInflow)}，资金面偏多`;
  } else if (mainInflow < 0 && Math.abs(mainInflow) > Math.abs(retailInflow)) {
    signal = 'bearish';
    detail = `主力净流出${formatAmount(Math.abs(mainInflow))}，资金面偏空`;
  } else {
    signal = 'neutral';
    detail = '资金流向不明显';
  }

  return {
    signal,
    mainInflow,
    retailInflow,
    detail
  };
}

/**
 * 分析成交量
 * @param {Array} volumeData - 成交量数据
 * @param {number} avgDays - 计算平均成交量的天数
 * @returns {object} 成交量分析结果
 */
function analyzeVolume(volumeData, avgDays = 20) {
  if (!volumeData || volumeData.length < 5) {
    return { signal: 'unknown', detail: '数据不足' };
  }

  const volumes = volumeData.map(d => d.volume || d成交量 || 0);
  const latest = volumes[volumes.length - 1];
  const avgVolume = volumes.slice(-avgDays).reduce((a, b) => a + b, 0) / Math.min(volumes.length, avgDays);

  const ratio = latest / avgVolume;

  let signal = 'neutral';
  let detail = '';

  if (ratio > 2) {
    signal = 'high_volume';
    detail = `成交量为近${avgDays}日均量的${ratio.toFixed(2)}倍，放量明显`;
  } else if (ratio > 1.3) {
    signal = 'above_average';
    detail = `成交量高于近${avgDays}日均量，温和放量`;
  } else if (ratio < 0.5) {
    signal = 'low_volume';
    detail = `成交量仅为近${avgDays}日均量的${ratio.toFixed(2)}倍，缩量明显`;
  } else if (ratio < 0.7) {
    signal = 'below_average';
    detail = `成交量低于近${avgDays}日均量，温和缩量`;
  } else {
    signal = 'normal';
    detail = '成交量正常';
  }

  return {
    signal,
    latest,
    average: avgVolume,
    ratio,
    detail
  };
}

/**
 * 分析北向资金
 * @param {object} northboundData - 北向资金数据
 * @returns {object} 北向资金分析结果
 */
function analyzeNorthbound(northboundData) {
  if (!northboundData) {
    return { signal: 'unknown', detail: '无北向资金数据' };
  }

  const netBuy = northboundData.netBuy || northboundData.净买入 || 0;

  let signal = 'neutral';
  let detail = '';

  if (netBuy > 50) {
    signal = 'bullish';
    detail = `北向资金净买入${netBuy}亿，外资积极看多`;
  } else if (netBuy > 0) {
    signal = 'slightly_bullish';
    detail = `北向资金净买入${netBuy}亿，外资小幅流入`;
  } else if (netBuy < -50) {
    signal = 'bearish';
    detail = `北向资金净卖出${Math.abs(netBuy)}亿，外资大幅流出`;
  } else if (netBuy < 0) {
    signal = 'slightly_bearish';
    detail = `北向资金净卖出${Math.abs(netBuy)}亿，外资小幅流出`;
  } else {
    signal = 'neutral';
    detail = '北向资金持平';
  }

  return {
    signal,
    netBuy,
    detail
  };
}

/**
 * 生成情绪面综合摘要
 * @param {object} data - 包含资金流向、成交量、北向资金等数据
 * @returns {object} 情绪面分析综合结果
 */
function generateSentimentSummary(data) {
  const capitalFlow = analyzeCapitalFlow(data.capitalFlow || data);
  const volume = analyzeVolume(data.volumeData || data.klineData || []);
  const northbound = analyzeNorthbound(data.northbound);

  let score = 50;

  if (capitalFlow.signal === 'bullish') score += 15;
  else if (capitalFlow.signal === 'bearish') score -= 15;

  if (volume.signal === 'high_volume' || volume.signal === 'above_average') score += 10;
  else if (volume.signal === 'low_volume' || volume.signal === 'below_average') score -= 5;

  if (northbound.signal === 'bullish') score += 15;
  else if (northbound.signal === 'slightly_bullish') score += 5;
  else if (northbound.signal === 'bearish') score -= 15;
  else if (northbound.signal === 'slightly_bearish') score -= 5;

  score = Math.max(0, Math.min(100, score));

  let conclusion = '中性';
  if (score >= 70) conclusion = '乐观';
  else if (score >= 60) conclusion = '偏乐观';
  else if (score <= 30) conclusion = '悲观';
  else if (score <= 40) conclusion = '偏悲观';

  return {
    score,
    conclusion,
    capitalFlow,
    volume,
    northbound,
    summary: `情绪面评分${score}/100（${conclusion}）。${capitalFlow.detail}。${volume.detail}。${northbound.detail}`
  };
}

/**
 * 格式化金额
 */
function formatAmount(amount) {
  if (Math.abs(amount) >= 100000000) {
    return (amount / 100000000).toFixed(2) + '亿';
  } else if (Math.abs(amount) >= 10000) {
    return (amount / 10000).toFixed(2) + '万';
  }
  return amount.toFixed(2);
}

module.exports = {
  analyzeCapitalFlow,
  analyzeVolume,
  analyzeNorthbound,
  generateSentimentSummary
};
