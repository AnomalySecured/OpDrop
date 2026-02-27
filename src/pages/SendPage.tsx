import { useState, useMemo, useCallback } from 'react';
import type { Network } from '@btc-vision/bitcoin';
import { AirdropMode } from '../types/index.js';
import { Alert } from '../components/common/Alert.js';
import { Spinner } from '../components/common/Spinner.js';
import { useDropOp } from '../hooks/useDropOp.js';
import { formatTokenAmount } from '../utils/csv.js';
import { resolveAllToPublicKeys, isHexPublicKey, type ResolvedAddress } from '../utils/address.js';

interface SendPageProps {
    network: Network;
    dropOpAddress: string;
    walletAddress: string | null;
    walletPublicKey: string | null;
    isConnected: boolean;
    onConnect: () => void;
}

interface UnresolvedEntry {
    index: number;
    original: string;
    manualKey: string;
}

export function SendPage({ network, dropOpAddress, walletAddress, walletPublicKey, isConnected, onConnect }: SendPageProps) {
    const [mode, setMode] = useState<AirdropMode>(AirdropMode.DIRECT);
    const [tokenAddress, setTokenAddress] = useState('');
    const [decimals, setDecimals] = useState(18);
    const [amountEach, setAmountEach] = useState('');
    const [addressText, setAddressText] = useState('');
    const [successId, setSuccessId] = useState<bigint | null>(null);
    const [resolving, setResolving] = useState(false);
    const [resolveError, setResolveError] = useState<string | null>(null);
    const [unresolved, setUnresolved] = useState<UnresolvedEntry[]>([]);
    const { createClaimAirdrop, createDirectAirdrop, loading, error } = useDropOp();

    const addresses = useMemo(() => {
        if (!addressText.trim()) return [];
        return addressText
            .split(/[,\n]+/)
            .map((a) => a.trim())
            .filter((a) => a.length > 0);
    }, [addressText]);

    const uniqueAddresses = useMemo(() => [...new Set(addresses)], [addresses]);
    const dupeCount = addresses.length - uniqueAddresses.length;

    const totalHuman = useMemo(() => {
        if (!amountEach || uniqueAddresses.length === 0) return '0';
        try {
            const parts = amountEach.split('.');
            const whole = parts[0];
            let frac = parts[1] || '';
            if (frac.length > decimals) frac = frac.slice(0, decimals);
            else frac = frac.padEnd(decimals, '0');
            const perPerson = BigInt(whole + frac);
            const total = perPerson * BigInt(uniqueAddresses.length);
            return formatTokenAmount(total, decimals);
        } catch {
            return '0';
        }
    }, [amountEach, uniqueAddresses.length, decimals]);

    const updateManualKey = useCallback((index: number, value: string) => {
        setUnresolved((prev) =>
            prev.map((u) => (u.index === index ? { ...u, manualKey: value } : u)),
        );
    }, []);

    const handleSend = async () => {
        if (!walletAddress || !dropOpAddress) return;
        setResolveError(null);
        setUnresolved([]);

        // Step 1: Resolve all addresses to public keys
        setResolving(true);
        let resolved: ResolvedAddress[];
        try {
            resolved = await resolveAllToPublicKeys(uniqueAddresses, network);
        } catch (err) {
            setResolveError(err instanceof Error ? err.message : 'Failed to resolve addresses');
            setResolving(false);
            return;
        }
        setResolving(false);

        // Check for unresolved entries
        const failed = resolved
            .map((r, i) => ({ ...r, index: i }))
            .filter((r) => !r.publicKey);

        if (failed.length > 0) {
            setUnresolved(
                failed.map((f) => ({
                    index: f.index,
                    original: f.original,
                    manualKey: '',
                })),
            );
            setResolveError(
                `${failed.length} address(es) could not be resolved to public keys. Enter the hex public keys manually below.`,
            );
            return;
        }

        // All resolved - build final recipient list with public keys
        const finalRecipients = resolved.map((r) => ({
            address: r.publicKey!,
            amount: amountEach,
        }));

        await doSend(finalRecipients);
    };

    const handleSendWithManualKeys = async () => {
        if (!walletAddress || !dropOpAddress) return;

        // Validate all manual entries
        for (const u of unresolved) {
            if (!u.manualKey.trim()) {
                setResolveError(`Please enter a hex public key for ${u.original}`);
                return;
            }
            if (!isHexPublicKey(u.manualKey.trim())) {
                setResolveError(
                    `Invalid hex public key for ${u.original}. Must be 0x-prefixed hex (e.g. 0x020373626d317ae8788ce3280b491068610d840c23ecb64c14075bbb9f670af52c)`,
                );
                return;
            }
        }

        // Re-resolve, substituting manual keys for failures
        setResolving(true);
        let resolved: ResolvedAddress[];
        try {
            resolved = await resolveAllToPublicKeys(uniqueAddresses, network);
        } catch (err) {
            setResolveError(err instanceof Error ? err.message : 'Failed to resolve addresses');
            setResolving(false);
            return;
        }
        setResolving(false);

        // Apply manual overrides
        const manualMap = new Map(unresolved.map((u) => [u.index, u.manualKey.trim()]));
        const finalRecipients = resolved.map((r, i) => ({
            address: r.publicKey || manualMap.get(i) || r.original,
            amount: amountEach,
        }));

        // Final validation: all must be hex
        const invalid = finalRecipients.find((r) => !isHexPublicKey(r.address));
        if (invalid) {
            setResolveError(`Address ${invalid.address} is not a valid hex public key.`);
            return;
        }

        setUnresolved([]);
        setResolveError(null);
        await doSend(finalRecipients);
    };

    const doSend = async (recipients: { address: string; amount: string }[]) => {
        let result: bigint | null = null;
        if (mode === AirdropMode.DIRECT) {
            result = await createDirectAirdrop(dropOpAddress, tokenAddress, recipients, decimals, walletAddress!, network);
        } else {
            result = await createClaimAirdrop(dropOpAddress, tokenAddress, recipients, decimals, walletAddress!, network);
        }

        if (result !== null) {
            setSuccessId(result);
        }
    };

    const canSend =
        isConnected &&
        tokenAddress.trim() &&
        amountEach &&
        uniqueAddresses.length > 0 &&
        !loading &&
        !resolving;

    if (successId !== null) {
        return (
            <div className="page">
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <h2 style={{ color: 'var(--success)', marginBottom: 12 }}>Sent!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {mode === AirdropMode.DIRECT
                            ? `Tokens sent to ${uniqueAddresses.length} addresses.`
                            : `Claim pool created for ${uniqueAddresses.length} addresses.`}
                    </p>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
                        Airdrop #{successId.toString()}
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setSuccessId(null);
                            setAddressText('');
                            setUnresolved([]);
                            setResolveError(null);
                        }}
                    >
                        Send Another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-title-row">
                <span className="page-title-logo">
                    Op<span>Drop</span>
                </span>
                <h1 style={{ fontSize: 28, fontWeight: 700 }}>Send Tokens</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                Paste addresses or hex public keys, pick an amount, hit send.
            </p>

            {error && <Alert type="error">{error}</Alert>}
            {resolveError && <Alert type="error">{resolveError}</Alert>}

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
                    <span
                        style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            alignSelf: 'center',
                            marginLeft: 4,
                        }}
                    >
                        {mode === AirdropMode.DIRECT
                            ? 'Tokens go out immediately.'
                            : 'Recipients claim themselves. You can take back unclaimed.'}
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
                            onChange={(e) =>
                                setDecimals(Math.min(18, Math.max(0, parseInt(e.target.value) || 0)))
                            }
                        />
                    </div>
                </div>

                {/* Addresses */}
                <div className="input-group">
                    <label className="input-label">
                        Recipient Public Keys or Addresses (comma or newline separated)
                    </label>
                    <textarea
                        className="input"
                        placeholder={
                            '0x020373626d317ae8788ce3280b491068610d840c23ecb...\n0x03a1b2c3d4e5f6...\nbc1q... (will be resolved to public key)'
                        }
                        value={addressText}
                        onChange={(e) => {
                            setAddressText(e.target.value);
                            setUnresolved([]);
                            setResolveError(null);
                        }}
                        rows={6}
                    />
                    <p className="input-hint">
                        Hex public keys (0x...) are preferred. Bitcoin addresses (bc1q, op1, tb1)
                        will be resolved to public keys automatically. If resolution fails you will
                        be prompted to enter the public key manually.
                    </p>
                </div>

                {/* Manual public key entry for unresolved addresses */}
                {unresolved.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <p
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--warning)',
                                marginBottom: 8,
                            }}
                        >
                            Enter hex public keys for unresolved addresses:
                        </p>
                        {unresolved.map((u) => (
                            <div key={u.index} className="input-group" style={{ marginBottom: 8 }}>
                                <label
                                    className="input-label"
                                    style={{ fontSize: 12, color: 'var(--text-muted)' }}
                                >
                                    {u.original}
                                </label>
                                <input
                                    className="input"
                                    placeholder="0x020373626d317ae8788ce3280b491068610d840c23ecb64c14075bbb9f670af52c"
                                    value={u.manualKey}
                                    onChange={(e) => updateManualKey(u.index, e.target.value)}
                                />
                            </div>
                        ))}
                        <button
                            className="btn btn-primary btn-full"
                            disabled={
                                loading ||
                                resolving ||
                                unresolved.some((u) => !u.manualKey.trim())
                            }
                            onClick={handleSendWithManualKeys}
                        >
                            {resolving ? (
                                <>
                                    <span
                                        className="spinner"
                                        style={{ width: 14, height: 14 }}
                                    />
                                    Resolving...
                                </>
                            ) : loading ? (
                                <>
                                    <span
                                        className="spinner"
                                        style={{ width: 14, height: 14 }}
                                    />
                                    {mode === AirdropMode.DIRECT
                                        ? 'Sending...'
                                        : 'Creating Pool...'}
                                </>
                            ) : (
                                'Confirm & Send'
                            )}
                        </button>
                    </div>
                )}

                {/* Summary bar */}
                {uniqueAddresses.length > 0 && (
                    <div className="summary-bar">
                        <span>{uniqueAddresses.length} addresses</span>
                        {dupeCount > 0 && (
                            <span style={{ color: 'var(--warning)' }}>
                                {dupeCount} duplicates removed
                            </span>
                        )}
                        {amountEach && (
                            <span>
                                Total: <strong>{totalHuman}</strong> tokens
                            </span>
                        )}
                    </div>
                )}

                {/* Action */}
                {unresolved.length === 0 && (
                    <>
                        {!isConnected ? (
                            <button
                                className="btn btn-primary btn-lg btn-full"
                                onClick={onConnect}
                            >
                                Connect Wallet to Send
                            </button>
                        ) : (
                            <button
                                className="btn btn-primary btn-lg btn-full"
                                disabled={!canSend}
                                onClick={handleSend}
                            >
                                {resolving ? (
                                    <>
                                        <span
                                            className="spinner"
                                            style={{ width: 14, height: 14 }}
                                        />
                                        Resolving Addresses...
                                    </>
                                ) : loading ? (
                                    <>
                                        <span
                                            className="spinner"
                                            style={{ width: 14, height: 14 }}
                                        />
                                        {mode === AirdropMode.DIRECT
                                            ? 'Sending...'
                                            : 'Creating Pool...'}
                                    </>
                                ) : mode === AirdropMode.DIRECT ? (
                                    `Send to ${uniqueAddresses.length} Addresses`
                                ) : (
                                    `Create Claim Pool for ${uniqueAddresses.length} Addresses`
                                )}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
