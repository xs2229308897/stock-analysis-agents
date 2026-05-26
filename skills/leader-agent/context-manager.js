/**
 * context-manager.js - 上下文记忆管理模块
 * 维护对话历史、用户偏好、市场观察
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CONTEXT_PATH = path.join(DATA_DIR, 'context.json');

/**
 * 获取上下文数据
 * @returns {object} 上下文数据
 */
function getContext() {
  try {
    const data = fs.readFileSync(CONTEXT_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      userPreferences: {
        focusSectors: ['半导体', 'AI算力', '电网'],
        riskTolerance: 'medium',
        investmentStyle: 'value+growth',
        preferredProducts: 'ETF联接基金'
      },
      conversationHistory: [],
      marketObservations: [],
      lastAnalysis: null
    };
  }
}

/**
 * 保存上下文数据
 * @param {object} context - 上下文数据
 */
function saveContext(context) {
  fs.writeFileSync(CONTEXT_PATH, JSON.stringify(context, null, 2), 'utf-8');
}

/**
 * 添加对话记录
 * @param {object} conversation - 对话记录
 */
function addConversation(conversation) {
  const context = getContext();

  context.conversationHistory.push({
    timestamp: new Date().toISOString(),
    user: conversation.user,
    intent: conversation.intent,
    summary: conversation.summary,
    result: conversation.result
  });

  // 只保留最近50条
  if (context.conversationHistory.length > 50) {
    context.conversationHistory = context.conversationHistory.slice(-50);
  }

  saveContext(context);
}

/**
 * 添加市场观察
 * @param {object} observation - 市场观察
 */
function addMarketObservation(observation) {
  const context = getContext();

  context.marketObservations.push({
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    ...observation
  });

  // 只保留最近100条
  if (context.marketObservations.length > 100) {
    context.marketObservations = context.marketObservations.slice(-100);
  }

  saveContext(context);
}

/**
 * 更新用户偏好
 * @param {object} preferences - 偏好设置
 */
function updatePreferences(preferences) {
  const context = getContext();
  context.userPreferences = { ...context.userPreferences, ...preferences };
  saveContext(context);
}

/**
 * 获取用户偏好
 * @returns {object} 用户偏好
 */
function getUserPreferences() {
  return getContext().userPreferences;
}

/**
 * 更新最近分析结果
 * @param {object} analysis - 分析结果
 */
function updateLastAnalysis(analysis) {
  const context = getContext();
  context.lastAnalysis = {
    timestamp: new Date().toISOString(),
    ...analysis
  };
  saveContext(context);
}

/**
 * 获取历史对话摘要
 * @param {number} count - 获取最近几条
 * @returns {Array} 对话摘要
 */
function getRecentConversations(count = 5) {
  const context = getContext();
  return context.conversationHistory.slice(-count);
}

module.exports = {
  getContext,
  saveContext,
  addConversation,
  addMarketObservation,
  updatePreferences,
  getUserPreferences,
  updateLastAnalysis,
  getRecentConversations
};
