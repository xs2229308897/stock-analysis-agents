/**
 * analyst.js - 信息分析Agent
 * 技术面、基本面、情绪面分析
 */

class AnalystAgent {
  constructor(config) {
    this.config = config;
  }

  /**
   * 计算移动平均线
   */
  calcMA(data, period) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[i - j];
        result.push(sum / period);
      }
    }
    return result;
  }

  /**
   * 计算EMA
   */
  calcEMA(data, period) {
    const result = [];
    const multiplier = 2 / (period + 1);
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else if (i === period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[j];
        result.push(sum / period);
      } else {
        result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
      }
    }
    return result;
  }

  /**
   * 分析均线系统
   */
  analyzeMovingAverage(klineData) {
    if (!klineData || klineData.length < 20) {
      return { trend: 'unknown', signal: 'neutral', detail: '数据不足' };
    }

    const closes = klineData.map(d => d.close || 0);
    const ma5 = this.calcMA(closes, 5);
    const ma10 = this.calcMA(closes, 10);
    const ma20 = this.calcMA(closes, 20);

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
    }

    return {
      trend, signal,
      values: { ma5: latestMA5, ma10: latestMA10, ma20: latestMA20, latest },
      detail: `当前价${latest}，MA5=${latestMA5?.toFixed(2)}，MA10=${latestMA10?.toFixed(2)}，MA20=${latestMA20?.toFixed(2)}。${signal}`
    };
  }

  /**
   * 分析MACD
   */
  analyzeMACD(klineData) {
    if (!klineData || klineData.length < 35) {
      return { signal: 'unknown', detail: '数据不足' };
    }

    const closes = klineData.map(d => d.close || 0);
    const ema12 = this.calcEMA(closes, 12);
    const ema26 = this.calcEMA(closes, 26);

    const dif = ema12.map((v, i) => v - ema26[i]);
    const dea = this.calcEMA(dif.filter(v => v !== null), 9);

    const latestDIF = dif[dif.length - 1];
    const latestDEA = dea[dea.length - 1];
    const macdBar = 2 * (latestDIF - latestDEA);

    let signal = 'neutral';
    if (latestDIF > latestDEA && macdBar > 0) signal = 'bullish';
    else if (latestDIF < latestDEA && macdBar < 0) signal = 'bearish';

    return {
      signal,
      values: { dif: latestDIF, dea: latestDEA, macd: macdBar },
      detail: `DIF=${latestDIF?.toFixed(4)}，DEA=${latestDEA?.toFixed(4)}，MACD=${macdBar?.toFixed(4)}`
    };
  }

  /**
   * 分析估值
   */
  analyzeValuation(financialData) {
    const pe = financialData.pe || financialData.PE;
    const pb = financialData.pb || financialData.PB;

    let peLevel = 'unknown';
    if (pe !== undefined) {
      if (pe < 0) peLevel = '亏损';
      else if (pe < 15) peLevel = '低估';
      else if (pe < 25) peLevel = '合理';
      else if (pe < 50) peLevel = '偏高';
      else peLevel = '高估';
    }

    return { pe, pb, peLevel, detail: `PE=${pe || 'N/A'}（${peLevel}），PB=${pb || 'N/A'}` };
  }

  /**
   * 分析盈利能力
   */
  analyzeProfitability(financialData) {
    const roe = financialData.roe || financialData.ROE;

    let roeLevel = 'unknown';
    if (roe !== undefined) {
      if (roe > 20) roeLevel = '优秀';
      else if (roe > 10) roeLevel = '良好';
      else if (roe > 0) roeLevel = '一般';
      else roeLevel = '较差';
    }

    return { roe, roeLevel, detail: `ROE=${roe || 'N/A'}%（${roeLevel}）` };
  }

  /**
   * 生成技术面摘要
   */
  generateTechnicalSummary(klineData) {
    const ma = this.analyzeMovingAverage(klineData);
    const macd = this.analyzeMACD(klineData);

    let score = 50;
    if (ma.trend === 'bullish') score += 15;
    else if (ma.trend === 'bearish') score -= 15;
    if (macd.signal === 'bullish') score += 15;
    else if (macd.signal === 'bearish') score -= 15;

    let conclusion = '中性';
    if (score >= 70) conclusion = '偏多';
    else if (score <= 30) conclusion = '偏空';

    return { score, conclusion, ma, macd, summary: `技术面评分${score}/100（${conclusion}）` };
  }

  /**
   * 生成基本面摘要
   */
  generateFundamentalSummary(financialData) {
    const valuation = this.analyzeValuation(financialData);
    const profitability = this.analyzeProfitability(financialData);

    let score = 50;
    if (valuation.peLevel === '低估') score += 10;
    else if (valuation.peLevel === '高估') score -= 10;
    if (profitability.roeLevel === '优秀') score += 15;
    else if (profitability.roeLevel === '较差') score -= 10;

    return { score, conclusion: score >= 60 ? '良好' : score <= 40 ? '较差' : '中性', valuation, profitability };
  }
}

module.exports = AnalystAgent;
