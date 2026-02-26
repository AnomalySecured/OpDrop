import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------
export type AirdropCreatedEvent = {
    readonly airdropId: bigint;
    readonly creator: Address;
    readonly tokenAddress: Address;
    readonly totalAmount: bigint;
    readonly mode: number;
    readonly airdropId: bigint;
    readonly creator: Address;
    readonly tokenAddress: Address;
    readonly totalAmount: bigint;
    readonly mode: number;
};
export type ClaimedEvent = {
    readonly airdropId: bigint;
    readonly claimer: Address;
    readonly amount: bigint;
    readonly airdropId: bigint;
    readonly claimer: Address;
    readonly amount: bigint;
};
export type WithdrawnEvent = {
    readonly airdropId: bigint;
    readonly amount: bigint;
    readonly airdropId: bigint;
    readonly amount: bigint;
};

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the _createAirdrop function call.
 */
export type createAirdrop = CallResult<
    {
        airdropId: bigint;
    },
    OPNetEvent<AirdropCreatedEvent>[]
>;

/**
 * @description Represents the result of the _directAirdrop function call.
 */
export type directAirdrop = CallResult<
    {
        airdropId: bigint;
    },
    OPNetEvent<AirdropCreatedEvent>[]
>;

/**
 * @description Represents the result of the _claim function call.
 */
export type claim = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<ClaimedEvent>[]
>;

/**
 * @description Represents the result of the _withdraw function call.
 */
export type withdraw = CallResult<
    {
        withdrawnAmount: bigint;
    },
    OPNetEvent<WithdrawnEvent>[]
>;

/**
 * @description Represents the result of the _getAirdrop function call.
 */
export type getAirdrop = CallResult<
    {
        creator: Address;
        tokenAddress: Address;
        totalAmount: bigint;
        claimedAmount: bigint;
        recipientCount: bigint;
        claimedCount: bigint;
        merkleRoot: Uint8Array;
        mode: number;
        status: number;
        createdAt: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the _getAirdropCount function call.
 */
export type getAirdropCount = CallResult<
    {
        count: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the _hasClaimed function call.
 */
export type hasClaimed = CallResult<
    {
        claimed: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the _getAirdropsByCreator function call.
 */
export type getAirdropsByCreator = CallResult<
    {
        airdropIds: bigint[];
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IOpDrop
// ------------------------------------------------------------------
export interface IOpDrop extends IOP_NETContract {
    _createAirdrop(
        tokenAddress: Address,
        merkleRoot: Uint8Array,
        totalAmount: bigint,
        recipientCount: bigint,
    ): Promise<createAirdrop>;
    _directAirdrop(tokenAddress: Address, recipients: AddressMap<bigint>): Promise<directAirdrop>;
    _claim(airdropId: bigint, amount: bigint, proof: Uint8Array[]): Promise<claim>;
    _withdraw(airdropId: bigint): Promise<withdraw>;
    _getAirdrop(airdropId: bigint): Promise<getAirdrop>;
    _getAirdropCount(): Promise<getAirdropCount>;
    _hasClaimed(airdropId: bigint, claimer: Address): Promise<hasClaimed>;
    _getAirdropsByCreator(creator: Address): Promise<getAirdropsByCreator>;
}
