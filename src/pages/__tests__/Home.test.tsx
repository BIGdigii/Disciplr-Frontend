import { vi, describe, test, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock WalletContext to avoid real Freighter dependencies in tests
vi.mock('../../context/WalletContext', () => ({
  WalletProvider: ({ children }: any) => <>{children}</>,
  useWallet: () => ({
    address: null,
    network: null,
    balance: null,
    isConnecting: false,
    error: null,
    connect: async () => {},
    disconnect: () => {},
    checkConnection: async () => {},
  }),
}));

// Mock the wallet button so we can drive its failure paths deterministically
// without touching the real Freighter bridge.
const connectMock = vi.fn();
vi.mock('../../components/Wallet/WalletConnectButton', () => ({
  default: () => (
    <button type="button" onClick={() => connectMock()}>
      Connect Wallet
    </button>
  ),
}));

import Home from '../../pages/Home';

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );

beforeEach(() => {
  connectMock.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('Home page hero', () => {
  test('renders headline and subheadline', () => {
    renderHome();
    const headline = screen.getByRole('heading', { level: 1, name: /Secure Time‑Lpocked Capital Vaults on Stellar/i });
    expect(headline).toBeInTheDocument();
    const subheadline = screen.getByText(/Time‑Locked capital vaults on Stellar that release on validation or redirect on failure\./i);
    expect(subheadline).toBeInTheDocument();
  });

  test('has primary CTA linking to /vaults/create', () => {
    renderHome();
    const cta = screen.getByRole('link', { name: /Create Your First Vault/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/vaults/create');
  });

  test('has secondary links to dashboard and vaults', () => {
    renderHome();
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    const vaultsLink = screen.getByRole('link', { name: /My Vaults/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(vaultsLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    expect(vaultsLink).toHaveAttribute('href', '/vaults');
  });

  test('hero heading is rendered as an h1 element', () => {
    renderHome();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.tagName).toBe('H1');
  });

  test('primary CTA has accessible link text and is not a button', () => {
    renderHome();
    const cta = screen.getByRole('link', { name: /Create Your First Vault/i });
    expect(cta.tagName).toBe('A');
    // The accessible name must be non-empty so screen readers announce it correctly
    expect(cta).toHaveAccessibleName(/Create Your First Vault/i);
  });

  test('secondary nav links expose accessible names for screen readers', () => {
    renderHome();
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    const vaultsLink = screen.getByRole('link', { name: /My Vaults/i });
    expect(dashboardLink).toHaveAccessibleName(/Dashboard/i);
    expect(vaultsLink).toHaveAccessibleName(/My Vaults/i);
  });

  test('hero value proposition copy is visible in the document', () => {
    renderHome();
    // Value proposition text should be present as body copy
    expect(
      screen.getByText(/Time‑Locked capital vaults on Stellar that release on validation or redirect on failure\./i)
    ).toBeVisible();
  });
});

describe('Home page boundary and failure paths', () => {
  test('renders exactly one H1 and one primary CTA even when wallet is disconnected', () => {
    renderHome();
    expect(screen.getAllByRole('heading', { level: 1 })).length).toBe(1);
    expect(screen.getAllByRole('link', { name: /Create Your First Vault/i }).length).toBe(1);
  });

  test('renders all expected navigation targets without duplicates', () => {
    renderHome();
    const hrefs = screen
      .getAllByRole('link')
      .map((link: HTMLAnchorElement) => link.getAttribute('href'));
    expect(new Set(hrefs)).toEqual(new Set(['/vaults/create', '/dashboard', '/vaults']));
  });

  test('renders the connect wallet action in the final CTA', () => {
    renderHome();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeInTheDocument();
  });

  test('connect wallet failure does not crash the page or hide the hero', () => {
    connectMock.mockImplementationOnce(() => {
      throw new Error('Freighter unavailable');
    });
    renderHome();
    const button = screen.getByRole('button', { name: /Connect Wallet/i });
    // The button is owned by WalletConnectButton; the page must stay mounted.
    expect(() => button.click()).toNotThrow();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  test('connect wallet is invoked at most once per click (concurrency guard)', () => {
    renderHome();
    const button = screen.getByRole('button', { name: /Connect Wallet/i });
    button.click();
    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  test('exposes the learn-more disclosure in a collapsed state by default', () => {
    renderHome();
    const details = screen.getByText(/Learn more about Stellar and Soroban/i).closest('details');
    expect(details).not.toHaveAttribute('open');
  });
});
