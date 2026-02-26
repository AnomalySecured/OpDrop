import { networks, type Network } from '@btc-vision/bitcoin';

export interface NetworkConfig {
    name: string;
    rpcUrl: string;
    explorerUrl: string;
}

export const NETWORK_CONFIGS: Map<Network, NetworkConfig> = new Map([
    [networks.bitcoin, {
        name: 'Mainnet',
        rpcUrl: 'https://mainnet.opnet.org',
        explorerUrl: 'https://explorer.opnet.org',
    }],
    [networks.opnetTestnet, {
        name: 'OPNet Testnet',
        rpcUrl: 'https://testnet.opnet.org',
        explorerUrl: 'https://testnet-explorer.opnet.org',
    }],
]);

export const DEFAULT_NETWORK: Network = networks.opnetTestnet;

export function getNetworkConfig(network: Network): NetworkConfig {
    const config = NETWORK_CONFIGS.get(network);
    if (!config) {
        throw new Error('Unsupported network');
    }
    return config;
}

export function getNetworkId(network: Network): string {
    if (network === networks.bitcoin) return 'mainnet';
    if (network === networks.opnetTestnet) return 'testnet';
    return 'unknown';
}
