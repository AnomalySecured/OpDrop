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
    const [claimingId, setClaimingId] = useState<bigint | null>(null);
    const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
    const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

    // Manual claim fields
    const [manualId, setManualId] = useState('');
    const [recipientList, setRecipientList] = useState('');
    const [manualError, setManualError] = useState<string | null>(null);

    const { fetchAirdropCount, fetchAirdrop, checkClaimed, claimAirdrop, loading, error } = useDropOp();

    // Auto-scan for claimable airdrops when wallet connects
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

    const handleManualClaim = async () => {
        if (!walletAddress || !dropOpAddress) return;
        setManualError(null);
        setClaimSuccess(null);

        const airdropId = BigInt(manualId);

        // Parse recipient list to generate proof
        const lines = recipientList.trim().split(/\r?\n/).filter((l) => l.trim());
        if (lines.length === 0) {
            setManualError('Paste the recipient list (address, amount per line) to generate your merkle proof.');
            return;
        }

        // Fetch airdrop info for decimals
        const info = await fetchAirdrop(dropOpAddress, airdropId, network);
        if (!info) {
            setManualError('Airdrop not found.');
            return;
        }

        const recipients: AirdropRecipient[] = [];
        for (const line of lines) {
            const parts = line.split(/[,\s\t]+/).filter(Boolean);
            if (parts.length < 2) continue;
            recipients.push({ address: parts[0].trim(), amount: parts[1].trim() });
        }

        if (recipients.length === 0) {
            setManualError('Could not parse any recipients from the list.');
            return;
        }

        // Find claimer in list
        const match = recipients.find(
            (r) => r.address.toLowerCase() === walletAddress.toLowerCase(),
        );
        if (!match) {
            setManualError('Your address was not found in the recipient list.');
            return;
        }

        // Build merkle tree and generate proof
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
            setManualError('Could not generate merkle proof. The recipient list may not match this airdrop.');
            return;
        }

        setClaimingId(airdropId);
        const success = await claimAirdrop(dropOpAddress, airdropId, claimAmount, proof, walletAddress, network);
        setClaimingId(null);

        if (success) {
            setClaimedIds((prev) => new Set(prev).add(airdropId.toString()));
            setClaimSuccess(`Claimed ${formatTokenAmount(claimAmount, info.decimals)} tokens from Airdrop #${airdropId}!`);
            setRecipientList('');
            setManualId('');
        }
    };

    // Not connected
    if (!isConnected) {
        return (
            <div className="page">
                <div className="page-title-row">
                    <span className="page-title-logo">Op<span>Drop</span></span>
                    <h1 style={{ fontSize: 28, fontWeight: 700 }}>Claim Tokens</h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                    Connect your wallet to see what you can claim.
                </p>
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                        We'll automatically find any airdrops available for your address.
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
                        Claim your share from merkle airdrops.
                    </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={scan} disabled={scanning}>
                    {scanning ? 'Scanning...' : 'Refresh'}
                </button>
            </div>

            {error && <Alert type="error">{error}</Alert>}
            {claimSuccess && <Alert type="success" onDismiss={() => setClaimSuccess(null)}>{claimSuccess}</Alert>}

            {/* Manual Claim Card */}
            <div className="card">
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Claim by Airdrop ID</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Enter the airdrop ID and paste the recipient list shared by the airdrop creator.
                </p>

                {manualError && <Alert type="error">{manualError}</Alert>}

                <div className="two-col">
                    <div className="input-group">
                        <label className="input-label">Airdrop ID</label>
                        <input
                            className="input"
                            placeholder="0"
                            value={manualId}
                            onChange={(e) => setManualId(e.target.value.replace(/[^0-9]/g, ''))}
                        />
                    </div>
                </div>

                <div className="input-group">
                    <label className="input-label">Recipient List (address, amount per line)</label>
                    <textarea
                        className="input"
                        placeholder={`Paste the full recipient list here:\n0x1234...abcd, 100\n0x5678...efgh, 250`}
                        value={recipientList}
                        onChange={(e) => setRecipientList(e.target.value)}
                        rows={5}
                    />
                    <p className="input-hint">
                        The creator shares this list. Your merkle proof is computed locally.
                    </p>
                </div>

                <button
                    className="btn btn-success btn-full"
                    disabled={!manualId || !recipientList.trim() || loading}
                    onClick={handleManualClaim}
                >
                    {claimingId !== null ? (
                        <>
                            <span className="spinner" style={{ width: 14, height: 14 }} />
                            Claiming...
                        </>
                    ) : 'Claim'}
                </button>
            </div>

            {/* Active Claim Pools */}
            {scanning ? (
                <Spinner text="Scanning for airdrops..." />
            ) : airdrops.length > 0 && (
                <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, marginTop: 8 }}>
                        Active Claim Pools
                    </div>
                    {airdrops.map(({ info, alreadyClaimed }) => {
                        const isClaimed = alreadyClaimed || claimedIds.has(info.id.toString());
                        const pct = info.totalAmount > 0n
                            ? Number((info.claimedAmount * 10000n) / info.totalAmount) / 100
                            : 0;

                        return (
                            <div key={info.id.toString()} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 600 }}>
                                            Airdrop #{info.id.toString()}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                            Pool: {formatTokenAmount(info.totalAmount, info.decimals)} tokens
                                        </div>
                                    </div>
                                    {isClaimed ? (
                                        <span className="badge badge-completed">Claimed</span>
                                    ) : (
                                        <span className="badge badge-active">Eligible</span>
                                    )}
                                </div>
                                <ProgressBar value={pct} label={`${info.claimedCount.toString()}/${info.recipientCount.toString()} claimed`} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
