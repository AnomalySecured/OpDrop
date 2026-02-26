import { useState, useCallback } from 'react';
import type { Network } from '@btc-vision/bitcoin';
import { Address } from '@btc-vision/transaction';
import { contractService } from '../services/ContractService.js';
import type { AirdropInfo, AirdropRecipient } from '../types/index.js';
import { AirdropMode, AirdropStatus } from '../types/index.js';
import { hashLeaf, getMerkleRoot, getMerkleProof } from '../utils/merkle.js';
import { amountToSmallestUnit } from '../utils/csv.js';

interface UseDropOpReturn {
    loading: boolean;
    error: string | null;
    createClaimAirdrop: (
        dropOpAddress: string,
        tokenAddress: string,
        recipients: AirdropRecipient[],
        decimals: number,
        senderAddress: string,
        network: Network,
    ) => Promise<bigint | null>;
    createDirectAirdrop: (
        dropOpAddress: string,
        tokenAddress: string,
        recipients: AirdropRecipient[],
        decimals: number,
        senderAddress: string,
        network: Network,
    ) => Promise<bigint | null>;
    claimAirdrop: (
        dropOpAddress: string,
        airdropId: bigint,
        amount: bigint,
        proof: Uint8Array[],
        senderAddress: string,
        network: Network,
    ) => Promise<boolean>;
    withdrawAirdrop: (
        dropOpAddress: string,
        airdropId: bigint,
        senderAddress: string,
        network: Network,
    ) => Promise<boolean>;
    fetchAirdrop: (
        dropOpAddress: string,
        airdropId: bigint,
        network: Network,
    ) => Promise<AirdropInfo | null>;
    fetchAirdropCount: (
        dropOpAddress: string,
        network: Network,
    ) => Promise<bigint>;
    fetchAirdropsByCreator: (
        dropOpAddress: string,
        creator: string,
        network: Network,
    ) => Promise<bigint[]>;
    checkClaimed: (
        dropOpAddress: string,
        airdropId: bigint,
        claimer: string,
        network: Network,
    ) => Promise<boolean>;
    fetchTokenDecimals: (
        tokenAddress: string,
        network: Network,
    ) => Promise<number>;
}

export function useDropOp(): UseDropOpReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTokenDecimals = useCallback(async (
        tokenAddress: string,
        network: Network,
    ): Promise<number> => {
        try {
            const tokenContract = contractService.getTokenContract(tokenAddress, network);
            const result = await tokenContract.decimals();
            if (result.revert) return 18;
            return result.properties.decimals;
        } catch {
            return 18;
        }
    }, []);

    const createClaimAirdrop = useCallback(async (
        dropOpAddress: string,
        tokenAddress: string,
        recipients: AirdropRecipient[],
        decimals: number,
        senderAddress: string,
        network: Network,
    ): Promise<bigint | null> => {
        setLoading(true);
        setError(null);
        try {
            // Build merkle tree from recipients
            const leaves = recipients.map((r) => {
                const amt = amountToSmallestUnit(r.amount, decimals);
                return hashLeaf(r.address, amt);
            });
            const merkleRoot = getMerkleRoot(leaves);

            // Calculate total
            let totalAmount = 0n;
            for (const r of recipients) {
                totalAmount += amountToSmallestUnit(r.amount, decimals);
            }

            // First: increaseAllowance for the DropOp contract to spend tokens
            const tokenContract = contractService.getTokenContract(tokenAddress, network, senderAddress);
            const allowanceSim = await tokenContract.increaseAllowance(
                Address.fromString(dropOpAddress),
                totalAmount,
            );
            if (allowanceSim.revert) {
                throw new Error(`Allowance simulation failed: ${allowanceSim.revert}`);
            }
            const allowanceReceipt = await allowanceSim.sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: senderAddress,
                maximumAllowedSatToSpend: 100_000n,
                feeRate: 10,
                network,
            });

            if (!allowanceReceipt.transactionId) {
                throw new Error('Allowance transaction failed');
            }

            // Then: create the airdrop
            const dropOp = contractService.getDropOpContract(dropOpAddress, network, senderAddress);
            const sim = await dropOp.createAirdrop(
                Address.fromString(tokenAddress),
                merkleRoot,
                totalAmount,
                BigInt(recipients.length),
            );
            if (sim.revert) {
                throw new Error(`CreateAirdrop simulation failed: ${sim.revert}`);
            }

            const receipt = await sim.sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: senderAddress,
                maximumAllowedSatToSpend: 100_000n,
                feeRate: 10,
                network,
            });

            if (!receipt.transactionId) {
                throw new Error('CreateAirdrop transaction failed');
            }

            // Extract airdropId from decoded properties on the simulation result
            return sim.properties.airdropId ?? null;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to create airdrop';
            setError(msg);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const createDirectAirdrop = useCallback(async (
        dropOpAddress: string,
        tokenAddress: string,
        recipients: AirdropRecipient[],
        decimals: number,
        senderAddress: string,
        network: Network,
    ): Promise<bigint | null> => {
        setLoading(true);
        setError(null);
        try {
            let totalAmount = 0n;
            const tuples: [Address, bigint][] = recipients.map((r) => {
                const amt = amountToSmallestUnit(r.amount, decimals);
                totalAmount += amt;
                return [Address.fromString(r.address), amt];
            });

            // increaseAllowance first
            const tokenContract = contractService.getTokenContract(tokenAddress, network, senderAddress);
            const allowanceSim = await tokenContract.increaseAllowance(
                Address.fromString(dropOpAddress),
                totalAmount,
            );
            if (allowanceSim.revert) {
                throw new Error(`Allowance simulation failed: ${allowanceSim.revert}`);
            }
            await allowanceSim.sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: senderAddress,
                maximumAllowedSatToSpend: 100_000n,
                feeRate: 10,
                network,
            });

            // Direct airdrop
            const dropOp = contractService.getDropOpContract(dropOpAddress, network, senderAddress);
            const sim = await dropOp.directAirdrop(
                Address.fromString(tokenAddress),
                tuples,
            );
            if (sim.revert) {
                throw new Error(`DirectAirdrop simulation failed: ${sim.revert}`);
            }

            const receipt = await sim.sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: senderAddress,
                maximumAllowedSatToSpend: 100_000n,
                feeRate: 10,
                network,
            });

            if (!receipt.transactionId) {
                throw new Error('DirectAirdrop transaction failed');
            }

            return sim.properties.airdropId ?? null;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create direct airdrop');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const claimAirdrop = useCallback(async (
        dropOpAddress: string,
        airdropId: bigint,
        amount: bigint,
        proof: Uint8Array[],
        senderAddress: string,
        network: Network,
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            const dropOp = contractService.getDropOpContract(dropOpAddress, network, senderAddress);
            const sim = await dropOp.claim(airdropId, amount, proof);
            if (sim.revert) {
                throw new Error(`Claim simulation failed: ${sim.revert}`);
            }

            const receipt = await sim.sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: senderAddress,
                maximumAllowedSatToSpend: 100_000n,
                feeRate: 10,
                network,
            });

            return !!receipt.transactionId;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to claim');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const withdrawAirdrop = useCallback(async (
        dropOpAddress: string,
        airdropId: bigint,
        senderAddress: string,
        network: Network,
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            const dropOp = contractService.getDropOpContract(dropOpAddress, network, senderAddress);
            const sim = await dropOp.withdraw(airdropId);
            if (sim.revert) {
                throw new Error(`Withdraw simulation failed: ${sim.revert}`);
            }

            const receipt = await sim.sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: senderAddress,
                maximumAllowedSatToSpend: 100_000n,
                feeRate: 10,
                network,
            });

            return !!receipt.transactionId;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to withdraw');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAirdrop = useCallback(async (
        dropOpAddress: string,
        airdropId: bigint,
        network: Network,
    ): Promise<AirdropInfo | null> => {
        try {
            const dropOp = contractService.getDropOpContract(dropOpAddress, network);
            const result = await dropOp.getAirdrop(airdropId);
            if (result.revert) return null;

            const p = result.properties;
            const modeMap: Record<number, AirdropMode> = {
                0: AirdropMode.DIRECT,
                1: AirdropMode.CLAIM,
            };
            const statusMap: Record<number, AirdropStatus> = {
                0: AirdropStatus.PENDING,
                1: AirdropStatus.ACTIVE,
                2: AirdropStatus.COMPLETED,
                3: AirdropStatus.WITHDRAWN,
            };

            // Fetch token decimals
            let decimals = 18;
            try {
                const tokenContract = contractService.getTokenContract(
                    p.tokenAddress.toString(),
                    network,
                );
                const decResult = await tokenContract.decimals();
                if (!decResult.revert) {
                    decimals = decResult.properties.decimals;
                }
            } catch {
                // Default to 18
            }

            return {
                id: airdropId,
                creator: p.creator.toString(),
                tokenAddress: p.tokenAddress.toString(),
                totalAmount: p.totalAmount,
                claimedAmount: p.claimedAmount,
                recipientCount: p.recipientCount,
                claimedCount: p.claimedCount,
                merkleRoot: p.merkleRoot,
                mode: modeMap[p.mode] ?? AirdropMode.DIRECT,
                status: statusMap[p.status] ?? AirdropStatus.PENDING,
                createdAt: p.createdAt,
                decimals,
            };
        } catch {
            return null;
        }
    }, []);

    const fetchAirdropCount = useCallback(async (
        dropOpAddress: string,
        network: Network,
    ): Promise<bigint> => {
        try {
            const dropOp = contractService.getDropOpContract(dropOpAddress, network);
            const result = await dropOp.getAirdropCount();
            return result.properties.count;
        } catch {
            return 0n;
        }
    }, []);

    const fetchAirdropsByCreator = useCallback(async (
        dropOpAddress: string,
        creator: string,
        network: Network,
    ): Promise<bigint[]> => {
        try {
            const dropOp = contractService.getDropOpContract(dropOpAddress, network);
            const result = await dropOp.getAirdropsByCreator(Address.fromString(creator));
            return result.properties.airdropIds;
        } catch {
            return [];
        }
    }, []);

    const checkClaimed = useCallback(async (
        dropOpAddress: string,
        airdropId: bigint,
        claimer: string,
        network: Network,
    ): Promise<boolean> => {
        try {
            const dropOp = contractService.getDropOpContract(dropOpAddress, network);
            const result = await dropOp.hasClaimed(airdropId, Address.fromString(claimer));
            return result.properties.claimed;
        } catch {
            return false;
        }
    }, []);

    return {
        loading,
        error,
        createClaimAirdrop,
        createDirectAirdrop,
        claimAirdrop,
        withdrawAirdrop,
        fetchAirdrop,
        fetchAirdropCount,
        fetchAirdropsByCreator,
        checkClaimed,
        fetchTokenDecimals,
    };
}

/**
 * Generate merkle proof data for a recipient to use when claiming.
 */
export function generateClaimData(
    recipients: AirdropRecipient[],
    claimerAddress: string,
    decimals: number,
): { amount: bigint; proof: Uint8Array[]; leaf: Uint8Array } | null {
    const leaves = recipients.map((r) => {
        const amt = amountToSmallestUnit(r.amount, decimals);
        return hashLeaf(r.address, amt);
    });

    const recipient = recipients.find(
        (r) => r.address.toLowerCase() === claimerAddress.toLowerCase(),
    );
    if (!recipient) return null;

    const amount = amountToSmallestUnit(recipient.amount, decimals);
    const leaf = hashLeaf(claimerAddress, amount);
    const proof = getMerkleProof(leaves, leaf);

    return { amount, proof, leaf };
}
