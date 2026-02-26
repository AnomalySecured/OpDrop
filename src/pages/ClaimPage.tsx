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

interface ClaimPageProps {
    network: Network;
    dropOpAddress: string;
    walletAddress: string | null;
    isConnected: boolean;
    onConnect: () => void;
}

interface ClaimableAirdrop {
    info: AirdropInfo;
    alreadyClaimed: boolean;
}

export function ClaimPage({ network, dropOpAddress, walletAddress, isConnected, onConnect }: ClaimPageProps) {
    const [airdrops, setAirdrops] = useState<ClaimableAirdrop[]>([]);
    const [scanning, setScanning] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [recipientList, setRecipientList] = useState('');
    const [claimError, setClaimError] = useState<string | null>(null);
    const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
    const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

    const { fetchAirdropCount, fetchAirdrop, checkClaimed, claimAirdrop, loading, error } = useDropOp();

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

        const lines = recipientList.trim().split(/\r?\n/).filter((l) => l.trim());
        if (lines.length === 0) {
            setClaimError('Paste the recipient list shared by the airdrop creator.');
            return;
        }

        const recipients: AirdropRecipient[] = [];
        for (const line of lines) {
            const parts = line.split(/[,\s\t]+/).filter(Boolean);
            if (parts.length < 2) continue;
            recipients.push({ address: parts[0].trim(), amount: parts[1].trim() });
        }

        if (recipients.length === 0) {
            setClaimError('Could not parse any recipients from the list.');
            return;
        }

        const match = recipients.find(
            (r) => r.address.toLowerCase() === walletAddress.toLowerCase(),
        );
        if (!match) {
            setClaimError('Your address is not in this recipient list. You may not be eligible for this airdrop.');
            return;
        }

        const leaves = recipients.map((r) => {
            const amt = amountToSmallestUnit(r.amount, info.decimals);
            return hashLeaf(r.address, amt);
        });

        const claimAmount = amountToSmallestUnit(match.amount, info.decimals);
        const leaf = hashLeaf(walletAddress, claimAmount);

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
                                            placeholder={`Paste the list the creator shared with you:\nopt1abc..., 100\nopt1def..., 250`}
                                            value={recipientList}
                                            onChange={(e) => setRecipientList(e.target.value)}
                                            rows={4}
                                        />
                                        <p className="input-hint">
                                            Your proof is computed locally in your browser — never sent anywhere.
                                        </p>
                                    </div>

                                    <button
                                        className="btn btn-success btn-full"
                                        disabled={!recipientList.trim() || loading}
                                        onClick={() => handleClaim(info)}
                                    >
                                        {loading ? (
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
