#!/usr/bin/env node

/**
 * test.js - 测试脚本
 */

const StockAgents = require('..');

async function test() {
  console.log('=== stock-agents 测试 ===\n');

  const agents = new StockAgents();

  // 测试1: 解析意图
  console.log('--- 测试1: 解析意图 ---');
  const instructions = [
    '分析半导体板块走势',
    '查看持仓',
    '买入1000份人工智能ETF联接C，价格1.25',
    '生成今日收益报告'
  ];

  for (const input of instructions) {
    const intent = agents.leader._parseIntent(input);
    console.log(`"${input}" => ${intent.type}/${intent.subType}`);
  }
  console.log();

  // 测试2: 持仓操作
  console.log('--- 测试2: 持仓操作 ---');
  const portfolio = agents.getPortfolio();
  console.log('当前持仓:', JSON.stringify(portfolio, null, 2));
  console.log();

  // 测试3: 技术分析
  console.log('--- 测试3: 技术分析 ---');
  const mockKline = Array.from({ length: 30 }, (_, i) => ({
    close: 100 + Math.random() * 10,
    high: 105 + Math.random() * 10,
    low: 95 + Math.random() * 10
  }));
  const techSummary = agents.analyst.generateTechnicalSummary(mockKline);
  console.log('技术面:', techSummary.summary);
  console.log();

  console.log('=== 测试完成 ===');
}

test().catch(console.error);
