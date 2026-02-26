/**
 * Truncate an address for display: bc1q...abcd
 */
export function formatAddress(address: string, chars: number = 6): string {
    if (!address) return '';
    if (address.length <= chars * 2 + 3) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format a percentage with 1 decimal place.
 */
export function formatPercent(value: number): string {
    return `${Math.min(100, Math.max(0, value)).toFixed(1)}%`;
}

/**
 * Format a bigint as a compact number string.
 */
export function formatCompact(value: bigint): string {
    const num = Number(value);
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
}
