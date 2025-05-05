import { Network,Alchemy } from "alchemy-sdk"
import {ethers} from "ethers"


async function getAllTokenByAddress(userAddress:string,apiKey:string) {
    const config = {
        apiKey: apiKey,
        network: Network.BNB_MAINNET,
    }
    
    const alchemy = new Alchemy(config)
    
    const tokenBalances = await alchemy.core.getTokenBalances(userAddress)

    // 查询结果
    const results: {
        symbol: string;
        address: string;
        balance: string;
        decimals: number;
        name:string,
        logo:string
    }[] = [];

    // 不要使用forEach处理异步操作，改用Promise.all和map
    const tokenPromises = tokenBalances.tokenBalances.map(async (tokenBalance) => {
        const tokenMetaData = await alchemy.core.getTokenMetadata(tokenBalance.contractAddress);
        return {
            name: tokenMetaData.name || '',
            logo: tokenMetaData.logo || '',
            symbol: tokenMetaData.symbol || '',
            address: tokenBalance.contractAddress,
            balance: tokenBalance.tokenBalance ? ethers.formatEther(tokenBalance.tokenBalance) : '0',
            decimals: tokenMetaData.decimals || 0
        };
    });
    // 等待所有Promise完成并将结果添加到results数组
    const allTokenData = await Promise.all(tokenPromises);
    
    // 现在results包含了所有token的数据
    console.log(`allTokenData value is : ${allTokenData}`);
    return allTokenData;
}

// 导出函数
export { getAllTokenByAddress };

// 如果直接运行此文件，则调用函数
// // if (require.main === module) {
    // getAllTokenByAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","0igZ_n1KE46feELmlkIFQlaAdlVdoV7J")
    //     .then(results => console.log(`获取到 ${results.length} 个代币信息`))
    //     .catch(error => console.error("获取代币信息出错:", error));
// }
