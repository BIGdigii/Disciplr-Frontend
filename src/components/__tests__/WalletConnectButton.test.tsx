import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WalletProvider } from '../../context/WalletContext';
import { WalletConnectButton } from '../Wallet/WalletConnectButton';
import {
  getAddress,
  getNetworkDetails,
  isAllowed,
  requestAccess,
  setAllowed,
} from '@stellar/freighter-api';

vi.mock('@stellar/freighter-api', () => ({
  isAllowed: vi.fn(),
  setAllowed: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetworkDetails: vi.fn(),
}));

vi.mock('../../utils/horizon', () => ({
  fetchUsdcBalance: vi.fn().mockResolvedValue({ balance: '0.00', hasTrustline: false }),
}));

const mockIsAllowed = vi.mocked(isAllowed);
const mockSetAllowed = vi.mocked(setAllowed);
const mockRequestAccess = vi.mocked(requestAccess);
const mockGetAddress = vi.mocked(getAddress);
const mockGetNetworkDetails = vi.mocked(getNetworkDetails);

const walletAddress = 'GBVZ3KQKM4XNQPBEZMXPOLKQKM4XNQPBEZMXPOLKQK7L';

function renderWalletButton() {
  return render(
    <WalletProvider>
      <div data-testid="outside-target">Outside</div>
      <WalletConnectButton />
    </WalletProvider>,
  );
}

function getConnectedButton() {
  const address = screen.getByText('GBVZ...QK7L');
  const button = address.closest('button');
  expect(button).toBeInTheDocument();
  return button as HTMLButtonElement;
}

describe('WalletConnectButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // A prior test's disconnect() persists WALLET_DISCONNECTED_KEY in
    // localStorage, which would otherwise make checkConnection() skip
    // auto-reconnect on the next test's mount.
    localStorage.clear();
    mockIsAllowed.mockResolvedValue({ isAllowed: false });
    mockSetAllowed.mockResolvedValue({ isAllowed: false });
    mockRequestAccess.mockResolvedValue({ address: walletAddress });
    mockGetAddress.mockResolvedValue({ address: walletAddress, error: undefined });
    mockGetNetworkDetails.mockResolvedValue({
      network: 'TESTNET',
      networkUrl: 'https://horizon-testnet.stellar.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
    });
  });

  it('opens the wallet selection modal from the disconnected state', async () => {
    renderWalletButton();

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));

    expect(screen.getByRole('heading', { name: /connect wallet/i })).toBeInTheDocument();
    // Wallet is not yet connected at this point, so the option shows "Available".
    expect(screen.getByRole('button', { name: /freighter available/i })).toBeInTheDocument();
    expect(screen.getByText('Albedo')).toBeInTheDocument();
  });

  it('renders the Albedo button as disabled with a Coming soon badge', () => {
    renderWalletButton();

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));

    const albedoButton = screen.getByRole('button', { name: /albedo/i });
    expect(albedoButton).toBeDisabled();
    expect(albedoButton).toHaveAttribute('aria-disabled', 'true');
    expect(albedoButton).toHaveAttribute('title', 'Albedo support is coming soon');
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('connects Freighter, renders the truncated address, and disconnects from the dropdown', async () => {
    renderWalletButton();

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    fireEvent.click(screen.getByRole('button', { name: /freighter available/i }));

    await waitFor(() => {
      expect(getConnectedButton()).toBeInTheDocument();
    });

    expect(mockSetAllowed).toHaveBeenCalledTimes(1);
    expect(mockRequestAccess).toHaveBeenCalledTimes(1);
    expect(mockGetAddress).toHaveBeenCalledTimes(1);
    expect(mockGetNetworkDetails).toHaveBeenCalledTimes(1);

    fireEvent.click(getConnectedButton());
    expect(screen.getByText('GBVZ3K...QK7L')).toBeInTheDocument();
    expect(screen.getByText('0.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: /disconnect/i }));

    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
    expect(screen.queryByText('GBVZ3K...QK7L')).not.toBeInTheDocument();
  });

  it('closes the connected dropdown when clicking outside', async () => {
    mockIsAllowed.mockResolvedValue({ isAllowed: true });
    renderWalletButton();

    await waitFor(() => {
      expect(getConnectedButton()).toBeInTheDocument();
    });

    fireEvent.click(getConnectedButton());
    expect(screen.getByRole('menuitem', { name: /disconnect/i })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside-target'));

    expect(screen.queryByRole('menuitem', { name: /disconnect/i })).not.toBeInTheDocument();
  });

  it('renders Freighter error state after a rejected connection attempt', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockRequestAccess.mockRejectedValue(new Error('Freighter is locked'));
    renderWalletButton();

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    fireEvent.click(screen.getByRole('button', { name: /freighter available/i }));

    // On failure the modal stays open (so the user can retry) and shows the
    // error inline, rather than closing and requiring the trigger to be
    // clicked again.
    await waitFor(() => {
      expect(screen.getByText('Freighter is locked')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /connect wallet/i })).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith('Connection error', expect.any(Error));
    consoleError.mockRestore();
  });
});
