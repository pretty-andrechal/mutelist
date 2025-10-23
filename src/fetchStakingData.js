import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const TOKEN_ADDRESS = '0xa023316FA5c85dADF008C611790B3235433e781e';
const STAKING_ADDRESS = '0xa32cEAff2d60a55ECDF9267BA436e4D18825b8cF';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const BLOCK_CHUNK_SIZE = 10; // Alchemy free tier limit

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

// Helper function to fetch logs in chunks
async function fetchLogsInChunks(provider, filter, startBlock, endBlock, chunkSize) {
  const allLogs = [];
  let currentBlock = startBlock;
  const totalBlocks = endBlock - startBlock + 1;
  const totalChunks = Math.ceil(totalBlocks / chunkSize);
  let processedChunks = 0;

  console.log(`Fetching logs from block ${startBlock} to ${endBlock}`);
  console.log(`Total blocks: ${totalBlocks.toLocaleString()}, Processing in ${totalChunks.toLocaleString()} chunks of ${chunkSize} blocks`);

  while (currentBlock <= endBlock) {
    const chunkEndBlock = Math.min(currentBlock + chunkSize - 1, endBlock);

    try {
      const chunkFilter = {
        ...filter,
        fromBlock: currentBlock,
        toBlock: chunkEndBlock
      };

      const logs = await provider.getLogs(chunkFilter);
      allLogs.push(...logs);

      processedChunks++;
      if (processedChunks % 100 === 0 || processedChunks === totalChunks) {
        const progress = ((processedChunks / totalChunks) * 100).toFixed(1);
        console.log(`Progress: ${progress}% (${processedChunks}/${totalChunks} chunks, ${allLogs.length} events found)`);
      }

      currentBlock = chunkEndBlock + 1;

      // Add a small delay to avoid rate limiting
      if (processedChunks % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`Error fetching blocks ${currentBlock}-${chunkEndBlock}: ${error.message}`);

      // If we still hit rate limits, add a longer delay and retry
      if (error.message.includes('rate') || error.message.includes('limit')) {
        console.log('Rate limited, waiting 2 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue; // Retry the same chunk
      }

      throw error;
    }
  }

  console.log(`\nCompleted! Found ${allLogs.length} total events`);
  return allLogs;
}

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

  console.log('\n=== Fetching Transfer events to staking contract ===');

  // Create a filter for Transfer events to the staking contract
  const transferFilter = {
    address: TOKEN_ADDRESS,
    topics: [
      ethers.id(TRANSFER_EVENT_SIGNATURE),
      null, // from (any address)
      ethers.zeroPadValue(STAKING_ADDRESS, 32) // to (staking contract)
    ]
  };

  // Determine starting block - you can adjust this if you know when the contract was deployed
  // For Base mainnet, the network launched in August 2023 (around block 0)
  // If you know the deployment block, set START_BLOCK to that value for faster results
  const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK) : 0;

  console.log(`\nFetching from block ${START_BLOCK} to ${currentBlock} in chunks of ${BLOCK_CHUNK_SIZE}...`);
  console.log('This will take a while. Progress updates every 100 chunks.\n');

  try {
    const logs = await fetchLogsInChunks(provider, transferFilter, START_BLOCK, currentBlock, BLOCK_CHUNK_SIZE);

    console.log(`\nParsing ${logs.length} transfer events...`);

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
    console.error('Error fetching transfer events:', error);
    throw error;
  }

  // Note: We're only fetching Transfer events to the staking contract
  // This gives us all deposits. If you need to track withdrawals as well,
  // you would also fetch Transfer events FROM the staking contract.

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
