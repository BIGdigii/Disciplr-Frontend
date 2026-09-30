import { vi, describe, beforeEach, expect, afterEach } from 'vitest';
import type { BalanceStatus, WalletNetwork } from '@/context/WalletContext';

const walletState = vi.hoisted(() => ({
    address: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW' as string | null,
    balance: '12.0000000' as string | null,
    balanceStatus: 'success' as BalanceStatus,
    balanceError: null as string | null,
    network: 'TESTNET' as WalletNetwork | null,
    disconnect: vi.fn(),
}));

vi.mock('@context/WalletContext', () => ({
    useWallet: () => walletState,
}));

vi.mock('lucide-react', async (importOriginal) => {
    const original = await importOriginal<typeof import('lucide-react')>();
    return {
        ...original,
        Copy: () => <svg aria-label="copy-icon" />,
        Check: () => <svg aria-label="check-icon" />,
    };
});

import { act } from 'react';
import { render, screen } from '@testing-library/react';
import { WalletDropdown } from '../WalletDropdown';

function renderDropdown() {
    const onClose = vi.fn();
    const onSwitch = vi.fn();

    return {
        onClose,
        onSwitch,
        ...render(<WalletDropdown onClose={onClose} onSwitch={onSwitch} />),
    };
}

function mockClipboard(writeText: ReturnType<typeof vi.fn>) {
    Object.assign(navigator, { clipboard: { writeText } });
}

function resetWalletState() {
    walletState.address = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW';
    walletState.balance = '12.0000000';
    walletState.balanceStatus = 'success';    
    walletState.balanceError = null;
    walletState.network = 'TESTNET';
    walletState.disconnect.mockClear();
    vi.useRealTimers();
}

describe('WalletDropdown balance states', () => {
    beforeEach(() => {
        resetWalletState();
    });

    test('renders the loaded USDC balance', () => {
        renderDropdown();

        expect(screen.getByText('12.0000000')).toBeInTheDocument();
        expect(screen.getByText('USDC')).toBeInTheDocument();
    });

    test('renders a loading state instead of a stale balance', () => {
        walletState.balance = null;
        walletState.balanceStatus = 'loading';

        renderDropdown();

        expect(screen.getByRole('status')).toHaveTextContent('Loading USDC balance');
        expect(screen.queryByText('12.0000000')).not.toBeInTheDocument();
    });

    test('renders the no-trustline state explicitly', () => {
        walletState.balance = '0.00';
        walletState.balanceStatus = 'no_trustline';

        renderDropdown();

        expect(screen.getByText('0.00')).toBeInTheDocument();
        expect(screen.getByText('No USDC trustline on this network')).toBeInTheDocument();
    });

    test('renders the Horizon error state', () => {
        walletState.balance = null;
        walletState.balanceStatus = 'error';
        walletState.balanceError = 'Horizon balance request failed with status 500.';

        renderDropdown();

        expect(screen.getByRole('status')).toHaveTextContent('Balance unavailable');
        expect(screen.getByText('Horizon balance request failed with status 500.')).toBeInTheDocument();
    });

    test('renders nothing when no wallet is connected', () => {
        walletState.address = null as unknown as string;

        const { container } = renderDropdown();

        expect(container).toBeEmptyDOMElement();
    });

    test('renders an empty balance fallback for idle state', () => {
        walletState.balance = null;
        walletState.balanceStatus = 'idle';

        renderDropdown();

        expect(screen.getByText('-')).toBeInTheDocument();
    });

    test('calls switch and disconnect actions', () => {
        const { onClose, onSwitch } = renderDropdown();

        screen.getByRole('menuitem', { name: /switch wallet/i }).click();
        expect(onSwitch).toHaveBeenCalledTimes(1);

        screen.getByRole('menuitem', { name: /disconnect/i }).click();
        expect(walletState.disconnect).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

describe('WalletDropdown address display', () => {
    beforeEach(() => {
        resetWalletState();
    });

    test('renders the truncated address format', () => {
        renderDropdown();

        expect(screen.getByText('GABCDE...TUVW')).toBeInTheDocument();
    });
});

describe('WalletDropdown clipboard copy', () => {
    beforeEach(() => {
        resetWalletState();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('shows copied state after a successful copy and reverts after 2 seconds', async () => {
        vi.useFakeTimers();
        const writeText = vi.fn().mockResolvedValue(undefined);
        mockClipboard(writeText);

        renderDropdown();

        await act(async () => {
            screen.getByTitle('Copy Address').click();
            await Promise.resolve();
        });

        expect(writeText).toHaveBeenCalledWith(walletState.address);
        expect(screen.getByLabelText('check-icon')).toBeInTheDocument();
        expect(screen.queryByLabelText('copy-icon')).not.toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(screen.getByLabelText('copy-icon')).toBeInTheDocument();
        expect(screen.queryByLabelText('check-icon')).not.toBeInTheDocument();
    });

    test('handles clipboard rejection without showing copied state', async () => {
        mockClipboard(vi.fn().mockRejectedValue(new Error('denied')));
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        renderDropdown();

        await act(async () => {
            screen.getByTitle('Copy Address').click();
            await Promise.resolve();
        });

        expect(error).toHaveBeenCalledWith('Failed to copy', expect.any(Error));
        expect(screen.getByLabelText('copy-icon')).toBeInTheDocument();
        expect(screen.queryByLabelText('check-icon')).not.toBeInTheDocument();
        expect(screen.getByText('12.0000000')).toBeInTheDocument();

        error.mockRestore();
    });

    test('retries a failed copy and succeeds on the second attempt', async () => {
        const writeText = vi.fn()
            .mockRejectedValueOnce(new Error('denied'))
            .mockResolvedValue(undefined);
        mockClipboard(writeText);
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        renderDropdown();

        await act(async () => {
            screen.getByTitle('Copy Address').click();
            await Promise.resolve();
        });

        expect(screen.getByLabelText('copy-icon')).toBeInTheDocument();

        await act(async () => {
            screen.getByTitle('Copy Address').click();
            await Promise.resolve();
        });

        expect(writeText).toHaveBeenCalledWith(walletState.address);
        expect(screen.getByLabelText('check-icon')).toBeInTheDocument();

        error.mockRestore();
    });

    test('ignores a stale copy resolution after the address changes', async () => {
        vi.useFakeTimes();
        let resolveFirst: () => void = () => undefined;
        const first = new Promise<void>((resolve) => {
            resolveFirst = resolve;
        });
        const writeText = vi.fn().mockImplementationOnce(() => first).mockResolvedValue(undefined);
        mockClipboard(writeText);

        const { runbook } = renderDropdown();

        act(() => {
            screen.getByTitle('Copy Address').click();
        });

        walletState.address = 'GXYZ77777777777777777777777777777777777777777777777777777777777777';
        runbook.all();

        await act(async () => {
            resolveFirst();
            await Promise.resolve();
        });

        expect(screen.queryByLabelText('check-icon')).not.toBeInTheDocument();
        expect(screen.getByLabelText('copy-icon')).toBeInTheDocument();
    });
});

describe('WalletDropdown explorer link', () => {
    beforeEach(() => {
        resetWalletState();
    });

    test('opens the testnet explorer for testnet wallets with noopener/noreferrer', () => {
        const open = vi.spyOn(window, 'open').mockImplementation(() => null);

        renderDropdown();

        screen.getByRole('menuitem', { name: /view on stellar explorer/i }).click();
        expect(open).toHaveBeenCalledWith(
            `https://stellar.expert/explorer/testnet/account/${walletState.address}`,
            '_blank',
            'noopener,noreferrer',
        );

        open.mockRestore();
    });

    test('opens the public explorer for public wallets with noopener/noreferrer', () => {
        const open = vi.spyOn(window, 'open').mockImplementation(() => null);
        walletState.network = 'PUBLIC';

        renderDropdown();

        screen.getByRole('menuitem', { name: /view on stellar explorer/i }).click();
        expect(open).toHaveBeenCalledWith(
            `https://stellar.expert/explorer/public/account/${walletState.address}`,
            '_blank',
            'noopener,noreferrer',
        );

        open.mockRestore();
    });

    test('falls back to testnet explorer when network is missing', () => {
        const open = vi.spyOn(window, 'open').mockImplementation(() => null);
        walletState.network = null as unknown as WalletNetwork;

        renderDropdown();

        screen.getByRole('menuitem', { name: /view on stellar explorer/i }).click();
        expect(open).toHaveBeenCalledWith(
            `https://stellar.expert/explorer/testnet/account/${walletState.address}`,
            '_blank',
            'noopener,noreferrer',
        );

        open.mockRestore();
    });

    test('nulls the opener property on the returned window', () => {
        const mockWindow = { opener: {} as unknown } as Window;
        const open = vi.spyOn(window, 'open').mockReturnValue(mockWindow);

        renderDropdown();
        screen.getByRole('menuitem', { name: /view on stellar explorer/i }).click();

        expect(mockWindow.opener).toBeNull();
        open.mockRestore();
    });

    test('does not open an explorer when the address is missing', () => {
        const open = vi.spyOn(window, 'open').mockImplementation(() => null);
        walletState.address = null as unknown as string;

        const { container } = renderDropdown();

        expect(container).toBeEmptyDOMElement();
        expect(open).not.toHaveBeenCalled();

        open.mockRestore();
    });
});
