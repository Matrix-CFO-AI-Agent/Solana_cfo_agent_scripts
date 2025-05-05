import { Addressable, ethers } from 'ethers';
import { AAVE_V3_POOL_ABI, PROTOCOL_DATA_PROVIDER_ABI ,ERC20_ABI, BNB_TRANSFER_WBNB_ABI} from './constants';
import dotenv from 'dotenv';
dotenv.config();

// 格式化显示的数字
function formatNumber(num: string | number, decimals = 2): string {
    return parseFloat(num.toString()).toFixed(decimals);
}

/**
 * 为指定的用户增加抵押物
 * @param providerUrl RPC节点URL
 * @param privateKey 用户私钥
 * @param tokenAddress 要增加的抵押物代币地址
 * @param amount 增加的金额（原始单位）
 */
async function increaseCollateral(
    providerUrl: string, 
    privateKey: string, 
    tokenAddress: string, 
    amount: string,
    aaveV3PoolAddress: string | Addressable,
    aaveV3UiPoolDataProvider: string | undefined
) {
    try {
        // 连接以太坊网络
        const provider = new ethers.JsonRpcProvider(providerUrl);
        const signer = new ethers.Wallet(privateKey, provider);
        const userAddress = signer.address;

        console.log(`\n=== Aave V3 增加抵押物操作 ===`);
        console.log(`用户地址: ${userAddress}`);

        // 创建Aave池合约实例
        const aavePool = new ethers.Contract(
            aaveV3PoolAddress,
            AAVE_V3_POOL_ABI,
            signer
        );
        
        // 检查增加抵押物前的账户状态
        const beforeData = await aavePool.getUserAccountData(userAddress);
        
        console.log(`beforeData value is ${beforeData}`);
        
        console.log(`\n增加抵押物前的账户状态:`);
        console.log(`总抵押品: $${formatNumber(beforeData.totalCollateralBase)}`);
        console.log(`总债务: $${formatNumber(beforeData.totalDebtBase)}`);
        console.log(`健康因子: ${formatNumber(beforeData.healthFactor)}`);

        let supplyTx:ethers.TransactionResponse


        if (!tokenAddress) {
            const wbnb = new ethers.Contract(
                process.env.WBNB_CONTRACT_ADDRESS || '',
                BNB_TRANSFER_WBNB_ABI,
                signer
            );

            // 查询代币的数量是否<amount
            const balance = await wbnb.balanceOf(userAddress);
            const amountWei = ethers.parseEther(amount);
            
            if (balance < amountWei) {
                console.log(`余额不足: 需要 ${ethers.formatEther(amountWei)} WBNB, 但只有 ${ethers.formatEther(balance)} WBNB`);
                const neededAmount = amountWei - balance;
                console.log(`需要转换的金额是 ${ethers.formatEther(neededAmount)} BNB -> WBNB`);
                
                const gasPrice = await provider.getFeeData();
                console.log(`gasPrice is ${gasPrice}`);
                
                // 直接使用BigInt值作为value，而不是格式化后的字符串
                const transferWbnbTx = await wbnb.deposit({ 
                    value: neededAmount, // 直接使用BigInt值
                    gasLimit: 6000000,
                    gasPrice: 5000000000
                });
                
                console.log(`transfer wbnb hash is ${transferWbnbTx.hash}`);
                await transferWbnbTx.wait();
                console.log(`transfer wbnb success`);
            }

            tokenAddress = process.env.WBNB_CONTRACT_ADDRESS || ''
        }

        const amountBigInt = await handleTokenApprove(tokenAddress, signer, userAddress, amount, aaveV3PoolAddress);

        if (amountBigInt instanceof Error) {
            throw amountBigInt;
        }

        // 存款到Aave（增加抵押物）
        console.log(`\n正在增加抵押物...`);
        
        // 获取当前gas价格
        const feeData = await provider.getFeeData();
        
        supplyTx = await aavePool.supply(
            tokenAddress,
            amountBigInt,
            userAddress,  // onBehalfOf，为自己增加抵押物
            0,  // referralCode，通常为0
            {
                gasLimit: 97195 ,  // 减小gas限制，避免超过区块gas限制
                gasPrice: 5000000000 // 动态设置gas价格
            }
        );
        
        console.log(`增加抵押物交易已提交，等待确认...`);
        console.log(`交易哈希: ${supplyTx.hash}`);
        await supplyTx.wait();
        console.log(`增加抵押物交易已确认`);

        // 确保代币设置为抵押品
        // await enableAssetAsCollateral(aavePool, tokenAddress, signer, aaveV3PoolAddress, aaveV3UiPoolDataProvider);

        // 检查增加抵押物后的账户状态
        const afterData = await aavePool.getUserAccountData(userAddress);
        console.log(`\n增加抵押物后的账户状态:`);
        console.log(`总抵押品: $${formatNumber(ethers.formatUnits(afterData.totalCollateralBase, 8))}`);
        console.log(`总债务: $${formatNumber(ethers.formatUnits(afterData.totalDebtBase, 8))}`);
        console.log(`健康因子: ${formatNumber(ethers.formatUnits(afterData.healthFactor, 18))}`);

        // 计算变化
        const collateralChange = parseFloat(ethers.formatUnits(afterData.totalCollateralBase - beforeData.totalCollateralBase, 8));
        const healthFactorChange = parseFloat(ethers.formatUnits(afterData.healthFactor - beforeData.healthFactor, 18));

        console.log(`\n变化总结:`);
        console.log(`抵押品增加: $${formatNumber(collateralChange)}`);
        console.log(`健康因子变化: ${formatNumber(healthFactorChange)}`);
        
        if (collateralChange > 0) {
            console.log(`操作成功: 已成功增加 ${amount} 作为抵押物`);
        } else {
            console.log(`警告: 抵押品价值未增加，请检查操作是否成功`);
        }

        console.log(`\n=== 操作完成 ===`);
        
        return {
            success: true,
            transactionHash: supplyTx.hash,
            // amountAdded: `${amount} ${symbol}`,
            amountAdded: `${amount}`,
            collateralChange: `$${formatNumber(collateralChange)}`,
            healthFactorAfter: formatNumber(ethers.formatUnits(afterData.healthFactor, 18))
        };
        
    } catch (error) {
        console.error("增加抵押物时出错:", error);
        
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
        };
    }
}

async function handleTokenApprove(
    tokenAddress:string,
    signer:ethers.Wallet,
    userAddress:string,
    amount:string,
    aaveV3PoolAddress:string | Addressable
) : Promise<bigint|Error>{

    try {
        // 创建代币合约实例
        const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            signer
        );

        // 获取代币信息
        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        
        // 确保amount是有效的数字，防止无效的BigNumberish字符串错误
        if (isNaN(parseFloat(amount))) {
            return new Error(`无效的金额: ${amount}`);
        }
        
        // 安全地解析金额为BigInt
        let amountBigInt: bigint;
        try {
            amountBigInt = ethers.parseUnits(amount, decimals);
        } catch (error) {
            console.error(`解析金额时出错:`, error);
            return new Error(`无法将 ${amount} 转换为代币单位: ${error instanceof Error ? error.message : String(error)}`);
        }

        console.log(`代币: ${symbol}`);
        console.log(`增加金额: ${amount} ${symbol} (${amountBigInt} wei)`);

        // 检查余额是否足够
        const balance = await tokenContract.balanceOf(userAddress);
        console.log(balance)

        if (balance < amountBigInt) {
            console.error(`余额不足: 需要 ${ethers.formatUnits(amountBigInt, decimals)} ${symbol}, 但只有 ${ethers.formatUnits(balance, decimals)} ${symbol}`);
            return new Error(`余额不足: 需要 ${ethers.formatUnits(amountBigInt, decimals)} ${symbol}, 但只有 ${ethers.formatUnits(balance, decimals)} ${symbol}`);
        }

        // 检查授权是否足够
        const allowance = await tokenContract.allowance(userAddress, aaveV3PoolAddress);
        if (allowance < amountBigInt) {
            console.log(`授权不足，正在授权...`);
            
            // 授权Aave池合约使用代币
            const approveTx = await tokenContract.approve(
                aaveV3PoolAddress,
                ethers.MaxUint256 // 授权最大值，避免未来再次授权
            );
            
            console.log(`授权交易已提交，等待确认...`);
            console.log(`交易哈希: ${approveTx.hash}`);
            await approveTx.wait();
            console.log(`授权交易已确认`);
        } else {
            console.log(`授权充足，无需再次授权`);
        }
        return amountBigInt;
    } catch(error:any) {
        console.error("token 授权出错:", error);
        
        return error instanceof Error ? error : new Error('未知错误');
    }
}

/**
 * 确保资产被设置为抵押品
 */
async function enableAssetAsCollateral(aavePool:ethers.Contract, tokenAddress:string, signer:ethers.Wallet, aaveV3PoolAddress:string | Addressable, aaveV3UiPoolDataProvider:string | undefined) {
    try {
        // 创建UI数据提供者合约实例，用于检查抵押品状态
        if (!aaveV3UiPoolDataProvider) {
            throw new Error("AAVE_V3_UI_POOL_DATA_PROVIDER 地址未定义");
        }
        const uiDataProvider = new ethers.Contract(
            aaveV3UiPoolDataProvider,
            PROTOCOL_DATA_PROVIDER_ABI,
            signer
        );

        // 获取所有资产数据
        const { reservesData } = await uiDataProvider.getReservesData(aaveV3PoolAddress);

        // 查找目标代币数据
        const tokenData = reservesData.find((reserve: { underlyingAsset: string; }[]) => 
            reserve[0].underlyingAsset.toLowerCase() === tokenAddress.toLowerCase()
        );

        if (tokenData && tokenData[0].usageAsCollateralEnabled) {
            // 如果代币可以作为抵押品，确保为当前用户启用
            console.log(`正在确保 ${await (new ethers.Contract(tokenAddress, ERC20_ABI, signer)).symbol()} 设置为抵押品...`);
            const tx = await aavePool.setUserUseReserveAsCollateral(tokenAddress, true);
            await tx.wait();
            console.log(`已成功将资产设置为抵押品`);
        } else if (tokenData && !tokenData[0].usageAsCollateralEnabled) {
            console.log(`警告: 此代币不能作为抵押品使用`);
        } else {
            console.log(`警告: 无法找到代币信息`);
        }
    } catch (error) {
        console.error("设置抵押品状态时出错:", error);
    }
}

// 主函数 - 示例用法
async function main() {
    // 配置参数
    // const providerUrl = 'https://ava-testnet.public.blastapi.io/ext/bc/C/rpc'; // 使用自己的RPC URL
    // const privateKey = '5e8e037cb29329c4f686e2aaba1c43b54e9bbc98139d8574beb5c230be6227ab'; // 实际使用时请确保安全存储私钥
    // const tokenAddress = '0xd00ae08403B9bbb9124bB305C09058E32C39A48c'; // WETH地址
    const tokenAddress = ''
    const amount = '0.0001'; // 增加0.01 WETH作为抵押物
    // const amount = '1000000';
    
    try {
        if (!process.env.AAVE_V3_POOL_ADDRESS || !process.env.AAVE_V3_UI_POOL_DATA_PROVIDER) {
            throw new Error("缺少必要的环境变量: AAVE_V3_POOL_ADDRESS 或 AAVE_V3_UI_POOL_DATA_PROVIDER");
        }
        if (!process.env.PROVIDER_URL || !process.env.PRIVATE_KEY) {
            throw new Error("缺少必要的环境变量: PROVIDER_URL, PRIVATE_KEY 或 TOKEN_ADDRESS");
        }
        
        const result = await increaseCollateral(
            process.env.PROVIDER_URL, 
            process.env.PRIVATE_KEY, 
            tokenAddress, 
            amount,
            process.env.AAVE_V3_POOL_ADDRESS,
            process.env.AAVE_V3_UI_POOL_DATA_PROVIDER
        );
        console.log("操作结果:", result);
    } catch (error) {
        console.error("执行脚本时出错:", error);
    }
}

// 如果直接运行此脚本，则执行主函数
// if (require.main === module) {
//     main();
// }
main();

// 导出函数，允许其他模块调用
export { increaseCollateral };
