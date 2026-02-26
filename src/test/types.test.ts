import { describe, it, expect } from 'vitest';
import { AirdropMode, AirdropStatus } from '../types/index.js';
import type { AirdropRecipient, AirdropInfo, ParsedCSVRow, ClaimParams, CreateAirdropParams } from '../types/index.js';

describe('AirdropMode', () => {
    it('has DIRECT value', () => {
        expect(AirdropMode.DIRECT).toBe('direct');
    });

    it('has CLAIM value', () => {
        expect(AirdropMode.CLAIM).toBe('claim');
    });

    it('has exactly 2 values', () => {
        expect(Object.keys(AirdropMode)).toHaveLength(2);
    });
});

describe('AirdropStatus', () => {
    it('has PENDING value', () => {
        expect(AirdropStatus.PENDING).toBe('pending');
    });

    it('has ACTIVE value', () => {
        expect(AirdropStatus.ACTIVE).toBe('active');
    });

    it('has COMPLETED value', () => {
        expect(AirdropStatus.COMPLETED).toBe('completed');
    });

    it('has WITHDRAWN value', () => {
        expect(AirdropStatus.WITHDRAWN).toBe('withdrawn');
    });

    it('has exactly 4 values', () => {
        expect(Object.keys(AirdropStatus)).toHaveLength(4);
    });
});

describe('Type structures', () => {
    it('AirdropRecipient has correct shape', () => {
        const recipient: AirdropRecipient = {
            address: '0xaabb',
            amount: '100',
        };
        expect(recipient.address).toBe('0xaabb');
        expect(recipient.amount).toBe('100');
    });

    it('ParsedCSVRow valid row', () => {
        const row: ParsedCSVRow = {
            address: '0xaabb',
            amount: '100',
            valid: true,
        };
        expect(row.valid).toBe(true);
        expect(row.error).toBeUndefined();
    });

    it('ParsedCSVRow invalid row with error', () => {
        const row: ParsedCSVRow = {
            address: 'bad',
            amount: '0',
            valid: false,
            error: 'Invalid address',
        };
        expect(row.valid).toBe(false);
        expect(row.error).toBe('Invalid address');
    });

    it('AirdropInfo has all fields', () => {
        const info: AirdropInfo = {
            id: 1n,
            creator: '0xaabb',
            tokenAddress: '0xccdd',
            totalAmount: 1000n,
            claimedAmount: 500n,
            recipientCount: 10n,
            claimedCount: 5n,
            merkleRoot: new Uint8Array(32),
            mode: AirdropMode.CLAIM,
            status: AirdropStatus.ACTIVE,
            createdAt: 123456n,
            decimals: 18,
        };
        expect(info.id).toBe(1n);
        expect(info.mode).toBe('claim');
        expect(info.status).toBe('active');
        expect(info.decimals).toBe(18);
    });

    it('ClaimParams has correct shape', () => {
        const params: ClaimParams = {
            airdropId: 0n,
            amount: 100n,
            proof: [new Uint8Array(32)],
        };
        expect(params.proof).toHaveLength(1);
    });

    it('CreateAirdropParams has correct shape', () => {
        const params: CreateAirdropParams = {
            tokenAddress: '0xaabb',
            recipients: [{ address: '0xccdd', amount: '100' }],
            mode: AirdropMode.DIRECT,
        };
        expect(params.recipients).toHaveLength(1);
        expect(params.mode).toBe('direct');
    });
});
