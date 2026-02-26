import { getContract, OP_20_ABI } from 'opnet';
import type { IOP20Contract } from 'opnet';
import type { Network } from '@btc-vision/bitcoin';
import { Address } from '@btc-vision/transaction';
import { providerService } from './ProviderService.js';
import { DROPOP_ABI } from '../abi/DropOpABI.js';
import type { IDropOpContract } from '../types/contract.js';

/**
 * Contract instance cache. getContract is called ONCE per address per network.
 */
class ContractService {
    private static instance: ContractService;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly contracts: Map<string, any> = new Map();

    private constructor() {}

    public static getInstance(): ContractService {
        if (!ContractService.instance) {
            ContractService.instance = new ContractService();
        }
        return ContractService.instance;
    }

    public getTokenContract(address: string, network: Network, sender?: string) {
        const key = `token:${network}:${address}:${sender ?? ''}`;
        if (!this.contracts.has(key)) {
            const provider = providerService.getProvider(network);
            const senderAddr = sender ? Address.fromString(sender) : undefined;
            const contract = getContract<IOP20Contract>(address, OP_20_ABI, provider, network, senderAddr);
            this.contracts.set(key, contract);
        }
        return this.contracts.get(key) as ReturnType<typeof getContract<IOP20Contract>>;
    }

    public getDropOpContract(address: string, network: Network, sender?: string) {
        const key = `dropop:${network}:${address}:${sender ?? ''}`;
        if (!this.contracts.has(key)) {
            const provider = providerService.getProvider(network);
            const senderAddr = sender ? Address.fromString(sender) : undefined;
            const contract = getContract<IDropOpContract>(address, DROPOP_ABI, provider, network, senderAddr);
            this.contracts.set(key, contract);
        }
        return this.contracts.get(key) as ReturnType<typeof getContract<IDropOpContract>>;
    }

    public clearCache(): void {
        this.contracts.clear();
    }
}

export const contractService = ContractService.getInstance();
