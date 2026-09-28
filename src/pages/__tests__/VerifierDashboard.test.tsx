import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import VerifierDashboard from '../VerifierDashboard';
import { useVerifierStore } from '../../Zustand/Store';
import { CRITICAL_DAYS_THRESHOLD } from '../../utils/verifierMetrics';

vi.mock('../../Zustand/Store', () => ({
  useVerifierStore: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const pendingTasks = [
  {
    id: 'v-1',
    vaultName: 'Alpha Vault',
    owner: '0xAAAA',
    amount: '10,000 USDC',
    deadline: '2026-07-01',
    status: 'pending' as const,
    milestone: 'Phase 1',
  },
  {
    id: 'v-2',
    vaultName: 'Beta Vault',
    owner: '0xBBBB',
    amount: '5,000 USDC',
    deadline: '2026-06-23',
    status: 'pending' as const,
    milestone: 'Phase 2',
  },
];

const historyTasks = [
  {
    id: 'h-1',
    vaultName: 'Gamma Vault',
    owner: '0xCCCC',
    amount: '20,000 USDC',
    deadline: '2026-05-01',
    status: 'approved' as const,
    milestone: 'Phase 3',
    notes: 'Looks good.',
    decidedAt: '2026-05-02',
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <VerifierDashboard />
    </MemoryRouter>
  );
}

describe('VerifierDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T00:00:00Z'));
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    (useVerifierStore as any).mockImplementation((selector: any) => selector({
      pendingValidations: pendingTasks,
      validationHistory: historyTasks,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByText('Verifier Dashboard')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    renderPage();
    expect(screen.getByText(/Overview of your assigned vaults/)).toBeInTheDocument();
  });

  it('renders stat cards with correct values', () => {
    renderPage();

    const totalAssignedCard = screen.getByText('Total Assigned').parentElement;
    expect(totalAssignedCard).toHaveTextContent('3');

    const pendingCard = screen.getByText('Pending Validations').parentElement;
    expect(pendingCard).toHaveTextContent('2');

    const completedCard = screen.getByText('Completed').parentElement;
    expect(completedCard).toHaveTextContent('1');
  });

  it('renders View Pending Queue button that navigates to /verifier/queue', () => {
    renderPage();
    fireEvent.click(screen.getByText('View Pending Queue'));
    expect(mockNavigate).toHaveBeenCalledWith('/verifier/queue');
  });

  it('renders View History button that navigates to /verifier/history', () => {
    renderPage();
    fireEvent.click(screen.getByText('View History'));
    expect(mockNavigate).toHaveBeenCalledWith('/verifier/history');
  });

  it('shows empty message when no pending validations exist', () => {
    (useVerifierStore as any).mockImplementation((selector: any) => selector({
      pendingValidations: [],
      validationHistory: [],
    }));
    renderPage();
    expect(screen.getByText(/no pending validations/i)).toBeInTheDocument();
  });

  it('renders urgent pending tasks', () => {
    renderPage();
    expect(screen.getByText('Alpha Vault')).toBeInTheDocument();
    expect(screen.getByText('Beta Vault')).toBeInTheDocument();
  });

  it('shows days remaining for each task', () => {
    renderPage();
    expect(screen.getByText(/10 days left/)).toBeInTheDocument();
    expect(screen.getByText(/2 days left/)).toBeInTheDocument();
  });

  it(`applies danger color for tasks with ${CRITICAL_DAYS_THRESHOLD} or fewer days remaining`, () => {
    renderPage();
    const urgentText = screen.getByText(/2 days left/);
    expect(urgentText.getAttribute('style')).toContain('var(--danger)');
  });

  it(`applies text color for tasks with more than ${CRITICAL_DAYS_THRESHOLD} days remaining`, () => {
    renderPage();
    const normalText = screen.getByText(/10 days left/);
    expect(normalText.getAttribute('style')).toContain('var(--text)');
  });

  it('navigates to task detail when Review Now is clicked', () => {
    renderPage();
    const reviewButtons = screen.getAllByText('Review Now →');
    fireEvent.click(reviewButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/verifier/queue/v-1');
  });

  it('gives each Review Now button an accessible name including the vault name', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Review Alpha Vault' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review Beta Vault' })).toBeInTheDocument();
  });

  it(`shows urgency text (not just color) for tasks with ${CRITICAL_DAYS_THRESHOLD} or fewer days remaining`, () => {
    renderPage();
    const urgentContainer = screen.getByText(/2 days left/) as HTMLElement;
    expect(urgentContainer.textContent).toContain('(urgent)');
  });

  it(`does not show urgency text for tasks with more than ${CRITICAL_DAYS_THRESHOLD} days remaining`, () => {
    renderPage();
    const normalContainer = screen.getByText(/10 days left/) as HTMLElement;
    expect(normalContainer.textContent).not.toContain('(urgent)');
  });

  it('Review Now buttons have focus-visible outline class', () => {
    renderPage();
    const btn = screen.getByRole('button', { name: 'Review Alpha Vault' });
    expect(btn.className).toContain('focus-visible:outline');
  });

  it('nav buttons have focus-visible outline class', () => {
    renderPage();
    expect(screen.getByText('View Pending Queue').className).toContain('focus-visible:outline');
    expect(screen.getByText('View History').className).toContain('focus-visible:outline');
  });

  it('uses design tokens for stat cards', () => {
    renderPage();
    const statLabels = ['Total Assigned', 'Pending Validations', 'Completed'];
    statLabels.forEach((label) => {
      const card = screen.getByText(label);
      expect(card.getAttribute('style')).toContain('var(--muted)');
    });
  });

  it('uses design tokens for action buttons', () => {
    renderPage();
    const queueBtn = screen.getByText('View Pending Queue');
    expect(queueBtn.getAttribute('style')).toContain('var(--accent)');
  });

  it('does not have hardcoded color classes on the primary container', () => {
    const { container } = renderPage();
    const primaryContainer = container.firstChild as HTMLElement;
    expect(primaryContainer.className).not.toContain('bg-white');
    expect(primaryContainer.className).not.toContain('text-gray-500');
    expect(primaryContainer.className).not.toContain('text-red-600');
  });

  describe('Recent Decisions feed', () => {
    it('renders the recent decisions section heading', () => {
      renderPage();
      expect(screen.getByText('Recent Decisions')).toBeInTheDocument();
    });

    it('renders recent decisions details correctly', () => {
      renderPage();
      expect(screen.getByText('Gamma Vault')).toBeInTheDocument();
      expect(screen.getByText('Milestone: Phase 3')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('2026-05-02')).toBeInTheDocument();
    });

    it('shows empty message when no history exists', () => {
      (useVerifierStore as any).mockImplementation((selector: any) => selector({
        pendingValidations: [],
        validationHistory: [],
      }));
      renderPage();
      expect(screen.getByText('No recent decisions found.')).toBeInTheDocument();
    });

    it('navigates to history page when View in History is clicked', () => {
      renderPage();
      const viewHistoryBtn = screen.getByRole('button', { name: 'View Gamma Vault in History' });
      fireEvent.click(viewHistoryBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/verifier/history');
    });

    it('gives each View in History button an accessible name including the vault name', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'View Gamma Vault in History' })).toBeInTheDocument();
    });

    it('View in History buttons have focus-visible outline class', () => {
      renderPage();
      const btn = screen.getByRole('button', { name: 'View Gamma Vault in History' });
      expect(btn.className).toContain('focus-visible:outline');
    });

    it('renders a maximum of 5 recent decisions', () => {
      const manyHistoryTasks = Array.from({ length: 8 }, (_, i) => ({
        id: `h-${i}`,
        vaultName: `Vault ${i}`,
        owner: '0xCCCC',
        amount: '20,000 USDC',
        deadline: '2026-05-01',
        status: i % 2 === 0 ? ('approved' as const) : ('rejected' as const),
        milestone: `Phase ${i}`,
        decidedAt: `2026-05-0${i + 1}`,
      }));

      (useVerifierStore as any).mockImplementation((selector: any) => selector({
        pendingValidations: [],
        validationHistory: manyHistoryTasks,
      }));

      renderPage();

      // Should show the first 5 (Vault 0 to Vault 4)
      expect(screen.getByText('Vault 0')).toBeInTheDocument();
      expect(screen.getByText('Vault 4')).toBeInTheDocument();
      // Should not show Vault 5 to 7
      expect(screen.queryByText('Vault 5')).not.toBeInTheDocument();
      expect(screen.queryByText('Vault 7')).not.toBeInTheDocument();
    });

    it('renders a pending task in history with the correct chip label ("Pending Validation")', () => {
      const pendingHistoryTask = {
        id: 'h-pending',
        vaultName: 'Pending Test Vault',
        owner: '0xDDDD',
        amount: '15,000 USDC',
        deadline: '2026-06-01',
        daysRemaining: 5,
        status: 'pending' as const,
        milestone: 'Phase 4',
        decidedAt: '2026-06-02',
      };

      (useVerifierStore as any).mockImplementation((selector: any) => selector({
        pendingValidations: [],
        validationHistory: [pendingHistoryTask],
      }));

      renderPage();

      expect(screen.getByText('Pending Test Vault')).toBeInTheDocument();
      expect(screen.getByText('Pending Validation')).toBeInTheDocument();
      expect(screen.queryByText('Cancelled')).not.toBeInTheDocument();
    });

    it('renders a rejected task in history with the correct chip label ("Rejected")', () => {
      const rejectedHistoryTask = {
        id: 'h-rejected',
        vaultName: 'Rejected Test Vault',
        owner: '0xEEEE',
        amount: '8,000 USDC',
        deadline: '2026-06-01',
        daysRemaining: 5,
        status: 'rejected' as const,
        milestone: 'Phase 5',
        decidedAt: '2026-06-03',
      };

      (useVerifierStore as any).mockImplementation((selector: any) => selector({
        pendingValidations: [],
        validationHistory: [rejectedHistoryTask],
      }));

      renderPage();

      expect(screen.getByText('Rejected Test Vault')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });
});
