import type { AirdropInfo } from '../../types/index.js';
import { AirdropMode, AirdropStatus } from '../../types/index.js';
import { ProgressBar } from '../common/ProgressBar.js';
import { formatAddress } from '../../utils/formatting.js';
import { formatTokenAmount } from '../../utils/csv.js';

interface AirdropCardProps {
    airdrop: AirdropInfo;
    decimals: number;
    tokenSymbol: string;
    onClick?: () => void;
    showActions?: boolean;
    onWithdraw?: () => void;
    isCreator?: boolean;
    withdrawing?: boolean;
}

const STATUS_BADGE: Record<AirdropStatus, { className: string; label: string }> = {
    [AirdropStatus.PENDING]: { className: 'badge-pending', label: 'Pending' },
    [AirdropStatus.ACTIVE]: { className: 'badge-active', label: 'Active' },
    [AirdropStatus.COMPLETED]: { className: 'badge-completed', label: 'Completed' },
    [AirdropStatus.WITHDRAWN]: { className: 'badge-withdrawn', label: 'Withdrawn' },
};

export function AirdropCard({
    airdrop,
    decimals,
    tokenSymbol,
    onClick,
    showActions,
    onWithdraw,
    isCreator,
    withdrawing,
}: AirdropCardProps) {
    const claimedPercent = airdrop.totalAmount > 0n
        ? Number((airdrop.claimedAmount * 10000n) / airdrop.totalAmount) / 100
        : 0;

    const recipientPercent = airdrop.recipientCount > 0n
        ? Number((airdrop.claimedCount * 10000n) / airdrop.recipientCount) / 100
        : 0;

    const statusInfo = STATUS_BADGE[airdrop.status];
    const remaining = airdrop.totalAmount - airdrop.claimedAmount;

    return (
        <div className="card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            <div className="card-header">
                <div>
                    <div className="card-title">
                        Airdrop #{airdrop.id.toString()}
                    </div>
                    <div className="card-subtitle">
                        {airdrop.mode === AirdropMode.CLAIM ? 'Merkle Claim' : 'Direct Send'}
                        {' | '}
                        Token: {formatAddress(airdrop.tokenAddress)}
                    </div>
                </div>
                <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>
            </div>

            <div className="stats-grid" style={{ marginBottom: 16 }}>
                <div>
                    <div className="stat-label">Total</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                        {formatTokenAmount(airdrop.totalAmount, decimals)} {tokenSymbol}
                    </div>
                </div>
                <div>
                    <div className="stat-label">Claimed</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                        {formatTokenAmount(airdrop.claimedAmount, decimals)} {tokenSymbol}
                    </div>
                </div>
                <div>
                    <div className="stat-label">Recipients</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                        {airdrop.claimedCount.toString()} / {airdrop.recipientCount.toString()}
                    </div>
                </div>
                {airdrop.mode === AirdropMode.CLAIM && (
                    <div>
                        <div className="stat-label">Remaining</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>
                            {formatTokenAmount(remaining, decimals)} {tokenSymbol}
                        </div>
                    </div>
                )}
            </div>

            <ProgressBar value={claimedPercent} label="Amount Claimed" />
            <div style={{ height: 8 }} />
            <ProgressBar value={recipientPercent} label="Recipients Claimed" />

            {showActions && isCreator && airdrop.status === AirdropStatus.ACTIVE && remaining > 0n && (
                <div style={{ marginTop: 16 }}>
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => { e.stopPropagation(); onWithdraw?.(); }}
                        disabled={withdrawing}
                    >
                        {withdrawing ? 'Withdrawing...' : 'Withdraw Unclaimed'}
                    </button>
                </div>
            )}
        </div>
    );
}
