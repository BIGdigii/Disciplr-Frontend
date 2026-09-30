import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../../context/WalletContext';
import { Copy, Plus, LogOut, Check, ExternalLink } from 'lucide-react';
import { getExplorerAccountUrl } from '../../utils/explorer';
import { truncateMiddle } from '../../utils/truncate';
import './wallet.css';
import { logger } from '../../utils/logger';
import FocusTrap from 'focus-trap-react';

interface WalletDropdownProps {
    onClose: () => void;
    onSwitch: () => void;
}

export function WalletDropdown({ onClose, onSwitch }: WalletDropdownProps) {
    const { address, balance, balanceStatus, balanceError, network, disconnect } = useWallet();
    const [copied, setCopied] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('keydown', handleKey);
            triggerRef.current?.focus();
        };
    }, [onClose]);

    if (!address) return null;

    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            logger.error('Failed to copy', err);
        }
    };

    const openExplorer = () => {
        const url = getExplorerAccountUrl(address, network);
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (newWindow) newWindow.opener = null;
    };

    const renderBalance = () => {
        if (balanceStatus === 'loading') {
            return (
                <div className="wallet-dropdown-balance-state" role="status">
                    <span className="loader" aria-hidden="true" />
                    Loading USDC balance
                </div>
            );
        }

        if (balanceStatus === 'error') {
            return (
                <div className="wallet-dropdown-balance-state error" role="status">
                    Balance unavailable
                    {balanceError && <small>{balanceError}</small>}
                </div>
            );
        }

        if (balanceStatus === 'no_trustline') {
            return (
                <div>
                    <div className="wallet-dropdown-balance">
                        0.00 <span>USDC</span>
                    </div>
                    <small className="wallet-dropdown-balance-note">No USDC trustline on this network</small>
                </div>
            );
        }

        return (
            <div className="wallet-dropdown-balance">
                {balance !== null ? balance : '-'} <span>USDC</span>
            </div>
        );
    };

    return (
        <FocusTrap
            focusTrapOptions={{
                allowOutsideClick: true,
                clickOutsideDeactivates: false,
                escapeDeactivates: false,
                fallbackFocus: () => dropdownRef.current ?? document.body,
                initialFocus: () =>
                    dropdownRef.current?.querySelector<HTMLElement>(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                    ) ?? dropdownRef.current ?? document.body,
                returnFocusOnDeactivate: false,
            }}
        >
            <div className="wallet-dropdown-menu" role="menu" aria-label="Wallet options" ref={dropdownRef}>
                <div className="wallet-dropdown-header">
                    <div className="wallet-dropdown-address-container">
                        <span className="wallet-dropdown-address">{truncateMiddle(address, 6, 4)}</span>
                        <button className="wallet-copy-btn" onClick={copyAddress} title="Copy Address" role="menuitem">
                            {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                        </button>
                    </div>
                    {renderBalance()}
                </div>

                <div className="wallet-dropdown-actions">
                    <button className="wallet-dropdown-item" onClick={openExplorer} role="menuitem">
                        <ExternalLink size={16} />
                        View on Stellar Explorer
                    </button>
                    <button className="wallet-dropdown-item" onClick={onSwitch} role="menuitem">
                        <Plus size={16} />
                        Switch Wallet
                    </button>
                    <button
                        className="wallet-dropdown-item danger"
                        onClick={() => {
                            disconnect();
                            onClose();
                        }}
                        role="menuitem"
                    >
                        <LogOut size={16} />
                        Disconnect
                    </button>
                </div>
            </div>
        </FocusTrap>
    );
}
