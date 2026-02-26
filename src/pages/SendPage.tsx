import { useState, useMemo } from 'react';
import type { Network } from '@btc-vision/bitcoin';
import { AirdropMode } from '../types/index.js';
import { Alert } from '../components/common/Alert.js';
import { useDropOp } from '../hooks/useDropOp.js';
import { formatTokenAmount } from '../utils/csv.js';

interface SendPageProps {
    network: Network;
    dropOpAddress: string;
    walletAddress: string | null;
    isConnected: boolean;
    onConnect: () => void;
}

export function SendPage({ network, dropOpAddress, walletAddress, isConnected, onConnect }: SendPageProps) {
    const [mode, setMode] = useState<AirdropMode>(AirdropMode.DIRECT);
    const [tokenAddress, setTokenAddress] = useState('');
    const [decimals, setDecimals] = useState(18);
    const [amountEach, setAmountEach] = useState('');
    const [addressText, setAddressText] = useState('');
    const [successId, setSuccessId] = useState<bigint | null>(null);
    const { createClaimAirdrop, createDirectAirdrop, loading, error } = useDropOp();

    // Parse comma-separated addresses
    const addresses = useMemo(() => {
        if (!addressText.trim()) return [];
        return addressText
            .split(/[,\n]+/)
            .map((a) => a.trim())
            .filter((a) => a.length > 0);
    }, [addressText]);

    // Dedup
    const uniqueAddresses = useMemo(() => [...new Set(addresses)], [addresses]);
    const dupeCount = addresses.length - uniqueAddresses.length;

    // Build recipients
    const recipients = useMemo(() => {
        if (!amountEach || uniqueAddresses.length === 0) return [];
        return uniqueAddresses.map((addr) => ({ address: addr, amount: amountEach }));
    }, [uniqueAddresses, amountEach]);

    const totalHuman = useMemo(() => {
        if (!amountEach || recipients.length === 0) return '0';
        try {
            const parts = amountEach.split('.');
            const whole = parts[0];
            let frac = parts[1] || '';
            if (frac.length > decimals) frac = frac.slice(0, decimals);
            else frac = frac.padEnd(decimals, '0');
            const perPerson = BigInt(whole + frac);
            const total = perPerson * BigInt(recipients.length);
            return formatTokenAmount(total, decimals);
        } catch {
            return '0';
        }
    }, [amountEach, recipients.length, decimals]);

    const canSend = isConnected && tokenAddress.trim() && amountEach && recipients.length > 0 && !loading;

    const handleSend = async () => {
        if (!walletAddress || !dropOpAddress) return;

        let result: bigint | null = null;
        if (mode === AirdropMode.DIRECT) {
            result = await createDirectAirdrop(dropOpAddress, tokenAddress, recipients, decimals, walletAddress, network);
        } else {
            result = await createClaimAirdrop(dropOpAddress, tokenAddress, recipients, decimals, walletAddress, network);
        }

        if (result !== null) {
            setSuccessId(result);
        }
    };

    if (successId !== null) {
        return (
            <div className="page">
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <h2 style={{ color: 'var(--success)', marginBottom: 12 }}>Sent!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {mode === AirdropMode.DIRECT
                            ? `Tokens sent to ${recipients.length} addresses.`
                            : `Claim pool created for ${recipients.length} addresses.`
                        }
                    </p>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
                        Airdrop #{successId.toString()}
                    </p>
                    <button className="btn btn-primary" onClick={() => { setSuccessId(null); setAddressText(''); }}>
                        Send Another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-title-row">
                <span className="page-title-logo">Drop<span>Op</span></span>
                <h1 style={{ fontSize: 28, fontWeight: 700 }}>Send Tokens</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                Paste addresses, pick an amount, hit send.
            </p>

            {error && <Alert type="error">{error}</Alert>}

            <div className="card">
                {/* Mode toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <button
                        className={`btn btn-sm ${mode === AirdropMode.DIRECT ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setMode(AirdropMode.DIRECT)}
                    >
                        Send Now
                    </button>
                    <button
                        className={`btn btn-sm ${mode === AirdropMode.CLAIM ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setMode(AirdropMode.CLAIM)}
                    >
                        Let Them Claim
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
                        {mode === AirdropMode.DIRECT
                            ? 'Tokens go out immediately.'
                            : 'Recipients claim themselves. You can take back unclaimed.'
                        }
                    </span>
                </div>

                {/* Token */}
                <div className="input-group">
                    <label className="input-label">Token Address</label>
                    <input
                        className="input"
                        placeholder="0x... or op1..."
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                    />
                </div>

                {/* Amount + Decimals side by side */}
                <div className="two-col">
                    <div className="input-group">
                        <label className="input-label">Amount Per Address</label>
                        <input
                            className="input"
                            placeholder="100"
                            value={amountEach}
                            onChange={(e) => setAmountEach(e.target.value.replace(/[^0-9.]/g, ''))}
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Token Decimals</label>
                        <input
                            className="input"
                            type="number"
                            min={0}
                            max={18}
                            value={decimals}
                            onChange={(e) => setDecimals(Math.min(18, Math.max(0, parseInt(e.target.value) || 0)))}
                        />
                    </div>
                </div>

                {/* Addresses */}
                <div className="input-group">
                    <label className="input-label">Addresses (comma or newline separated)</label>
                    <textarea
                        className="input"
                        placeholder="0x1234..., 0x5678..., 0x9abc..."
                        value={addressText}
                        onChange={(e) => setAddressText(e.target.value)}
                        rows={6}
                    />
                </div>

                {/* Summary bar */}
                {uniqueAddresses.length > 0 && (
                    <div className="summary-bar">
                        <span>{uniqueAddresses.length} addresses</span>
                        {dupeCount > 0 && (
                            <span style={{ color: 'var(--warning)' }}>{dupeCount} duplicates removed</span>
                        )}
                        {amountEach && <span>Total: <strong>{totalHuman}</strong> tokens</span>}
                    </div>
                )}

                {/* Action */}
                {!isConnected ? (
                    <button className="btn btn-primary btn-lg btn-full" onClick={onConnect}>
                        Connect Wallet to Send
                    </button>
                ) : (
                    <button className="btn btn-primary btn-lg btn-full" disabled={!canSend} onClick={handleSend}>
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: 14, height: 14 }} />
                                {mode === AirdropMode.DIRECT ? 'Sending...' : 'Creating Pool...'}
                            </>
                        ) : (
                            mode === AirdropMode.DIRECT
                                ? `Send to ${uniqueAddresses.length} Addresses`
                                : `Create Claim Pool for ${uniqueAddresses.length} Addresses`
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
