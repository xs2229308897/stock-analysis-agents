#!/usr/bin/env node
/**
 * A股实时行情查询工具
 * 数据源：新浪财经实时行情 API
 *
 * 用法：
 *   node tools/realtime-quote.js                    # 查询大盘指数
 *   node tools/realtime-quote.js sh600519            # 查询个股（贵州茅台）
 *   node tools/realtime-quote.js sh600519,sz000858   # 查询多只个股
 *   node tools/realtime-quote.js --board             # 查询板块 ETF
 *   node tools/realtime-quote.js --top               # 查询涨幅榜（通过 iFinD）
 */

const https = require('https');

// 默认大盘指数代码
const DEFAULT_INDICES = ['sh000001', 'sz399001', 'sz399006', 'sh000688', 'sz399005'];

// 常用板块 ETF
const BOARD_ETFS = [
  'sh510300', // 沪深300ETF
  'sh510500', // 中证500ETF
  'sh510050', // 上证50ETF
  'sh588000', // 科创50ETF
  'sz159915', // 创业板ETF
  'sh512010', // 医药ETF
  'sh512660', // 军工ETF
  'sh512880', // 证券ETF
  'sh515030', // 新能源车ETF
  'sh515790', // 光伏ETF
  'sh516160', // 新能源ETF
  'sh512480', // 半导体ETF
  'sh515050', // 5GETF
  'sh512690', // 酒ETF
  'sh512170', // 医疗ETF
  'sz159869', // 游戏ETF
  'sh562500', // 机器人ETF
  'sh512720', // 计算机ETF
];

const ETF_NAMES = {
  'sh510300': '沪深300ETF',
  'sh510500': '中证500ETF',
  'sh510050': '上证50ETF',
  'sh588000': '科创50ETF',
  'sz159915': '创业板ETF',
  'sh512010': '医药ETF',
  'sh512660': '军工ETF',
  'sh512880': '证券ETF',
  'sh515030': '新能源车ETF',
  'sh515790': '光伏ETF',
  'sh516160': '新能源ETF',
  'sh512480': '半导体ETF',
  'sh515050': '5GETF',
  'sh512690': '酒ETF',
  'sh512170': '医疗ETF',
  'sz159869': '游戏ETF',
  'sh562500': '机器人ETF',
  'sh512720': '计算机ETF',
};

function fetchQuotes(codes) {
  return new Promise((resolve, reject) => {
    const url = `https://hq.sinajs.cn/list=${codes.join(',')}`;
    const options = {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    };

    https.get(url, options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const decoder = new TextDecoder('gbk');
        resolve(decoder.decode(buf));
      });
    }).on('error', reject);
  });
}

function parseIndexLine(line) {
  const match = line.match(/var hq_str_(\w+)="(.*)";/);
  if (!match || !match[2]) return null;

  const code = match[1];
  const fields = match[2].split(',');
  if (fields.length < 32) return null;

  const name = fields[0];
  const open = parseFloat(fields[1]);
  const prevClose = parseFloat(fields[2]);
  const current = parseFloat(fields[3]);
  const high = parseFloat(fields[4]);
  const low = parseFloat(fields[5]);
  const volume = parseFloat(fields[8]);   // 成交量（股）
  const amount = parseFloat(fields[9]);   // 成交额（元）

  const change = current - prevClose;
  const changePct = prevClose ? (change / prevClose) * 100 : 0;

  return {
    code,
    name,
    current: current.toFixed(2),
    open: open.toFixed(2),
    prevClose: prevClose.toFixed(2),
    high: high.toFixed(2),
    low: low.toFixed(2),
    change: change.toFixed(2),
    changePct: changePct.toFixed(2),
    volume,
    amount,
  };
}

function formatAmount(amount) {
  if (amount >= 1e12) return (amount / 1e12).toFixed(2) + '万亿';
  if (amount >= 1e8) return (amount / 1e8).toFixed(2) + '亿';
  if (amount >= 1e4) return (amount / 1e4).toFixed(2) + '万';
  return amount.toFixed(2);
}

function formatVolume(vol) {
  if (vol >= 1e8) return (vol / 1e8).toFixed(2) + '亿股';
  if (vol >= 1e4) return (vol / 1e4).toFixed(2) + '万股';
  return vol.toFixed(0) + '股';
}

function printTable(title, items) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}`);

  const header = '名称'.padEnd(12) + '最新价'.padStart(10) + '涨跌幅'.padStart(10) +
    '涨跌额'.padStart(10) + '成交额'.padStart(12);
  console.log(header);
  console.log('-'.repeat(60));

  for (const item of items) {
    const sign = parseFloat(item.changePct) >= 0 ? '+' : '';
    const name = item.name.length > 6 ? item.name.substring(0, 6) : item.name;
    const row = name.padEnd(12) +
      item.current.padStart(10) +
      (sign + item.changePct + '%').padStart(10) +
      (sign + item.change).padStart(10) +
      formatAmount(item.amount).padStart(12);
    console.log(row);
  }
}

async function main() {
  const args = process.argv.slice(2);
  let codes;
  let title;

  if (args.includes('--board')) {
    codes = BOARD_ETFS;
    title = '板块 ETF 实时行情';
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    codes = args[0].split(',').map((c) => c.trim());
    title = '个股实时行情';
  } else {
    codes = DEFAULT_INDICES;
    title = 'A股大盘指数实时行情';
  }

  try {
    const rawData = await fetchQuotes(codes);
    const lines = rawData.split('\n').filter((l) => l.trim());
    const results = [];

    for (const line of lines) {
      const parsed = parseIndexLine(line);
      if (parsed) results.push(parsed);
    }

    if (results.length === 0) {
      console.log('未获取到数据，请检查代码是否正确或市场是否开盘。');
      process.exit(1);
    }

    // 如果是 ETF 查询，补充名称
    for (const r of results) {
      if (ETF_NAMES[r.code]) r.name = ETF_NAMES[r.code];
    }

    printTable(title, results);

    // 输出 JSON 格式（供程序解析）
    if (args.includes('--json')) {
      console.log('\n--- JSON ---');
      console.log(JSON.stringify(results, null, 2));
    }

    // 输出时间戳
    console.log(`\n数据时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    console.log('数据来源: 新浪财经实时行情 API');
  } catch (err) {
    console.error('获取数据失败:', err.message);
    process.exit(1);
  }
}

main();
