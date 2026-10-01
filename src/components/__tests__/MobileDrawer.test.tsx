import { useState } from 'react';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../Layout';
import MobileDrawer from '../MobileDrawer';
import { ThemeProvider } from '../../context/ThemeContext';

const focusTrapState = vi.hoisted(() => ({
  options: [] as Array<Record<string, unknown>>,
}));

vi.mock('focus-trap-react', () => ({
  default: ({ children, focusTrapOptions }: { children: ReactNode; focusTrapOptions: Record<string, unknown> }) => {
    focusTrapState.options.push(focusTrapOptions);
    return <div data-testid="focus-trap">{children}</div>;
  },
}));

vi.mock('../Wallet/WalletConnectButton', () => ({
  WalletConnectButton: () => <button type="button">Connect wallet</button>,
}));

vi.mock('../TrustlineBanner', () => ({
  TrustlineBanner: () => null,
}));

function renderOpenDrawer(onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <MobileDrawer isOpen onClose={onClose} />
    </MemoryRouter>,
  );

  return onClose;
}

function DrawerHarness() {
  const [isOpen, setOpen] = useState(false);

  return (
    <MemoryRouter>
      <button type="button" onClick={() => setOpen(true)}>
        Open navigation menu
      </button>
      <MobileDrawer isOpen={isOpen} onClose={() => setOpen(false)} />
    </MemoryRouter>
  );
}

describe('MobileDrawer accessibility', () => {
  beforeEach(() => {
    focusTrapState.options = [];
    document.body.style.overflow = '';
  });

  test('renders as a labelled modal dialog inside a focus trap', () => {
    renderOpenDrawer();

    const dialog = screen.getByRole('dialog', { name: /navigation/i });
    expect(screen.getByTestId('focus-trap')).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'mobile-drawer-title');
    expect(dialog).toHaveAttribute('tabindex', '-1');
    expect(screen.getByText('Navigation')).toHaveAttribute('id', 'mobile-drawer-title');

    expect(focusTrapState.options[0]).toMatchObject({
      allowOutsideClick: true,
      clickOutsideDeactivates: false,
      escapeDeactivates: false,
      returnFocusOnDeactivate: false,
    });
    expect(focusTrapState.options[0].initialFocus).toEqual(expect.any(Function));
    expect(focusTrapState.options[0].fallbackFocus).toEqual(expect.any(Function));
    expect((focusTrapState.options[0].initialFocus as () => HTMLElement)()).toBe(
      screen.getByRole('button', { name: /close navigation drawer/i }),
    );
    expect((focusTrapState.options[0].fallbackFocus as () => HTMLElement)()).toBe(dialog);
  });

  test('closes on Escape and restores focus to the trigger', async () => {
    render(<DrawerHarness />);

    const trigger = screen.getByRole('button', { name: /open navigation menu/i });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: /navigation/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  test('keeps drawer clicks contained and closes from navigation links', () => {
    const onClose = renderOpenDrawer();
    const dialog = screen.getByRole('dialog', { name: /navigation/i });

    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('link', { name: /home/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('falls back safely when focus targets are unavailable', () => {
    const activeElementDescriptor = Object.getOwnPropertyDescriptor(document, 'activeElement');

    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get: () => null,
    });

    const { unmount } = render(
      <MemoryRouter>
        <MobileDrawer isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );
    const options = focusTrapState.options[0];

    unmount();

    expect((options.initialFocus as () => HTMLElement)()).toBe(document.body);
    expect((options.fallbackFocus as () => HTMLElement)()).toBe(document.body);

    if (activeElementDescriptor) {
      Object.defineProperty(document, 'activeElement', activeElementDescriptor);
    } else {
      delete (document as any).activeElement;
    }
  });

  test('closes from the backdrop and close button', () => {
    const onClose = renderOpenDrawer();

    fireEvent.click(screen.getByRole('button', { name: /close navigation drawer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('dialog', { name: /navigation/i }).parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('Layout drawer integration', () => {
  beforeEach(() => {
    focusTrapState.options = [];
  });

  test('marks background content inert while the drawer is open', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <Layout>
            <p>Page content</p>
          </Layout>
        </MemoryRouter>
      </ThemeProvider>,
    );

    const trigger = screen.getByRole('button', { name: /open navigation menu/i });
    const main = screen.getByRole('main');

    expect(main).not.toHaveAttribute('aria-hidden');
    expect(main).not.toHaveAttribute('inert');

    fireEvent.click(trigger);

    const hiddenMain = screen.getByRole('main', { hidden: true });
    expect(hiddenMain).toHaveAttribute('aria-hidden', 'true');
    expect(hiddenMain).toHaveAttribute('inert');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('MobileDrawer scroll lock and focus restore', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  test('locks body scroll while open and restores on close', () => {
    const { rerender } = render(
      <MemoryRouter>
        <MobileDrawer isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <MemoryRouter>
        <MobileDrawer isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(document.body.style.overflow).toBe('');
  });

  test('restores body scroll on unmount', () => {
    const { unmount } = render(
      <MemoryRouter>
        <MobileDrawer isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  test('restores focus to trigger when drawer closes via close button', async () => {
    render(<DrawerHarness />);

    const trigger = screen.getByRole('button', { name: /open navigation menu/i });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: /navigation/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close navigation drawer/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  test('prevents default on Escape keydown and calls onClose', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <MobileDrawer isOpen onClose={onClose} />
      </MemoryRouter>,
    );

    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not handle Escape when drawer is closed', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <MobileDrawer isOpen={false} onClose={onClose} />
      </MemoryRouter>,
    );

    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('MobileDrawer active links', () => {
  test('verifier link receives active class and aria-current when on /verifier or subroutes', () => {
    render(
      <MemoryRouter initialEntries={['/verifier/queue']}>
        <MobileDrawer isOpen onClose={vi.fn()} />
      </MemoryRouter>
    );

    const verifierLink = screen.getByRole('link', { name: /verifier/i });
    expect(verifierLink).toHaveAttribute('aria-current', 'page');
    expect(verifierLink).toHaveClass('active');
  });

  test('analytics link receives active class and aria-current when on /analytics', () => {
    render(
      <MemoryRouter initialEntries={['/analytics']}>
        <MobileDrawer isOpen onClose={vi.fn()} />
      </MemoryRouter>
    );

    const analyticsLink = screen.getByRole('link', { name: /analytics/i });
    expect(analyticsLink).toHaveAttribute('aria-current', 'page');
    expect(analyticsLink).toHaveClass('active');
  });

  test('verifier and analytics links are not active on home route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <MobileDrawer isOpen onClose={vi.fn()} />
      </MemoryRouter>
    );

    const verifierLink = screen.getByRole('link', { name: /verifier/i });
    expect(verifierLink).not.toHaveAttribute('aria-current');
    expect(verifierLink).not.toHaveClass('active');

    const analyticsLink = screen.getByRole('link', { name: /analytics/i });
    expect(analyticsLink).not.toHaveAttribute('aria-current');
    expect(analyticsLink).not.toHaveClass('active');
  });
});

// ---------------------------------------------------------------------------
// Recovery and hostile-input boundary
// ---------------------------------------------------------------------------
function ReRenderHarness() {
  const [isOpen, setOpen] = useState(false);
  const [, setTick] = useState(0);

  return (
    <MemoryRouter>
      <button type="button" onClick={() => setOpen(true)}>
        Open navigation menu
      </button>
      <button type="button" onClick={() => setTick((t) => t + 1)}>
        Re-render
      </button>
      <MobileDrawer isOpen={isOpen} onClose={() => setOpen(false)} />
    </MemoryRouter>
  );
}

describe('MobileDrawer recovery and hostile-input boundary', () => {
  beforeEach(() => {
    focusTrapState.options = [];
    document.body.style.overflow = '';
  });

  test('restores the exact previous body overflow instead of clobbering it', () => {
    document.body.style.overflow = 'auto';

    const { rerender } = render(
      <MemoryRouter>
        <MobileDrawer isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <MemoryRouter>
        <MobileDrawer isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(document.body.style.overflow).toBe('auto');
  });

  test('treats a non-boolean isOpen as closed (hostile-input boundary)', () => {
    render(
      <MemoryRouter>
        <MobileDrawer isOpen={'true' as unknown as boolean} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  test('does not crash when onClose is missing (hostile-input boundary)', () => {
    render(
      <MemoryRouter>
        <MobileDrawer isOpen onClose={undefined as unknown as () => void} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog', { name: /navigation/i })).toBeInTheDocument();

    expect(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        cancelable: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    }).not.toThrow();

    expect(() => {
      fireEvent.click(screen.getByRole('dialog', { name: /navigation/i }).parentElement as HTMLElement);
    }).not.toThrow();
  });

  test('does not attempt to restore focus to a trigger that is no longer connected (recovery)', () => {
    // Simulate the focus trigger being removed from the document while the
    // drawer is open (e.g. an interrupted navigation drops the header button).
    const detachedTrigger = document.createElement('button');
    const activeElementDescriptor = Object.getOwnPropertyDescriptor(document, 'activeElement');

    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get: () => detachedTrigger,
    });

    const { unmount } = render(
      <MemoryRouter>
        <MobileDrawer isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('dialog', { name: /navigation/i })).toBeInTheDocument();

    const focusSpy = vi.spyOn(detachedTrigger, 'focus');

    expect(() => unmount()).not.toThrow();
    // Recovery contract: never focus a detached node.
    expect(focusSpy).not.toHaveBeenCalled();

    if (activeElementDescriptor) {
      Object.defineProperty(document, 'activeElement', activeElementDescriptor);
    } else {
      delete (document as any).activeElement;
    }
  });

  test('keeps the original trigger as the focus-restore target across parent re-renders', async () => {
    render(<ReRenderHarness />);
    const trigger = screen.getByRole('button', { name: /open navigation menu/i });
    trigger.focus();
    fireEvent.click(trigger);

    // Focus moves inside the drawer, then the parent re-renders with a new
    // onClose identity. The focus-restore target must stay the original
    // trigger, not whatever element happens to have focus mid-interaction.
    const closeButton = screen.getByRole('button', { name: /close navigation drawer/i });
    closeButton.focus();
    fireEvent.click(screen.getByRole('button', { name: /re-render/i }));

    fireEvent.click(closeButton);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
