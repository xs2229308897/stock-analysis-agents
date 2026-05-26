/**
 * performance-tracker.js - 收益追踪模块
 * 记录和追踪历史收益数据
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PERFORMANCE_PATH = path.join(DATA_DIR, 'performance.json');

/**
 * 获取收益数据
 * @returns {object} 收益数据
 */
function getPerformance() {
  try {
    const data = fs.readFileSync(PERFORMANCE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { daily: [], summary: { totalInvested: 0, totalCurrentValue: 0, totalReturn: 0, totalReturnRate: 0 } };
  }
}

/**
 * 记录每日收益
 * @param {object} dailyData - 当日收益数据
 */
function recordDailyPerformance(dailyData) {
  const perf = getPerformance();

  // 检查是否已有当日记录
  const existingIndex = perf.daily.findIndex(d => d.date === dailyData.date);
  if (existingIndex >= 0) {
    perf.daily[existingIndex] = dailyData;
  } else {
    perf.daily.push(dailyData);
  }

  // 只保留最近90天
  if (perf.daily.length > 90) {
    perf.daily = perf.daily.slice(-90);
  }

  // 更新汇总
  perf.summary = {
    totalInvested: dailyData.totalCost || 0,
    totalCurrentValue: dailyData.totalValue || 0,
    totalReturn: dailyData.totalPnL || 0,
    totalReturnRate: dailyData.totalPnLRate || 0,
    lastUpdated: dailyData.date
  };

  fs.writeFileSync(PERFORMANCE_PATH, JSON.stringify(perf, null, 2), 'utf-8');
}

/**
 * 计算累计收益
 * @returns {object} 累计收益数据
 */
function calculateCumulativeReturns() {
  const perf = getPerformance();
  const daily = perf.daily || [];

  if (daily.length === 0) {
    return { days: 0, totalReturn: 0, totalReturnRate: 0, maxDrawdown: 0 };
  }

  let maxAssets = 0;
  let maxDrawdown = 0;
  let totalReturn = 0;

  daily.forEach(d => {
    const assets = d.totalAssets || d.totalValue || 0;
    if (assets > maxAssets) maxAssets = assets;

    const drawdown = maxAssets > 0 ? (maxAssets - assets) / maxAssets : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  const firstDay = daily[0];
  const lastDay = daily[daily.length - 1];

  totalReturn = (lastDay.totalAssets || 0) - (firstDay.totalAssets || 0);
  const totalReturnRate = firstDay.totalAssets > 0
    ? (totalReturn / firstDay.totalAssets * 100)
    : 0;

  return {
    days: daily.length,
    startDate: firstDay.date,
    endDate: lastDay.date,
    startAssets: firstDay.totalAssets || 0,
    endAssets: lastDay.totalAssets || 0,
    totalReturn,
    totalReturnRate,
    maxDrawdown: maxDrawdown * 100,
    daily
  };
}

/**
 * 获取指定时间范围的收益
 * @param {number} days - 天数
 * @returns {object} 收益数据
 */
function getReturnsByPeriod(days) {
  const perf = getPerformance();
  const daily = perf.daily || [];

  if (daily.length === 0) {
    return { period: days, return: 0, returnRate: 0 };
  }

  const recent = daily.slice(-days);
  if (recent.length < 2) {
    return { period: days, return: 0, returnRate: 0, dataPoints: recent.length };
  }

  const start = recent[0];
  const end = recent[recent.length - 1];

  const returnVal = (end.totalAssets || 0) - (start.totalAssets || 0);
  const returnRate = start.totalAssets > 0
    ? (returnVal / start.totalAssets * 100)
    : 0;

  return {
    period: days,
    dataPoints: recent.length,
    startAssets: start.totalAssets || 0,
    endAssets: end.totalAssets || 0,
    return: returnVal,
    returnRate
  };
}

module.exports = {
  getPerformance,
  recordDailyPerformance,
  calculateCumulativeReturns,
  getReturnsByPeriod
};
