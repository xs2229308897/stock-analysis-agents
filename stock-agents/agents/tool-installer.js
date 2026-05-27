/**
 * tool-installer.js - 工具安装模块
 * 自动安装和配置 MCP、skills、tools
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

class ToolInstaller {
  constructor(config) {
    this.config = config;
    this.installLog = [];
  }

  /**
   * 获取可用工具推荐
   * @param {string} taskType - 任务类型
   * @returns {Array} 推荐工具列表
   */
  getRecommendations(taskType) {
    const recommendations = {
      'realtime': [
        {
          name: 'realtime-quote',
          description: '新浪财经实时行情',
          type: 'script',
          path: 'tools/realtime-quote.js',
          priority: 'high',
          installCmd: null,
          alreadyInstalled: this._checkScriptExists('tools/realtime-quote.js')
        }
      ],
      'financial': [
        {
          name: 'ifind-finance-data',
          description: '同花顺 iFinD 深度数据（股票、基金、宏观、新闻）',
          type: 'skill',
          path: '.claude/skills/ifind-finance-data-1.1.0/',
          priority: 'high',
          installCmd: '从 iFinD 官网下载 skill 并复制到 .claude/skills/',
          alreadyInstalled: this._checkIFindInstalled()
        },
        {
          name: 'aktools',
          description: 'AKShare 金融数据（开源免费）',
          type: 'mcp',
          installCmd: 'pip install mcp-aktools',
          priority: 'medium',
          alreadyInstalled: this._checkMCPAvailable('aktools')
        }
      ],
      'news': [
        {
          name: 'ifind-news',
          description: 'iFinD 新闻资讯',
          type: 'skill',
          dependency: 'ifind-finance-data',
          priority: 'high',
          alreadyInstalled: this._checkIFindInstalled()
        }
      ],
      'macro': [
        {
          name: 'ifind-edb',
          description: 'iFinD 宏观经济数据',
          type: 'skill',
          dependency: 'ifind-finance-data',
          priority: 'medium',
          alreadyInstalled: this._checkIFindInstalled()
        }
      ],
      'stock': [
        {
          name: 'china-stock-mcp',
          description: '中国股票数据',
          type: 'mcp',
          installCmd: 'pip install china-stock-mcp',
          priority: 'medium',
          alreadyInstalled: this._checkMCPAvailable('china-stock-mcp')
        }
      ]
    };

    return recommendations[taskType] || [];
  }

  /**
   * 获取所有推荐
   */
  getAllRecommendations() {
    const categories = ['realtime', 'financial', 'news', 'macro', 'stock'];
    const all = {};

    for (const category of categories) {
      all[category] = this.getRecommendations(category);
    }

    return all;
  }

  /**
   * 生成安装报告
   */
  generateInstallReport() {
    const recommendations = this.getAllRecommendations();
    const installed = [];
    const missing = [];

    for (const [category, tools] of Object.entries(recommendations)) {
      for (const tool of tools) {
        if (tool.alreadyInstalled) {
          installed.push({ category, ...tool });
        } else {
          missing.push({ category, ...tool });
        }
      }
    }

    return {
      installed,
      missing,
      summary: `已安装 ${installed.length} 个工具，${missing.length} 个可选工具未安装`,
      suggestions: missing.filter(t => t.priority === 'high').map(t => ({
        name: t.name,
        description: t.description,
        installCmd: t.installCmd || `请参考文档安装 ${t.name}`
      }))
    };
  }

  /**
   * 安装 npm 包
   */
  async installNpmPackage(packageName, global = false) {
    const cmd = global ? `npm install -g ${packageName}` : `npm install ${packageName}`;

    try {
      this._log(`正在安装 ${packageName}...`);
      execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
      this._log(`✓ ${packageName} 安装成功`);
      return { success: true, message: `${packageName} 安装成功` };
    } catch (error) {
      this._log(`✗ ${packageName} 安装失败: ${error.message}`);
      return { success: false, message: `${packageName} 安装失败`, error: error.message };
    }
  }

  /**
   * 安装 pip 包
   */
  async installPipPackage(packageName) {
    const cmd = `pip install ${packageName}`;

    try {
      this._log(`正在安装 ${packageName}...`);
      execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
      this._log(`✓ ${packageName} 安装成功`);
      return { success: true, message: `${packageName} 安装成功` };
    } catch (error) {
      this._log(`✗ ${packageName} 安装失败: ${error.message}`);
      return { success: false, message: `${packageName} 安装失败`, error: error.message };
    }
  }

  /**
   * 配置 MCP 服务器
   */
  configureMCP(serverName, config) {
    const mcpPath = path.join(process.cwd(), '.mcp.json');
    let mcpConfig = {};

    if (fs.existsSync(mcpPath)) {
      try {
        mcpConfig = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
      } catch {
        mcpConfig = {};
      }
    }

    if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};
    mcpConfig.mcpServers[serverName] = config;

    fs.writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2));
    this._log(`✓ MCP 服务器 ${serverName} 已配置`);
    return { success: true, message: `MCP 服务器 ${serverName} 已配置` };
  }

  /**
   * 自动安装推荐工具
   */
  async autoInstall(category = null) {
    const recommendations = category
      ? { [category]: this.getRecommendations(category) }
      : this.getAllRecommendations();

    const results = [];

    for (const [cat, tools] of Object.entries(recommendations)) {
      for (const tool of tools) {
        if (tool.alreadyInstalled) continue;
        if (!tool.installCmd) continue;

        this._log(`\n安装 ${tool.name} (${tool.description})...`);

        if (tool.type === 'mcp') {
          if (tool.installCmd.startsWith('pip')) {
            const pkg = tool.installCmd.replace('pip install ', '');
            results.push(await this.installPipPackage(pkg));
          } else if (tool.installCmd.startsWith('npm')) {
            const pkg = tool.installCmd.replace('npm install ', '');
            results.push(await this.installNpmPackage(pkg));
          }
        }
      }
    }

    return {
      results,
      log: this.installLog,
      success: results.every(r => r.success)
    };
  }

  /**
   * 生成安装指南
   */
  generateInstallGuide() {
    const report = this.generateInstallReport();

    let guide = '# 工具安装指南\n\n';

    if (report.missing.length === 0) {
      guide += '所有推荐工具已安装！\n';
      return guide;
    }

    guide += '## 推荐安装\n\n';

    const highPriority = report.missing.filter(t => t.priority === 'high');
    const mediumPriority = report.missing.filter(t => t.priority === 'medium');

    if (highPriority.length > 0) {
      guide += '### 高优先级\n\n';
      for (const tool of highPriority) {
        guide += `**${tool.name}** - ${tool.description}\n`;
        if (tool.installCmd) {
          guide += `安装命令: \`${tool.installCmd}\`\n`;
        }
        guide += '\n';
      }
    }

    if (mediumPriority.length > 0) {
      guide += '### 中优先级\n\n';
      for (const tool of mediumPriority) {
        guide += `**${tool.name}** - ${tool.description}\n`;
        if (tool.installCmd) {
          guide += `安装命令: \`${tool.installCmd}\`\n`;
        }
        guide += '\n';
      }
    }

    return guide;
  }

  // === 内部方法 ===

  _checkScriptExists(scriptPath) {
    const fullPath = path.join(process.cwd(), scriptPath);
    return fs.existsSync(fullPath);
  }

  _checkIFindInstalled() {
    const possiblePaths = [
      path.join(process.cwd(), '.claude', 'skills', 'ifind-finance-data-1.1.0', 'call-node.js'),
      path.join(__dirname, '..', '..', '.claude', 'skills', 'ifind-finance-data-1.1.0', 'call-node.js')
    ];

    return possiblePaths.some(p => fs.existsSync(p));
  }

  _checkMCPAvailable(serverName) {
    const mcpPath = path.join(process.cwd(), '.mcp.json');
    if (!fs.existsSync(mcpPath)) return false;

    try {
      const config = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
      return !!(config.mcpServers && config.mcpServers[serverName]);
    } catch {
      return false;
    }
  }

  _log(message) {
    this.installLog.push(`[${new Date().toISOString()}] ${message}`);
  }
}

module.exports = ToolInstaller;
