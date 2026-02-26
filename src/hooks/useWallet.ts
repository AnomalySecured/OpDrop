import { useState, useCallback, useEffect } from 'react';
import type { Network } from '@btc-vision/bitcoin';

interface WalletState {
    isConnected: boolean;
    address: string | null;
    publicKey: string | null;
    connecting: boolean;
    error: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useWallet(network: Network) {
    const [state, setState] = useState<WalletState>({
        isConnected: false,
        address: null,
        publicKey: null,
        connecting: false,
        error: null,
    });

    const connect = useCallback(async () => {
        if (!window.opnet) {
            setState((s) => ({ ...s, error: 'OP_WALLET extension not found. Please install it.' }));
            return;
        }

        setState((s) => ({ ...s, connecting: true, error: null }));

        try {
            const accounts = await window.opnet.requestAccounts();
            if (!accounts || accounts.length === 0) {
                setState((s) => ({ ...s, connecting: false, error: 'No accounts returned by wallet' }));
                return;
            }

            const publicKey = await window.opnet.getPublicKey();

            setState({
                isConnected: true,
                address: accounts[0],
                publicKey,
                connecting: false,
                error: null,
            });
        } catch (err) {
            setState((s) => ({
                ...s,
                connecting: false,
                error: err instanceof Error ? err.message : 'Failed to connect wallet',
            }));
        }
    }, []);

    const disconnect = useCallback(async () => {
        try {
            if (window.opnet) {
                await window.opnet.disconnect();
            }
        } finally {
            setState({
                isConnected: false,
                address: null,
                publicKey: null,
                connecting: false,
                error: null,
            });
        }
    }, []);

    // Listen for account changes
    useEffect(() => {
        if (!window.opnet) return;

        const handleAccountsChanged = (accounts: string[]) => {
            if (!accounts || accounts.length === 0) {
                disconnect();
            } else {
                setState((s) => ({ ...s, address: accounts[0] }));
            }
        };

        window.opnet.on('accountsChanged', handleAccountsChanged);
        return () => {
            window.opnet?.removeListener('accountsChanged', handleAccountsChanged);
        };
    }, [disconnect]);

    return {
        ...state,
        connect,
        disconnect,
        hasWallet: typeof window !== 'undefined' && !!window.opnet,
    };
}
