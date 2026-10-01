import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequireWallet from '../RequireWallet';

// Mock WalletContext
const mockUseWallet = vi.fn();
vi.mock('../../context/WalletContext', () => ({
  useWallet: () => mockUseWallet(),
}));

// Lightweight stub so we don't pull in Freighter APIs
vi.mock('../Wallet/WalletConnectButton', () => ({
  WalletConnectButton: () => <button>Connect Wallet</button>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderInRouter(ui: React.ReactNode, initialEntry = '/vaults/create') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
  );
}

describe('RequireWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when wallet is connected', () => {
    mockUseWallet.mockReturnValue({ address: 'GADDR123', isConnecting: false });

    renderInRouter(<RequireWallet><div>Protected content</div></RequireWallet>);

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /connect your wallet/i })).not.toBeInTheDocument();
  });

  it('shows connect prompt when wallet is disconnected', () => {
    mockUseWallet.mockReturnValue({ address: null, isConnecting: false });

    renderInRouter(<RequireWallet><div>Protected content</div></RequireWallet>);

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /connect your wallet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('shows connecting state message while connecting', () => {
    mockUseWallet.mockReturnValue({ address: null, isConnecting: true });

    renderInRouter(<RequireWallet><div>Protected content</div></RequireWallet>);

    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('does not show connecting message when not connecting', () => {
    mockUseWallet.mockReturnValue({ address: null, isConnecting: false });

    renderInRouter(<RequireWallet><div>Protected content</div></RequireWallet>);

    expect(screen.queryByText(/connecting/i)).not.toBeInTheDocument();
  });

  it('has an accessible landmark with labelled heading', () => {
    mockUseWallet.mockReturnValue({ address: null, isConnecting: false });

    renderInRouter(<RequireWallet><div>Protected content</div></RequireWallet>);

    const region = screen.getByRole('main', { name: /connect your wallet/i });
    expect(region).toBeInTheDocument();
  });

  it('renders children immediately once address becomes truthy', () => {
    mockUseWallet.mockReturnValue({ address: 'GABC', isConnecting: false });

    renderInRouter(<RequireWallet><span>Child</span></RequireWallet>);

    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('navigates to the original destination once address becomes truthy', () => {
    mockUseWallet.mockReturnValue({ address: 'GABC', isConnecting: false });

    renderInRouter(<RequireWallet><span>Child</span></RequireWallet>, '/vaults/create?ref=123');

    expect(mockNavigate).toHaveBeenCalledWith('/vaults/create?ref=123', { replace: true });
  });
});
