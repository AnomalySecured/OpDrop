import { describe, it, expect } from 'vitest';
import { networks } from '@btc-vision/bitcoin';
import { getContractAddress } from '../config/contracts.js';

describe('getContractAddress', () => {
    it('throws for empty testnet dropOp address', () => {
        // Addresses are empty until deployment
        expect(() => getContractAddress('dropOp', networks.opnetTestnet)).toThrow(
            'No dropOp address configured',
        );
    });

    it('throws for empty mainnet dropOp address', () => {
        expect(() => getContractAddress('dropOp', networks.bitcoin)).toThrow(
            'No dropOp address configured',
        );
    });

    it('throws for unsupported network', () => {
        const fakeNetwork = { ...networks.bitcoin, bech32: 'fake' };
        expect(() => getContractAddress('dropOp', fakeNetwork)).toThrow(
            'No addresses configured',
        );
    });
});
