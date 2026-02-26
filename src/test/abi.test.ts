import { describe, it, expect } from 'vitest';
import { BitcoinAbiTypes } from 'opnet';
import { DROPOP_ABI } from '../abi/DropOpABI.js';

describe('DROPOP_ABI', () => {
    it('is an array', () => {
        expect(Array.isArray(DROPOP_ABI)).toBe(true);
    });

    it('has all expected write functions', () => {
        const functionNames = DROPOP_ABI
            .filter((e) => e.type === BitcoinAbiTypes.Function)
            .map((e) => e.name);

        expect(functionNames).toContain('createAirdrop');
        expect(functionNames).toContain('directAirdrop');
        expect(functionNames).toContain('claim');
        expect(functionNames).toContain('withdraw');
    });

    it('has all expected read functions', () => {
        const constantFns = DROPOP_ABI
            .filter((e) => e.type === BitcoinAbiTypes.Function && 'constant' in e && e.constant)
            .map((e) => e.name);

        expect(constantFns).toContain('getAirdrop');
        expect(constantFns).toContain('getAirdropCount');
        expect(constantFns).toContain('hasClaimed');
        expect(constantFns).toContain('getAirdropsByCreator');
    });

    it('has all expected events', () => {
        const events = DROPOP_ABI
            .filter((e) => e.type === BitcoinAbiTypes.Event)
            .map((e) => e.name);

        expect(events).toContain('AirdropCreated');
        expect(events).toContain('Claimed');
        expect(events).toContain('Withdrawn');
    });

    it('write functions are not constant', () => {
        const writeFns = ['createAirdrop', 'directAirdrop', 'claim', 'withdraw'];
        for (const name of writeFns) {
            const fn = DROPOP_ABI.find((e) => e.name === name);
            expect(fn).toBeDefined();
            expect(fn!.type).toBe(BitcoinAbiTypes.Function);
            if ('constant' in fn!) {
                expect(fn!.constant).toBe(false);
            }
        }
    });

    it('createAirdrop has correct inputs', () => {
        const fn = DROPOP_ABI.find((e) => e.name === 'createAirdrop');
        expect(fn).toBeDefined();
        if (fn && 'inputs' in fn && fn.inputs) {
            const inputNames = fn.inputs.map((i) => i.name);
            expect(inputNames).toEqual(['tokenAddress', 'merkleRoot', 'totalAmount', 'recipientCount']);
        }
    });

    it('createAirdrop has airdropId output', () => {
        const fn = DROPOP_ABI.find((e) => e.name === 'createAirdrop');
        expect(fn).toBeDefined();
        if (fn && 'outputs' in fn && fn.outputs) {
            expect(fn.outputs[0].name).toBe('airdropId');
        }
    });

    it('claim has correct inputs', () => {
        const fn = DROPOP_ABI.find((e) => e.name === 'claim');
        expect(fn).toBeDefined();
        if (fn && 'inputs' in fn && fn.inputs) {
            const inputNames = fn.inputs.map((i) => i.name);
            expect(inputNames).toEqual(['airdropId', 'amount', 'proof']);
        }
    });

    it('getAirdrop has all output fields', () => {
        const fn = DROPOP_ABI.find((e) => e.name === 'getAirdrop');
        expect(fn).toBeDefined();
        if (fn && 'outputs' in fn && fn.outputs) {
            const outputNames = fn.outputs.map((o) => o.name);
            expect(outputNames).toEqual([
                'creator', 'tokenAddress', 'totalAmount', 'claimedAmount',
                'recipientCount', 'claimedCount', 'merkleRoot', 'mode',
                'status', 'createdAt',
            ]);
        }
    });

    it('AirdropCreated event has correct values', () => {
        const evt = DROPOP_ABI.find((e) => e.name === 'AirdropCreated');
        expect(evt).toBeDefined();
        if (evt && 'values' in evt) {
            const names = evt.values.map((v) => v.name);
            expect(names).toEqual(['airdropId', 'creator', 'tokenAddress', 'totalAmount', 'mode']);
        }
    });

    it('has correct total count of definitions', () => {
        const functions = DROPOP_ABI.filter((e) => e.type === BitcoinAbiTypes.Function);
        const events = DROPOP_ABI.filter((e) => e.type === BitcoinAbiTypes.Event);
        expect(functions.length).toBe(8); // 4 write + 4 read
        expect(events.length).toBe(3);
        expect(DROPOP_ABI.length).toBe(11);
    });
});
