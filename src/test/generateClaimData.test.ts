import { describe, it, expect } from 'vitest';
import { generateClaimData } from '../hooks/useDropOp.js';
import { verifyMerkleProof, getMerkleRoot, hashLeaf } from '../utils/merkle.js';
import { amountToSmallestUnit } from '../utils/csv.js';
import type { AirdropRecipient } from '../types/index.js';

describe('generateClaimData', () => {
    const recipients: AirdropRecipient[] = [
        { address: '0x' + 'aa'.repeat(32), amount: '100' },
        { address: '0x' + 'bb'.repeat(32), amount: '200' },
        { address: '0x' + 'cc'.repeat(32), amount: '300' },
    ];
    const decimals = 18;

    it('returns proof data for a valid recipient', () => {
        const result = generateClaimData(recipients, '0x' + 'aa'.repeat(32), decimals);
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(amountToSmallestUnit('100', decimals));
        expect(result!.proof.length).toBeGreaterThanOrEqual(1);
        expect(result!.leaf.length).toBe(32);
    });

    it('returns null for unknown address', () => {
        const result = generateClaimData(recipients, '0x' + 'ff'.repeat(32), decimals);
        expect(result).toBeNull();
    });

    it('proof verifies against merkle root', () => {
        const result = generateClaimData(recipients, '0x' + 'bb'.repeat(32), decimals);
        expect(result).not.toBeNull();

        const leaves = recipients.map((r) => {
            const amt = amountToSmallestUnit(r.amount, decimals);
            return hashLeaf(r.address, amt);
        });
        const root = getMerkleRoot(leaves);

        expect(verifyMerkleProof(result!.leaf, result!.proof, root)).toBe(true);
    });

    it('generates valid proof for every recipient', () => {
        const leaves = recipients.map((r) => {
            const amt = amountToSmallestUnit(r.amount, decimals);
            return hashLeaf(r.address, amt);
        });
        const root = getMerkleRoot(leaves);

        for (const r of recipients) {
            const data = generateClaimData(recipients, r.address, decimals);
            expect(data).not.toBeNull();
            expect(verifyMerkleProof(data!.leaf, data!.proof, root)).toBe(true);
        }
    });

    it('is case-insensitive for address matching', () => {
        const addr = '0x' + 'AA'.repeat(32);
        const result = generateClaimData(recipients, addr, decimals);
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(amountToSmallestUnit('100', decimals));
    });

    it('returns correct amounts for each recipient', () => {
        for (const r of recipients) {
            const data = generateClaimData(recipients, r.address, decimals);
            expect(data).not.toBeNull();
            expect(data!.amount).toBe(amountToSmallestUnit(r.amount, decimals));
        }
    });

    it('handles single recipient', () => {
        const single = [recipients[0]];
        const result = generateClaimData(single, recipients[0].address, decimals);
        expect(result).not.toBeNull();
        // Single leaf = root, proof is empty
        expect(result!.proof.length).toBe(0);
    });

    it('handles two recipients', () => {
        const two = recipients.slice(0, 2);
        for (const r of two) {
            const data = generateClaimData(two, r.address, decimals);
            expect(data).not.toBeNull();
            expect(data!.proof.length).toBe(1);
        }
    });

    it('handles large recipient list', () => {
        const large: AirdropRecipient[] = Array.from({ length: 50 }, (_, i) => ({
            address: '0x' + i.toString(16).padStart(64, '0'),
            amount: ((i + 1) * 10).toString(),
        }));

        const leaves = large.map((r) => {
            const amt = amountToSmallestUnit(r.amount, decimals);
            return hashLeaf(r.address, amt);
        });
        const root = getMerkleRoot(leaves);

        // Test a sample
        for (let i = 0; i < 50; i += 5) {
            const data = generateClaimData(large, large[i].address, decimals);
            expect(data).not.toBeNull();
            expect(verifyMerkleProof(data!.leaf, data!.proof, root)).toBe(true);
        }
    });

    it('proof fails with wrong amount', () => {
        const data = generateClaimData(recipients, recipients[0].address, decimals);
        expect(data).not.toBeNull();

        const leaves = recipients.map((r) => {
            const amt = amountToSmallestUnit(r.amount, decimals);
            return hashLeaf(r.address, amt);
        });
        const root = getMerkleRoot(leaves);

        // Create a leaf with wrong amount
        const wrongLeaf = hashLeaf(recipients[0].address, 999n);
        expect(verifyMerkleProof(wrongLeaf, data!.proof, root)).toBe(false);
    });

    it('handles different decimal values', () => {
        for (const dec of [0, 6, 8, 18]) {
            const data = generateClaimData(recipients, recipients[0].address, dec);
            expect(data).not.toBeNull();
            expect(data!.amount).toBe(amountToSmallestUnit('100', dec));
        }
    });
});
