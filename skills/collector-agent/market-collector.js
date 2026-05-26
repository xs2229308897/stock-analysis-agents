/**
 * market-collector.js - 实时行情数据收集器
 * 整合 realtime-quote.js 和 iFinD MCP 获取行情数据
 */

const { execSync } = require('child_process');
const path = require('path');

const TOOLS_DIR = path.join(__dirname, '..', '..', 'tools');
const IFCALL_PATH = path.join(__dirname, '..', '..', '.claude', 'skills', 'ifind-finance-data-1.1.0', 'call-node.js');

let callIFinD;
try {
  callIFinD = require(IFCALL_PATH).call;
} catch (e) {
  callIFinD = null;
}

/**
 * 获取大盘指数实时行情
 */
function getMarketIndices() {
  try {
    const result = execSync(`node ${path.join(TOOLS_DIR, 'realtime-quote.js')} --json`, {
      encoding: 'utf-8',
      timeout: 10000
    });
    return { ok: true, data: JSON.parse(result) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 获取个股实时行情
 * @param {string[]} codes - 股票代码数组，如 ['sh600519', 'sz000858']
 */
function getStockQuotes(codes) {
  try {
    const codeStr = codes.join(',');
    const result = execSync(`node ${path.join(TOOLS_DIR, 'realtime-quote.js')} ${codeStr} --json`, {
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
function getBoardETF() {
  try {
    const result = execSync(`node ${path.join(TOOLS_DIR, 'realtime-quote.js')} --board --json`, {
      encoding: 'utf-8',
      timeout: 10000
    });
    return { ok: true, data: JSON.parse(result) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 通过 iFinD 获取板块涨跌排行
 */
async function getSectorRanking() {
  if (!callIFinD) return { ok: false, error: 'iFinD not available' };
  try {
    const result = await callIFinD('index', 'sector_data', {
      query: '申万一级行业板块今日涨跌幅'
    });
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 通过 iFinD 获取指数数据
 * @param {string} query - 查询条件
 */
async function getIndexData(query) {
  if (!callIFinD) return { ok: false, error: 'iFinD not available' };
  try {
    const result = await callIFinD('index', 'index_data', { query });
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 收集大盘总览数据
 */
async function collectMarketOverview() {
  const indices = getMarketIndices();
  let sectorRanking = { ok: false };
  try {
    sectorRanking = await getSectorRanking();
  } catch (e) {
    // iFinD may not be available
  }

  return {
    timestamp: new Date().toISOString(),
    indices: indices.ok ? indices.data : null,
    sectorRanking: sectorRanking.ok ? sectorRanking.data : null,
    source: indices.ok ? 'realtime-quote' : 'unavailable'
  };
}

module.exports = {
  getMarketIndices,
  getStockQuotes,
  getBoardETF,
  getSectorRanking,
  getIndexData,
  collectMarketOverview
};
