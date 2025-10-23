import fs from 'fs';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function createBarChart(value, maxValue, width = 50) {
  const filled = Math.floor((value / maxValue) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function visualizeStakingData() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║          $MUTE TOKEN STAKING VISUALIZATION                    ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Read the staking data
  let stakingData;
  try {
    const rawData = fs.readFileSync('staking_data.json', 'utf8');
    stakingData = JSON.parse(rawData);
  } catch (error) {
    console.error('Error: Could not read staking_data.json');
    console.error('Please run "npm start" first to fetch the data.');
    process.exit(1);
  }

  const entries = Object.entries(stakingData);

  if (entries.length === 0) {
    console.log('No staking data found.');
    return;
  }

  // Calculate statistics
  let totalStaked = 0;
  let totalTransactions = 0;
  const amounts = [];

  for (const [_, data] of entries) {
    const amount = parseFloat(data.totalStakedFormatted);
    totalStaked += amount;
    totalTransactions += data.transactionCount;
    amounts.push(amount);
  }

  const avgStaked = totalStaked / entries.length;
  const maxStaked = Math.max(...amounts);
  const minStaked = Math.min(...amounts);

  // Display overall statistics
  console.log(`${colors.bright}Overall Statistics:${colors.reset}`);
  console.log(`${colors.green}├─${colors.reset} Total Stakers: ${colors.bright}${entries.length}${colors.reset}`);
  console.log(`${colors.green}├─${colors.reset} Total MUTE Staked: ${colors.bright}${totalStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE${colors.reset}`);
  console.log(`${colors.green}├─${colors.reset} Total Transactions: ${colors.bright}${totalTransactions}${colors.reset}`);
  console.log(`${colors.green}├─${colors.reset} Average Stake: ${colors.bright}${avgStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE${colors.reset}`);
  console.log(`${colors.green}├─${colors.reset} Largest Stake: ${colors.bright}${maxStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE${colors.reset}`);
  console.log(`${colors.green}└─${colors.reset} Smallest Stake: ${colors.bright}${minStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE${colors.reset}`);

  // Display top stakers
  console.log(`\n${colors.bright}${colors.yellow}Top Stakers:${colors.reset}\n`);

  const topCount = Math.min(20, entries.length);
  const topEntries = entries.slice(0, topCount);

  for (let i = 0; i < topEntries.length; i++) {
    const [address, data] = topEntries[i];
    const amount = parseFloat(data.totalStakedFormatted);
    const percentage = (amount / totalStaked) * 100;
    const bar = createBarChart(amount, maxStaked, 30);

    console.log(`${colors.cyan}${(i + 1).toString().padStart(2, ' ')}.${colors.reset} ${colors.bright}${shortenAddress(address)}${colors.reset}`);
    console.log(`    ${bar} ${colors.green}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE${colors.reset} ${colors.yellow}(${percentage.toFixed(2)}%)${colors.reset}`);
    console.log(`    ${colors.blue}Transactions: ${data.transactionCount}${colors.reset}\n`);
  }

  // Distribution analysis
  console.log(`${colors.bright}${colors.magenta}Stake Distribution:${colors.reset}\n`);

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

    console.log(`${range.label.padEnd(15, ' ')} ${bar} ${colors.bright}${count}${colors.reset} stakers ${colors.yellow}(${percentage.toFixed(1)}%)${colors.reset}`);
  }

  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Generate HTML visualization
  generateHTMLVisualization(stakingData, {
    totalStaked,
    totalTransactions,
    avgStaked,
    maxStaked,
    minStaked,
    stakerCount: entries.length
  });
}

function generateHTMLVisualization(stakingData, stats) {
  const entries = Object.entries(stakingData);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$MUTE Staking Visualization</title>
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
  </style>
</head>
<body>
  <div class="container">
    <h1>$MUTE Token Staking Dashboard</h1>
    <p class="subtitle">Visualization of all wallets staking on Base Network</p>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Stakers</div>
        <div class="stat-value">${stats.stakerCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total MUTE Staked</div>
        <div class="stat-value">${stats.totalStaked.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Transactions</div>
        <div class="stat-value">${stats.totalTransactions}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Average Stake</div>
        <div class="stat-value">${stats.avgStaked.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
      </div>
    </div>

    <div class="chart-container">
      <h2>Top 10 Stakers</h2>
      <div class="chart-wrapper">
        <canvas id="topStakersChart"></canvas>
      </div>
    </div>

    <div class="chart-container">
      <h2>Stake Distribution</h2>
      <div class="chart-wrapper">
        <canvas id="distributionChart"></canvas>
      </div>
    </div>

    <h2>All Stakers</h2>
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Wallet Address</th>
          <th>Amount Staked</th>
          <th>% of Total</th>
          <th>Transactions</th>
          <th>Visual</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(([address, data], index) => {
          const percentage = (parseFloat(data.totalStakedFormatted) / stats.totalStaked * 100).toFixed(2);
          const barWidth = (parseFloat(data.totalStakedFormatted) / stats.maxStaked * 100).toFixed(2);
          return `
          <tr>
            <td class="rank">#${index + 1}</td>
            <td class="address">${address}</td>
            <td class="amount">${parseFloat(data.totalStakedFormatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} MUTE</td>
            <td>${percentage}%</td>
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
    // Top Stakers Chart
    const topStakersData = ${JSON.stringify(entries.slice(0, 10).map(([address, data]) => ({
      address: address.slice(0, 6) + '...' + address.slice(-4),
      amount: parseFloat(data.totalStakedFormatted)
    })))};

    new Chart(document.getElementById('topStakersChart'), {
      type: 'bar',
      data: {
        labels: topStakersData.map(d => d.address),
        datasets: [{
          label: 'MUTE Staked',
          data: topStakersData.map(d => d.amount),
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
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

    // Distribution Chart
    const amounts = ${JSON.stringify(entries.map(([_, data]) => parseFloat(data.totalStakedFormatted)))};
    const ranges = [
      { min: 0, max: 100, label: '0-100' },
      { min: 100, max: 1000, label: '100-1K' },
      { min: 1000, max: 10000, label: '1K-10K' },
      { min: 10000, max: 100000, label: '10K-100K' },
      { min: 100000, max: Infinity, label: '100K+' }
    ];

    const distribution = ranges.map(range => ({
      label: range.label,
      count: amounts.filter(a => a >= range.min && a < range.max).length
    }));

    new Chart(document.getElementById('distributionChart'), {
      type: 'doughnut',
      data: {
        labels: distribution.map(d => d.label + ' MUTE'),
        datasets: [{
          data: distribution.map(d => d.count),
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(46, 204, 113, 0.8)',
            'rgba(241, 196, 15, 0.8)',
            'rgba(231, 76, 60, 0.8)'
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

  fs.writeFileSync('staking_visualization.html', html);
  console.log(`${colors.green}✓ HTML visualization saved to staking_visualization.html${colors.reset}`);
  console.log(`${colors.cyan}  Open this file in your browser to see the interactive charts!${colors.reset}\n`);
}

visualizeStakingData();
