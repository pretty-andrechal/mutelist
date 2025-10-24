import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
};

function createBarChart(value, maxValue, width = 50) {
  const filled = Math.floor((value / maxValue) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function visualizePurchaseData() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║       $MUTE TOKEN PURCHASE TRACKER VISUALIZATION              ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Read the purchase data
  let purchaseData;
  try {
    const dataFile = path.join(__dirname, '../purchase_data.json');
    const rawData = fs.readFileSync(dataFile, 'utf8');
    purchaseData = JSON.parse(rawData);
  } catch (error) {
    console.error('Error: Could not read purchase_data.json');
    console.error('Please run "npm run purchase" first to fetch the data.');
    process.exit(1);
  }

  const entries = Object.entries(purchaseData);

  if (entries.length === 0) {
    console.log('No purchase data found.');
    return;
  }

  // Calculate statistics
  let totalPurchased = 0;
  let totalStaked = 0;
  let totalTransactions = 0;
  const amounts = [];
  const stakingRatios = [];

  for (const [_, data] of entries) {
    const purchased = parseFloat(data.totalPurchasedFormatted);
    const staked = parseFloat(data.totalStakedFormatted);
    totalPurchased += purchased;
    totalStaked += staked;
    totalTransactions += data.transactionCount;
    amounts.push(purchased);
    stakingRatios.push(parseFloat(data.stakingPercentage));
  }

  const avgPurchased = totalPurchased / entries.length;
  const maxPurchased = Math.max(...amounts);
  const minPurchased = Math.min(...amounts);
  const avgStakingRatio = stakingRatios.reduce((a, b) => a + b, 0) / stakingRatios.length;

  // Display overall statistics
  console.log(`${colors.bright}Overall Statistics:${colors.reset}`);
  console.log(`${colors.green}├─${colors.reset} Total Purchasers (who staked): ${colors.bright}${entries.length}${colors.reset}`);
  console.log(`${colors.green}├─${colors.reset} Total MUTE Purchased: ${colors.bright}${totalPurchased.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE${colors.reset}`);
  console.log(`${colors.green}├─${colors.reset} Total MUTE Staked: ${colors.bright}${totalStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE${colors.reset}`);
  console.log(`${colors.green}├─${colors.reset} Overall Staking Ratio: ${colors.bright}${((totalStaked / totalPurchased) * 100).toFixed(2)}%${colors.reset}`);
  console.log(`${colors.green}├─${colors.reset} Total Purchase Transactions: ${colors.bright}${totalTransactions}${colors.reset}`);
  console.log(`${colors.green}├─${colors.reset} Average Purchased: ${colors.bright}${avgPurchased.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE${colors.reset}`);
  console.log(`${colors.green}├─${colors.reset} Largest Purchase Total: ${colors.bright}${maxPurchased.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE${colors.reset}`);
  console.log(`${colors.green}└─${colors.reset} Smallest Purchase Total: ${colors.bright}${minPurchased.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE${colors.reset}`);

  // Display top purchasers
  console.log(`\n${colors.bright}${colors.yellow}Top 20 Purchasers:${colors.reset}\n`);

  const topCount = Math.min(20, entries.length);
  const topEntries = entries.slice(0, topCount);

  for (let i = 0; i < topEntries.length; i++) {
    const [address, data] = topEntries[i];
    const purchased = parseFloat(data.totalPurchasedFormatted);
    const staked = parseFloat(data.totalStakedFormatted);
    const percentage = (purchased / totalPurchased) * 100;
    const bar = createBarChart(purchased, maxPurchased, 30);
    const firstPurchase = data.firstPurchaseDate ? new Date(data.firstPurchaseDate).toLocaleDateString() : 'Unknown';

    console.log(`${colors.cyan}${(i + 1).toString().padStart(2, ' ')}.${colors.reset} ${colors.bright}${shortenAddress(address)}${colors.reset}`);
    console.log(`    ${bar} ${colors.green}${purchased.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE${colors.reset} ${colors.yellow}(${percentage.toFixed(2)}%)${colors.reset}`);
    console.log(`    ${colors.blue}Staked: ${staked.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE (${data.stakingPercentage}%)${colors.reset}`);
    console.log(`    ${colors.magenta}First Purchase: ${firstPurchase}${colors.reset} | ${colors.blue}Transactions: ${data.transactionCount}${colors.reset}\n`);
  }

  // Purchase distribution analysis
  console.log(`${colors.bright}${colors.magenta}Purchase Amount Distribution:${colors.reset}\n`);

  const ranges = [
    { min: 0, max: 100, label: '0-100 MUTE' },
    { min: 100, max: 1000, label: '100-1K MUTE' },
    { min: 1000, max: 10000, label: '1K-10K MUTE' },
    { min: 10000, max: 100000, label: '10K-100K MUTE' },
    { min: 100000, max: Infinity, label: '100K+ MUTE' }
  ];

  for (const range of ranges) {
    const count = amounts.filter(a => a >= range.min && a < range.max).length;
    const percentage = (count / entries.length) * 100;
    const bar = createBarChart(count, entries.length, 30);

    console.log(`${range.label.padEnd(15, ' ')} ${bar} ${colors.bright}${count}${colors.reset} purchasers ${colors.yellow}(${percentage.toFixed(1)}%)${colors.reset}`);
  }

  // Staking ratio distribution
  console.log(`\n${colors.bright}${colors.magenta}Staking Ratio Distribution:${colors.reset}\n`);

  const stakingRanges = [
    { min: 0, max: 20, label: '0-20% staked' },
    { min: 20, max: 40, label: '20-40% staked' },
    { min: 40, max: 60, label: '40-60% staked' },
    { min: 60, max: 80, label: '60-80% staked' },
    { min: 80, max: 100, label: '80-100% staked' },
    { min: 100, max: Infinity, label: '>100% staked' }
  ];

  for (const range of stakingRanges) {
    const count = stakingRatios.filter(r => r >= range.min && r < range.max).length;
    const percentage = (count / entries.length) * 100;
    const bar = createBarChart(count, entries.length, 30);

    console.log(`${range.label.padEnd(17, ' ')} ${bar} ${colors.bright}${count}${colors.reset} wallets ${colors.yellow}(${percentage.toFixed(1)}%)${colors.reset}`);
  }

  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Generate HTML visualization
  generateHTMLVisualization(purchaseData, {
    totalPurchased,
    totalStaked,
    totalTransactions,
    avgPurchased,
    maxPurchased,
    minPurchased,
    avgStakingRatio,
    purchaserCount: entries.length
  });
}

function generateHTMLVisualization(purchaseData, stats) {
  const entries = Object.entries(purchaseData);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$MUTE Purchase Tracker Visualization</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      padding: 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    h1 {
      text-align: center;
      color: #667eea;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 40px;
      font-size: 1.1em;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 25px;
      border-radius: 15px;
      color: white;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
    .stat-label {
      font-size: 0.9em;
      opacity: 0.9;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 1.8em;
      font-weight: bold;
    }
    .chart-container {
      margin: 40px 0;
      background: #f8f9fa;
      padding: 30px;
      border-radius: 15px;
    }
    .chart-wrapper {
      position: relative;
      height: 400px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
    }
    thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    th, td {
      padding: 15px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85em;
      letter-spacing: 0.5px;
    }
    tbody tr:hover {
      background-color: #f5f5f5;
    }
    .address {
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #667eea;
    }
    .amount {
      font-weight: bold;
      color: #2ecc71;
    }
    .staked {
      font-weight: bold;
      color: #3498db;
    }
    .ratio {
      font-weight: bold;
    }
    .ratio.high {
      color: #27ae60;
    }
    .ratio.medium {
      color: #f39c12;
    }
    .ratio.low {
      color: #e74c3c;
    }
    .rank {
      font-weight: bold;
      color: #667eea;
      font-size: 1.1em;
    }
    .progress-bar {
      background: #e0e0e0;
      border-radius: 10px;
      height: 20px;
      overflow: hidden;
      margin-top: 5px;
    }
    .progress-fill {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      height: 100%;
      transition: width 0.3s ease;
    }
    h2 {
      color: #667eea;
      margin-top: 40px;
      margin-bottom: 20px;
      font-size: 1.8em;
    }
    .date {
      color: #95a5a6;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>$MUTE Token Purchase Tracker</h1>
    <p class="subtitle">Analyzing purchases by stakers on Base Network</p>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Purchasers</div>
        <div class="stat-value">${stats.purchaserCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Purchased</div>
        <div class="stat-value">${stats.totalPurchased.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Staked</div>
        <div class="stat-value">${stats.totalStaked.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Staking Ratio</div>
        <div class="stat-value">${((stats.totalStaked / stats.totalPurchased) * 100).toFixed(1)}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Purchased</div>
        <div class="stat-value">${stats.avgPurchased.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Transactions</div>
        <div class="stat-value">${stats.totalTransactions}</div>
      </div>
    </div>

    <div class="chart-container">
      <h2>Top 10 Purchasers</h2>
      <div class="chart-wrapper">
        <canvas id="topPurchasersChart"></canvas>
      </div>
    </div>

    <div class="chart-container">
      <h2>Staking Ratio Distribution</h2>
      <div class="chart-wrapper">
        <canvas id="stakingRatioChart"></canvas>
      </div>
    </div>

    <h2>All Purchasers</h2>
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Wallet Address</th>
          <th>Purchased</th>
          <th>Staked</th>
          <th>Staking %</th>
          <th>First Purchase</th>
          <th>Txs</th>
          <th>Visual</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(([address, data], index) => {
          const purchased = parseFloat(data.totalPurchasedFormatted);
          const staked = parseFloat(data.totalStakedFormatted);
          const stakingPct = parseFloat(data.stakingPercentage);
          const ratioClass = stakingPct >= 80 ? 'high' : stakingPct >= 40 ? 'medium' : 'low';
          const barWidth = (purchased / stats.maxPurchased * 100).toFixed(2);
          const firstPurchase = data.firstPurchaseDate ? new Date(data.firstPurchaseDate).toLocaleDateString() : 'Unknown';

          return `
          <tr>
            <td class="rank">#${index + 1}</td>
            <td class="address">${address}</td>
            <td class="amount">${purchased.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE</td>
            <td class="staked">${staked.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE</td>
            <td><span class="ratio ${ratioClass}">${stakingPct.toFixed(1)}%</span></td>
            <td class="date">${firstPurchase}</td>
            <td>${data.transactionCount}</td>
            <td>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${barWidth}%"></div>
              </div>
            </td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <script>
    // Top Purchasers Chart
    const topPurchasersData = ${JSON.stringify(entries.slice(0, 10).map(([address, data]) => ({
      address: address.slice(0, 6) + '...' + address.slice(-4),
      purchased: parseFloat(data.totalPurchasedFormatted),
      staked: parseFloat(data.totalStakedFormatted)
    })))};

    new Chart(document.getElementById('topPurchasersChart'), {
      type: 'bar',
      data: {
        labels: topPurchasersData.map(d => d.address),
        datasets: [
          {
            label: 'MUTE Purchased',
            data: topPurchasersData.map(d => d.purchased),
            backgroundColor: 'rgba(102, 126, 234, 0.8)',
            borderColor: 'rgba(102, 126, 234, 1)',
            borderWidth: 2
          },
          {
            label: 'MUTE Staked',
            data: topPurchasersData.map(d => d.staked),
            backgroundColor: 'rgba(52, 152, 219, 0.8)',
            borderColor: 'rgba(52, 152, 219, 1)',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString() + ' MUTE';
              }
            }
          }
        }
      }
    });

    // Staking Ratio Distribution Chart
    const stakingRatios = ${JSON.stringify(entries.map(([_, data]) => parseFloat(data.stakingPercentage)))};
    const stakingRanges = [
      { min: 0, max: 20, label: '0-20%' },
      { min: 20, max: 40, label: '20-40%' },
      { min: 40, max: 60, label: '40-60%' },
      { min: 60, max: 80, label: '60-80%' },
      { min: 80, max: 100, label: '80-100%' },
      { min: 100, max: Infinity, label: '>100%' }
    ];

    const stakingDistribution = stakingRanges.map(range => ({
      label: range.label,
      count: stakingRatios.filter(r => r >= range.min && r < range.max).length
    }));

    new Chart(document.getElementById('stakingRatioChart'), {
      type: 'doughnut',
      data: {
        labels: stakingDistribution.map(d => d.label + ' staked'),
        datasets: [{
          data: stakingDistribution.map(d => d.count),
          backgroundColor: [
            'rgba(231, 76, 60, 0.8)',
            'rgba(243, 156, 18, 0.8)',
            'rgba(241, 196, 15, 0.8)',
            'rgba(46, 204, 113, 0.8)',
            'rgba(39, 174, 96, 0.8)',
            'rgba(52, 152, 219, 0.8)'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  </script>
</body>
</html>`;

  const outputFile = path.join(__dirname, '../purchase_visualization.html');
  fs.writeFileSync(outputFile, html);
  console.log(`${colors.green}✓ HTML visualization saved to purchases/purchase_visualization.html${colors.reset}`);
  console.log(`${colors.cyan}  Open this file in your browser to see the interactive charts!${colors.reset}\n`);
}

visualizePurchaseData();
