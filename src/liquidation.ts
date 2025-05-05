const { ethers } = require('ethers');
import { AAVE_V3_POOL_ABI } from './constants';

const dotenv = require('dotenv');
dotenv.config();

const MAX_UINT256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";


// 格式化大数字为可读格式
function formatNumber(num: string | number, decimals = 2) {
    if (num.toString() === MAX_UINT256) {
        return "0";
    }
    return parseFloat(num.toString()).toFixed(decimals);
}

// 计算健康因子并分析账户状态
async function analyzeUserAccount(providerUrl: string, userAddress: string) {
    try {
        const provider = new ethers.JsonRpcProvider(providerUrl);
        // 创建合约实例
        const aavePool = new ethers.Contract(
            process.env.AAVE_V3_POOL_ADDRESS,
            AAVE_V3_POOL_ABI,
            provider
        );

        // 获取用户账户数据
        const userData = await aavePool.getUserAccountData(userAddress);

        console.log("userData", userData);
        
        // 解析返回数据
        const {
            totalCollateralBase,
            totalDebtBase,
            availableBorrowsBase,
            currentLiquidationThreshold,
            ltv,
            healthFactor
        } = userData;

        // 转换为可读格式
        const formattedData = {
            totalCollateral: formatNumber(totalCollateralBase),
            totalDebt: formatNumber(totalDebtBase),
            availableBorrows: formatNumber(availableBorrowsBase),
            liquidationThreshold: formatNumber(currentLiquidationThreshold),
            loanToValue: formatNumber(ltv),
            healthFactor: formatNumber(healthFactor)
        };

        // 分析健康状态
        const healthStatus = analyzeHealthFactor(parseFloat(formattedData.healthFactor));
        
        return {
            ...formattedData,
            status: healthStatus
        };
    } catch (error) {
        console.error('分析用户账户时出错:', error);
        throw error;
    }
}

// 分析健康因子状态
function analyzeHealthFactor(healthFactor:number) {
    if (healthFactor === 0) {
        return {
            level: '无债务',
            risk: '无风险',
            suggestion: '账户无债务，可以安全借款'
        };
    } else if (healthFactor > 1.5) {
        return {
            level: '健康',
            risk: '低风险',
            suggestion: '账户状态良好，可以继续操作'
        };
    } else if (healthFactor > 1) {
        return {
            level: '警告',
            risk: '中等风险',
            suggestion: '建议增加抵押品或减少债务'
        };
    } else {
        return {
            level: '危险',
            risk: '高风险',
            suggestion: '立即增加抵押品或偿还债务，否则可能被清算'
        };
    }
}

// 打印分析结果
function printAnalysis(userAddress, data) {
    console.log('\n=== Aave V3 账户分析报告 ===');
    console.log(`用户地址: ${userAddress}`);
    console.log('------------------------');
    console.log(`总抵押品: $${data.totalCollateral}`);
    console.log(`总债务: $${data.totalDebt}`);
    console.log(`可借额度: $${data.availableBorrows}`);
    console.log(`清算阈值: ${data.liquidationThreshold}%`);
    console.log(`贷款价值比: ${data.loanToValue}%`);
    console.log(`健康因子: ${data.healthFactor}`);
    console.log('------------------------');
    console.log(`状态等级: ${data.status.level}`);
    console.log(`风险等级: ${data.status.risk}`);
    console.log(`建议: ${data.status.suggestion}`);
    console.log('========================\n');
}

// 主函数
async function main() {
    const userAddress = '0xC33D53d4ACa86A8e40c050E92D23E3842789641e';
    
    try {
        if (!process.env.PROVIDER_URL) {
            throw new Error('PROVIDER_URL 环境变量未设置');
        }
        const analysis = await analyzeUserAccount(process.env.PROVIDER_URL, userAddress);
        printAnalysis(userAddress, analysis);
    } catch (error) {
        console.error('执行分析时出错:', error);
    }
}

// 运行分析
main();

export { analyzeUserAccount }