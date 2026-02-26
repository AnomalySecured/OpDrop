import { describe, it, expect } from 'vitest';
import { parseAirdropCSV, amountToSmallestUnit, formatTokenAmount } from '../utils/csv.js';

describe('parseAirdropCSV', () => {
    it('parses comma-separated format', () => {
        const csv = '0xaabbccdd, 100\n0x11223344, 250';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(2);
        expect(rows[0].valid).toBe(true);
        expect(rows[0].address).toBe('0xaabbccdd');
        expect(rows[0].amount).toBe('100');
        expect(rows[1].valid).toBe(true);
        expect(rows[1].address).toBe('0x11223344');
        expect(rows[1].amount).toBe('250');
    });

    it('parses space-separated format', () => {
        const csv = '0xaabbccdd 100\n0x11223344 250';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(2);
        expect(rows.every((r) => r.valid)).toBe(true);
    });

    it('parses tab-separated format', () => {
        const csv = '0xaabbccdd\t100\n0x11223344\t250';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(2);
        expect(rows.every((r) => r.valid)).toBe(true);
    });

    it('skips header row', () => {
        const csv = 'address,amount\n0xaabbccdd,100\n0x11223344,250';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(2);
        expect(rows[0].address).toBe('0xaabbccdd');
    });

    it('skips header with "recipient"', () => {
        const csv = 'recipient,amount\n0xaabbccdd,100';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].address).toBe('0xaabbccdd');
    });

    it('returns empty for empty input', () => {
        expect(parseAirdropCSV('')).toHaveLength(0);
        expect(parseAirdropCSV('  \n  ')).toHaveLength(0);
    });

    it('flags invalid lines with too few fields', () => {
        const csv = '0xaabbccdd';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(false);
        expect(rows[0].error).toContain('Expected address and amount');
    });

    it('flags invalid address format', () => {
        const csv = 'not_valid_addr, 100';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(false);
        expect(rows[0].error).toContain('Invalid address');
    });

    it('flags negative amounts', () => {
        const csv = '0xaabbccdd, -100';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(false);
    });

    it('flags zero amounts', () => {
        const csv = '0xaabbccdd, 0';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(false);
        expect(rows[0].error).toContain('greater than zero');
    });

    it('flags duplicate addresses', () => {
        const csv = '0xaabbccdd, 100\n0xaabbccdd, 200';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(2);
        expect(rows[0].valid).toBe(true);
        expect(rows[1].valid).toBe(false);
        expect(rows[1].error).toContain('Duplicate');
    });

    it('accepts Bitcoin addresses', () => {
        const csv = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4, 100';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(true);
    });

    it('accepts testnet addresses', () => {
        const csv = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx, 100';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(true);
    });

    it('accepts op1 contract addresses', () => {
        const csv = 'op1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4, 100';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(true);
    });

    it('accepts decimal amounts', () => {
        const csv = '0xaabbccdd, 100.5';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].valid).toBe(true);
        expect(rows[0].amount).toBe('100.5');
    });

    it('handles Windows-style line endings', () => {
        const csv = '0xaabbccdd, 100\r\n0x11223344, 200';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(2);
        expect(rows.every((r) => r.valid)).toBe(true);
    });

    it('skips blank lines', () => {
        const csv = '0xaabbccdd, 100\n\n\n0x11223344, 200';
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(2);
    });

    it('handles mixed valid and invalid rows', () => {
        const csv = `0xaabbccddeeff1122, 100\ninvalid_stuff, 200\n0x99887766554433221100, 300`;
        const rows = parseAirdropCSV(csv);
        expect(rows).toHaveLength(3);
        expect(rows[0].valid).toBe(true);
        expect(rows[1].valid).toBe(false);
        expect(rows[2].valid).toBe(true);
    });
});

describe('amountToSmallestUnit', () => {
    it('converts whole number', () => {
        expect(amountToSmallestUnit('100', 18)).toBe(100000000000000000000n);
    });

    it('converts with decimals', () => {
        expect(amountToSmallestUnit('1.5', 18)).toBe(1500000000000000000n);
    });

    it('converts small decimal', () => {
        expect(amountToSmallestUnit('0.001', 18)).toBe(1000000000000000n);
    });

    it('truncates excess decimal places', () => {
        // With 2 decimals: 1.555 → 1.55 → 155
        expect(amountToSmallestUnit('1.555', 2)).toBe(155n);
    });

    it('handles zero decimals', () => {
        expect(amountToSmallestUnit('100', 0)).toBe(100n);
    });

    it('handles no fraction part', () => {
        expect(amountToSmallestUnit('42', 8)).toBe(4200000000n);
    });
});

describe('formatTokenAmount', () => {
    it('formats whole number', () => {
        expect(formatTokenAmount(100000000000000000000n, 18)).toBe('100');
    });

    it('formats with decimals', () => {
        expect(formatTokenAmount(1500000000000000000n, 18)).toBe('1.5');
    });

    it('formats small values', () => {
        expect(formatTokenAmount(1n, 18)).toBe('0.000000000000000001');
    });

    it('formats zero', () => {
        expect(formatTokenAmount(0n, 18)).toBe('0');
    });

    it('trims trailing zeros', () => {
        expect(formatTokenAmount(1000000000000000000n, 18)).toBe('1');
    });

    it('works with 8 decimals', () => {
        expect(formatTokenAmount(100000000n, 8)).toBe('1');
        expect(formatTokenAmount(150000000n, 8)).toBe('1.5');
    });
});
