/**
 * DropOp Smart Contract (AssemblyScript source reference)
 *
 * This file documents the contract that must be deployed on OPNet.
 * The actual contract is written in AssemblyScript and compiled to WASM.
 *
 * ============================================================
 * CONTRACT: DropOp - Token Airdrop Manager
 * ============================================================
 *
 * Features:
 *   1. CLAIM MODE: Depositor funds a pool, sets merkle root.
 *      Recipients claim with merkle proof. Depositor can withdraw unclaimed at any time.
 *   2. DIRECT MODE: Depositor approves + calls directAirdrop.
 *      Contract transfers tokens to all recipients in one transaction.
 *   3. Dashboard: Read airdrop info, % claimed, status.
 *
 * Storage Layout:
 *   - airdropCount: StoredU256 (auto-incrementing ID)
 *   - airdrops[id].creator: AddressMemoryMap
 *   - airdrops[id].tokenAddress: AddressMemoryMap
 *   - airdrops[id].totalAmount: StoredMapU256
 *   - airdrops[id].claimedAmount: StoredMapU256
 *   - airdrops[id].recipientCount: StoredMapU256
 *   - airdrops[id].claimedCount: StoredMapU256
 *   - airdrops[id].merkleRoot: StoredMapU256 (bytes32 stored as u256)
 *   - airdrops[id].mode: StoredMapU256 (0=direct, 1=claim)
 *   - airdrops[id].status: StoredMapU256 (0=pending, 1=active, 2=completed, 3=withdrawn)
 *   - airdrops[id].createdAt: StoredMapU256
 *   - claimed[id][address]: Nested<AddressMemoryMap<StoredBoolean>>
 *   - creatorAirdrops[address]: array tracking
 *
 * Methods:
 *   @method createAirdrop(tokenAddress, merkleRoot, totalAmount, recipientCount) => airdropId
 *     - Caller must have approved this contract for totalAmount on the token
 *     - Transfers totalAmount from caller to this contract
 *     - Stores merkle root and metadata
 *     - Emits AirdropCreated
 *
 *   @method directAirdrop(tokenAddress, recipients[]) => airdropId
 *     - Caller must have approved this contract for sum of all amounts
 *     - Iterates recipients, calls transferFrom for each
 *     - Records as completed immediately
 *     - Emits AirdropCreated
 *
 *   @method claim(airdropId, amount, proof[]) => bool
 *     - Verifies merkle proof against stored root
 *     - Checks not already claimed
 *     - Transfers amount from pool to caller
 *     - Marks as claimed
 *     - Emits Claimed
 *
 *   @method withdraw(airdropId) => withdrawnAmount
 *     - Only creator can call
 *     - Returns remaining (totalAmount - claimedAmount) to creator
 *     - Sets status to withdrawn
 *     - Emits Withdrawn
 *
 *   @view getAirdrop(airdropId) => full info tuple
 *   @view getAirdropCount() => count
 *   @view hasClaimed(airdropId, claimer) => bool
 *   @view getAirdropsByCreator(creator) => airdropIds[]
 *
 * Security:
 *   - All u256 ops use SafeMath
 *   - Bounded loops (max 1000 recipients per direct airdrop)
 *   - Checks-effects-interactions pattern
 *   - ReentrancyGuard on all write methods
 *   - Only creator can withdraw
 *   - Double-claim prevention via claimed mapping
 *   - Merkle proof verification for claim security
 */

export const CONTRACT_SOURCE_REFERENCE = 'DropOp.ts';
