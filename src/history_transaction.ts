import unmarshalDocs from '@api/unmarshal-docs';

async function getTransactionHistory(userAddress: string) {
    // if (!process.env.UNMARSHAL_API_KEY) {
    //     throw new Error('UNMARSHAL_API_KEY is not defined');
    // }
    unmarshalDocs.auth('OBNXpJu82SEiagh14wAM3uYOUOYONWjUOhoEkrpl');
    const transactionHistory = await unmarshalDocs.getV3ChainAddressAddressTransactions({
        page: 1,
        pageSize: 200000,
        chain: 'bsc',
        address: '0x7a4eAA2393c06C79786cb5cff70Dc1174C763c37'
    })
    console.log(transactionHistory)
}

getTransactionHistory(process.env.USER_ADDRESS || '')
