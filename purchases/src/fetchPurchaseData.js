import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Configuration
const TOKEN_ADDRESS = '0xa023316FA5c85dADF008C611790B3235433e781e';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const BLOCK_CHUNK_SIZE = 10; // Alchemy free tier limit
const CACHE_FILE = path.join(__dirname, '../.purchase_cache.json');
const SAVE_INTERVAL = 100; // Save cache every N chunks
const STAKING_DATA_FILE = path.join(__dirname, '../../staking_data.json');

// ERC20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = 'Transfer(address,address,uint256)';

// Cache management functions
function saveCache(lastProcessedBlock, purchaseData) {
  const cache = {
    lastProcessedBlock,
    purchaseData: serializePurchaseData(purchaseData),
    timestamp: new Date().toISOString(),
    version: '1.0'
  };

  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Warning: Failed to save cache:', error.message);
  }
}

function loadCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return null;
    }

    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
    const cache = JSON.parse(cacheContent);

    console.log(`\n📦 Found cached progress from ${cache.timestamp}`);
    console.log(`   Last processed block: ${cache.lastProcessedBlock}`);
    console.log(`   Cached purchasers: ${Object.keys(cache.purchaseData).length}`);

    return {
      lastProcessedBlock: cache.lastProcessedBlock,
      purchaseData: deserializePurchaseData(cache.purchaseData)
    };
  } catch (error) {
    console.error('Warning: Failed to load cache, starting fresh:', error.message);
    return null;
  }
}

function clearCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
      console.log('✓ Cache cleared');
    }
  } catch (error) {
    console.error('Warning: Failed to clear cache:', error.message);
  }
}

// Serialize BigInt values for JSON storage
function serializePurchaseData(purchaseData) {
  const serialized = {};
  for (const [address, data] of Object.entries(purchaseData)) {
    serialized[address] = {
      totalPurchased: data.totalPurchased.toString(),
      totalStaked: data.totalStaked.toString(),
      firstPurchaseBlock: data.firstPurchaseBlock,
      firstPurchaseDate: data.firstPurchaseDate,
      transactions: data.transactions
    };
  }
  return serialized;
}

// Deserialize back to BigInt
function deserializePurchaseData(serializedData) {
  const deserialized = {};
  for (const [address, data] of Object.entries(serializedData)) {
    deserialized[address] = {
      totalPurchased: BigInt(data.totalPurchased),
      totalStaked: BigInt(data.totalStaked),
      firstPurchaseBlock: data.firstPurchaseBlock,
      firstPurchaseDate: data.firstPurchaseDate,
      transactions: data.transactions
    };
  }
  return deserialized;
}

// Helper function to fetch logs in chunks with caching
async function fetchLogsInChunks(provider, stakerAddresses, startBlock, endBlock, chunkSize, purchaseData) {
  let currentBlock = startBlock;
  const totalBlocks = endBlock - startBlock + 1;
  const totalChunks = Math.ceil(totalBlocks / chunkSize);
  let processedChunks = 0;
  let totalEventsFound = 0;

  // Interface for parsing Transfer events
  const iface = new ethers.Interface([
    'event Transfer(address indexed from, address indexed to, uint256 value)'
  ]);

  console.log(`Fetching purchase logs from block ${startBlock} to ${endBlock}`);
  console.log(`Tracking purchases for ${stakerAddresses.size.toLocaleString()} staker addresses`);
  console.log(`Total blocks: ${totalBlocks.toLocaleString()}, Processing in ${totalChunks.toLocaleString()} chunks of ${chunkSize} blocks`);

  while (currentBlock <= endBlock) {
    const chunkEndBlock = Math.min(currentBlock + chunkSize - 1, endBlock);

    try {
      // Fetch all Transfer events in this chunk
      const transferFilter = {
        address: TOKEN_ADDRESS,
        topics: [ethers.id(TRANSFER_EVENT_SIGNATURE)],
        fromBlock: currentBlock,
        toBlock: chunkEndBlock
      };

      const logs = await provider.getLogs(transferFilter);

      // Process logs - filter for transfers TO staker addresses
      for (const log of logs) {
        try {
          const parsed = iface.parseLog(log);
          const to = parsed.args.to.toLowerCase();
          const from = parsed.args.from;
          const value = parsed.args.value;

          // Check if this is a purchase by a staker (transfer TO a staker address)
          if (stakerAddresses.has(to)) {
            if (!purchaseData[to]) {
              console.error(`Warning: Address ${to} not in purchaseData`);
              continue;
            }

            purchaseData[to].totalPurchased += value;

            // Track first purchase
            if (purchaseData[to].firstPurchaseBlock === null || log.blockNumber < purchaseData[to].firstPurchaseBlock) {
              purchaseData[to].firstPurchaseBlock = log.blockNumber;
            }

            purchaseData[to].transactions.push({
              amount: value.toString(),
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              from: from
            });

            totalEventsFound++;
          }
        } catch (parseError) {
          console.error(`Error parsing log: ${parseError.message}`);
        }
      }

      processedChunks++;
      currentBlock = chunkEndBlock + 1;

      // Save cache periodically
      if (processedChunks % SAVE_INTERVAL === 0) {
        saveCache(chunkEndBlock, purchaseData);
        const progress = ((processedChunks / totalChunks) * 100).toFixed(1);
        console.log(`Progress: ${progress}% (${processedChunks}/${totalChunks} chunks, ${totalEventsFound} purchase events) 💾 Saved`);
      } else if (processedChunks % 100 === 0 || processedChunks === totalChunks) {
        const progress = ((processedChunks / totalChunks) * 100).toFixed(1);
        console.log(`Progress: ${progress}% (${processedChunks}/${totalChunks} chunks, ${totalEventsFound} purchase events)`);
      }

      // Add a small delay to avoid rate limiting
      if (processedChunks % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`Error fetching blocks ${currentBlock}-${chunkEndBlock}: ${error.message}`);

      // Save cache before potentially crashing
      saveCache(currentBlock - 1, purchaseData);
      console.log(`💾 Cache saved at block ${currentBlock - 1} before error`);

      // If we still hit rate limits, add a longer delay and retry
      if (error.message.includes('rate') || error.message.includes('limit')) {
        console.log('Rate limited, waiting 2 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue; // Retry the same chunk
      }

      throw error;
    }
  }

  console.log(`\nCompleted! Processed ${totalEventsFound} purchase events`);
}

// Fetch block timestamp
async function getBlockTimestamp(provider, blockNumber) {
  try {
    const block = await provider.getBlock(blockNumber);
    return block ? new Date(block.timestamp * 1000) : null;
  } catch (error) {
    console.error(`Failed to get timestamp for block ${blockNumber}:`, error.message);
    return null;
  }
}

async function fetchPurchaseData() {
  console.log('=== $MUTE Token Purchase Tracker ===\n');
  console.log('Connecting to Base network...');
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);

  try {
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
  } catch (error) {
    console.error('Failed to connect to network:', error.message);
    process.exit(1);
  }

  // Load staking data to get list of stakers
  console.log('\nLoading staker addresses from staking_data.json...');
  if (!fs.existsSync(STAKING_DATA_FILE)) {
    console.error('Error: staking_data.json not found!');
    console.error('Please run "npm start" first to generate staking data.');
    process.exit(1);
  }

  const stakingData = JSON.parse(fs.readFileSync(STAKING_DATA_FILE, 'utf8'));
  const stakerAddresses = new Set(Object.keys(stakingData).map(addr => addr.toLowerCase()));
  console.log(`Loaded ${stakerAddresses.size} staker addresses`);

  console.log('\nFetching purchase data...');
  console.log(`Token: ${TOKEN_ADDRESS}`);

  // Get the current block number
  const currentBlock = await provider.getBlockNumber();
  console.log(`Current block: ${currentBlock}`);

  // Determine the block range to scan
  const configuredStartBlock = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK) : 0;
  const endBlock = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK) : currentBlock;

  // Validate END_BLOCK
  if (endBlock > currentBlock) {
    console.error(`\n⚠️  Error: END_BLOCK (${endBlock}) is greater than current block (${currentBlock})`);
    console.error('Please set END_BLOCK to a valid block number or remove it to scan to the current block.');
    process.exit(1);
  }

  if (process.env.END_BLOCK) {
    console.log(`Scan range: blocks ${configuredStartBlock.toLocaleString()} to ${endBlock.toLocaleString()} (user specified)`);
  } else {
    console.log(`Scan range: blocks ${configuredStartBlock.toLocaleString()} to ${endBlock.toLocaleString()} (current block)`);
  }

  // Check for cached progress
  const cache = loadCache();
  let purchaseData = {};
  let startBlock = configuredStartBlock;

  // Initialize purchase data for all stakers
  for (const address of stakerAddresses) {
    purchaseData[address] = {
      totalPurchased: 0n,
      totalStaked: BigInt(stakingData[Object.keys(stakingData).find(k => k.toLowerCase() === address)].totalStaked),
      firstPurchaseBlock: null,
      firstPurchaseDate: null,
      transactions: []
    };
  }

  if (cache) {
    // Merge cached data with initialized data
    for (const [address, data] of Object.entries(cache.purchaseData)) {
      if (purchaseData[address]) {
        purchaseData[address] = data;
      }
    }
    startBlock = cache.lastProcessedBlock + 1;

    if (startBlock > endBlock) {
      console.log('✓ Cache is up to date! No new blocks to process.');
      console.log(`Loaded purchase data for ${Object.keys(purchaseData).filter(addr => purchaseData[addr].totalPurchased > 0n).length} purchasers from cache.`);
    } else {
      console.log(`\n🔄 Resuming from block ${startBlock.toLocaleString()}`);
      console.log(`   Skipping ${(startBlock - configuredStartBlock).toLocaleString()} already processed blocks`);
    }
  }

  console.log('\n=== Fetching Transfer events (purchases by stakers) ===');
  console.log(`\nFetching from block ${startBlock.toLocaleString()} to ${endBlock.toLocaleString()} in chunks of ${BLOCK_CHUNK_SIZE}...`);
  console.log(`Cache saves automatically every ${SAVE_INTERVAL} chunks.`);
  console.log('Progress updates every 100 chunks.\n');

  try {
    if (startBlock <= endBlock) {
      await fetchLogsInChunks(provider, stakerAddresses, startBlock, endBlock, BLOCK_CHUNK_SIZE, purchaseData);
    }

    // Fetch timestamps for first purchases
    console.log('\nFetching timestamps for first purchases...');
    const uniqueFirstBlocks = new Set();
    for (const data of Object.values(purchaseData)) {
      if (data.firstPurchaseBlock) {
        uniqueFirstBlocks.add(data.firstPurchaseBlock);
      }
    }

    const blockTimestamps = {};
    let fetchedCount = 0;
    for (const blockNumber of uniqueFirstBlocks) {
      blockTimestamps[blockNumber] = await getBlockTimestamp(provider, blockNumber);
      fetchedCount++;
      if (fetchedCount % 10 === 0) {
        console.log(`Fetched ${fetchedCount}/${uniqueFirstBlocks.size} timestamps...`);
      }
    }

    // Update first purchase dates
    for (const data of Object.values(purchaseData)) {
      if (data.firstPurchaseBlock && blockTimestamps[data.firstPurchaseBlock]) {
        data.firstPurchaseDate = blockTimestamps[data.firstPurchaseBlock].toISOString();
      }
    }

  } catch (error) {
    console.error('Error fetching purchase events:', error);
    throw error;
  }

  // Filter out addresses with no purchases
  const purchaseDataFiltered = {};
  for (const [address, data] of Object.entries(purchaseData)) {
    if (data.totalPurchased > 0n) {
      purchaseDataFiltered[address] = data;
    }
  }

  // Convert BigInt to string for JSON serialization
  const outputData = {};
  for (const [address, data] of Object.entries(purchaseDataFiltered)) {
    const totalPurchased = parseFloat(ethers.formatEther(data.totalPurchased));
    const totalStaked = parseFloat(ethers.formatEther(data.totalStaked));
    const stakingRatio = totalStaked / totalPurchased;

    outputData[address] = {
      totalPurchased: data.totalPurchased.toString(),
      totalPurchasedFormatted: ethers.formatEther(data.totalPurchased),
      totalStaked: data.totalStaked.toString(),
      totalStakedFormatted: ethers.formatEther(data.totalStaked),
      stakingRatio: stakingRatio,
      stakingPercentage: (stakingRatio * 100).toFixed(2),
      firstPurchaseBlock: data.firstPurchaseBlock,
      firstPurchaseDate: data.firstPurchaseDate,
      transactionCount: data.transactions.length,
      transactions: data.transactions
    };
  }

  // Sort by total purchased amount
  const sortedData = Object.entries(outputData)
    .sort((a, b) => {
      const aAmount = BigInt(a[1].totalPurchased);
      const bAmount = BigInt(b[1].totalPurchased);
      return aAmount > bAmount ? -1 : 1;
    })
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

  // Save to file
  const outputFile = path.join(__dirname, '../purchase_data.json');
  fs.writeFileSync(outputFile, JSON.stringify(sortedData, null, 2));
  console.log('\n✓ Data saved to purchases/purchase_data.json');

  // Clear cache after successful completion
  clearCache();

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total stakers who purchased: ${Object.keys(sortedData).length}`);
  console.log(`Total stakers tracked: ${stakerAddresses.size}`);
  console.log(`Stakers with no tracked purchases: ${stakerAddresses.size - Object.keys(sortedData).length}`);

  let totalPurchased = 0n;
  let totalStaked = 0n;
  for (const data of Object.values(sortedData)) {
    totalPurchased += BigInt(data.totalPurchased);
    totalStaked += BigInt(data.totalStaked);
  }
  console.log(`\nTotal MUTE purchased: ${ethers.formatEther(totalPurchased)} MUTE`);
  console.log(`Total MUTE staked: ${ethers.formatEther(totalStaked)} MUTE`);
  console.log(`Overall staking ratio: ${((parseFloat(ethers.formatEther(totalStaked)) / parseFloat(ethers.formatEther(totalPurchased))) * 100).toFixed(2)}%`);

  // Print top 10 purchasers
  console.log('\n=== TOP 10 PURCHASERS ===');
  const entries = Object.entries(sortedData).slice(0, 10);
  entries.forEach(([address, data], index) => {
    console.log(`${index + 1}. ${address}:`);
    console.log(`   Purchased: ${parseFloat(data.totalPurchasedFormatted).toLocaleString()} MUTE`);
    console.log(`   Staked: ${parseFloat(data.totalStakedFormatted).toLocaleString()} MUTE (${data.stakingPercentage}%)`);
    console.log(`   First Purchase: ${data.firstPurchaseDate ? new Date(data.firstPurchaseDate).toLocaleDateString() : 'Unknown'}`);
  });

  return sortedData;
}

// Run the script
fetchPurchaseData()
  .then(() => {
    console.log('\n✓ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
