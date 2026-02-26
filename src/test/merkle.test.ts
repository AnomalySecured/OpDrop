import { describe, it, expect } from 'vitest';
import {
    hashLeaf,
    hashPair,
    buildMerkleTree,
    getMerkleRoot,
    getMerkleProof,
    verifyMerkleProof,
    bytesToHex,
    sha256,
} from '../utils/merkle.js';

describe('sha256', () => {
    it('hashes empty input correctly', () => {
        const result = sha256(new Uint8Array(0));
        const hex = bytesToHex(result);
        // SHA-256 of empty string
        expect(hex).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('hashes known string correctly', () => {
        const input = new TextEncoder().encode('hello');
        const result = sha256(input);
        const hex = bytesToHex(result);
        expect(hex).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('produces 32-byte output', () => {
        const result = sha256(new Uint8Array([1, 2, 3]));
        expect(result.length).toBe(32);
    });
});

describe('hashLeaf', () => {
    it('produces deterministic 32-byte hash', () => {
        const addr = '0x' + 'ab'.repeat(32);
        const amount = 1000n;

        const hash1 = hashLeaf(addr, amount);
        const hash2 = hashLeaf(addr, amount);

        expect(hash1.length).toBe(32);
        expect(bytesToHex(hash1)).toBe(bytesToHex(hash2));
    });

    it('different addresses produce different hashes', () => {
        const hash1 = hashLeaf('0x' + 'aa'.repeat(32), 100n);
        const hash2 = hashLeaf('0x' + 'bb'.repeat(32), 100n);
        expect(bytesToHex(hash1)).not.toBe(bytesToHex(hash2));
    });

    it('different amounts produce different hashes', () => {
        const addr = '0x' + 'aa'.repeat(32);
        const hash1 = hashLeaf(addr, 100n);
        const hash2 = hashLeaf(addr, 200n);
        expect(bytesToHex(hash1)).not.toBe(bytesToHex(hash2));
    });

    it('handles address without 0x prefix', () => {
        const hash1 = hashLeaf('0x' + 'ab'.repeat(32), 100n);
        const hash2 = hashLeaf('ab'.repeat(32), 100n);
        expect(bytesToHex(hash1)).toBe(bytesToHex(hash2));
    });
});

describe('hashPair', () => {
    it('is commutative (sorted pair hashing)', () => {
        const a = sha256(new Uint8Array([1]));
        const b = sha256(new Uint8Array([2]));

        const hash1 = hashPair(a, b);
        const hash2 = hashPair(b, a);

        expect(bytesToHex(hash1)).toBe(bytesToHex(hash2));
    });

    it('produces 32-byte output', () => {
        const a = sha256(new Uint8Array([1]));
        const b = sha256(new Uint8Array([2]));
        expect(hashPair(a, b).length).toBe(32);
    });
});

describe('buildMerkleTree', () => {
    it('handles empty leaves', () => {
        const tree = buildMerkleTree([]);
        expect(tree).toHaveLength(1);
        expect(tree[0]).toHaveLength(0);
    });

    it('handles single leaf', () => {
        const leaf = hashLeaf('0x' + 'aa'.repeat(32), 100n);
        const tree = buildMerkleTree([leaf]);
        expect(tree).toHaveLength(1);
        expect(bytesToHex(tree[0][0])).toBe(bytesToHex(leaf));
    });

    it('handles two leaves', () => {
        const leaf1 = hashLeaf('0x' + 'aa'.repeat(32), 100n);
        const leaf2 = hashLeaf('0x' + 'bb'.repeat(32), 200n);
        const tree = buildMerkleTree([leaf1, leaf2]);
        expect(tree).toHaveLength(2);
        expect(tree[0]).toHaveLength(2);
        expect(tree[1]).toHaveLength(1); // root
    });

    it('handles three leaves (odd count)', () => {
        const leaves = [
            hashLeaf('0x' + 'aa'.repeat(32), 100n),
            hashLeaf('0x' + 'bb'.repeat(32), 200n),
            hashLeaf('0x' + 'cc'.repeat(32), 300n),
        ];
        const tree = buildMerkleTree(leaves);
        expect(tree.length).toBeGreaterThanOrEqual(2);
        expect(tree[tree.length - 1]).toHaveLength(1); // root is single
    });

    it('handles power-of-two leaves', () => {
        const leaves = Array.from({ length: 4 }, (_, i) =>
            hashLeaf('0x' + i.toString(16).padStart(2, '0').repeat(32), BigInt(i * 100)),
        );
        const tree = buildMerkleTree(leaves);
        expect(tree[tree.length - 1]).toHaveLength(1);
    });
});

describe('getMerkleRoot', () => {
    it('returns zero bytes for empty', () => {
        const root = getMerkleRoot([]);
        expect(root.length).toBe(32);
        expect(root.every((b) => b === 0)).toBe(true);
    });

    it('returns leaf for single entry', () => {
        const leaf = hashLeaf('0x' + 'aa'.repeat(32), 100n);
        const root = getMerkleRoot([leaf]);
        expect(bytesToHex(root)).toBe(bytesToHex(leaf));
    });

    it('is deterministic regardless of input order', () => {
        const leaf1 = hashLeaf('0x' + 'aa'.repeat(32), 100n);
        const leaf2 = hashLeaf('0x' + 'bb'.repeat(32), 200n);

        const root1 = getMerkleRoot([leaf1, leaf2]);
        const root2 = getMerkleRoot([leaf2, leaf1]);

        expect(bytesToHex(root1)).toBe(bytesToHex(root2));
    });
});

describe('getMerkleProof + verifyMerkleProof', () => {
    it('generates valid proof for each leaf in a 2-leaf tree', () => {
        const leaf1 = hashLeaf('0x' + 'aa'.repeat(32), 100n);
        const leaf2 = hashLeaf('0x' + 'bb'.repeat(32), 200n);
        const leaves = [leaf1, leaf2];
        const root = getMerkleRoot(leaves);

        for (const leaf of leaves) {
            const proof = getMerkleProof(leaves, leaf);
            expect(proof.length).toBeGreaterThanOrEqual(1);
            expect(verifyMerkleProof(leaf, proof, root)).toBe(true);
        }
    });

    it('generates valid proofs for all leaves in a 5-leaf tree', () => {
        const leaves = Array.from({ length: 5 }, (_, i) =>
            hashLeaf('0x' + (i + 10).toString(16).padStart(2, '0').repeat(32), BigInt((i + 1) * 1000)),
        );
        const root = getMerkleRoot(leaves);

        for (const leaf of leaves) {
            const proof = getMerkleProof(leaves, leaf);
            expect(verifyMerkleProof(leaf, proof, root)).toBe(true);
        }
    });

    it('generates valid proofs for all leaves in a 100-leaf tree', () => {
        const leaves = Array.from({ length: 100 }, (_, i) =>
            hashLeaf(
                '0x' + i.toString(16).padStart(64, '0'),
                BigInt((i + 1) * 500),
            ),
        );
        const root = getMerkleRoot(leaves);

        // Test a sample of leaves
        for (let i = 0; i < 100; i += 10) {
            const proof = getMerkleProof(leaves, leaves[i]);
            expect(verifyMerkleProof(leaves[i], proof, root)).toBe(true);
        }
    });

    it('rejects proof with wrong leaf', () => {
        const leaf1 = hashLeaf('0x' + 'aa'.repeat(32), 100n);
        const leaf2 = hashLeaf('0x' + 'bb'.repeat(32), 200n);
        const leaves = [leaf1, leaf2];
        const root = getMerkleRoot(leaves);

        const proof = getMerkleProof(leaves, leaf1);
        // Verify with wrong leaf should fail
        const fakeLeaf = hashLeaf('0x' + 'cc'.repeat(32), 100n);
        expect(verifyMerkleProof(fakeLeaf, proof, root)).toBe(false);
    });

    it('rejects proof with wrong root', () => {
        const leaf1 = hashLeaf('0x' + 'aa'.repeat(32), 100n);
        const leaf2 = hashLeaf('0x' + 'bb'.repeat(32), 200n);
        const leaves = [leaf1, leaf2];

        const proof = getMerkleProof(leaves, leaf1);
        const fakeRoot = sha256(new Uint8Array([99]));
        expect(verifyMerkleProof(leaf1, proof, fakeRoot)).toBe(false);
    });

    it('rejects proof with tampered proof element', () => {
        const leaves = Array.from({ length: 4 }, (_, i) =>
            hashLeaf('0x' + (i + 10).toString(16).padStart(2, '0').repeat(32), BigInt(i * 100 + 100)),
        );
        const root = getMerkleRoot(leaves);
        const proof = getMerkleProof(leaves, leaves[0]);

        // Tamper with proof
        if (proof.length > 0) {
            const tampered = [...proof];
            tampered[0] = sha256(new Uint8Array([255]));
            expect(verifyMerkleProof(leaves[0], tampered, root)).toBe(false);
        }
    });

    it('throws when leaf not in tree', () => {
        const leaf1 = hashLeaf('0x' + 'aa'.repeat(32), 100n);
        const leaf2 = hashLeaf('0x' + 'bb'.repeat(32), 200n);
        const fakeLeaf = hashLeaf('0x' + 'cc'.repeat(32), 300n);

        expect(() => getMerkleProof([leaf1, leaf2], fakeLeaf)).toThrow('Leaf not found');
    });
});

describe('bytesToHex', () => {
    it('converts empty array', () => {
        expect(bytesToHex(new Uint8Array(0))).toBe('');
    });

    it('converts single byte', () => {
        expect(bytesToHex(new Uint8Array([255]))).toBe('ff');
        expect(bytesToHex(new Uint8Array([0]))).toBe('00');
        expect(bytesToHex(new Uint8Array([16]))).toBe('10');
    });

    it('converts multiple bytes', () => {
        expect(bytesToHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe('deadbeef');
    });
});
