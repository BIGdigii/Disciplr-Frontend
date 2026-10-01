import { vi, describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

import Home from '../../pages/Home';

describe('Home page hero', () => {
  test('renders headline and subheadline', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const headline = screen.getByRole('heading', { level: 1, name: /Secure Time‑Locked Capital Vaults on Stellar/i });
    expect(headline).toBeInTheDocument();
    const subheadline = screen.getByText(/Time‑locked capital vaults on Stellar that release on validation or redirect on failure\./i);
    expect(subheadline).toBeInTheDocument();
  });

  test('has primary CTA linking to /vaults/create', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const cta = screen.getByRole('link', { name: /Create Your First Vault/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/vaults/create');
  });

  test('has secondary links to dashboard and vaults', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    const vaultsLink = screen.getByRole('link', { name: /My Vaults/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(vaultsLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    expect(vaultsLink).toHaveAttribute('href', '/vaults');
  });

  test('hero heading is rendered as an h1 element', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.tagName).toBe('H1');
  });

  test('primary CTA has accessible link text and is not a button', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const cta = screen.getByRole('link', { name: /Create Your First Vault/i });
    expect(cta.tagName).toBe('A');
    // The accessible name must be non-empty so screen readers announce it correctly
    expect(cta).toHaveAccessibleName(/Create Your First Vault/i);
  });

  test('secondary nav links expose accessible names for screen readers', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    const vaultsLink = screen.getByRole('link', { name: /My Vaults/i });
    expect(dashboardLink).toHaveAccessibleName(/Dashboard/i);
    expect(vaultsLink).toHaveAccessibleName(/My Vaults/i);
  });

  test('hero value proposition copy is visible in the document', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    // Value proposition text should be present as body copy
    expect(
      screen.getByText(/Time‑locked capital vaults on Stellar that release on validation or redirect on failure\./i)
    ).toBeVisible();
  });
});

describe('Home page authorization regression', () => {
  test('renders without requiring wallet connection (public page)', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    // Home page should be accessible without wallet authentication
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  test('all navigation links have valid href attributes', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveAttribute('href');
      const href = link.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toMatch(/^\/[a-zA-Z0-9\-/_]*$/);
    });
  });

  test('does not expose sensitive user data on public page', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    // Should not show wallet address or user-specific data
    expect(screen.queryByText(/0x[a-fA-F0-9]{40}/)).not.toBeInTheDocument();
    expect(screen.queryByText(/G[A-Z0-9]{55}/)).not.toBeInTheDocument();
    // Should not show balance amounts
    expect(screen.queryByText(/\d+\.\d+ USDC/)).not.toBeInTheDocument();
  });

  test('WalletConnectButton renders in final CTA section', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    // WalletConnectButton should be present for user to connect
    // Look for the button in the final CTA section (not the "Connect Your Wallet" heading)
    const connectButtons = screen.getAllByRole('button');
    const walletConnectButton = connectButtons.find(btn => 
      btn.textContent?.includes('Connect') && !btn.textContent?.includes('Your Wallet')
    );
    expect(walletConnectButton).toBeInTheDocument();
  });
});

describe('Home page validation regression', () => {
  test('handles missing or empty state gracefully', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    // Page should render correctly even without any dynamic data
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  test('all section headings are properly hierarchical', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const h1 = screen.getAllByRole('heading', { level: 1 });
    const h2 = screen.getAllByRole('heading', { level: 2 });
    const h3 = screen.getAllByRole('heading', { level: 3 });
    
    // Should have exactly one h1
    expect(h1.length).toBe(1);
    // Should have multiple h2 and h3 for content structure
    expect(h2.length).toBeGreaterThan(0);
    expect(h3.length).toBeGreaterThan(0);
  });

  test('links maintain safe navigation (no javascript: or data: protocols)', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      const href = link.getAttribute('href');
      expect(href).not.toMatch(/^javascript:/i);
      expect(href).not.toMatch(/^data:/i);
    });
  });

  test('How It Works section renders all three steps', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText(/Connect Your Wallet/i)).toBeInTheDocument();
    expect(screen.getByText(/Create a Vault/i)).toBeInTheDocument();
    expect(screen.getByText(/Achieve or Redirect/i)).toBeInTheDocument();
  });

  test('Stellar & Soroban section renders correctly', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText(/Built on Stellar & Soroban/i)).toBeInTheDocument();
    expect(screen.getByText(/Why Stellar\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Why Soroban\?/i)).toBeInTheDocument();
  });

  test('Trust section renders security badges', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText(/Trusted & Secure/i)).toBeInTheDocument();
    expect(screen.getByText(/Audited Smart Contracts/i)).toBeInTheDocument();
    expect(screen.getByText(/Non-Custodial/i)).toBeInTheDocument();
    expect(screen.getByText(/Instant Settlements/i)).toBeInTheDocument();
  });

  test('details element for Learn more is interactive', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const details = screen.getByRole('group');
    expect(details).toBeInTheDocument();
    const summary = screen.getByText(/Learn more about Stellar and Soroban/i);
    expect(summary).toBeInTheDocument();
  });

  test('final CTA section renders with proper call to action', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText(/Ready to Secure Your Future\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Join thousands building unstoppable financial discipline/i)).toBeInTheDocument();
  });
});

describe('Home page edge cases and boundary conditions', () => {
  test('renders consistently on repeated mounts', () => {
    const { unmount } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    unmount();
    
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  test('handles window resize gracefully (responsive layout)', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    // Page should render regardless of viewport size
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    
    // Simulate mobile viewport
    global.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  test('icons render without errors', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    // Icons should be present in the document
    const container = document.body;
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });
});
