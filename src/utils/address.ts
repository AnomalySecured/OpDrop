import { providerService } from '../services/ProviderService.js';
import type { Network } from '@btc-vision/bitcoin';

/**
 * Check if a string is already a hex public key (0x-prefixed).
 */
export function isHexPublicKey(value: string): boolean {
    return /^0x[0-9a-fA-F]{40,130}$/.test(value);
}

/**
 * Check if a string looks like a Bitcoin/OPNet address.
 */
export function isBitcoinAddress(value: string): boolean {
    return /^(bc1|tb1|bcrt1|op1|opt1)[a-zA-HJ-NP-Z0-9]+$/.test(value);
}

/**
 * Check if a string is an OPNet contract address (op1/opt1 prefix).
 */
export function isContractAddress(value: string): boolean {
    return /^(op1|opt1)[a-zA-HJ-NP-Z0-9]+$/.test(value);
}

export interface ResolvedAddress {
    original: string;
    publicKey: string | null;
    error: string | null;
}

const ZERO_HASH = '0x' + '00'.repeat(32);

/**
 * Try to extract a hex public key from an Address object returned by getPublicKeyInfo.
 */
function extractHex(addressObj: { toHex?: () => string; tweakedToHex?: () => string; toString?: () => string }): string | null {
    // Try toHex first (MLDSA hash)
    try {
        const hex = addressObj.toHex?.();
        if (hex && hex !== ZERO_HASH && hex !== '0x') return hex;
    } catch { /* ignore */ }

    // Try tweakedToHex (classical tweaked pubkey)
    try {
        const tweaked = addressObj.tweakedToHex?.();
        if (tweaked && tweaked !== ZERO_HASH && tweaked !== '0x') {
            return tweaked.startsWith('0x') ? tweaked : `0x${tweaked}`;
        }
    } catch { /* ignore */ }

    return null;
}

/**
 * Resolve a single address to a hex public key.
 * - If already 0x-prefixed hex, pass through.
 * - If a Bitcoin/OPNet address, call provider.getPublicKeyInfo() to look up the public key.
 * - For contract addresses (op1/opt1), uses isContract=true.
 * - For user addresses (bc1/tb1), uses isContract=false.
 * - If one fails, tries the other.
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

    const isContract = isContractAddress(trimmed);

    try {
        const provider = providerService.getProvider(network);

        // Try with the detected isContract value first
        try {
            const addressObj = await provider.getPublicKeyInfo(trimmed, isContract);
            if (addressObj) {
                const hex = extractHex(addressObj);
                if (hex) return { original: trimmed, publicKey: hex, error: null };
            }
        } catch { /* fall through to try opposite */ }

        // If that failed, try the opposite
        try {
            const addressObj = await provider.getPublicKeyInfo(trimmed, !isContract);
            if (addressObj) {
                const hex = extractHex(addressObj);
                if (hex) return { original: trimmed, publicKey: hex, error: null };
            }
        } catch { /* both failed */ }

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
