/** Direct batch send - tokens go out immediately in one txn */
export const AirdropMode = {
    DIRECT: 'direct',
    CLAIM: 'claim',
} as const;
export type AirdropMode = (typeof AirdropMode)[keyof typeof AirdropMode];

export const AirdropStatus = {
    PENDING: 'pending',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    WITHDRAWN: 'withdrawn',
} as const;
export type AirdropStatus = (typeof AirdropStatus)[keyof typeof AirdropStatus];

export interface AirdropRecipient {
    /** Recipient public key (hex 0x...) */
    address: string;
    /** Amount in token decimal string */
    amount: string;
}

export interface AirdropInfo {
    id: bigint;
    creator: string;
    tokenAddress: string;
    totalAmount: bigint;
    claimedAmount: bigint;
    recipientCount: bigint;
    claimedCount: bigint;
    merkleRoot: Uint8Array;
    mode: AirdropMode;
    status: AirdropStatus;
    createdAt: bigint;
    decimals: number;
}

export interface MerkleProof {
    leaf: Uint8Array;
    proof: Uint8Array[];
    index: number;
}

export interface ParsedCSVRow {
    address: string;
    amount: string;
    valid: boolean;
    error?: string;
}

export interface CreateAirdropParams {
    tokenAddress: string;
    recipients: AirdropRecipient[];
    mode: AirdropMode;
}

export interface ClaimParams {
    airdropId: bigint;
    amount: bigint;
    proof: Uint8Array[];
}
