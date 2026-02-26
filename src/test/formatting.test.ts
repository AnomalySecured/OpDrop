import { describe, it, expect } from 'vitest';
import { formatAddress, formatPercent, formatCompact } from '../utils/formatting.js';

describe('formatAddress', () => {
    it('truncates long address', () => {
        const addr = '0x1234567890abcdef1234567890abcdef12345678';
        const result = formatAddress(addr);
        expect(result).toBe('0x1234...345678');
        expect(result.length).toBeLessThan(addr.length);
    });

    it('returns short address unchanged', () => {
        const addr = '0xabcd';
        expect(formatAddress(addr, 3)).toBe('0xabcd');
    });

    it('returns empty for empty input', () => {
        expect(formatAddress('')).toBe('');
    });

    it('respects custom char count', () => {
        const addr = '0x1234567890abcdef1234567890abcdef12345678';
        const result = formatAddress(addr, 4);
        expect(result).toBe('0x12...5678');
    });
});

describe('formatPercent', () => {
    it('formats normal value', () => {
        expect(formatPercent(45.678)).toBe('45.7%');
    });

    it('clamps to 100%', () => {
        expect(formatPercent(150)).toBe('100.0%');
    });

    it('clamps to 0%', () => {
        expect(formatPercent(-10)).toBe('0.0%');
    });

    it('formats zero', () => {
        expect(formatPercent(0)).toBe('0.0%');
    });

    it('formats 100', () => {
        expect(formatPercent(100)).toBe('100.0%');
    });
});

describe('formatCompact', () => {
    it('formats millions', () => {
        expect(formatCompact(1500000n)).toBe('1.5M');
    });

    it('formats thousands', () => {
        expect(formatCompact(2500n)).toBe('2.5K');
    });

    it('formats small values', () => {
        expect(formatCompact(42n)).toBe('42');
    });

    it('formats zero', () => {
        expect(formatCompact(0n)).toBe('0');
    });
});
