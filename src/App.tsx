import { useState } from 'react';
import { networks } from '@btc-vision/bitcoin';
import { useNetwork } from './hooks/useNetwork.js';
import { useWallet } from './hooks/useWallet.js';
import { WalletButton } from './components/wallet/WalletButton.js';
import { SendPage } from './pages/SendPage.js';
import { ClaimPage } from './pages/ClaimPage.js';
import { MyDropsPage } from './pages/MyDropsPage.js';
import { getContractAddress } from './config/index.js';

type Page = 'send' | 'claim' | 'mydrops';

export function App() {
    const { network, switchNetwork, networkName } = useNetwork();
    const wallet = useWallet(network);
    const [page, setPage] = useState<Page>('send');

    let dropOpAddress = '';
    try {
        dropOpAddress = getContractAddress('dropOp', network);
    } catch {
        // Not configured yet
    }

    return (
        <div className="app-container">
            <header className="header">
                <div className="header-logo" onClick={() => setPage('send')} style={{ cursor: 'pointer' }}>
                    Op<span>Drop</span>
                </div>
                <div className="header-actions">
                    <select
                        className="input"
                        style={{ width: 'auto', padding: '6px 32px 6px 12px' }}
                        value={network === networks.bitcoin ? 'mainnet' : 'testnet'}
                        onChange={(e) =>
                            switchNetwork(e.target.value === 'mainnet' ? networks.bitcoin : networks.opnetTestnet)
                        }
                    >
                        <option value="testnet">OPNet Testnet</option>
                        <option value="mainnet">Mainnet</option>
                    </select>
                    <WalletButton
                        isConnected={wallet.isConnected}
                        address={wallet.address}
                        connecting={wallet.connecting}
                        networkName={networkName}
                        onConnect={wallet.connect}
                        onDisconnect={wallet.disconnect}
                        error={wallet.error}
                    />
                </div>
            </header>

            <nav className="nav">
                <button className={`nav-item ${page === 'send' ? 'active' : ''}`} onClick={() => setPage('send')}>
                    Send
                </button>
                <button className={`nav-item ${page === 'claim' ? 'active' : ''}`} onClick={() => setPage('claim')}>
                    Claim
                </button>
                <button className={`nav-item ${page === 'mydrops' ? 'active' : ''}`} onClick={() => setPage('mydrops')}>
                    My Drops
                </button>
            </nav>

            {page === 'send' && (
                <SendPage
                    network={network}
                    dropOpAddress={dropOpAddress}
                    walletAddress={wallet.address}
                    walletPublicKey={wallet.publicKey}
                    isConnected={wallet.isConnected}
                    onConnect={wallet.connect}
                />
            )}
            {page === 'claim' && (
                <ClaimPage
                    network={network}
                    dropOpAddress={dropOpAddress}
                    walletAddress={wallet.address}
                    walletPublicKey={wallet.publicKey}
                    isConnected={wallet.isConnected}
                    onConnect={wallet.connect}
                />
            )}
            {page === 'mydrops' && (
                <MyDropsPage
                    network={network}
                    dropOpAddress={dropOpAddress}
                    walletAddress={wallet.address}
                    isConnected={wallet.isConnected}
                    onConnect={wallet.connect}
                />
            )}

            <footer className="footer">
                <div className="footer-links">
                    <a href="https://github.com/AnomalySecured/OpDrop" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                    </a>
                    <a href="https://x.com/placeholder" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                </div>
                <div>
                    OpDrop is provided as-is, free of charge, no fees. Use at your own risk.
                </div>
            </footer>
        </div>
    );
}
