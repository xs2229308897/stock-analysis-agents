/**
 * health-checker.js - 健康检查模块
 * 启动时检查系统依赖和配置完整性
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class HealthChecker {
  constructor(config) {
    this.config = config;
    this.checks = [];
    this.results = { passed: [], failed: [], warnings: [] };
  }

  /**
   * 执行所有健康检查
   */
  async runAllChecks() {
    this.results = { passed: [], failed: [], warnings: [] };

    await this.checkNodeVersion();
    await this.checkDataDirectory();
    await this.checkPortfolioFile();
    await this.checkIFindScript();
    await this.checkRealtimeScript();
    await this.checkMCPConfig();

    return {
      healthy: this.results.failed.length === 0,
      summary: this._generateSummary(),
      ...this.results
    };
  }

  /**
   * 检查 Node.js 版本
   */
  async checkNodeVersion() {
    try {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);

      if (major >= 16) {
        this._addPassed('node-version', `Node.js ${version}`);
      } else {
        this._addFailed('node-version', `Node.js 版本过低: ${version}，需要 >= 16.0.0`, {
          fix: '请升级 Node.js 到 16.0.0 或更高版本',
          url: 'https://nodejs.org/'
        });
      }
    } catch (error) {
      this._addFailed('node-version', '无法检测 Node.js 版本', { error: error.message });
    }
  }

  /**
   * 检查数据目录
   */
  async checkDataDirectory() {
    const dataDir = this.config.get('dataDir');

    if (fs.existsSync(dataDir)) {
      this._addPassed('data-directory', `数据目录存在: ${dataDir}`);
    } else {
      this._addWarning('data-directory', `数据目录不存在: ${dataDir}`, {
        fix: '运行 autoInit() 自动创建',
        autoFix: true
      });
    }
  }

  /**
   * 检查持仓文件
   */
  async checkPortfolioFile() {
    const portfolioPath = this.config.getPortfolioPath();

    if (fs.existsSync(portfolioPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(portfolioPath, 'utf-8'));
        if (data.holdings !== undefined) {
          this._addPassed('portfolio-file', '持仓文件格式正确');
        } else {
          this._addFailed('portfolio-file', '持仓文件格式错误: 缺少 holdings 字段', {
            fix: '删除损坏的文件，运行 autoInit() 重新创建'
          });
        }
      } catch (error) {
        this._addFailed('portfolio-file', '持仓文件 JSON 解析失败', {
          fix: '删除损坏的文件，运行 autoInit() 重新创建',
          error: error.message
        });
      }
    } else {
      this._addWarning('portfolio-file', '持仓文件不存在', {
        fix: '运行 autoInit() 自动创建',
        autoFix: true
      });
    }
  }

  /**
   * 检查 iFinD 脚本
   */
  async checkIFindScript() {
    const scriptPath = this.config.getIFinDScriptPath();

    if (scriptPath && fs.existsSync(scriptPath)) {
      try {
        // 尝试加载脚本验证语法
        require(scriptPath);
        this._addPassed('ifind-script', `iFinD 脚本可用: ${scriptPath}`);
      } catch (error) {
        this._addWarning('ifind-script', `iFinD 脚本加载失败: ${scriptPath}`, {
          fix: '检查脚本语法或重新安装 iFinD skill',
          error: error.message
        });
      }
    } else {
      this._addWarning('ifind-script', 'iFinD 脚本未找到', {
        fix: '安装 iFinD skill: 将 ifind-finance-data 复制到 .claude/skills/ 目录',
        impact: '深度数据查询功能不可用，仅可使用实时行情'
      });
    }
  }

  /**
   * 检查实时行情脚本
   */
  async checkRealtimeScript() {
    const scriptPath = this.config.getRealtimeScriptPath();

    if (scriptPath && fs.existsSync(scriptPath)) {
      this._addPassed('realtime-script', `实时行情脚本可用: ${scriptPath}`);
    } else {
      this._addFailed('realtime-script', '实时行情脚本未找到', {
        fix: '确保 tools/realtime-quote.js 存在',
        impact: '实时行情功能不可用'
      });
    }
  }

  /**
   * 检查 MCP 配置
   */
  async checkMCPConfig() {
    const possiblePaths = [
      path.join(process.cwd(), '.mcp.json'),
      path.join(process.cwd(), '..', '.mcp.json')
    ];

    let found = false;
    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          const serverCount = Object.keys(config.mcpServers || {}).length;
          this._addPassed('mcp-config', `MCP 配置文件存在，已配置 ${serverCount} 个服务器`);
          found = true;
          break;
        } catch (error) {
          this._addWarning('mcp-config', `MCP 配置文件解析失败: ${configPath}`, {
            fix: '检查 JSON 语法',
            error: error.message
          });
          found = true;
          break;
        }
      }
    }

    if (!found) {
      this._addWarning('mcp-config', 'MCP 配置文件未找到', {
        fix: '创建 .mcp.json 文件，参考 .mcp.json.example',
        impact: '部分数据源不可用'
      });
    }
  }

  /**
   * 自动修复可修复的问题
   */
  async autoFix() {
    const fixable = this.results.warnings.filter(w => w.details?.autoFix);
    const fixed = [];

    for (const issue of fixable) {
      switch (issue.check) {
        case 'data-directory':
          const dataDir = this.config.get('dataDir');
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            fixed.push(`创建数据目录: ${dataDir}`);
          }
          break;

        case 'portfolio-file':
          const portfolioPath = this.config.getPortfolioPath();
          if (!fs.existsSync(portfolioPath)) {
            const dir = path.dirname(portfolioPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(portfolioPath, JSON.stringify({
              lastUpdated: new Date().toISOString().split('T')[0],
              holdings: [],
              cash: 0
            }, null, 2));
            fixed.push(`创建持仓文件: ${portfolioPath}`);
          }
          break;
      }
    }

    return { fixed, remaining: this.results.warnings.filter(w => !w.details?.autoFix) };
  }

  /**
   * 生成修复建议
   */
  getFixSuggestions() {
    const suggestions = [];

    this.results.failed.forEach(f => {
      if (f.details?.fix) {
        suggestions.push({
          priority: 'high',
          check: f.check,
          message: f.message,
          fix: f.details.fix,
          url: f.details.url
        });
      }
    });

    this.results.warnings.forEach(w => {
      if (w.details?.fix) {
        suggestions.push({
          priority: 'medium',
          check: w.check,
          message: w.message,
          fix: w.details.fix,
          url: w.details.url
        });
      }
    });

    return suggestions;
  }

  // === 内部方法 ===

  _addPassed(check, message, details = {}) {
    this.results.passed.push({ check, message, details });
  }

  _addFailed(check, message, details = {}) {
    this.results.failed.push({ check, message, details });
  }

  _addWarning(check, message, details = {}) {
    this.results.warnings.push({ check, message, details });
  }

  _generateSummary() {
    const total = this.results.passed.length + this.results.failed.length + this.results.warnings.length;
    const passed = this.results.passed.length;
    const failed = this.results.failed.length;
    const warnings = this.results.warnings.length;

    if (failed === 0 && warnings === 0) {
      return `所有检查通过 (${passed}/${total})`;
    } else if (failed === 0) {
      return `基本可用，有 ${warnings} 个警告 (${passed} 通过, ${warnings} 警告)`;
    } else {
      return `存在 ${failed} 个问题需要修复 (${passed} 通过, ${failed} 失败, ${warnings} 警告)`;
    }
  }
}

module.exports = HealthChecker;
