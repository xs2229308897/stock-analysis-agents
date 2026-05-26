/**
 * technical-analyzer.js - 技术面分析模块
 * 分析均线、MACD、KDJ、成交量、支撑位/压力位
 */

/**
 * 分析均线系统
 * @param {Array} klineData - K线数据
 * @returns {object} 均线分析结果
 */
function analyzeMovingAverage(klineData) {
  if (!klineData || klineData.length < 20) {
    return { trend: 'unknown', signal: 'neutral', detail: '数据不足' };
  }

  const closes = klineData.map(d => d.close || d收盘价 || 0);
  const ma5 = calcMA(closes, 5);
  const ma10 = calcMA(closes, 10);
  const ma20 = calcMA(closes, 20);

  const latest = closes[closes.length - 1];
  const latestMA5 = ma5[ma5.length - 1];
  const latestMA10 = ma10[ma10.length - 1];
  const latestMA20 = ma20[ma20.length - 1];

  let trend = 'neutral';
  let signal = 'hold';

  if (latest > latestMA5 && latestMA5 > latestMA10 && latestMA10 > latestMA20) {
    trend = 'bullish';
    signal = '多头排列，趋势向上';
  } else if (latest < latestMA5 && latestMA5 < latestMA10 && latestMA10 < latestMA20) {
    trend = 'bearish';
    signal = '空头排列，趋势向下';
  } else if (latest > latestMA20) {
    trend = 'slightly_bullish';
    signal = '站上20日均线，偏多';
  } else {
    trend = 'slightly_bearish';
    signal = '跌破20日均线，偏空';
  }

  return {
    trend,
    signal,
    values: { ma5: latestMA5, ma10: latestMA10, ma20: latestMA20, latest },
    detail: `当前价${latest}，MA5=${latestMA5.toFixed(2)}，MA10=${latestMA10.toFixed(2)}，MA20=${latestMA20.toFixed(2)}。${signal}`
  };
}

/**
 * 计算移动平均线
 */
function calcMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * 分析MACD指标
 * @param {Array} klineData - K线数据
 * @returns {object} MACD分析结果
 */
function analyzeMACD(klineData) {
  if (!klineData || klineData.length < 35) {
    return { signal: 'unknown', detail: '数据不足' };
  }

  const closes = klineData.map(d => d.close || d收盘价 || 0);
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);

  const dif = ema12.map((v, i) => v - ema26[i]);
  const dea = calcEMA(dif.filter(v => v !== null), 9);

  const latestDIF = dif[dif.length - 1];
  const latestDEA = dea[dea.length - 1];
  const macdBar = 2 * (latestDIF - latestDEA);

  let signal = 'neutral';
  if (latestDIF > latestDEA && macdBar > 0) {
    signal = 'bullish';
  } else if (latestDIF < latestDEA && macdBar < 0) {
    signal = 'bearish';
  }

  return {
    signal,
    values: { dif: latestDIF, dea: latestDEA, macd: macdBar },
    detail: `DIF=${latestDIF.toFixed(4)}，DEA=${latestDEA.toFixed(4)}，MACD=${macdBar.toFixed(4)}`
  };
}

/**
 * 计算EMA
 */
function calcEMA(data, period) {
  const result = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[j];
      }
      result.push(sum / period);
    } else {
      result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  return result;
}

/**
 * 识别支撑位和压力位
 * @param {Array} klineData - K线数据
 * @returns {object} 支撑位和压力位
 */
function findSupportResistance(klineData) {
  if (!klineData || klineData.length < 10) {
    return { supports: [], resistances: [], detail: '数据不足' };
  }

  const highs = klineData.map(d => d.high || d最高价 || 0);
  const lows = klineData.map(d => d.low || d最低价 || 0);
  const closes = klineData.map(d => d.close || d收盘价 || 0);
  const latest = closes[closes.length - 1];

  // 简单方法：用近期高点作为压力位，低点作为支撑位
  const recentHighs = highs.slice(-20).sort((a, b) => b - a);
  const recentLows = lows.slice(-20).sort((a, b) => a - b);

  const resistances = [...new Set(recentHighs.slice(0, 3))].filter(v => v > latest);
  const supports = [...new Set(recentLows.slice(0, 3))].filter(v => v < latest);

  return {
    supports: supports.slice(0, 2),
    resistances: resistances.slice(0, 2),
    currentPrice: latest,
    detail: `当前价${latest}，支撑位：${supports.slice(0, 2).join('/') }，压力位：${resistances.slice(0, 2).join('/')}`
  };
}

/**
 * 生成技术面综合摘要
 * @param {object} data - 包含K线数据的对象
 * @returns {object} 技术面分析综合结果
 */
function generateTechnicalSummary(data) {
  const klineData = data.klineData || data;

  const ma = analyzeMovingAverage(klineData);
  const macd = analyzeMACD(klineData);
  const sr = findSupportResistance(klineData);

  // 综合评分
  let score = 50;
  if (ma.trend === 'bullish') score += 15;
  else if (ma.trend === 'bearish') score -= 15;
  if (macd.signal === 'bullish') score += 15;
  else if (macd.signal === 'bearish') score -= 15;

  let conclusion = '中性';
  if (score >= 70) conclusion = '偏多';
  else if (score >= 60) conclusion = '略偏多';
  else if (score <= 30) conclusion = '偏空';
  else if (score <= 40) conclusion = '略偏空';

  return {
    score,
    conclusion,
    ma,
    macd,
    supportResistance: sr,
    summary: `技术面评分${score}/100（${conclusion}）。${ma.detail}。${macd.signal === 'bullish' ? 'MACD金叉' : macd.signal === 'bearish' ? 'MACD死叉' : 'MACD中性'}。${sr.detail}`
  };
}

module.exports = {
  analyzeMovingAverage,
  analyzeMACD,
  findSupportResistance,
  generateTechnicalSummary,
  calcMA,
  calcEMA
};
