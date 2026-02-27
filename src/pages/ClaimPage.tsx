import { useState, useEffect, useCallback } from 'react';
import type { Network } from '@btc-vision/bitcoin';
import { useDropOp } from '../hooks/useDropOp.js';
import { Alert } from '../components/common/Alert.js';
import { Spinner } from '../components/common/Spinner.js';
import { ProgressBar } from '../components/common/ProgressBar.js';
import { formatTokenAmount } from '../utils/csv.js';
import { hashLeaf, getMerkleProof } from '../utils/merkle.js';
import { amountToSmallestUnit } from '../utils/csv.js';
import type { AirdropInfo, AirdropRecipient } from '../types/index.js';
import { AirdropMode, AirdropStatus } from '../types/index.js';
import { resolveAllToPublicKeys, isHexPublicKey } from '../utils/address.js';

interface ClaimPageProps {
    network: Network;
    dropOpAddress: string;
    walletAddress: string | null;
    walletPublicKey: string | null;
    isConnected: boolean;
    onConnect: () => void;
}

interface ClaimableAirdrop {
    info: AirdropInfo;
    alreadyClaimed: boolean;
}

export function ClaimPage({ network, dropOpAddress, walletAddress, walletPublicKey, isConnected, onConnect }: ClaimPageProps) {
    const [airdrops, setAirdrops] = useState<ClaimableAirdrop[]>([]);
    const [scanning, setScanning] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [recipientList, setRecipientList] = useState('');
    const [claimError, setClaimError] = useState<string | null>(null);
    const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
    const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
    const [resolving, setResolving] = useState(false);

    const { fetchAirdropCount, fetchAirdrop, checkClaimed, claimAirdrop, loading, error } = useDropOp();

    // The public key to use for matching. Must be hex format.
    const myPublicKey = walletPublicKey
        ? (walletPublicKey.startsWith('0x') ? walletPublicKey : `0x${walletPublicKey}`)
        : null;

    const scan = useCallback(async () => {
        if (!dropOpAddress || !walletAddress) return;
        setScanning(true);
        try {
            const count = await fetchAirdropCount(dropOpAddress, network);
            const found: ClaimableAirdrop[] = [];

            for (let i = 0n; i < count; i++) {
                const info = await fetchAirdrop(dropOpAddress, i, network);
                if (!info) continue;
                if (info.mode !== AirdropMode.CLAIM) continue;
                if (info.status !== AirdropStatus.ACTIVE) continue;

                const claimed = await checkClaimed(dropOpAddress, i, walletAddress, network);
                found.push({ info, alreadyClaimed: claimed });
            }

            setAirdrops(found);
        } finally {
            setScanning(false);
        }
    }, [dropOpAddress, walletAddress, network, fetchAirdropCount, fetchAirdrop, checkClaimed]);

    useEffect(() => {
        if (isConnected && walletAddress && dropOpAddress) {
            scan();
        }
    }, [isConnected, walletAddress, dropOpAddress, scan]);

    const handleClaim = async (info: AirdropInfo) => {
        if (!walletAddress || !dropOpAddress) return;
        setClaimError(null);
        setClaimSuccess(null);

        if (!myPublicKey) {
            setClaimError('Wallet did not provide a public key. Please reconnect your wallet.');
            return;
        }

        const lines = recipientList.trim().split(/\r?\n/).filter((l) => l.trim());
        if (lines.length === 0) {
            setClaimError('Paste the recipient list shared by the airdrop creator.');
            return;
        }

        const rawRecipients: AirdropRecipient[] = [];
        for (const line of lines) {
            const parts = line.split(/[,\s\t]+/).filter(Boolean);
            if (parts.length < 2) continue;
            rawRecipients.push({ address: parts[0].trim(), amount: parts[1].trim() });
        }

        if (rawRecipients.length === 0) {
            setClaimError('Could not parse any recipients from the list.');
            return;
        }

        // Resolve all addresses to public keys
        setResolving(true);
        const rawAddresses = rawRecipients.map((r) => r.address);
        let resolvedKeys: string[];
        try {
            const resolved = await resolveAllToPublicKeys(rawAddresses, network);
            const failed = resolved.filter((r) => !r.publicKey);
            if (failed.length > 0) {
                setClaimError(
                    `Could not resolve ${failed.length} address(es) to public keys: ${failed.map((f) => f.original).join(', ')}. ` +
                    'The recipient list must use hex public keys (0x...) or addresses that have on-chain activity.',
                );
                setResolving(false);
                return;
            }
            resolvedKeys = resolved.map((r) => r.publicKey!);
        } catch (err) {
            setClaimError(err instanceof Error ? err.message : 'Failed to resolve addresses');
            setResolving(false);
            return;
        }
        setResolving(false);

        // Build recipients with resolved public keys
        const recipients: AirdropRecipient[] = rawRecipients.map((r, i) => ({
            address: resolvedKeys[i],
            amount: r.amount,
        }));

        // Find the current wallet in the list by matching public key
        const match = recipients.find(
            (r) => r.address.toLowerCase() === myPublicKey.toLowerCase(),
        );
        if (!match) {
            setClaimError(
                'Your public key is not in this recipient list. You may not be eligible for this airdrop. ' +
                `Your public key: ${myPublicKey}`,
            );
            return;
        }

        // Build merkle leaves using resolved public keys
        const leaves = recipients.map((r) => {
            const amt = amountToSmallestUnit(r.amount, info.decimals);
            return hashLeaf(r.address, amt);
        });

        const claimAmount = amountToSmallestUnit(match.amount, info.decimals);
        const leaf = hashLeaf(myPublicKey, claimAmount);

        let proof: Uint8Array[];
        try {
            proof = getMerkleProof(leaves, leaf);
        } catch {
            setClaimError('Could not generate merkle proof. The recipient list may not match this airdrop.');
            return;
        }

        const success = await claimAirdrop(dropOpAddress, info.id, claimAmount, proof, walletAddress, network);

        if (success) {
            setClaimedIds((prev) => new Set(prev).add(info.id.toString()));
            setClaimSuccess(`Claimed ${formatTokenAmount(claimAmount, info.decimals)} tokens from Airdrop #${info.id}!`);
            setRecipientList('');
            setExpandedId(null);
        }
    };

    if (!isConnected) {
        return (
            <div className="page">
                <div className="page-title-row">
                    <span className="page-title-logo">Op<span>Drop</span></span>
                    <h1 style={{ fontSize: 28, fontWeight: 700 }}>Claim Tokens</h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                    Connect your wallet to see available airdrops.
                </p>
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                        We'll scan for active claim pools you can collect from.
                    </p>
                    <button className="btn btn-primary btn-lg" onClick={onConnect}>
                        Connect Wallet
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <div className="page-title-row">
                        <span className="page-title-logo">Op<span>Drop</span></span>
                        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Claim Tokens</h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        Active airdrops on this network. Expand one to claim your share.
                    </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={scan} disabled={scanning}>
                    {scanning ? 'Scanning...' : 'Refresh'}
                </button>
            </div>

            {myPublicKey && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, wordBreak: 'break-all' }}>
                    Your public key: <code style={{ fontSize: 11 }}>{myPublicKey}</code>
                </div>
            )}

            {error && <Alert type="error">{error}</Alert>}
            {claimSuccess && <Alert type="success" onDismiss={() => setClaimSuccess(null)}>{claimSuccess}</Alert>}

            {scanning ? (
                <Spinner text="Scanning for active airdrops..." />
            ) : airdrops.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        No active claim pools found on this network.
                    </p>
                </div>
            ) : (
                airdrops.map(({ info, alreadyClaimed }) => {
                    const isClaimed = alreadyClaimed || claimedIds.has(info.id.toString());
                    const isExpanded = expandedId === info.id.toString();
                    const pct = info.totalAmount > 0n
                        ? Number((info.claimedAmount * 10000n) / info.totalAmount) / 100
                        : 0;
                    const remaining = info.totalAmount - info.claimedAmount;

                    return (
                        <div key={info.id.toString()} className="card" style={{ marginBottom: 12 }}>
                            <div
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: isClaimed ? 'default' : 'pointer' }}
                                onClick={() => {
                                    if (isClaimed) return;
                                    setExpandedId(isExpanded ? null : info.id.toString());
                                    setClaimError(null);
                                    setRecipientList('');
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                                        Airdrop #{info.id.toString()}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                                        {formatTokenAmount(remaining, info.decimals)} remaining of {formatTokenAmount(info.totalAmount, info.decimals)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {isClaimed ? (
                                        <span className="badge badge-completed">Claimed</span>
                                    ) : (
                                        <span className="badge badge-active">Open</span>
                                    )}
                                    {!isClaimed && (
                                        <span style={{ fontSize: 18, color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                                            ▾
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: 12 }}>
                                <ProgressBar value={pct} label={`${info.claimedCount.toString()}/${info.recipientCount.toString()} claimed`} />
                            </div>

                            {isExpanded && !isClaimed && (
                                <div style={{ marginTop: 16, borderTop: '1px solid var(--glass-border)', paddingTop: 16 }}>
                                    {claimError && <Alert type="error">{claimError}</Alert>}

                                    <div className="input-group">
                                        <label className="input-label">Recipient List</label>
                                        <textarea
                                            className="input"
                                            placeholder={
                                                'Paste the list the creator shared with you:\n' +
                                                '0x020373626d317ae8..., 100\n' +
                                                '0x03a1b2c3d4e5f6..., 250\n' +
                                                'bc1q... addresses will be resolved to public keys'
                                            }
                                            value={recipientList}
                                            onChange={(e) => setRecipientList(e.target.value)}
                                            rows={4}
                                        />
                                        <p className="input-hint">
                                            All addresses are resolved to hex public keys for merkle proof verification.
                                            Your proof is computed locally in your browser.
                                        </p>
                                    </div>

                                    <button
                                        className="btn btn-success btn-full"
                                        disabled={!recipientList.trim() || loading || resolving}
                                        onClick={() => handleClaim(info)}
                                    >
                                        {resolving ? (
                                            <>
                                                <span className="spinner" style={{ width: 14, height: 14 }} />
                                                Resolving Addresses...
                                            </>
                                        ) : loading ? (
                                            <>
                                                <span className="spinner" style={{ width: 14, height: 14 }} />
                                                Claiming...
                                            </>
                                        ) : 'Claim My Share'}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}
