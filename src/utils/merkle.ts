/**
 * Merkle tree utilities for airdrop claim verification.
 * Builds a binary merkle tree from recipient+amount leaves.
 * Compatible with on-chain verification in the DropOp contract.
 */

/**
 * Hash a single leaf: SHA-256(address || amount as 32-byte big-endian)
 */
export function hashLeaf(address: string, amount: bigint): Uint8Array {
    const addressBytes = hexToBytes(address.startsWith('0x') ? address.slice(2) : address);
    const amountBytes = bigintToBytes32(amount);
    const combined = new Uint8Array(addressBytes.length + 32);
    combined.set(addressBytes, 0);
    combined.set(amountBytes, addressBytes.length);
    return sha256(combined);
}

/**
 * Hash two nodes together: SHA-256(sortedConcat(a, b))
 * Sorting ensures the same root regardless of order.
 */
export function hashPair(a: Uint8Array, b: Uint8Array): Uint8Array {
    const sorted = compareBytes(a, b) <= 0 ? [a, b] : [b, a];
    const combined = new Uint8Array(64);
    combined.set(sorted[0], 0);
    combined.set(sorted[1], 32);
    return sha256(combined);
}

/**
 * Build a merkle tree from leaves. Returns all layers (bottom to top).
 */
export function buildMerkleTree(leaves: Uint8Array[]): Uint8Array[][] {
    if (leaves.length === 0) {
        return [[]];
    }

    // Sort leaves for deterministic tree
    const sorted = [...leaves].sort(compareBytes);
    const layers: Uint8Array[][] = [sorted];

    let current = sorted;
    while (current.length > 1) {
        const next: Uint8Array[] = [];
        for (let i = 0; i < current.length; i += 2) {
            if (i + 1 < current.length) {
                next.push(hashPair(current[i], current[i + 1]));
            } else {
                // Odd leaf promoted
                next.push(current[i]);
            }
        }
        layers.push(next);
        current = next;
    }

    return layers;
}

/**
 * Get the merkle root from a set of leaves.
 */
export function getMerkleRoot(leaves: Uint8Array[]): Uint8Array {
    if (leaves.length === 0) {
        return new Uint8Array(32);
    }
    const tree = buildMerkleTree(leaves);
    return tree[tree.length - 1][0];
}

/**
 * Generate a merkle proof for a specific leaf.
 */
export function getMerkleProof(leaves: Uint8Array[], targetLeaf: Uint8Array): Uint8Array[] {
    const tree = buildMerkleTree(leaves);
    const proof: Uint8Array[] = [];

    let index = tree[0].findIndex((l) => compareBytes(l, targetLeaf) === 0);
    if (index === -1) {
        throw new Error('Leaf not found in tree');
    }

    for (let layer = 0; layer < tree.length - 1; layer++) {
        const isRight = index % 2 === 1;
        const siblingIndex = isRight ? index - 1 : index + 1;

        if (siblingIndex < tree[layer].length) {
            proof.push(tree[layer][siblingIndex]);
        }

        index = Math.floor(index / 2);
    }

    return proof;
}

/**
 * Verify a merkle proof against a root.
 */
export function verifyMerkleProof(
    leaf: Uint8Array,
    proof: Uint8Array[],
    root: Uint8Array,
): boolean {
    let computed = leaf;
    for (const sibling of proof) {
        computed = hashPair(computed, sibling);
    }
    return compareBytes(computed, root) === 0;
}

// --- Internal helpers ---

function compareBytes(a: Uint8Array, b: Uint8Array): number {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
}

function bigintToBytes32(value: bigint): Uint8Array {
    const hex = value.toString(16).padStart(64, '0');
    return hexToBytes(hex);
}

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 using Web Crypto (sync wrapper with pre-computed).
 * For the browser we use the SubtleCrypto API.
 */
export async function sha256Async(data: Uint8Array): Promise<Uint8Array> {
    const buf = await crypto.subtle.digest('SHA-256', data as ArrayBufferView<ArrayBuffer>);
    return new Uint8Array(buf);
}

/**
 * Synchronous SHA-256 using a simple JS implementation.
 * This avoids async issues in merkle tree building.
 */
export function sha256(data: Uint8Array): Uint8Array {
    return sha256Sync(data);
}

// Minimal synchronous SHA-256 implementation for merkle tree building
function sha256Sync(message: Uint8Array): Uint8Array {
    const K: number[] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
        0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
        0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
        0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
        0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
        0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
        0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
        0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];

    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

    const msgLen = message.length;
    const bitLen = msgLen * 8;
    const padLen = ((msgLen + 9 + 63) & ~63);
    const padded = new Uint8Array(padLen);
    padded.set(message);
    padded[msgLen] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padLen - 4, bitLen, false);

    for (let offset = 0; offset < padLen; offset += 64) {
        const w = new Int32Array(64);
        for (let i = 0; i < 16; i++) {
            w[i] = view.getUint32(offset + i * 4, false);
        }
        for (let i = 16; i < 64; i++) {
            const s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3));
            const s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10));
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }

        let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

        for (let i = 0; i < 64; i++) {
            const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
            const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) | 0;

            h = g; g = f; f = e; e = (d + temp1) | 0;
            d = c; c = b; b = a; a = (temp1 + temp2) | 0;
        }

        h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
        h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }

    const result = new Uint8Array(32);
    const rv = new DataView(result.buffer);
    rv.setUint32(0, h0, false); rv.setUint32(4, h1, false);
    rv.setUint32(8, h2, false); rv.setUint32(12, h3, false);
    rv.setUint32(16, h4, false); rv.setUint32(20, h5, false);
    rv.setUint32(24, h6, false); rv.setUint32(28, h7, false);
    return result;
}

function rotr(x: number, n: number): number {
    return (x >>> n) | (x << (32 - n));
}
