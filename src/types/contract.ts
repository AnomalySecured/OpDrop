import type { CallResult, OPNetEvent, BaseContractProperties } from 'opnet';
import type { DecodedCallResult } from 'opnet';
import type { Address } from '@btc-vision/transaction';

// === Event Types ===
export interface AirdropCreatedEvent {
    [key: string]: DecodedCallResult;
    airdropId: bigint;
    creator: Address;
    tokenAddress: Address;
    totalAmount: bigint;
    mode: number;
}

export interface ClaimedEvent {
    [key: string]: DecodedCallResult;
    airdropId: bigint;
    claimer: Address;
    amount: bigint;
}

export interface WithdrawnEvent {
    [key: string]: DecodedCallResult;
    airdropId: bigint;
    amount: bigint;
}

// === Result Types ===
export type CreateAirdropResult = CallResult<
    { airdropId: bigint },
    [OPNetEvent<AirdropCreatedEvent>]
>;

export type DirectAirdropResult = CallResult<
    { airdropId: bigint },
    [OPNetEvent<AirdropCreatedEvent>]
>;

export type ClaimResult = CallResult<
    { success: boolean },
    [OPNetEvent<ClaimedEvent>]
>;

export type WithdrawResult = CallResult<
    { withdrawnAmount: bigint },
    [OPNetEvent<WithdrawnEvent>]
>;

export type GetAirdropResult = CallResult<{
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
}, []>;

export type GetAirdropCountResult = CallResult<{ count: bigint }, []>;

export type HasClaimedResult = CallResult<{ claimed: boolean }, []>;

export type GetAirdropsByCreatorResult = CallResult<{ airdropIds: bigint[] }, []>;

// === Contract Interface ===
export interface IDropOpContract extends BaseContractProperties {
    // Write
    createAirdrop(
        tokenAddress: Address,
        merkleRoot: Uint8Array,
        totalAmount: bigint,
        recipientCount: bigint,
    ): Promise<CreateAirdropResult>;

    directAirdrop(
        tokenAddress: Address,
        recipients: [Address, bigint][],
    ): Promise<DirectAirdropResult>;

    claim(
        airdropId: bigint,
        amount: bigint,
        proof: Uint8Array[],
    ): Promise<ClaimResult>;

    withdraw(airdropId: bigint): Promise<WithdrawResult>;

    // Read
    getAirdrop(airdropId: bigint): Promise<GetAirdropResult>;
    getAirdropCount(): Promise<GetAirdropCountResult>;
    hasClaimed(airdropId: bigint, claimer: Address): Promise<HasClaimedResult>;
    getAirdropsByCreator(creator: Address): Promise<GetAirdropsByCreatorResult>;
}
