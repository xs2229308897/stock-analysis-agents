/**
 * collector.js - 信息收集Agent
 * 收集行情、新闻、财务数据
 */

const { execSync } = require('child_process');

class CollectorAgent {
  constructor(config) {
    this.config = config;
    this._ifindCall = null;
  }

  /**
   * 获取iFinD调用函数
   */
  _getIFinD() {
    if (this._ifindCall) return this._ifindCall;
    const scriptPath = this.config.getIFinDScriptPath();
    if (scriptPath) {
      try {
        this._ifindCall = require(scriptPath).call;
      } catch (e) {}
    }
    return this._ifindCall;
  }

  /**
   * 获取大盘指数
   */
  getMarketIndices() {
    const scriptPath = this.config.getRealtimeScriptPath();
    if (!scriptPath) return { ok: false, error: '实时行情脚本未找到' };

    try {
      const result = execSync(`node "${scriptPath}" --json`, {
        encoding: 'utf-8',
        timeout: 10000
      });
      return { ok: true, data: JSON.parse(result) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  /**
   * 获取个股行情
   * @param {string[]} codes - 股票代码数组
   */
  getStockQuotes(codes) {
    const scriptPath = this.config.getRealtimeScriptPath();
    if (!scriptPath) return { ok: false, error: '实时行情脚本未找到' };

    try {
      const codeStr = codes.join(',');
      const result = execSync(`node "${scriptPath}" ${codeStr} --json`, {
        encoding: 'utf-8',
        timeout: 10000
      });
      return { ok: true, data: JSON.parse(result) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  /**
   * 获取板块ETF行情
   */
  getBoardETF() {
    const scriptPath = this.config.getRealtimeScriptPath();
    if (!scriptPath) return { ok: false, error: '实时行情脚本未找到' };

    try {
      const result = execSync(`node "${scriptPath}" --board --json`, {
        encoding: 'utf-8',
        timeout: 10000
      });
      return { ok: true, data: JSON.parse(result) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  /**
   * 获取大盘总览
   */
  async getMarketOverview() {
    const indices = this.getMarketIndices();
    let sectorRanking = { ok: false };

    const callIFinD = this._getIFinD();
    if (callIFinD) {
      try {
        sectorRanking = await callIFinD('index', 'sector_data', {
          query: '申万一级行业板块今日涨跌幅'
        });
      } catch (e) {}
    }

    return {
      timestamp: new Date().toISOString(),
      indices: indices.ok ? indices.data : null,
      sectorRanking: sectorRanking.ok ? sectorRanking.data : null
    };
  }

  /**
   * 搜索新闻
   */
  async searchNews(query, timeStart, timeEnd, size = 5) {
    const callIFinD = this._getIFinD();
    if (!callIFinD) return { ok: false, error: 'iFinD未配置' };

    try {
      return await callIFinD('news', 'search_news', {
        query, time_start: timeStart, time_end: timeEnd, size
      });
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  /**
   * 获取个股财务数据
   */
  async getStockFinancials(query) {
    const callIFinD = this._getIFinD();
    if (!callIFinD) return { ok: false, error: 'iFinD未配置' };

    try {
      return await callIFinD('stock', 'get_stock_financials', { query });
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  /**
   * 获取基金数据
   */
  async getFundPerformance(query) {
    const callIFinD = this._getIFinD();
    if (!callIFinD) return { ok: false, error: 'iFinD未配置' };

    try {
      return await callIFinD('fund', 'get_fund_market_performance', { query });
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
}

module.exports = CollectorAgent;
