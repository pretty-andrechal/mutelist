# $MUTE Token Staking Visualization

A comprehensive tool to visualize all wallets that have staked $MUTE tokens on the Base blockchain.

## Overview

This project fetches and visualizes staking data for the $MUTE token, showing which wallet addresses deposited how much $MUTE into the staking contract.

**Contract Addresses:**
- Token Contract: `0xa023316FA5c85dADF008C611790B3235433e781e`
- Staking Contract: `0xa32cEAff2d60a55ECDF9267BA436e4D18825b8cF`
- Network: Base (Chain ID: 8453)

## Features

- 📊 Fetches all Transfer events to the staking contract from the Base blockchain
- 💰 Aggregates staking amounts by wallet address
- 📈 Generates interactive HTML visualization with charts
- 🎨 Beautiful terminal output with colored statistics
- 📋 Detailed table of all stakers with rankings
- 📊 Distribution analysis by stake size

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Internet connection to access Base blockchain RPC

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mutelist
```

2. Install dependencies:
```bash
npm install
```

3. Configure RPC endpoint (optional):
```bash
cp .env.example .env
# Edit .env to add your RPC URL if needed
```

The default public RPC (`https://mainnet.base.org`) will work, but for better performance, consider using a dedicated RPC provider like:
- [Alchemy](https://www.alchemy.com/) - Recommended
- [Infura](https://www.infura.io/)
- [QuickNode](https://www.quicknode.com/)

**Note:** The tool automatically fetches data in 10-block chunks to comply with Alchemy's free tier rate limits.

## Usage

### Step 1: Fetch Staking Data

Run the data fetching script to query the blockchain:

```bash
npm start
```

This will:
- Connect to the Base network
- Fetch all Transfer events to the staking contract in 10-block chunks
- Show progress updates every 100 chunks
- Aggregate data by wallet address
- Save results to `staking_data.json`
- Display a summary in the terminal

**Performance Notes:**
- The script fetches data in 10-block chunks to comply with Alchemy free tier limits
- Base mainnet has millions of blocks, so fetching from genesis will take time
- Progress is displayed every 100 chunks so you can monitor the process
- Small delays are added between requests to avoid rate limiting
- The first run may take **several hours** to fetch all historical data

**Optimization:** If you know when the staking contract was deployed, you can set a starting block to skip empty blocks:

```bash
# Add to your .env file
START_BLOCK=10000000  # Replace with actual deployment block
```

This will significantly speed up the initial data fetch.

### Step 2: Generate Visualizations

After fetching the data, generate visualizations:

```bash
npm run visualize
```

This will:
- Read the `staking_data.json` file
- Display beautiful terminal output with statistics
- Generate an interactive HTML dashboard (`staking_visualization.html`)

### Step 3: View Interactive Dashboard

Open the generated HTML file in your browser:

```bash
# On Linux/WSL
xdg-open staking_visualization.html

# On macOS
open staking_visualization.html

# On Windows
start staking_visualization.html
```

Or simply open `staking_visualization.html` in your preferred web browser.

## Output Files

- `staking_data.json` - Raw staking data with all wallet addresses and transaction details
- `staking_visualization.html` - Interactive HTML dashboard with charts and tables

## Visualization Features

### Terminal Output
- Overall statistics (total stakers, total staked, averages)
- Top 20 stakers with ASCII bar charts
- Stake distribution analysis

### HTML Dashboard
- 📊 Interactive charts using Chart.js
- 📈 Top 10 stakers bar chart
- 🍩 Stake distribution doughnut chart
- 📋 Complete sortable table of all stakers
- 🎨 Beautiful gradient design
- 📱 Responsive layout

## How It Works

The tool works by:

1. **Querying Transfer Events**: It fetches all ERC20 Transfer events where the recipient is the staking contract address
2. **Aggregating Data**: Groups transfers by sender address and sums the amounts
3. **Data Processing**: Converts blockchain data (wei) to human-readable format (MUTE tokens)
4. **Visualization**: Creates both terminal and HTML visualizations

## Troubleshooting

### Error: "block range" or "10 block range"

The script is designed to work with Alchemy's free tier (10 block limit) and automatically fetches data in 10-block chunks. If you still encounter range errors:

**Solution:**
- Ensure you're using the latest version of the code
- Check your RPC URL is correct in `.env`
- The script includes automatic retry logic with delays for rate limits

### Slow Performance / Long Fetch Time

Fetching all historical data from block 0 will take several hours due to rate limits and the large number of blocks.

**Solution:**
- Set `START_BLOCK` in your `.env` file to the block when the staking contract was deployed
- This skips all blocks before the contract existed and dramatically speeds up fetching
- You can find the deployment block by checking the contract on BaseScan

### Error: "Could not read staking_data.json"

Make sure you run `npm start` before `npm run visualize`.

### Slow Performance

- Use a dedicated RPC provider instead of the public endpoint
- Consider caching the data and only fetching new blocks on subsequent runs

## Data Structure

The `staking_data.json` file contains:

```json
{
  "0xWalletAddress...": {
    "totalStaked": "1000000000000000000000",
    "totalStakedFormatted": "1000.0",
    "transactionCount": 5,
    "transactions": [
      {
        "amount": "200000000000000000000",
        "blockNumber": 12345678,
        "transactionHash": "0x..."
      }
    ]
  }
}
```

## Extending the Tool

You can extend this tool by:

- Adding withdrawal tracking (look for Transfer events FROM the staking contract)
- Calculating net staking positions (deposits - withdrawals)
- Adding time-series analysis
- Tracking staking rewards
- Monitoring real-time changes

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
