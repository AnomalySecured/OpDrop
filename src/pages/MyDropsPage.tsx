import { useState, useEffect, useCallback } from 'react';
import type { Network } from '@btc-vision/bitcoin';
import { useDropOp } from '../hooks/useDropOp.js';
import { Alert } from '../components/common/Alert.js';
import { Spinner } from '../components/common/Spinner.js';
import { ProgressBar } from '../components/common/ProgressBar.js';
import { formatTokenAmount } from '../utils/csv.js';
import type { AirdropInfo } from '../types/index.js';
import { AirdropMode, AirdropStatus } from '../types/index.js';

interface MyDropsPageProps {
    network: Network;
    dropOpAddress: string;
    walletAddress: string | null;
    isConnected: boolean;
    onConnect: () => void;
}

export function MyDropsPage({ network, dropOpAddress, walletAddress, isConnected, onConnect }: MyDropsPageProps) {
    const [drops, setDrops] = useState<AirdropInfo[]>([]);
    const [fetching, setFetching] = useState(false);
    const [withdrawingId, setWithdrawingId] = useState<bigint | null>(null);
    const { fetchAirdropsByCreator, fetchAirdrop, withdrawAirdrop, error } = useDropOp();

    const load = useCallback(async () => {
        if (!dropOpAddress || !walletAddress) return;
        setFetching(true);
        try {
            // Use getAirdropsByCreator for efficient lookup
            const ids = await fetchAirdropsByCreator(dropOpAddress, walletAddress, network);
            const mine: AirdropInfo[] = [];
            for (const id of ids) {
                const info = await fetchAirdrop(dropOpAddress, id, network);
                if (info) mine.push(info);
            }
            setDrops(mine.reverse());
        } finally {
            setFetching(false);
        }
    }, [dropOpAddress, walletAddress, network, fetchAirdropsByCreator, fetchAirdrop]);

    useEffect(() => {
        if (isConnected && walletAddress && dropOpAddress) {
            load();
        }
    }, [isConnected, walletAddress, dropOpAddress, load]);

    const handleWithdraw = async (id: bigint) => {
        if (!walletAddress || !dropOpAddress) return;
        setWithdrawingId(id);
        await withdrawAirdrop(dropOpAddress, id, walletAddress, network);
        setWithdrawingId(null);
        load();
    };

    if (!isConnected) {
        return (
            <div className="page">
                <div className="page-title-row">
                    <span className="page-title-logo">Op<span>Drop</span></span>
                    <h1 style={{ fontSize: 28, fontWeight: 700 }}>My Drops</h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                    See airdrops you created and manage unclaimed tokens.
                </p>
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
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
                        <h1 style={{ fontSize: 28, fontWeight: 700 }}>My Drops</h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        {drops.length} airdrop{drops.length !== 1 ? 's' : ''} created
                    </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={load} disabled={fetching}>
                    {fetching ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {error && <Alert type="error">{error}</Alert>}

            {fetching ? (
                <Spinner text="Loading your airdrops..." />
            ) : drops.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        No drops yet
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        Go to the Send tab to create one.
                    </p>
                </div>
            ) : (
                drops.map((drop) => {
                    const pct = drop.totalAmount > 0n
                        ? Number((drop.claimedAmount * 10000n) / drop.totalAmount) / 100
                        : 0;
                    const remaining = drop.totalAmount - drop.claimedAmount;
                    const canWithdraw = drop.mode === AirdropMode.CLAIM
                        && drop.status === AirdropStatus.ACTIVE
                        && remaining > 0n;
                    const isWithdrawing = withdrawingId === drop.id;
                    const modeLabel = drop.mode === AirdropMode.DIRECT ? 'Direct' : 'Claim Pool';

                    const statusLabel = drop.status === AirdropStatus.ACTIVE ? 'Active'
                        : drop.status === AirdropStatus.COMPLETED ? 'Done'
                            : drop.status === AirdropStatus.WITHDRAWN ? 'Withdrawn' : 'Pending';
                    const statusClass = drop.status === AirdropStatus.ACTIVE ? 'badge-active'
                        : drop.status === AirdropStatus.COMPLETED ? 'badge-completed'
                            : drop.status === AirdropStatus.WITHDRAWN ? 'badge-withdrawn' : 'badge-pending';

                    return (
                        <div key={drop.id.toString()} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
                                        #{drop.id.toString()} - {modeLabel}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        {formatTokenAmount(drop.totalAmount, drop.decimals)} tokens to {drop.recipientCount.toString()} addresses
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span className={`badge ${statusClass}`}>{statusLabel}</span>
                                    {canWithdraw && (
                                        <button
                                            className="btn btn-danger btn-sm"
                                            disabled={isWithdrawing}
                                            onClick={() => handleWithdraw(drop.id)}
                                        >
                                            {isWithdrawing ? 'Withdrawing...' : `Withdraw ${formatTokenAmount(remaining, drop.decimals)}`}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <ProgressBar
                                value={pct}
                                label={`${drop.claimedCount.toString()}/${drop.recipientCount.toString()} claimed`}
                            />
                        </div>
                    );
                })
            )}
        </div>
    );
}
