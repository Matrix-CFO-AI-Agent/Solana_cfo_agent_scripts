const express = require('express');
import * as https from 'https';
// import { getUserAaveHistory } from './history_transaction';
import { getAllTokenByAddress } from './all_token_metadata';
const { analyzeUserAccount } = require('./liquidation');
const { increaseCollateral } = require('./increase_collateral');
const dotenv = require('dotenv');
const fs = require('fs')
dotenv.config();

const app = express();
app.use(express.json());
const port = 3000;


function safeJsonStringify(obj: any): string {
    return JSON.stringify(obj, (_, value) => 
      typeof value === 'bigint' ? value.toString() : value
    );
  }

app.get('/dorahacks/liquidationRiskAnalysis', async (req, res) => {

    const userAddress = req.query.userAddress

    const analysis = await analyzeUserAccount(process.env.PROVIDER_URL, userAddress)

    const respData = {
        userAddress:userAddress,
        totalCollateral:analysis.totalCollateral,              //总抵押物
        totalDebt:analysis.totalDebt,                          //总债务
        availableBorrows:analysis.availableBorrows,           //可借额度
        liquidationThreshold:analysis.liquidationThreshold,  //清算阈值
        loanToValue:analysis.loanToValue,                    //贷款价值比
        healthFactor:analysis.healthFactor,                  //健康因子
        level:analysis.status.level,                         //状态等级
        risk:analysis.status.risk,                           //风险等级
        suggestion:analysis.status.suggestion                //建议
    }

    res.json(respData)
});


app.post('/dorahacks/increaseCollateral', async (req, res) => {
    try {
        const { privateKey, tokenAddress, amount } = req.body;
        
        // 参数验证
        if (!privateKey || !amount) {
            return res.status(400).json({
                success: false,
                error: '缺少必需参数: privateKey, amount 是必需的'
            });
        }

        // 从环境变量获取配置
        const providerUrl = process.env.PROVIDER_URL;
        const aaveV3PoolAddress = process.env.AAVE_V3_POOL_ADDRESS;
        const aaveV3UiPoolDataProvider = process.env.AAVE_V3_UI_POOL_DATA_PROVIDER;

        if (!providerUrl || !aaveV3PoolAddress) {
            return res.status(500).json({
                success: false,
                error: '服务器配置错误: 缺少必要的环境变量'
            });
        }

        // 调用增加抵押物函数
        const result = await increaseCollateral(
            providerUrl,
            privateKey,
            tokenAddress,
            amount,
            aaveV3PoolAddress,
            aaveV3UiPoolDataProvider
        );
        // 返回结果
        return res.json(result);
    } catch (error) {
        console.error('处理增加抵押物请求时出错:', error);
        return res.status(500).json({
            success: false,
            error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}`
        });
    }
});

app.get('/dorahacks/alltokenBalance', async (req, res) => {

    const userAddress = req.query.userAddress;

    if (!userAddress || typeof userAddress !== 'string') {
        return res.status(400).json({
            success: false,
            error: '缺少必需参数: userAddress 是必需的'
        });
    }

    if (!process.env.ALCHEMY_API_KEY) {
        return res.status(500).json({
            success: false,
            error: '服务器配置错误: 缺少必要的环境变量 PROVIDER_URL'
        });
    }

    const alltokenBalance = await getAllTokenByAddress(userAddress, process.env.ALCHEMY_API_KEY);
    
    return res.json(alltokenBalance);
})


app.get('/dorahacks/getUserAaveHistory', async (req, res) => {

    const userAddress = req.query.userAddress;

    if (!userAddress || typeof userAddress !== 'string') {
        return res.status(400).json({
            success: false,
            error: '缺少必需参数: userAddress 是必需的'
        });
    }

    if (!process.env.PROVIDER_URL) {
        return res.status(500).json({
            success: false,
            error: '服务器配置错误: 缺少必要的环境变量 PROVIDER_URL'
        });
    }

    const userAaveHistory = await getUserAaveHistory(process.env.PROVIDER_URL, userAddress)
    
    return res.json(userAaveHistory);
});


// https.createServer(options,app).listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});