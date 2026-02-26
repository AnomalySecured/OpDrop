import type { ParsedCSVRow } from '../types/index.js';

/**
 * Parse a CSV string of airdrop recipients.
 * Accepted formats:
 *   address,amount
 *   address amount
 *   address\tamount
 *
 * First row is skipped if it looks like a header.
 */
export function parseAirdropCSV(raw: string): ParsedCSVRow[] {
    const lines = raw.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    // Detect and skip header
    const firstLine = lines[0].toLowerCase();
    const startIdx = (firstLine.includes('address') || firstLine.includes('recipient')) ? 1 : 0;

    const results: ParsedCSVRow[] = [];

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by comma, space, or tab
        const parts = line.split(/[,\s\t]+/).filter(Boolean);

        if (parts.length < 2) {
            results.push({
                address: parts[0] || '',
                amount: '0',
                valid: false,
                error: `Line ${i + 1}: Expected address and amount, got ${parts.length} field(s)`,
            });
            continue;
        }

        const address = parts[0].trim();
        const amountStr = parts[1].trim();

        // Validate address format
        const addressError = validateAddress(address);
        if (addressError) {
            results.push({ address, amount: amountStr, valid: false, error: `Line ${i + 1}: ${addressError}` });
            continue;
        }

        // Validate amount
        const amountError = validateAmount(amountStr);
        if (amountError) {
            results.push({ address, amount: amountStr, valid: false, error: `Line ${i + 1}: ${amountError}` });
            continue;
        }

        // Check for duplicates
        const duplicate = results.find((r) => r.address.toLowerCase() === address.toLowerCase() && r.valid);
        if (duplicate) {
            results.push({
                address,
                amount: amountStr,
                valid: false,
                error: `Line ${i + 1}: Duplicate address "${address}"`,
            });
            continue;
        }

        results.push({ address, amount: amountStr, valid: true });
    }

    return results;
}

function validateAddress(addr: string): string | null {
    if (!addr) return 'Address is empty';
    // Accept hex public keys (0x...) and Bitcoin addresses (bc1, tb1, etc)
    if (addr.startsWith('0x')) {
        if (addr.length < 10) return 'Public key too short';
        if (!/^0x[0-9a-fA-F]+$/.test(addr)) return 'Invalid hex public key';
        return null;
    }
    // Bitcoin address basic format check
    if (/^(bc1|tb1|bcrt1|op1)[a-zA-HJ-NP-Z0-9]+$/.test(addr)) {
        return null;
    }
    return 'Invalid address format. Use hex public key (0x...) or Bitcoin address';
}

function validateAmount(amount: string): string | null {
    if (!amount) return 'Amount is empty';
    // Allow integer or decimal
    if (!/^\d+(\.\d+)?$/.test(amount)) return 'Amount must be a positive number';
    const num = parseFloat(amount);
    if (num <= 0) return 'Amount must be greater than zero';
    if (!isFinite(num)) return 'Amount is not a valid number';
    return null;
}

/**
 * Convert a decimal amount string to the smallest unit bigint given decimals.
 */
export function amountToSmallestUnit(amount: string, decimals: number): bigint {
    const parts = amount.split('.');
    const whole = parts[0];
    let fraction = parts[1] || '';

    if (fraction.length > decimals) {
        fraction = fraction.slice(0, decimals);
    } else {
        fraction = fraction.padEnd(decimals, '0');
    }

    return BigInt(whole + fraction);
}

/**
 * Format a smallest-unit bigint to a human-readable decimal string.
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
    const str = amount.toString().padStart(decimals + 1, '0');
    const whole = str.slice(0, str.length - decimals) || '0';
    const fraction = str.slice(str.length - decimals);
    const trimmed = fraction.replace(/0+$/, '');
    return trimmed ? `${whole}.${trimmed}` : whole;
}
