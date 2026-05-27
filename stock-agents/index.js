/**
 * stock-agents - 多Agents股市分析系统
 * 可复用的股市分析工具包
 */

const LeaderAgent = require('./agents/leader');
const CollectorAgent = require('./agents/collector');
const AnalystAgent = require('./agents/analyst');
const AdvisorAgent = require('./agents/advisor');
const ReportAgent = require('./agents/report');
const Config = require('./config');

class StockAgents {
  constructor(options = {}) {
    this.config = new Config(options);
    this.leader = new LeaderAgent(this.config);
    this.collector = new CollectorAgent(this.config);
    this.analyst = new AnalystAgent(this.config);
    this.advisor = new AdvisorAgent(this.config);
    this.report = new ReportAgent(this.config);
  }

  /**
   * 处理用户输入
   * @param {string} input - 用户自然语言指令
   * @returns {object} 处理结果
   */
  async process(input) {
    return await this.leader.process(input);
  }

  /**
   * 获取当前持仓
   */
  getPortfolio() {
    return this.advisor.getPortfolio();
  }

  /**
   * 获取大盘行情
   */
  async getMarketOverview() {
    return await this.collector.getMarketOverview();
  }

  /**
   * 生成每日报告
   */
  async generateDailyReport() {
    return await this.report.generateDailyReport();
  }
}

module.exports = StockAgents;
module.exports.LeaderAgent = LeaderAgent;
module.exports.CollectorAgent = CollectorAgent;
module.exports.AnalystAgent = AnalystAgent;
module.exports.AdvisorAgent = AdvisorAgent;
module.exports.ReportAgent = ReportAgent;
module.exports.Config = Config;
