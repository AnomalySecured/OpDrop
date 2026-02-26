import { useState, useCallback } from 'react';
import { networks, type Network } from '@btc-vision/bitcoin';
import { contractService } from '../services/ContractService.js';
import { providerService } from '../services/ProviderService.js';
import { DEFAULT_NETWORK } from '../config/index.js';

export function useNetwork() {
    const [network, setNetwork] = useState<Network>(DEFAULT_NETWORK);

    const switchNetwork = useCallback((newNetwork: Network) => {
        contractService.clearCache();
        providerService.clearCache();
        setNetwork(newNetwork);
    }, []);

    const networkName = network === networks.bitcoin ? 'Mainnet' : 'OPNet Testnet';

    return {
        network,
        switchNetwork,
        networkName,
    };
}
