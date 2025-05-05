

const AAVE_V3_POOL_ABI = [
    "function deposit(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)",
    "function depositETH(address lendingPool, address onBehalfOf, uint16 referralCode) external payable",
    "function supply(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)",
    "function getUserAccountData(address user) external view returns (uint256 totalCollateralBase,uint256 totalDebtBase,uint256 availableBorrowsBase,uint256 currentLiquidationThreshold,uint256 ltv,uint256 healthFactor)",
    "function setUserUseReserveAsCollateral(address asset,bool useAsCollateral)",
    "function borrow(address asset,uint256 amount,uint256 interestRateMode,address onBehalfOf,uint16 referralCode)",
    "function withdraw(address asset,uint256 amount,address to)"
];

const BNB_TRANSFER_WBNB_ABI = [
    "function deposit() public payable", 
    "function withdraw(uint wad) public",
    "function balanceOf(address account) external view returns (uint256)"
]

// UI数据提供者ABI
const PROTOCOL_DATA_PROVIDER_ABI = [
    "function getAllReservesTokens() external view returns (tuple(string symbol,address tokenAddress)[] memory)",
    "function getReserveConfigurationData(address asset) external view returns (uint256 decimals,uint256 ltv,uint256 liquidationThreshold,uint256 liquidationBonus,uint256 reserveFactor,bool usageAsCollateralEnabled,bool borrowingEnabled,bool stableBorrowRateEnabled,bool isActive,bool isFrozen)"
];

// ERC20代币基础ABI
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)",
    "function allowance(address owner, address spender) external view returns (uint256)"
];


// Aave事件ABI
const AAVE_EVENTS_ABI = [
    // 存款事件
    "event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)",
    // 取款事件
    "event Withdraw(address indexed reserve, address indexed user, address indexed to, uint256 amount)",
    // 借款事件
    "event Borrow(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint8 interestRateMode, uint256 borrowRate, uint16 indexed referralCode)",
    // 还款事件
    "event Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)",
    // 清算事件
    "event LiquidationCall(address indexed collateralAsset, address indexed debtAsset, address indexed user, uint256 debtToCover, uint256 liquidatedCollateralAmount, address liquidator, bool receiveAToken)",
    // 利率交换事件
    "event SwapBorrowRateMode(address indexed reserve, address indexed user, uint8 interestRateMode)",
    // 抵押品启用/禁用事件
    "event ReserveUsedAsCollateralEnabled(address indexed reserve, address indexed user)",
    "event ReserveUsedAsCollateralDisabled(address indexed reserve, address indexed user)"
];

export { AAVE_V3_POOL_ABI, PROTOCOL_DATA_PROVIDER_ABI, AAVE_EVENTS_ABI ,ERC20_ABI,BNB_TRANSFER_WBNB_ABI};