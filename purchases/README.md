# $MUTE Purchase Tracker

Analyzes token purchases by addresses that are staking $MUTE tokens.

## What It Does

This tool:
1. Loads the list of staker addresses from `staking_data.json`
2. Tracks all Transfer events TO those addresses (token purchases)
3. Calculates total purchased, staking ratios, and first purchase dates
4. Generates interactive visualizations

## Quick Start

### Prerequisites

**You must run the staking tracker first!**

```bash
cd ..
npm start  # This generates staking_data.json
```

### Usage

```bash
# From the root directory
npm run purchase      # Fetch purchase data
npm run purchase:viz  # Generate visualization
```

### View Results

Open `purchase_visualization.html` in your browser to see:
- Top purchasers comparison chart
- Staking ratio distribution
- Complete table with purchase details

## What You'll Learn

**Purchase Patterns:**
- Total MUTE tokens purchased by each staker
- When each staker made their first purchase
- Number of purchase transactions per staker

**Staking Commitment:**
- What percentage of purchases went into staking
- Identify strong believers (high staking %)
- Find whales (large purchasers)

**Timeline Analysis:**
- Track when stakers first started accumulating
- See purchase activity over time

## Output Files

- `purchase_data.json` - Raw purchase data with timestamps and ratios
- `purchase_visualization.html` - Interactive dashboard
- `.purchase_cache.json` - Progress cache (auto-managed)

## Configuration

Uses the same `.env` file as the main staking tracker:
- `START_BLOCK` - Skip blocks before staking started
- `END_BLOCK` - Stop at a specific block
- `BASE_RPC_URL` - RPC endpoint to use

## Performance

- Uses 10-block chunking for Alchemy free tier compatibility
- Automatic caching every 100 chunks
- Resume from where you left off if interrupted
- Progress updates every 100 chunks

## Notes

- This tracks ALL transfers TO staker addresses, not just token purchases from DEXes
- Includes transfers from other wallets, DEX swaps, airdrops, etc.
- The "staking ratio" shows what % of total received tokens went into staking
- Ratios over 100% mean the staker staked more than they purchased (received from multiple sources)

## Example Insights

**High Staking Ratio (80-100%):**
- Strong conviction in the project
- Most purchases immediately staked
- Long-term holders

**Medium Staking Ratio (40-80%):**
- Balanced approach
- Some trading, some staking
- Strategic position sizing

**Low Staking Ratio (0-40%):**
- More active trading
- Smaller commitment to staking
- Possibly liquidity providers
