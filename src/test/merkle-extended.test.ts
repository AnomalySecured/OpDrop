import { describe, it, expect } from 'vitest';
import {
    hashLeaf,
    buildMerkleTree,
    getMerkleRoot,
    getMerkleProof,
    verifyMerkleProof,
    sha256,
    sha256Async,
    bytesToHex,
} from '../utils/merkle.js';

describe('sha256 extended', () => {
    it('matches async version', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5]);
        const syncResult = sha256(data);
        const asyncResult = await sha256Async(data);
        expect(bytesToHex(syncResult)).toBe(bytesToHex(asyncResult));
    });

    it('matches async for empty input', async () => {
        const data = new Uint8Array(0);
        const syncResult = sha256(data);
        const asyncResult = await sha256Async(data);
        expect(bytesToHex(syncResult)).toBe(bytesToHex(asyncResult));
    });

    it('matches async for large input', async () => {
        const data = new Uint8Array(1024).fill(0xab);
        const syncResult = sha256(data);
        const asyncResult = await sha256Async(data);
        expect(bytesToHex(syncResult)).toBe(bytesToHex(asyncResult));
    });

    it('different inputs produce different hashes', () => {
        const a = sha256(new Uint8Array([1]));
        const b = sha256(new Uint8Array([2]));
        expect(bytesToHex(a)).not.toBe(bytesToHex(b));
    });

    it('hashes known multi-block message', () => {
        // "abc" has a well-known SHA-256
        const abc = new TextEncoder().encode('abc');
        const result = sha256(abc);
        expect(bytesToHex(result)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    });

    it('hashes message longer than 64 bytes (multi-block)', () => {
        const long = new TextEncoder().encode('a'.repeat(100));
        const result = sha256(long);
        expect(result.length).toBe(32);
        // Just verify it doesn't crash and produces consistent output
        const result2 = sha256(long);
        expect(bytesToHex(result)).toBe(bytesToHex(result2));
    });
});

describe('hashLeaf extended', () => {
    it('handles zero amount', () => {
        const hash = hashLeaf('0x' + 'aa'.repeat(32), 0n);
        expect(hash.length).toBe(32);
    });

    it('handles very large amount', () => {
        const hash = hashLeaf('0x' + 'aa'.repeat(32), 2n ** 256n - 1n);
        expect(hash.length).toBe(32);
    });

    it('handles short hex address', () => {
        const hash = hashLeaf('0xabcdef', 100n);
        expect(hash.length).toBe(32);
    });

    it('handles long hex address', () => {
        const hash = hashLeaf('0x' + 'ab'.repeat(64), 100n);
        expect(hash.length).toBe(32);
    });
});

describe('buildMerkleTree extended', () => {
    it('handles 7 leaves (non-power-of-2)', () => {
        const leaves = Array.from({ length: 7 }, (_, i) =>
            hashLeaf('0x' + i.toString(16).padStart(64, '0'), BigInt(i * 100)),
        );
        const tree = buildMerkleTree(leaves);
        expect(tree[tree.length - 1]).toHaveLength(1);
    });

    it('handles 8 leaves (power-of-2)', () => {
        const leaves = Array.from({ length: 8 }, (_, i) =>
            hashLeaf('0x' + i.toString(16).padStart(64, '0'), BigInt(i * 100)),
        );
        const tree = buildMerkleTree(leaves);
        expect(tree[tree.length - 1]).toHaveLength(1);
        expect(tree[0]).toHaveLength(8);
    });

    it('handles 1 leaf', () => {
        const leaf = hashLeaf('0x' + 'aa'.repeat(32), 100n);
        const tree = buildMerkleTree([leaf]);
        expect(tree).toHaveLength(1);
        expect(tree[0]).toHaveLength(1);
    });

    it('tree layers decrease in size', () => {
        const leaves = Array.from({ length: 16 }, (_, i) =>
            hashLeaf('0x' + i.toString(16).padStart(64, '0'), BigInt(i * 100)),
        );
        const tree = buildMerkleTree(leaves);
        for (let i = 1; i < tree.length; i++) {
            expect(tree[i].length).toBeLessThanOrEqual(tree[i - 1].length);
        }
    });

    it('sorted leaves produce same root regardless of input order', () => {
        const a = hashLeaf('0x' + 'aa'.repeat(32), 100n);
        const b = hashLeaf('0x' + 'bb'.repeat(32), 200n);
        const c = hashLeaf('0x' + 'cc'.repeat(32), 300n);

        const root1 = getMerkleRoot([a, b, c]);
        const root2 = getMerkleRoot([c, a, b]);
        const root3 = getMerkleRoot([b, c, a]);

        expect(bytesToHex(root1)).toBe(bytesToHex(root2));
        expect(bytesToHex(root2)).toBe(bytesToHex(root3));
    });
});

describe('getMerkleProof extended', () => {
    it('proof length is log2(n) for power-of-2 trees', () => {
        for (const n of [2, 4, 8, 16]) {
            const leaves = Array.from({ length: n }, (_, i) =>
                hashLeaf('0x' + i.toString(16).padStart(64, '0'), BigInt(i + 1)),
            );
            const proof = getMerkleProof(leaves, leaves[0]);
            expect(proof.length).toBeLessThanOrEqual(Math.ceil(Math.log2(n)));
        }
    });

    it('every proof element is 32 bytes', () => {
        const leaves = Array.from({ length: 10 }, (_, i) =>
            hashLeaf('0x' + i.toString(16).padStart(64, '0'), BigInt(i + 1)),
        );
        const proof = getMerkleProof(leaves, leaves[3]);
        for (const elem of proof) {
            expect(elem.length).toBe(32);
        }
    });
});

describe('verifyMerkleProof extended', () => {
    it('rejects empty proof for multi-leaf tree', () => {
        const leaves = [
            hashLeaf('0x' + 'aa'.repeat(32), 100n),
            hashLeaf('0x' + 'bb'.repeat(32), 200n),
        ];
        const root = getMerkleRoot(leaves);
        // Empty proof with the correct leaf will not produce correct root
        // (unless single leaf tree, but this is 2 leaves)
        expect(verifyMerkleProof(leaves[0], [], root)).toBe(false);
    });

    it('accepts empty proof for single-leaf tree', () => {
        const leaf = hashLeaf('0x' + 'aa'.repeat(32), 100n);
        const root = getMerkleRoot([leaf]);
        expect(verifyMerkleProof(leaf, [], root)).toBe(true);
    });

    it('rejects proof with extra element', () => {
        const leaves = [
            hashLeaf('0x' + 'aa'.repeat(32), 100n),
            hashLeaf('0x' + 'bb'.repeat(32), 200n),
        ];
        const root = getMerkleRoot(leaves);
        const proof = getMerkleProof(leaves, leaves[0]);
        // Add extra element
        const extendedProof = [...proof, sha256(new Uint8Array([99]))];
        expect(verifyMerkleProof(leaves[0], extendedProof, root)).toBe(false);
    });

    it('stress test: 200 leaves, all proofs valid', () => {
        const leaves = Array.from({ length: 200 }, (_, i) =>
            hashLeaf('0x' + i.toString(16).padStart(64, '0'), BigInt((i + 1) * 1000)),
        );
        const root = getMerkleRoot(leaves);

        for (let i = 0; i < 200; i++) {
            const proof = getMerkleProof(leaves, leaves[i]);
            expect(verifyMerkleProof(leaves[i], proof, root)).toBe(true);
        }
    });
});
