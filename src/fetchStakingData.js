import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const TOKEN_ADDRESS = '0xa023316FA5c85dADF008C611790B3235433e781e';
const STAKING_ADDRESS = '0xa32cEAff2d60a55ECDF9267BA436e4D18825b8cF';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// ERC20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = 'Transfer(address,address,uint256)';

// Common staking contract event signatures
const STAKING_EVENT_SIGNATURES = [
  'Staked(address,uint256)',
  'Deposit(address,uint256)',
  'Stake(address,uint256)',
  'Staked(address,uint256,uint256)',
  'Deposit(address,uint256,uint256)'
];

async function fetchStakingData() {
  console.log('Connecting to Base network...');
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);

  try {
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
  } catch (error) {
    console.error('Failed to connect to network:', error.message);
    process.exit(1);
  }

  console.log('\nFetching staking data...');
  console.log(`Token: ${TOKEN_ADDRESS}`);
  console.log(`Staking Contract: ${STAKING_ADDRESS}`);

  // Get the current block number
  const currentBlock = await provider.getBlockNumber();
  console.log(`Current block: ${currentBlock}`);

  // We'll track deposits by looking at Transfer events to the staking contract
  const stakingData = {};

  try {
    console.log('\n=== Method 1: Fetching Transfer events to staking contract ===');

    // Create a filter for Transfer events to the staking contract
    const transferFilter = {
      address: TOKEN_ADDRESS,
      topics: [
        ethers.id(TRANSFER_EVENT_SIGNATURE),
        null, // from (any address)
        ethers.zeroPadValue(STAKING_ADDRESS, 32) // to (staking contract)
      ],
      fromBlock: 0,
      toBlock: 'latest'
    };

    console.log('Fetching transfer events (this may take a while)...');
    const logs = await provider.getLogs(transferFilter);
    console.log(`Found ${logs.length} transfer events to staking contract`);

    // Parse the logs
    const iface = new ethers.Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)'
    ]);

    for (const log of logs) {
      try {
        const parsed = iface.parseLog(log);
        const from = parsed.args.from;
        const value = parsed.args.value;

        if (!stakingData[from]) {
          stakingData[from] = {
            totalStaked: 0n,
            transactions: []
          };
        }

        stakingData[from].totalStaked += value;
        stakingData[from].transactions.push({
          amount: value.toString(),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash
        });
      } catch (parseError) {
        console.error(`Error parsing log: ${parseError.message}`);
      }
    }

    console.log(`\nProcessed ${Object.keys(stakingData).length} unique stakers`);

  } catch (error) {
    console.error('Error fetching transfer events:', error.message);

    // If the range is too large, suggest using a smaller range
    if (error.message.includes('range') || error.message.includes('limit')) {
      console.log('\n⚠️  The block range is too large. Trying with recent blocks...');

      // Try with last 10000 blocks
      const fromBlock = Math.max(0, currentBlock - 10000);
      console.log(`Fetching from block ${fromBlock} to ${currentBlock}`);

      const transferFilter = {
        address: TOKEN_ADDRESS,
        topics: [
          ethers.id(TRANSFER_EVENT_SIGNATURE),
          null,
          ethers.zeroPadValue(STAKING_ADDRESS, 32)
        ],
        fromBlock: fromBlock,
        toBlock: currentBlock
      };

      const logs = await provider.getLogs(transferFilter);
      console.log(`Found ${logs.length} transfer events in recent blocks`);

      const iface = new ethers.Interface([
        'event Transfer(address indexed from, address indexed to, uint256 value)'
      ]);

      for (const log of logs) {
        try {
          const parsed = iface.parseLog(log);
          const from = parsed.args.from;
          const value = parsed.args.value;

          if (!stakingData[from]) {
            stakingData[from] = {
              totalStaked: 0n,
              transactions: []
            };
          }

          stakingData[from].totalStaked += value;
          stakingData[from].transactions.push({
            amount: value.toString(),
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash
          });
        } catch (parseError) {
          console.error(`Error parsing log: ${parseError.message}`);
        }
      }
    }
  }

  // Try to fetch staking-specific events as well
  try {
    console.log('\n=== Method 2: Attempting to fetch Staking contract events ===');

    for (const eventSig of STAKING_EVENT_SIGNATURES) {
      try {
        const stakingFilter = {
          address: STAKING_ADDRESS,
          topics: [ethers.id(eventSig)],
          fromBlock: 0,
          toBlock: 'latest'
        };

        console.log(`Trying event: ${eventSig}`);
        const stakingLogs = await provider.getLogs(stakingFilter);

        if (stakingLogs.length > 0) {
          console.log(`✓ Found ${stakingLogs.length} ${eventSig} events`);
          // You could parse these events here if needed
        }
      } catch (err) {
        // Silently continue if this event signature doesn't exist
        if (err.message.includes('range') || err.message.includes('limit')) {
          console.log(`  ⚠️  Range too large for ${eventSig}, skipping...`);
        }
      }
    }
  } catch (error) {
    console.log('Could not fetch staking events:', error.message);
  }

  // Convert BigInt to string for JSON serialization
  const outputData = {};
  for (const [address, data] of Object.entries(stakingData)) {
    outputData[address] = {
      totalStaked: data.totalStaked.toString(),
      totalStakedFormatted: ethers.formatEther(data.totalStaked),
      transactionCount: data.transactions.length,
      transactions: data.transactions
    };
  }

  // Sort by total staked amount
  const sortedData = Object.entries(outputData)
    .sort((a, b) => {
      const aAmount = BigInt(a[1].totalStaked);
      const bAmount = BigInt(b[1].totalStaked);
      return aAmount > bAmount ? -1 : 1;
    })
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

  // Save to file
  fs.writeFileSync('staking_data.json', JSON.stringify(sortedData, null, 2));
  console.log('\n✓ Data saved to staking_data.json');

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total unique stakers: ${Object.keys(sortedData).length}`);

  let totalStaked = 0n;
  for (const data of Object.values(sortedData)) {
    totalStaked += BigInt(data.totalStaked);
  }
  console.log(`Total MUTE staked: ${ethers.formatEther(totalStaked)} MUTE`);

  // Print top 10 stakers
  console.log('\n=== TOP 10 STAKERS ===');
  const entries = Object.entries(sortedData).slice(0, 10);
  entries.forEach(([address, data], index) => {
    console.log(`${index + 1}. ${address}: ${data.totalStakedFormatted} MUTE (${data.transactionCount} txs)`);
  });

  return sortedData;
}

// Run the script
fetchStakingData()
  .then(() => {
    console.log('\n✓ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
