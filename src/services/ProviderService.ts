import { JSONRpcProvider } from 'opnet';
import { networks, type Network } from '@btc-vision/bitcoin';
import { getNetworkConfig } from '../config/index.js';

/**
 * Singleton provider service. Never create multiple provider instances.
 */
class ProviderService {
    private static instance: ProviderService;
    private readonly providers: Map<string, JSONRpcProvider> = new Map();

    private constructor() {}

    public static getInstance(): ProviderService {
        if (!ProviderService.instance) {
            ProviderService.instance = new ProviderService();
        }
        return ProviderService.instance;
    }

    public getProvider(network: Network): JSONRpcProvider {
        const networkId = this.getNetworkId(network);
        if (!this.providers.has(networkId)) {
            const config = getNetworkConfig(network);
            const provider = new JSONRpcProvider({ url: config.rpcUrl, network });
            this.providers.set(networkId, provider);
        }
        return this.providers.get(networkId)!;
    }

    public clearCache(): void {
        this.providers.clear();
    }

    private getNetworkId(network: Network): string {
        if (network === networks.bitcoin) return 'mainnet';
        if (network === networks.opnetTestnet) return 'testnet';
        return 'unknown';
    }
}

export const providerService = ProviderService.getInstance();
