/**
 * financial-collector.js - 财务数据收集器
 * 通过 iFinD MCP 获取个股财务指标、基金数据、宏观经济数据
 */

const path = require('path');

const IFCALL_PATH = path.join(__dirname, '..', '..', '.claude', 'skills', 'ifind-finance-data-1.1.0', 'call-node.js');

let callIFinD;
try {
  callIFinD = require(IFCALL_PATH).call;
} catch (e) {
  callIFinD = null;
}

/**
 * 获取个股财务数据
 * @param {string} query - 查询条件
 */
async function getStockFinancials(query) {
  if (!callIFinD) return { ok: false, error: 'iFinD not available' };
  try {
    const result = await callIFinD('stock', 'get_stock_financials', { query });
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 获取个股基本信息
 * @param {string} query - 查询条件
 */
async function getStockInfo(query) {
  if (!callIFinD) return { ok: false, error: 'iFinD not available' };
  try {
    const result = await callIFinD('stock', 'get_stock_info', { query });
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 智能选股
 * @param {string} query - 选股条件
 */
async function searchStocks(query) {
  if (!callIFinD) return { ok: false, error: 'iFinD not available' };
  try {
    const result = await callIFinD('stock', 'search_stocks', { query });
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 获取基金行情与业绩
 * @param {string} query - 查询条件
 */
async function getFundPerformance(query) {
  if (!callIFinD) return { ok: false, error: 'iFinD not available' };
  try {
    const result = await callIFinD('fund', 'get_fund_market_performance', { query });
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 获取基金持仓明细
 * @param {string} query - 查询条件
 */
async function getFundPortfolio(query) {
  if (!callIFinD) return { ok: false, error: 'iFinD not available' };
  try {
    const result = await callIFinD('fund', 'get_fund_portfolio', { query });
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 获取宏观经济数据
 * @param {string} query - 查询条件
 */
async function getMacroData(query) {
  if (!callIFinD) return { ok: false, error: 'iFinD not available' };
  try {
    const result = await callIFinD('edb', 'get_edb_data', { query });
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 搜索宏观指标
 * @param {string} query - 搜索条件
 */
async function searchMacroIndicators(query) {
  if (!callIFinD) return { ok: false, error: 'iFinD not available' };
  try {
    const result = await callIFinD('edb', 'search_edb', { query });
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 收集个股完整财务数据
 * @param {string} stockName - 股票名称
 */
async function collectStockFinancialData(stockName) {
  const financials = await getStockFinancials(`${stockName}的ROE、PE、PB、净利润增速`);
  const info = await getStockInfo(`${stockName}近20日涨跌幅`);

  return {
    timestamp: new Date().toISOString(),
    stock: stockName,
    financials: financials.ok ? financials.data : null,
    marketInfo: info.ok ? info.data : null
  };
}

/**
 * 收集基金数据
 * @param {string} fundName - 基金名称或代码
 */
async function collectFundData(fundName) {
  const performance = await getFundPerformance(`${fundName}近一个月收益率`);
  const portfolio = await getFundPortfolio(`${fundName}最新持仓明细`);

  return {
    timestamp: new Date().toISOString(),
    fund: fundName,
    performance: performance.ok ? performance.data : null,
    portfolio: portfolio.ok ? portfolio.data : null
  };
}

module.exports = {
  getStockFinancials,
  getStockInfo,
  searchStocks,
  getFundPerformance,
  getFundPortfolio,
  getMacroData,
  searchMacroIndicators,
  collectStockFinancialData,
  collectFundData
};
