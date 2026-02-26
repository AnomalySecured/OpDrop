import { describe, it, expect } from 'vitest';
import { formatAddress, formatPercent, formatCompact } from '../utils/formatting.js';

describe('formatAddress extended', () => {
    it('handles Bitcoin mainnet address', () => {
        const addr = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
        const result = formatAddress(addr, 6);
        expect(result).toBe('bc1qw5...v8f3t4');
    });

    it('handles Bitcoin testnet address', () => {
        const addr = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
        const result = formatAddress(addr, 6);
        expect(result).toBe('tb1qw5...xpjzsx');
    });

    it('handles 0x prefixed hex key', () => {
        const addr = '0x' + 'ab'.repeat(33);
        const result = formatAddress(addr, 8);
        expect(result.startsWith('0xababab')).toBe(true);
        expect(result.endsWith('abababab')).toBe(true);
        expect(result).toContain('...');
    });

    it('returns address unchanged when exactly at threshold', () => {
        // chars=3 means threshold is 3*2+3=9
        const addr = '123456789'; // length 9
        expect(formatAddress(addr, 3)).toBe('123456789');
    });

    it('truncates when 1 char over threshold', () => {
        const addr = '1234567890'; // length 10, threshold at 9 for chars=3
        expect(formatAddress(addr, 3)).toBe('123...890');
    });

    it('handles chars=1', () => {
        const addr = '0x1234567890';
        const result = formatAddress(addr, 1);
        expect(result).toBe('0...0');
    });

    it('handles very long address', () => {
        const addr = '0x' + 'f'.repeat(200);
        const result = formatAddress(addr);
        expect(result.length).toBeLessThan(addr.length);
        expect(result).toContain('...');
    });
});

describe('formatPercent extended', () => {
    it('formats 50.05 correctly', () => {
        // toFixed(1) rounds 50.05 to 50.0 due to floating point
        expect(formatPercent(50.05)).toBe('50.0%');
    });

    it('formats 99.99', () => {
        expect(formatPercent(99.99)).toBe('100.0%');
    });

    it('formats 0.01', () => {
        expect(formatPercent(0.01)).toBe('0.0%');
    });

    it('formats 0.05', () => {
        expect(formatPercent(0.05)).toBe('0.1%');
    });

    it('handles very large negative', () => {
        expect(formatPercent(-999)).toBe('0.0%');
    });

    it('handles very large positive', () => {
        expect(formatPercent(999)).toBe('100.0%');
    });
});

describe('formatCompact extended', () => {
    it('formats exactly 1000', () => {
        expect(formatCompact(1000n)).toBe('1.0K');
    });

    it('formats exactly 1000000', () => {
        expect(formatCompact(1000000n)).toBe('1.0M');
    });

    it('formats 999 (below K threshold)', () => {
        expect(formatCompact(999n)).toBe('999');
    });

    it('formats 999999 (below M threshold)', () => {
        expect(formatCompact(999999n)).toBe('1000.0K');
    });

    it('formats 10 million', () => {
        expect(formatCompact(10000000n)).toBe('10.0M');
    });

    it('formats 1', () => {
        expect(formatCompact(1n)).toBe('1');
    });

    it('formats very large number', () => {
        expect(formatCompact(1000000000n)).toBe('1000.0M');
    });
});
