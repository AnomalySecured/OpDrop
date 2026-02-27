import { providerService } from '../services/ProviderService.js';
import type { Network } from '@btc-vision/bitcoin';

/**
 * Check if a string is already a hex public key (0x-prefixed).
 */
export function isHexPublicKey(value: string): boolean {
    return /^0x[0-9a-fA-F]{40,130}$/.test(value);
}

/**
 * Check if a string looks like a Bitcoin/OPNet address (bc1, tb1, op1, bcrt1, opt1).
 */
export function isBitcoinAddress(value: string): boolean {
    return /^(bc1|tb1|bcrt1|op1|opt1)[a-zA-HJ-NP-Z0-9]+$/.test(value);
}

export interface ResolvedAddress {
    original: string;
    publicKey: string | null;
    error: string | null;
}

/**
 * Resolve a single address to a hex public key.
 * - If already 0x-prefixed hex, pass through.
 * - If a Bitcoin/OPNet address, call provider.getPublicKeyInfo() to look up the public key.
 *   getPublicKeyInfo returns an Address object — we call .toHex() to get the hex key.
 * - Returns null publicKey if resolution fails.
 */
export async function resolveToPublicKey(
    addressOrKey: string,
    network: Network,
): Promise<ResolvedAddress> {
    const trimmed = addressOrKey.trim();

    if (isHexPublicKey(trimmed)) {
        return { original: trimmed, publicKey: trimmed, error: null };
    }

    if (!isBitcoinAddress(trimmed)) {
        return {
            original: trimmed,
            publicKey: null,
            error: 'Invalid format. Use a hex public key (0x...) or Bitcoin address.',
        };
    }

    try {
        const provider = providerService.getProvider(network);
        // getPublicKeyInfo(address, isContract) returns Address object
        const addressObj = await provider.getPublicKeyInfo(trimmed, false);

        if (addressObj) {
            // Address extends Uint8Array and has .toHex() for the hashed MLDSA key
            const hex = addressObj.toHex();
            if (hex && hex !== '0x' + '00'.repeat(32)) {
                return { original: trimmed, publicKey: hex, error: null };
            }
        }

        return {
            original: trimmed,
            publicKey: null,
            error: `No public key found on-chain for ${trimmed}. Enter the hex public key manually.`,
        };
    } catch {
        return {
            original: trimmed,
            publicKey: null,
            error: `Could not resolve ${trimmed}. Enter the hex public key manually.`,
        };
    }
}

/**
 * Resolve multiple addresses to public keys in parallel.
 * Returns results in the same order as input.
 */
export async function resolveAllToPublicKeys(
    addresses: string[],
    network: Network,
): Promise<ResolvedAddress[]> {
    return Promise.all(addresses.map((addr) => resolveToPublicKey(addr, network)));
}
