import { ABIDataTypes, BitcoinAbiTypes } from 'opnet';
import type { BitcoinInterfaceAbi } from 'opnet';

/**
 * ABI for the DropOp airdrop contract.
 *
 * Methods:
 *   - createAirdrop(tokenAddress, merkleRoot, totalAmount, recipientCount) => airdropId
 *   - directAirdrop(tokenAddress, recipients[]) => airdropId
 *   - claim(airdropId, amount, proof[]) => bool
 *   - withdraw(airdropId) => withdrawnAmount
 *   - getAirdrop(airdropId) => AirdropInfo
 *   - getAirdropCount() => count
 *   - hasClaimed(airdropId, claimer) => bool
 *   - getAirdropsByCreator(creator) => airdropIds[]
 */
export const DROPOP_ABI: BitcoinInterfaceAbi = [
    // === Write Methods ===
    {
        name: 'createAirdrop',
        type: BitcoinAbiTypes.Function,
        constant: false,
        inputs: [
            { name: 'tokenAddress', type: ABIDataTypes.ADDRESS },
            { name: 'merkleRoot', type: ABIDataTypes.BYTES32 },
            { name: 'totalAmount', type: ABIDataTypes.UINT256 },
            { name: 'recipientCount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
        ],
    },
    {
        name: 'directAirdrop',
        type: BitcoinAbiTypes.Function,
        constant: false,
        inputs: [
            { name: 'tokenAddress', type: ABIDataTypes.ADDRESS },
            { name: 'recipients', type: ABIDataTypes.ADDRESS_UINT256_TUPLE },
        ],
        outputs: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
        ],
    },
    {
        name: 'claim',
        type: BitcoinAbiTypes.Function,
        constant: false,
        inputs: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'amount', type: ABIDataTypes.UINT256 },
            { name: 'proof', type: ABIDataTypes.ARRAY_OF_BYTES },
        ],
        outputs: [
            { name: 'success', type: ABIDataTypes.BOOL },
        ],
    },
    {
        name: 'withdraw',
        type: BitcoinAbiTypes.Function,
        constant: false,
        inputs: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
        ],
        outputs: [
            { name: 'withdrawnAmount', type: ABIDataTypes.UINT256 },
        ],
    },

    // === Read Methods ===
    {
        name: 'getAirdrop',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
        ],
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
    },
    {
        name: 'getAirdropCount',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [],
        outputs: [
            { name: 'count', type: ABIDataTypes.UINT256 },
        ],
    },
    {
        name: 'hasClaimed',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'claimer', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [
            { name: 'claimed', type: ABIDataTypes.BOOL },
        ],
    },
    {
        name: 'getAirdropsByCreator',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [
            { name: 'creator', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [
            { name: 'airdropIds', type: ABIDataTypes.ARRAY_OF_UINT256 },
        ],
    },

    // === Events ===
    {
        name: 'AirdropCreated',
        type: BitcoinAbiTypes.Event,
        values: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'creator', type: ABIDataTypes.ADDRESS },
            { name: 'tokenAddress', type: ABIDataTypes.ADDRESS },
            { name: 'totalAmount', type: ABIDataTypes.UINT256 },
            { name: 'mode', type: ABIDataTypes.UINT8 },
        ],
    },
    {
        name: 'Claimed',
        type: BitcoinAbiTypes.Event,
        values: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'claimer', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
    },
    {
        name: 'Withdrawn',
        type: BitcoinAbiTypes.Event,
        values: [
            { name: 'airdropId', type: ABIDataTypes.UINT256 },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
    },
];
