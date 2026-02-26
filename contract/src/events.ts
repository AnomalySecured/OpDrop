import { NetEvent, BytesWriter, Address } from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

// AirdropCreated(airdropId, creator, tokenAddress, totalAmount, mode)
// Size: 32 + 32 + 32 + 32 + 1 = 129 bytes (under 352 limit)
@final
export class AirdropCreatedEvent extends NetEvent {
    public constructor(
        public readonly airdropId: u256,
        public readonly creator: Address,
        public readonly tokenAddress: Address,
        public readonly totalAmount: u256,
        public readonly mode: u8,
    ) {
        const data = new BytesWriter(129);
        data.writeU256(airdropId);
        data.writeAddress(creator);
        data.writeAddress(tokenAddress);
        data.writeU256(totalAmount);
        data.writeU8(mode);
        super('AirdropCreated', data);
    }
}

// Claimed(airdropId, claimer, amount)
// Size: 32 + 32 + 32 = 96 bytes
@final
export class ClaimedEvent extends NetEvent {
    public constructor(
        public readonly airdropId: u256,
        public readonly claimer: Address,
        public readonly amount: u256,
    ) {
        const data = new BytesWriter(96);
        data.writeU256(airdropId);
        data.writeAddress(claimer);
        data.writeU256(amount);
        super('Claimed', data);
    }
}

// Withdrawn(airdropId, amount)
// Size: 32 + 32 = 64 bytes
@final
export class WithdrawnEvent extends NetEvent {
    public constructor(
        public readonly airdropId: u256,
        public readonly amount: u256,
    ) {
        const data = new BytesWriter(64);
        data.writeU256(airdropId);
        data.writeU256(amount);
        super('Withdrawn', data);
    }
}
