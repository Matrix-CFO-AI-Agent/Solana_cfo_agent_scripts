# Solana Lending 工具集

这个项目提供了一套与Solana Lending V3协议交互的工具，主要功能包括：

- 增加Sol代币作为抵押品
- 增加原生代币（如Sol）作为抵押品
- 查询用户在Solana上的交易历史记录

## 环境设置

1. 复制`.env.example`文件并重命名为`.env`
2. 在`.env`文件中填入你的配置信息：
   - 设置RPC节点URL（推荐使用Alchemy、Infura等高性能节点）
   - 确认合约地址（大多数情况下可以使用默认地址）
   - 根据需要调整其他参数

## 安装依赖

```bash
npm install
```

## 使用方法

### 启动服务

```bash
npm start
```

### API端点

#### 增加ERC20代币抵押

```
POST /increase-collateral
```

请求体示例：
```json
{
  "userAddress": "0x...",
  "tokenAddress": "0x...",
  "amount": "1000000000000000000"
}
```

#### 增加原生代币抵押

```
POST /increase-native-collateral
```

请求体示例：
```json
{
  "userAddress": "0x...",
  "amount": "1000000000000000000"
}
```

#### 获取用户历史记录

```
GET /user-history?address=0x...
```

## 故障排除

### RPC节点速率限制

如果遇到RPC节点速率限制问题，特别是在查询历史记录时：

1. 使用付费的RPC节点服务
2. 在`.env`文件中调整`BATCH_SIZE`参数（较小的批次大小可以避免速率限制，但查询时间会增加）
3. 设置适当的`START_BLOCK`值以减少需要扫描的区块范围

### 交易历史查询问题

如果历史记录查询没有返回完整结果：

1. 确认RPC节点支持`eth_getLogs`方法，并且没有施加严格的限制
2. 检查`.env`中的`START_BLOCK`设置是否合理（过低的值会扫描过多区块）
3. 增加批处理间的延迟时间（代码中`pauseBetweenBatches`参数）

