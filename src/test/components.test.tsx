import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Alert } from '../components/common/Alert.js';
import { Spinner } from '../components/common/Spinner.js';
import { ProgressBar } from '../components/common/ProgressBar.js';
import { Modal } from '../components/common/Modal.js';
import { WalletButton } from '../components/wallet/WalletButton.js';
import { ValidationResults } from '../components/airdrop/ValidationResults.js';

describe('Alert', () => {
    it('renders error alert', () => {
        render(<Alert type="error">Something went wrong</Alert>);
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders success alert', () => {
        render(<Alert type="success">All good</Alert>);
        expect(screen.getByText('All good')).toBeInTheDocument();
    });

    it('renders warning alert', () => {
        render(<Alert type="warning">Be careful</Alert>);
        expect(screen.getByText('Be careful')).toBeInTheDocument();
    });

    it('renders info alert', () => {
        render(<Alert type="info">FYI</Alert>);
        expect(screen.getByText('FYI')).toBeInTheDocument();
    });

    it('shows dismiss button when onDismiss provided', () => {
        let dismissed = false;
        render(<Alert type="error" onDismiss={() => { dismissed = true; }}>Error</Alert>);
        const btn = screen.getByText('x');
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);
        expect(dismissed).toBe(true);
    });

    it('does not show dismiss button by default', () => {
        render(<Alert type="error">Error</Alert>);
        expect(screen.queryByText('x')).not.toBeInTheDocument();
    });

    it('applies correct class for type', () => {
        const { container } = render(<Alert type="error">Error</Alert>);
        expect(container.querySelector('.alert-error')).toBeInTheDocument();
    });
});

describe('Spinner', () => {
    it('renders without text', () => {
        const { container } = render(<Spinner />);
        expect(container.querySelector('.spinner')).toBeInTheDocument();
    });

    it('renders with text', () => {
        render(<Spinner text="Loading..." />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('applies sm size', () => {
        const { container } = render(<Spinner size="sm" />);
        const spinner = container.querySelector('.spinner') as HTMLElement;
        expect(spinner.style.width).toBe('16px');
    });

    it('applies md size by default', () => {
        const { container } = render(<Spinner />);
        const spinner = container.querySelector('.spinner') as HTMLElement;
        expect(spinner.style.width).toBe('20px');
    });

    it('applies lg size', () => {
        const { container } = render(<Spinner size="lg" />);
        const spinner = container.querySelector('.spinner') as HTMLElement;
        expect(spinner.style.width).toBe('32px');
    });
});

describe('ProgressBar', () => {
    it('renders with value', () => {
        const { container } = render(<ProgressBar value={50} />);
        const bar = container.querySelector('.progress-bar') as HTMLElement;
        expect(bar.style.width).toBe('50%');
    });

    it('renders with label', () => {
        render(<ProgressBar value={75} label="75% done" />);
        expect(screen.getByText('75% done')).toBeInTheDocument();
    });

    it('shows percentage text', () => {
        render(<ProgressBar value={42.5} label="Progress" />);
        expect(screen.getByText('42.5%')).toBeInTheDocument();
    });

    it('clamps to 0', () => {
        const { container } = render(<ProgressBar value={-10} />);
        const bar = container.querySelector('.progress-bar') as HTMLElement;
        expect(bar.style.width).toBe('0%');
    });

    it('clamps to 100', () => {
        const { container } = render(<ProgressBar value={150} />);
        const bar = container.querySelector('.progress-bar') as HTMLElement;
        expect(bar.style.width).toBe('100%');
    });

    it('renders 0%', () => {
        const { container } = render(<ProgressBar value={0} />);
        const bar = container.querySelector('.progress-bar') as HTMLElement;
        expect(bar.style.width).toBe('0%');
    });

    it('renders 100%', () => {
        const { container } = render(<ProgressBar value={100} />);
        const bar = container.querySelector('.progress-bar') as HTMLElement;
        expect(bar.style.width).toBe('100%');
    });
});

describe('Modal', () => {
    it('renders when open', () => {
        render(<Modal open={true} onClose={() => {}} title="Test Modal"><p>Content</p></Modal>);
        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(<Modal open={false} onClose={() => {}} title="Test Modal"><p>Content</p></Modal>);
        expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
        let closed = false;
        render(<Modal open={true} onClose={() => { closed = true; }} title="Test"><p>Content</p></Modal>);
        fireEvent.click(screen.getByText('x'));
        expect(closed).toBe(true);
    });

    it('calls onClose when backdrop clicked', () => {
        let closed = false;
        const { container } = render(
            <Modal open={true} onClose={() => { closed = true; }} title="Test"><p>Content</p></Modal>,
        );
        const backdrop = container.querySelector('.modal-backdrop')!;
        fireEvent.click(backdrop);
        expect(closed).toBe(true);
    });

    it('does not close when modal content clicked', () => {
        let closed = false;
        const { container } = render(
            <Modal open={true} onClose={() => { closed = true; }} title="Test"><p>Content</p></Modal>,
        );
        const modal = container.querySelector('.modal')!;
        fireEvent.click(modal);
        expect(closed).toBe(false);
    });

    it('closes on Escape key', () => {
        let closed = false;
        render(<Modal open={true} onClose={() => { closed = true; }} title="Test"><p>Content</p></Modal>);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(closed).toBe(true);
    });
});

describe('WalletButton', () => {
    it('shows Connect Wallet when disconnected', () => {
        render(
            <WalletButton
                isConnected={false}
                address={null}
                connecting={false}
                networkName="Testnet"
                onConnect={() => {}}
                onDisconnect={() => {}}
                error={null}
            />,
        );
        expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });

    it('calls onConnect when clicked', () => {
        let connected = false;
        render(
            <WalletButton
                isConnected={false}
                address={null}
                connecting={false}
                networkName="Testnet"
                onConnect={() => { connected = true; }}
                onDisconnect={() => {}}
                error={null}
            />,
        );
        fireEvent.click(screen.getByText('Connect Wallet'));
        expect(connected).toBe(true);
    });

    it('shows Connecting... when connecting', () => {
        render(
            <WalletButton
                isConnected={false}
                address={null}
                connecting={true}
                networkName="Testnet"
                onConnect={() => {}}
                onDisconnect={() => {}}
                error={null}
            />,
        );
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('shows address and Disconnect when connected', () => {
        render(
            <WalletButton
                isConnected={true}
                address="0x1234567890abcdef1234567890abcdef12345678"
                connecting={false}
                networkName="OPNet Testnet"
                onConnect={() => {}}
                onDisconnect={() => {}}
                error={null}
            />,
        );
        expect(screen.getByText('Disconnect')).toBeInTheDocument();
        expect(screen.getByText('OPNet Testnet')).toBeInTheDocument();
    });

    it('calls onDisconnect when Disconnect clicked', () => {
        let disconnected = false;
        render(
            <WalletButton
                isConnected={true}
                address="0x1234567890abcdef1234567890abcdef12345678"
                connecting={false}
                networkName="Testnet"
                onConnect={() => {}}
                onDisconnect={() => { disconnected = true; }}
                error={null}
            />,
        );
        fireEvent.click(screen.getByText('Disconnect'));
        expect(disconnected).toBe(true);
    });

    it('shows error message when error is present', () => {
        render(
            <WalletButton
                isConnected={false}
                address={null}
                connecting={false}
                networkName="Testnet"
                onConnect={() => {}}
                onDisconnect={() => {}}
                error="Wallet not found"
            />,
        );
        expect(screen.getByText('Wallet not found')).toBeInTheDocument();
    });

    it('connecting button is disabled', () => {
        render(
            <WalletButton
                isConnected={false}
                address={null}
                connecting={true}
                networkName="Testnet"
                onConnect={() => {}}
                onDisconnect={() => {}}
                error={null}
            />,
        );
        const btn = screen.getByText('Connecting...').closest('button')!;
        expect(btn).toBeDisabled();
    });
});

describe('ValidationResults', () => {
    it('renders nothing for empty rows', () => {
        const { container } = render(<ValidationResults rows={[]} />);
        expect(container.innerHTML).toBe('');
    });

    it('shows valid count', () => {
        const rows = [
            { address: '0xaabb', amount: '100', valid: true },
            { address: '0xccdd', amount: '200', valid: true },
        ];
        render(<ValidationResults rows={rows} />);
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('valid')).toBeInTheDocument();
    });

    it('shows invalid count', () => {
        const rows = [
            { address: '0xaabb', amount: '100', valid: true },
            { address: 'bad', amount: '0', valid: false, error: 'Invalid address' },
        ];
        render(<ValidationResults rows={rows} />);
        // Both valid and invalid show "1", so use getAllByText
        const ones = screen.getAllByText('1');
        expect(ones.length).toBe(2); // 1 valid, 1 invalid
        expect(screen.getByText('invalid')).toBeInTheDocument();
    });

    it('shows error messages for invalid rows', () => {
        const rows = [
            { address: 'bad', amount: '0', valid: false, error: 'Invalid address' },
        ];
        render(<ValidationResults rows={rows} />);
        expect(screen.getByText('Invalid address')).toBeInTheDocument();
    });

    it('shows total count', () => {
        const rows = [
            { address: '0xaabb', amount: '100', valid: true },
            { address: 'bad', amount: '0', valid: false, error: 'Bad' },
        ];
        render(<ValidationResults rows={rows} />);
        expect(screen.getByText('2 total')).toBeInTheDocument();
    });

    it('shows valid rows when 20 or fewer', () => {
        const rows = Array.from({ length: 3 }, (_, i) => ({
            address: `0x${i}${i}`,
            amount: '100',
            valid: true,
        }));
        render(<ValidationResults rows={rows} />);
        // Should render the + markers for valid items
        expect(screen.getAllByText('+')).toHaveLength(3);
    });

    it('hides valid rows when more than 20', () => {
        const rows = Array.from({ length: 25 }, (_, i) => ({
            address: `0x${i.toString().padStart(4, '0')}`,
            amount: '100',
            valid: true,
        }));
        render(<ValidationResults rows={rows} />);
        // Should NOT render individual valid items
        expect(screen.queryAllByText('+')).toHaveLength(0);
    });
});
