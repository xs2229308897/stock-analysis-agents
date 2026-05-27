#!/usr/bin/env node

/**
 * init.js - 初始化脚本
 * 在新项目中初始化stock-agents数据目录和配置
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data');

console.log('=== stock-agents 初始化 ===\n');

// 创建数据目录
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✓ 创建 data/ 目录');
}

// 创建默认持仓文件
const portfolioPath = path.join(dataDir, 'portfolio.json');
if (!fs.existsSync(portfolioPath)) {
  fs.writeFileSync(portfolioPath, JSON.stringify({
    lastUpdated: new Date().toISOString().split('T')[0],
    holdings: [],
    cash: 0
  }, null, 2));
  console.log('✓ 创建 data/portfolio.json');
}

// 创建交易历史文件
const transactionsPath = path.join(dataDir, 'transactions.json');
if (!fs.existsSync(transactionsPath)) {
  fs.writeFileSync(transactionsPath, JSON.stringify({ transactions: [] }, null, 2));
  console.log('✓ 创建 data/transactions.json');
}

// 创建上下文文件
const contextPath = path.join(dataDir, 'context.json');
if (!fs.existsSync(contextPath)) {
  fs.writeFileSync(contextPath, JSON.stringify({
    userPreferences: {
      focusSectors: ['半导体', 'AI算力', '电网'],
      riskTolerance: 'medium',
      investmentStyle: 'value+growth'
    },
    conversationHistory: []
  }, null, 2));
  console.log('✓ 创建 data/context.json');
}

// 创建收益记录文件
const performancePath = path.join(dataDir, 'performance.json');
if (!fs.existsSync(performancePath)) {
  fs.writeFileSync(performancePath, JSON.stringify({ daily: [] }, null, 2));
  console.log('✓ 创建 data/performance.json');
}

// 创建配置文件示例
const configPath = path.join(process.cwd(), 'stock-agents.config.js');
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, `/**
 * stock-agents 配置文件
 * 可覆盖默认配置
 */

module.exports = {
  // 数据目录
  dataDir: './data',

  // iFinD 配置
  ifind: {
    enabled: true,
    scriptPath: null, // 自定义iFinD脚本路径
    rateLimit: 2
  },

  // 实时行情配置
  realtime: {
    enabled: true,
    scriptPath: null // 自定义实时行情脚本路径
  },

  // 风险控制
  risk: {
    stopLoss: -0.08,
    takeProfit: 0.20,
    maxPosition: 0.30,
    minCash: 0.05
  },

  // 用户偏好
  userPreferences: {
    focusSectors: ['半导体', 'AI算力', '电网'],
    riskTolerance: 'medium'
  }
};
`);
  console.log('✓ 创建 stock-agents.config.js');
}

console.log('\n=== 初始化完成 ===');
console.log('\n使用方法:');
console.log('  const StockAgents = require("./stock-agents");');
console.log('  const agents = new StockAgents();');
console.log('  const result = await agents.process("查看持仓");');
