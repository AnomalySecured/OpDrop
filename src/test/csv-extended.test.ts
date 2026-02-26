import { describe, it, expect } from 'vitest';
import { parseAirdropCSV, amountToSmallestUnit, formatTokenAmount } from '../utils/csv.js';

describe('parseAirdropCSV - extended edge cases', () => {
    it('handles very large amounts', () => {
        const csv = '0xaabbccdd, 999999999999999999';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(true);
        expect(rows[0].amount).toBe('999999999999999999');
    });

    it('handles very small decimal amounts', () => {
        const csv = '0xaabbccdd, 0.000000000000000001';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(true);
    });

    it('handles leading/trailing whitespace in addresses', () => {
        const csv = '  0xaabbccdd  , 100';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].address).toBe('0xaabbccdd');
    });

    it('handles multiple commas (extra fields ignored)', () => {
        const csv = '0xaabbccdd, 100, extra, stuff';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(true);
        expect(rows[0].address).toBe('0xaabbccdd');
        expect(rows[0].amount).toBe('100');
    });

    it('flags non-numeric amounts', () => {
        const csv = '0xaabbccdd, abc';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(false);
    });

    it('flags amounts with multiple dots', () => {
        const csv = '0xaabbccdd, 1.2.3';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(false);
    });

    it('handles bcrt1 regtest addresses', () => {
        const csv = 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080, 100';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(true);
    });

    it('rejects empty amount field', () => {
        const csv = '0xaabbccdd,';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(false);
    });

    it('case-insensitive duplicate detection', () => {
        const csv = '0xAABBCCDD, 100\n0xaabbccdd, 200';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(2);
        expect(rows[0].valid).toBe(true);
        expect(rows[1].valid).toBe(false);
        expect(rows[1].error).toContain('Duplicate');
    });

    it('handles hex address with mixed case', () => {
        const csv = '0xAaBbCcDd, 100';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(true);
    });

    it('rejects short hex public key', () => {
        const csv = '0xab, 100';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(false);
        expect(rows[0].error).toContain('too short');
    });

    it('rejects hex with non-hex characters', () => {
        const csv = '0xaabbccddgg, 100';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(false);
        expect(rows[0].error).toContain('Invalid hex');
    });

    it('parses 1000 recipients', () => {
        const lines = Array.from({ length: 1000 }, (_, i) =>
            `0x${i.toString(16).padStart(10, '0')}, ${i + 1}`,
        );
        const csv = lines.join('\n');
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1000);
        expect(rows.filter((r) => r.valid)).toHaveLength(1000);
    });

    it('only skips header if it matches known patterns', () => {
        const csv = '0xaabbccdd, 100\n0x11223344, 200';
        const rows = parseAirdropCSV(csv);
        // First line is data, not header
        expect(rows).toHaveLength(2);
        expect(rows[0].address).toBe('0xaabbccdd');
    });

    it('skips header with "Recipient" uppercase', () => {
        const csv = 'Recipient,Amount\n0xaabbccdd,100';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].address).toBe('0xaabbccdd');
    });
});

describe('amountToSmallestUnit - extended', () => {
    it('handles 1 decimal token', () => {
        expect(amountToSmallestUnit('1.5', 1)).toBe(15n);
    });

    it('handles maximum precision', () => {
        expect(amountToSmallestUnit('0.123456789012345678', 18)).toBe(123456789012345678n);
    });

    it('handles zero', () => {
        expect(amountToSmallestUnit('0', 18)).toBe(0n);
    });

    it('handles large whole number with zero decimals', () => {
        expect(amountToSmallestUnit('1000000', 0)).toBe(1000000n);
    });

    it('truncates at 6 decimals', () => {
        expect(amountToSmallestUnit('1.1234567', 6)).toBe(1123456n);
    });

    it('pads fraction to match decimals', () => {
        expect(amountToSmallestUnit('1.1', 6)).toBe(1100000n);
    });

    it('handles amount "0.1" with 1 decimal', () => {
        expect(amountToSmallestUnit('0.1', 1)).toBe(1n);
    });

    it('handles "10" with 2 decimals', () => {
        expect(amountToSmallestUnit('10', 2)).toBe(1000n);
    });
});

describe('formatTokenAmount - extended', () => {
    it('formats 1 token with 8 decimals', () => {
        expect(formatTokenAmount(100000000n, 8)).toBe('1');
    });

    it('formats very small amount', () => {
        expect(formatTokenAmount(1n, 8)).toBe('0.00000001');
    });

    it('formats with 0 decimals', () => {
        expect(formatTokenAmount(42n, 0)).toBe('42');
    });

    it('formats with 1 decimal', () => {
        expect(formatTokenAmount(15n, 1)).toBe('1.5');
    });

    it('formats large number', () => {
        const large = 123456789000000000000000n; // 123456.789 with 18 decimals
        expect(formatTokenAmount(large, 18)).toBe('123456.789');
    });

    it('roundtrip: format(toSmallest(x)) === x', () => {
        const testCases = ['100', '1.5', '0.001', '1000.123456'];
        for (const tc of testCases) {
            const smallest = amountToSmallestUnit(tc, 18);
            const formatted = formatTokenAmount(smallest, 18);
            expect(formatted).toBe(tc);
        }
    });

    it('roundtrip with 8 decimals', () => {
        const testCases = ['1', '0.5', '0.00000001', '999.12345678'];
        for (const tc of testCases) {
            const smallest = amountToSmallestUnit(tc, 8);
            const formatted = formatTokenAmount(smallest, 8);
            expect(formatted).toBe(tc);
        }
    });
});
