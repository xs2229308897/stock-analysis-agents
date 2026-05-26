/**
 * news-collector.js - 新闻资讯收集器
 * 通过 iFinD MCP 获取财经新闻、公司公告、热点事件
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
 * 搜索财经新闻
 * @param {string} query - 搜索关键词
 * @param {string} timeStart - 起始日期 YYYY-MM-DD
 * @param {string} timeEnd - 结束日期 YYYY-MM-DD
 * @param {number} size - 返回数量
 */
async function searchNews(query, timeStart, timeEnd, size = 5) {
  if (!callIFinD) return { ok: false, error: 'iFinD not available' };
  try {
    const result = await callIFinD('news', 'search_news', {
      query,
      time_start: timeStart,
      time_end: timeEnd,
      size
    });
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 搜索公司公告
 * @param {string} query - 搜索内容
 * @param {string} timeStart - 起始日期
 * @param {string} timeEnd - 结束日期
 * @param {number} size - 返回数量
 */
async function searchNotices(query, timeStart, timeEnd, size = 5) {
  if (!callIFinD) return { ok: false, error: 'iFinD not available' };
  try {
    const result = await callIFinD('news', 'search_notice', {
      query,
      time_start: timeStart,
      time_end: timeEnd,
      size
    });
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 搜索热点事件
 * @param {string} keyword - 关键词
 * @param {string} industryName - 行业名称
 * @param {string} timeScope - 时效范围（如 "24小时"）
 * @param {number} size - 返回数量
 */
async function searchTrendingNews(keyword, industryName, timeScope = '24小时', size = 5) {
  if (!callIFinD) return { ok: false, error: 'iFinD not available' };
  try {
    const result = await callIFinD('news', 'search_trending_news', {
      keyword,
      industry_name: industryName,
      time_scope: timeScope,
      size
    });
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 收集板块相关新闻
 * @param {string} sectorName - 板块名称
 */
async function collectSectorNews(sectorName) {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const news = await searchNews(`${sectorName}板块相关最新消息`, weekAgo, today, 5);
  const trending = await searchTrendingNews(sectorName, '', '24小时', 5);

  return {
    timestamp: new Date().toISOString(),
    sector: sectorName,
    news: news.ok ? news.data : null,
    trending: trending.ok ? trending.data : null
  };
}

/**
 * 收集个股相关新闻
 * @param {string} stockName - 股票名称
 */
async function collectStockNews(stockName) {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const news = await searchNews(`${stockName}相关最新消息`, weekAgo, today, 5);
  const notices = await searchNotices(`${stockName}最新公告`, weekAgo, today, 3);

  return {
    timestamp: new Date().toISOString(),
    stock: stockName,
    news: news.ok ? news.data : null,
    notices: notices.ok ? notices.data : null
  };
}

module.exports = {
  searchNews,
  searchNotices,
  searchTrendingNews,
  collectSectorNews,
  collectStockNews
};
