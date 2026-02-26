import { networks, type Network } from '@btc-vision/bitcoin';

export interface ContractAddresses {
    dropOp: string;
}

const CONTRACT_ADDRESSES: Map<Network, ContractAddresses> = new Map([
    [networks.opnetTestnet, {
        dropOp: '', // Set after deployment
    }],
    [networks.bitcoin, {
        dropOp: '', // Set after deployment
    }],
]);

export function getContractAddress(
    contract: keyof ContractAddresses,
    network: Network,
): string {
    const addresses = CONTRACT_ADDRESSES.get(network);
    if (!addresses) {
        throw new Error('No addresses configured for this network');
    }
    const address = addresses[contract];
    if (!address) {
        throw new Error(`No ${contract} address configured for this network`);
    }
    return address;
}
