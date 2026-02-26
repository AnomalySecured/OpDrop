import { describe, it, expect } from 'vitest';
import { networks } from '@btc-vision/bitcoin';
import {
    NETWORK_CONFIGS,
    DEFAULT_NETWORK,
    getNetworkConfig,
    getNetworkId,
} from '../config/networks.js';

describe('NETWORK_CONFIGS', () => {
    it('has mainnet config', () => {
        const config = NETWORK_CONFIGS.get(networks.bitcoin);
        expect(config).toBeDefined();
        expect(config!.name).toBe('Mainnet');
        expect(config!.rpcUrl).toBe('https://mainnet.opnet.org');
        expect(config!.explorerUrl).toBe('https://explorer.opnet.org');
    });

    it('has testnet config', () => {
        const config = NETWORK_CONFIGS.get(networks.opnetTestnet);
        expect(config).toBeDefined();
        expect(config!.name).toBe('OPNet Testnet');
        expect(config!.rpcUrl).toBe('https://testnet.opnet.org');
        expect(config!.explorerUrl).toBe('https://testnet-explorer.opnet.org');
    });

    it('has exactly 2 configs', () => {
        expect(NETWORK_CONFIGS.size).toBe(2);
    });
});

describe('DEFAULT_NETWORK', () => {
    it('defaults to opnetTestnet', () => {
        expect(DEFAULT_NETWORK).toBe(networks.opnetTestnet);
    });
});

describe('getNetworkConfig', () => {
    it('returns mainnet config', () => {
        const config = getNetworkConfig(networks.bitcoin);
        expect(config.name).toBe('Mainnet');
        expect(config.rpcUrl).toContain('mainnet');
    });

    it('returns testnet config', () => {
        const config = getNetworkConfig(networks.opnetTestnet);
        expect(config.name).toBe('OPNet Testnet');
        expect(config.rpcUrl).toContain('testnet');
    });

    it('throws for unsupported network', () => {
        const fakeNetwork = { ...networks.bitcoin, bech32: 'fake' };
        expect(() => getNetworkConfig(fakeNetwork)).toThrow('Unsupported network');
    });
});

describe('getNetworkId', () => {
    it('returns "mainnet" for bitcoin', () => {
        expect(getNetworkId(networks.bitcoin)).toBe('mainnet');
    });

    it('returns "testnet" for opnetTestnet', () => {
        expect(getNetworkId(networks.opnetTestnet)).toBe('testnet');
    });

    it('returns "unknown" for unrecognized network', () => {
        const fakeNetwork = { ...networks.bitcoin, bech32: 'fake' };
        expect(getNetworkId(fakeNetwork)).toBe('unknown');
    });
});
