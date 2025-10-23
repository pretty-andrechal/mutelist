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
- 💾 Automatic progress caching - resume from where you left off if interrupted
- 🔄 Works with Alchemy free tier (10-block chunk limit)

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

**Automatic Resume/Caching:**
- ✅ Progress is automatically saved every 100 chunks to `.fetch_cache.json`
- ✅ If the script is interrupted (Ctrl+C, network error, etc.), just run `npm start` again
- ✅ The script will automatically resume from the last saved block
- ✅ No data is lost - all previously processed staking events are preserved
- ✅ Cache is automatically cleared when data fetch completes successfully

**Example:**
- Script processes 4,000 chunks and gets interrupted
- Run `npm start` again - it resumes from chunk 4,001
- No need to reprocess the first 4,000 chunks

**Block Range Configuration:**

You can configure a specific block range to scan by setting START_BLOCK and/or END_BLOCK in your `.env` file:

```bash
# Add to your .env file

# Set starting block (defaults to 0)
# Useful to skip blocks before the staking contract was deployed
START_BLOCK=10000000

# Set ending block (defaults to current block)
# Useful for historical analysis, testing, or scanning specific time periods
END_BLOCK=15000000
```

**Use Cases:**
- **Skip empty blocks**: Set START_BLOCK to the staking contract deployment block to dramatically speed up fetching
- **Historical analysis**: Scan a specific time period (e.g., blocks 10M to 15M)
- **Testing**: Use a small range like START_BLOCK=10000000 and END_BLOCK=10001000 to test with just 1,000 blocks
- **Incremental updates**: Fetch new data by setting START_BLOCK to your last processed block

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
- For testing, use both START_BLOCK and END_BLOCK to scan a small range (e.g., 1000 blocks)

### Error: "END_BLOCK is greater than current block"

The END_BLOCK you specified hasn't been mined yet.

**Solution:**
- Check the current block number on [BaseScan](https://basescan.org/)
- Set END_BLOCK to a valid block number that exists
- Or remove END_BLOCK to scan up to the current block

### Error: "Could not read staking_data.json"

Make sure you run `npm start` before `npm run visualize`.

### Starting Fresh / Clearing Cache

If you want to start the data fetch from scratch (ignoring cached progress):

```bash
# Delete the cache file
rm .fetch_cache.json

# Then run the script
npm start
```

The cache is automatically cleared when the script completes successfully, so you typically don't need to manually delete it.

### Script Got Interrupted

No problem! The script saves progress every 100 chunks. Just run `npm start` again and it will automatically resume from where it left off. You'll see a message like:

```
📦 Found cached progress from 2024-01-15T10:30:00.000Z
   Last processed block: 12345678
   Cached stakers: 42

🔄 Resuming from block 12345679
```

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
