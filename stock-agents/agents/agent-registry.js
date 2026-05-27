/**
 * agent-registry.js - Agent注册模块
 * 动态注册、能力发现、健康检查
 */

class AgentRegistry {
  constructor(config) {
    this.config = config;
    this.agents = new Map();
    this._registerBuiltinAgents();
  }

  /**
   * 注册内置Agent
   */
  _registerBuiltinAgents() {
    this.register('collector', {
      name: '信息收集Agent',
      description: '收集行情、新闻、财务数据',
      capabilities: ['collectMarketOverview', 'collectSectorData', 'collectStockData', 'collectNewsData'],
      module: './collector'
    });

    this.register('analyst', {
      name: '信息分析Agent',
      description: '技术面、基本面、情绪面分析',
      capabilities: ['analyzeMarket', 'analyzeSector', 'analyzeStock', 'analyzeTechnical', 'analyzeFundamental'],
      module: './analyst'
    });

    this.register('advisor', {
      name: '投资建议Agent',
      description: '持仓管理、策略制定、风险评估',
      capabilities: ['generateAdvice', 'managePortfolio', 'assessRisk'],
      module: './advisor'
    });

    this.register('report', {
      name: '报告Agent',
      description: '生成报告、追踪收益',
      capabilities: ['generateDailyReport', 'calculatePerformance'],
      module: './report'
    });
  }

  /**
   * 注册Agent
   */
  register(id, agentInfo) {
    this.agents.set(id, {
      id,
      ...agentInfo,
      registeredAt: new Date().toISOString(),
      status: 'active',
      instance: null
    });
  }

  /**
   * 注销Agent
   */
  unregister(id) {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = 'removed';
      this.agents.delete(id);
      return true;
    }
    return false;
  }

  /**
   * 获取Agent
   */
  getAgent(id) {
    return this.agents.get(id) || null;
  }

  /**
   * 获取所有Agent
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * 获取活跃Agent
   */
  getActiveAgents() {
    return this.getAllAgents().filter(a => a.status === 'active');
  }

  /**
   * 根据能力查找Agent
   */
  findAgentByCapability(capability) {
    for (const [id, agent] of this.agents) {
      if (agent.capabilities.includes(capability)) {
        return agent;
      }
    }
    return null;
  }

  /**
   * 获取能力列表
   */
  getCapabilities() {
    const capabilities = {};

    for (const [id, agent] of this.agents) {
      for (const cap of agent.capabilities) {
        capabilities[cap] = id;
      }
    }

    return capabilities;
  }

  /**
   * 检查Agent健康状态
   */
  async checkHealth(id) {
    const agent = this.agents.get(id);
    if (!agent) return { healthy: false, error: 'Agent不存在' };

    try {
      // 如果有实例，检查实例状态
      if (agent.instance && typeof agent.instance.healthCheck === 'function') {
        const result = await agent.instance.healthCheck();
        return { healthy: true, ...result };
      }

      return { healthy: true, message: 'Agent已注册' };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * 检查所有Agent健康状态
   */
  async checkAllHealth() {
    const results = {};

    for (const [id] of this.agents) {
      results[id] = await this.checkHealth(id);
    }

    return results;
  }

  /**
   * 设置Agent实例
   */
  setInstance(id, instance) {
    const agent = this.agents.get(id);
    if (agent) {
      agent.instance = instance;
    }
  }

  /**
   * 获取Agent实例
   */
  getInstance(id) {
    const agent = this.agents.get(id);
    return agent?.instance || null;
  }

  /**
   * 生成注册报告
   */
  generateReport() {
    const agents = this.getAllAgents();

    return {
      total: agents.length,
      active: agents.filter(a => a.status === 'active').length,
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        capabilities: a.capabilities.length,
        status: a.status
      }))
    };
  }
}

module.exports = AgentRegistry;
