import { ethers } from 'ethers';
import { ERC20_ABI } from './constants';
import dotenv from 'dotenv';
dotenv.config();

// BSC链上常见的代币列表
// const BSC_TOKENS = [
//   { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', decimals: 18 },
//   { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', decimals: 18 },
//   { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18 },
//   { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 18 },
//   { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB', decimals: 18 },
//   { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH', decimals: 18 },
//   { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', decimals: 18 },
//   { address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', symbol: 'ADA', decimals: 18 },
//   { address: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402', symbol: 'DOT', decimals: 18 },
//   { address: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', symbol: 'LINK', decimals: 18 },
//   { address: '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94', symbol: 'LTC', decimals: 18 },
//   { address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', symbol: 'XRP', decimals: 18 },
//   { address: '0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf', symbol: 'BCH', decimals: 18 },
//   { address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', symbol: 'DAI', decimals: 18 },
// ];

const BSC_TOKENS = [
    
  ];

// 自定义代币列表（可选）
const CUSTOM_TOKENS: { address: string, symbol: string, decimals: number }[] = [];

/**
 * 添加自定义代币
 * @param tokenAddress 代币合约地址
 * @param symbol 代币符号
 * @param decimals 代币小数位数
 */
function addCustomToken(tokenAddress: string, symbol: string, decimals: number) {
  // 检查是否已存在
  const exists = BSC_TOKENS.some(token => token.address.toLowerCase() === tokenAddress.toLowerCase()) || 
                 CUSTOM_TOKENS.some(token => token.address.toLowerCase() === tokenAddress.toLowerCase());
  
  if (!exists) {
    CUSTOM_TOKENS.push({ address: tokenAddress, symbol, decimals });
    console.log(`已添加自定义代币: ${symbol} (${tokenAddress})`);
  } else {
    console.log(`自定义代币: ${symbol} (${tokenAddress}) 已存在于列表中`);
  }
}

/**
 * 获取BSC链上指定地址的所有ERC20代币余额
 * @param providerUrl BSC RPC节点URL
 * @param walletAddress 要查询的钱包地址
 */
async function getBscTokenBalances(
  providerUrl: string,
  walletAddress: string
) {
  try {
    console.log(`\n=== 查询BSC链钱包 ${walletAddress} 的代币余额 ===`);
    
    // 连接BSC网络
    const provider = new ethers.JsonRpcProvider(providerUrl);
    
    // 获取BNB余额（BSC原生代币）
    const nativeBalance = await provider.getBalance(walletAddress);
    const network = await provider.getNetwork();
    
    console.log(`连接到网络: ${network.name} (chainId: ${network.chainId})`);
    console.log(`BNB余额: ${ethers.formatEther(nativeBalance)} BNB`);
    
    // 合并标准代币列表和自定义代币列表
    const tokensToCheck = [...BSC_TOKENS, ...CUSTOM_TOKENS];
    
    // 查询结果
    const results: {
      symbol: string;
      address: string;
      balance: string;
      rawBalance: string;
      decimals: number;
      valueUSD: string;
    }[] = [];
    
    // 添加BNB (原生代币)
    results.push({
      symbol: "BNB",
      address: "native",
      balance: ethers.formatEther(nativeBalance),
      rawBalance: nativeBalance.toString(),
      decimals: 18,
      valueUSD: "N/A"
    });
    
    // 查询ERC20/BEP20代币余额
    console.log("\n查询BEP20代币余额...");
    for (const token of tokensToCheck) {
      try {
        const tokenContract = new ethers.Contract(
          token.address,
          ERC20_ABI,
          provider
        );
        
        // 获取余额
        const balance = await tokenContract.balanceOf(walletAddress);
        
        // 如果余额大于0，添加到结果
        if (balance > BigInt(0)) {
          const formattedBalance = ethers.formatUnits(balance, token.decimals);
          console.log(`${token.symbol}: ${formattedBalance}`);
          
          results.push({
            symbol: token.symbol,
            address: token.address,
            balance: formattedBalance,
            rawBalance: balance.toString(),
            decimals: token.decimals,
            valueUSD: "N/A"
          });
        }
      } catch (error) {
        console.error(`查询 ${token.symbol} (${token.address}) 余额时出错:`, error);
      }
    }
    
    return {
      walletAddress,
      tokens: results.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance)),
      count: results.length,
      nativeBalance: ethers.formatEther(nativeBalance)
    };
  } catch (error) {
    console.error("查询BSC代币余额时出错:", error);
    throw error;
  }
}

/**
 * 扫描钱包里可能存在的所有代币
 * 警告：这可能会非常慢，并且会消耗大量RPC请求，不建议经常使用
 * @param providerUrl BSC RPC节点URL
 * @param walletAddress 要查询的钱包地址
 * @param startBlock 开始扫描的区块 (默认为最近的10000个区块)
 */
async function scanAllTokens(providerUrl: string, walletAddress: string, startBlock: number = 0) {
  console.log(`\n=== 开始扫描 ${walletAddress} 可能持有的所有代币 ===`);
  console.log("警告：这个过程可能会非常慢，并消耗大量RPC请求");
  
  try {
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const currentBlock = await provider.getBlockNumber();
    
    // 如果未指定起始区块，设置为最近10000个区块
    if (startBlock === 0) {
      startBlock = Math.max(currentBlock - 1000000, 0);
    }
    
    console.log(`扫描区块范围: ${startBlock} 到 ${currentBlock}`);
    
    // ERC20 Transfer事件的主题
    const transferEventTopic = ethers.id("Transfer(address,address,uint256)");
    
    // 创建过滤器查询所有接收到代币的Transfer事件
    const filter = {
      topics: [
        transferEventTopic,
        null,
        ethers.zeroPadValue(walletAddress.toLowerCase(), 32)  // 接收地址
      ],
      fromBlock: startBlock,
      toBlock: currentBlock
    };
    
    // 获取日志
    console.log("正在获取Transfer事件日志...");
    const logs = await provider.getLogs(filter);
    console.log(`找到 ${logs.length} 个Transfer事件`);
    
    // 提取唯一的代币合约地址
    const tokenAddresses = Array.from(new Set(logs.map(log => log.address.toLowerCase())));
    console.log(`发现 ${tokenAddresses.length} 个唯一代币合约`);
    
    // 扫描发现的代币
    const discoveredTokens: {
      address: string;
      symbol: string;
      decimals: number;
      balance: string;
      rawBalance: string;
    }[] = [];
    
    for (const address of tokenAddresses) {
      try {
        const tokenContract = new ethers.Contract(
          address,
          ERC20_ABI,
          provider
        );
        
        // 获取代币信息
        const [symbol, decimals, balance] = await Promise.all([
          tokenContract.symbol(),
          tokenContract.decimals(),
          tokenContract.balanceOf(walletAddress)
        ]);
        
        if (balance > BigInt(0)) {
          const formattedBalance = ethers.formatUnits(balance, decimals);
          console.log(`发现代币: ${symbol} (${address}) - 余额: ${formattedBalance}`);
          
          discoveredTokens.push({
            address,
            symbol,
            decimals,
            balance: formattedBalance,
            rawBalance: balance.toString()
          });
          
          // 将新发现的代币添加到自定义列表
          addCustomToken(address, symbol, decimals);
        }
      } catch (error) {
        console.error(`处理代币 ${address} 时出错:`, error);
      }
    }
    
    return discoveredTokens;
  } catch (error) {
    console.error("扫描所有代币时出错:", error);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    // BSC主网RPC节点
    const BSC_RPC_URL = process.env.PROVIDER_URL || 'https://bsc-dataseed.binance.org/';
    
    // 获取命令行参数或使用默认值/环境变量
    const walletAddress = process.env.USER_ACCOUNT_ADDRESS || '0xC33D53d4ACa86A8e40c050E92D23E3842789641e';
    
    console.log(`查询地址: ${walletAddress}`);
    console.log(`BSC RPC节点: ${BSC_RPC_URL}`);

    console.log("\n开始深度扫描所有可能的代币...");
    await scanAllTokens(BSC_RPC_URL, walletAddress);
    
    // 查询BSC链上的代币余额
    const result = await getBscTokenBalances(BSC_RPC_URL, walletAddress);
    
    // 整理结果
    console.log("\n=== 查询结果 ===");
    console.log(`钱包地址: ${result.walletAddress}`);
    console.log(`发现 ${result.count} 种代币`);
    console.log('------------------------');
    
    result.tokens.forEach((token, index) => {
      console.log(`[${index + 1}] ${token.symbol}`);
      console.log(`余额: ${token.balance}`);
      console.log(`地址: ${token.address}`);
      console.log('------------------------');
    });
    
    // 询问是否要扫描所有可能的代币
    if (process.argv.includes('--scan-all')) {
      console.log("\n开始深度扫描所有可能的代币...");
      await scanAllTokens(BSC_RPC_URL, walletAddress);
    }
    
    return result;
  } catch (error) {
    console.error("执行脚本时出错:", error);
  }
}

// 如果直接运行此脚本，则执行主函数
// main();

// 导出函数，允许其他模块调用
export { getBscTokenBalances, scanAllTokens, addCustomToken }; 