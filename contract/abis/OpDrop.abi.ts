import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const OpDropEvents = [
    {
        name: 'AirdropCreated',
        values: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'creator', type: ABIDataTypes.ADDRESS },
            { name: 'tokenAddress', type: ABIDataTypes.ADDRESS },
            { name: 'totalAmount', type: ABIDataTypes.UINT256 },
            { name: 'mode', type: ABIDataTypes.UINT8 },
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'creator', type: ABIDataTypes.ADDRESS },
            { name: 'tokenAddress', type: ABIDataTypes.ADDRESS },
            { name: 'totalAmount', type: ABIDataTypes.UINT256 },
            { name: 'mode', type: ABIDataTypes.UINT8 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'Claimed',
        values: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'claimer', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT256 },
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'claimer', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'Withdrawn',
        values: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'amount', type: ABIDataTypes.UINT256 },
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
];

export const OpDropAbi = [
    {
        name: '_createAirdrop',
        inputs: [
            { name: 'tokenAddress', type: ABIDataTypes.ADDRESS },
            { name: 'merkleRoot', type: ABIDataTypes.BYTES32 },
            { name: 'totalAmount', type: ABIDataTypes.UINT256 },
            { name: 'recipientCount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'airdropId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_directAirdrop',
        inputs: [
            { name: 'tokenAddress', type: ABIDataTypes.ADDRESS },
            { name: 'recipients', type: ABIDataTypes.ADDRESS_UINT256_TUPLE },
        ],
        outputs: [{ name: 'airdropId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_claim',
        inputs: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'amount', type: ABIDataTypes.UINT256 },
            { name: 'proof', type: ABIDataTypes.ARRAY_OF_BYTES },
        ],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_withdraw',
        inputs: [{ name: 'airdropId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'withdrawnAmount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_getAirdrop',
        inputs: [{ name: 'airdropId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'creator', type: ABIDataTypes.ADDRESS },
            { name: 'tokenAddress', type: ABIDataTypes.ADDRESS },
            { name: 'totalAmount', type: ABIDataTypes.UINT256 },
            { name: 'claimedAmount', type: ABIDataTypes.UINT256 },
            { name: 'recipientCount', type: ABIDataTypes.UINT256 },
            { name: 'claimedCount', type: ABIDataTypes.UINT256 },
            { name: 'merkleRoot', type: ABIDataTypes.BYTES32 },
            { name: 'mode', type: ABIDataTypes.UINT8 },
            { name: 'status', type: ABIDataTypes.UINT8 },
            { name: 'createdAt', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_getAirdropCount',
        inputs: [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_hasClaimed',
        inputs: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'claimer', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [{ name: 'claimed', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_getAirdropsByCreator',
        inputs: [{ name: 'creator', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'airdropIds', type: ABIDataTypes.ARRAY_OF_UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...OpDropEvents,
    ...OP_NET_ABI,
];

export default OpDropAbi;
