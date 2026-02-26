import { formatAddress } from '../../utils/formatting.js';

interface WalletButtonProps {
    isConnected: boolean;
    address: string | null;
    connecting: boolean;
    networkName: string;
    onConnect: () => void;
    onDisconnect: () => void;
    error: string | null;
}

export function WalletButton({
    isConnected,
    address,
    connecting,
    networkName,
    onConnect,
    onDisconnect,
    error,
}: WalletButtonProps) {
    if (connecting) {
        return (
            <button className="btn btn-primary" disabled>
                <span className="spinner" style={{ width: 14, height: 14 }} />
                Connecting...
            </button>
        );
    }

    if (isConnected && address) {
        return (
            <div className="header-actions">
                <span className="badge badge-active">{networkName}</span>
                <span style={{ fontSize: 14, fontFamily: 'monospace' }}>
                    {formatAddress(address)}
                </span>
                <button className="btn btn-secondary btn-sm" onClick={onDisconnect}>
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button className="btn btn-primary" onClick={onConnect}>
                Connect Wallet
            </button>
            {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
        </div>
    );
}
