import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PendingValidations from '../PendingValidations';
import { useVerifierStore } from '../../Zustand/Store';

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

const makeTasks = () => [
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
    deadline: '2026-06-20',
    status: 'pending' as const,
    milestone: 'Phase 2',
  },
  {
    id: 'v-3',
    vaultName: 'Gamma Vault',
    owner: '0xCCCC',
    amount: '20,000 USDC',
    deadline: '2026-07-10',
    status: 'pending' as const,
    milestone: 'Phase 3',
  },
];

const mockedUseVerifierStore = useVerifierStore as unknown as Mock;

/** Helper: make useVerifierStore(selector) work in tests. */
function mockStore(state: Record<string, unknown>) {
  mockedUseVerifierStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector(state),
  );
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PendingValidations />
    </MemoryRouter>
  );
}

describe('PendingValidations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T00:00:00Z'));
    vi.clearAllMocks();
    mockStore({
      pendingValidations: makeTasks(),
      validationHistory: [],
      batchApprove: vi.fn(),
      batchReject: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without throwing (regression test for #622)', () => {
    // Ensure that sortLabel, headerSort, and aria-sort expressions all
    // reference the correct state variable (sortDir, not sortDirection)
    // and that the page mounts without a ReferenceError.
    expect(() => renderPage()).not.toThrow();
  });

  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByText('Pending Validations')).toBeInTheDocument();
  });

  it('shows "All caught up!" when there are no pending validations', () => {
    mockStore({ pendingValidations: [], validationHistory: [], batchApprove: vi.fn(), batchReject: vi.fn() });
    renderPage();
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    expect(screen.getByText(/no pending validations/i)).toBeInTheDocument();
  });

  it('does not render the table when queue is empty', () => {
    mockStore({ pendingValidations: [], validationHistory: [], batchApprove: vi.fn(), batchReject: vi.fn() });
    renderPage();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders a row for each pending task', () => {
    renderPage();
    expect(screen.getByText('Alpha Vault')).toBeInTheDocument();
    expect(screen.getByText('Beta Vault')).toBeInTheDocument();
    expect(screen.getByText('Gamma Vault')).toBeInTheDocument();
  });

  it('default sort is deadline ascending and direction shows ascending', () => {
    renderPage();
    expect(screen.getByLabelText(/Sort by/i)).toHaveValue('deadline');
    expect(screen.getByRole('button', { name: /Ascending/i })).toBeInTheDocument();

    // ascending: v-2 → v-1 → v-3
    const vaultCells = screen.getAllByText(/Vault$/);
    expect(vaultCells[0].textContent).toBe('Beta Vault');
    expect(vaultCells[1].textContent).toBe('Alpha Vault');
    expect(vaultCells[2].textContent).toBe('Gamma Vault');
  });

  it('toggling sort direction reverses the order and shows descending', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Ascending/i }));

    expect(screen.getByRole('button', { name: /Descending/i })).toBeInTheDocument();

    // descending: v-3 → v-1 → v-2
    const vaultCells = screen.getAllByText(/Vault$/);
    expect(vaultCells[0].textContent).toBe('Gamma Vault');
    expect(vaultCells[1].textContent).toBe('Alpha Vault');
    expect(vaultCells[2].textContent).toBe('Beta Vault');
  });

  it('toggling direction twice returns to original ascending order', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Ascending/i }));
    fireEvent.click(screen.getByRole('button', { name: /Descending/i }));

    expect(screen.getByRole('button', { name: /Ascending/i })).toBeInTheDocument();

    // back to ascending: v-2 → v-1 → v-3
    const vaultCells = screen.getAllByText(/Vault$/);
    expect(vaultCells[0].textContent).toBe('Beta Vault');
    expect(vaultCells[1].textContent).toBe('Alpha Vault');
    expect(vaultCells[2].textContent).toBe('Gamma Vault');
  });

  it('sorts by amount when the sort selector changes', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/Sort by/i), {
      target: { value: 'amount' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Ascending/i }));

    const vaultCells = screen.getAllByText(/Vault$/);
    expect(vaultCells[0].textContent).toBe('Gamma Vault');
    expect(vaultCells[1].textContent).toBe('Alpha Vault');
    expect(vaultCells[2].textContent).toBe('Beta Vault');
  });

  it('sorts by vault name from the sort selector', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/Sort by/i), {
      target: { value: 'vaultName' },
    });

    const vaultCells = screen.getAllByText(/Vault$/);
    expect(vaultCells[0].textContent).toBe('Alpha Vault');
    expect(vaultCells[1].textContent).toBe('Beta Vault');
    expect(vaultCells[2].textContent).toBe('Gamma Vault');
  });

  it('clicking Review navigates to the correct ValidationDetail route', () => {
    renderPage();
    const reviewButtons = screen.getAllByRole('button', { name: /Review/i });
    // first row after deadline ascending sort is v-2.
    fireEvent.click(reviewButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/verifier/queue/v-2');
  });

  it('clicking Back navigates to /verifier', () => {
    renderPage();
    fireEvent.click(screen.getByText(/Back to Dashboard/i));
    expect(mockNavigate).toHaveBeenCalledWith('/verifier');
  });

  it('renders a single task without crashing', () => {
    mockStore({
      pendingValidations: [makeTasks()[0]],
      validationHistory: [],
      batchApprove: vi.fn(),
      batchReject: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Alpha Vault')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2); // header + 1 row
  });

  it('handles ties in daysRemaining (stable relative order preserved)', () => {
    mockStore({
      pendingValidations: [
        { ...makeTasks()[0], id: 'v-a', daysRemaining: 5 },
        { ...makeTasks()[1], id: 'v-b', daysRemaining: 5 },
      ],
      validationHistory: [],
      batchApprove: vi.fn(),
      batchReject: vi.fn(),
    });
    renderPage();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
  });

  it('uses design tokens for the table container', () => {
    renderPage();
    const section = screen.getByRole('table').parentElement;
    expect(section?.getAttribute('style')).toContain('var(--bg)');
  });

  it('uses design tokens for the Review button', () => {
    renderPage();
    const reviewBtns = screen.getAllByRole('button', { name: /Review/i });
    expect(reviewBtns[0].getAttribute('style')).toContain('var(--accent)');
  });

  describe('accessible table semantics', () => {
    it('table has an accessible name', () => {
      renderPage();
      expect(screen.getByRole('table', { name: /Pending Validations/i })).toBeInTheDocument();
    });

    it('all column headers have scope="col"', () => {
      renderPage();
      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);
      headers.forEach(th => {
        expect(th).toHaveAttribute('scope', 'col');
      });
    });

    it('Deadline column header exposes aria-sort="ascending" by default', () => {
      renderPage();
      const deadlineHeader = screen.getByRole('columnheader', { name: /Deadline/i });
      expect(deadlineHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    it('aria-sort becomes "descending" after toggling sort direction', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /Ascending/i }));
      const deadlineHeader = screen.getByRole('columnheader', { name: /Deadline/i });
      expect(deadlineHeader).toHaveAttribute('aria-sort', 'descending');
    });

    it('toggling sort twice restores aria-sort to "ascending"', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /Ascending/i }));
      fireEvent.click(screen.getByRole('button', { name: /Descending/i }));
      const deadlineHeader = screen.getByRole('columnheader', { name: /Deadline/i });
      expect(deadlineHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    it('moves aria-sort to the active sort column', () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/Sort by/i), {
        target: { value: 'amount' },
      });

      expect(screen.getByRole('columnheader', { name: /Deadline/i })).not.toHaveAttribute('aria-sort');
      expect(screen.getByRole('columnheader', { name: /Amount at Stake/i })).toHaveAttribute('aria-sort', 'ascending');
    });

    it('clicking an inactive column header button activates that column sort and sets aria-sort', () => {
      renderPage();
      const amountButton = screen.getByRole('button', { name: /Sort Amount at Stake column/i });
      fireEvent.click(amountButton);

      expect(screen.getByRole('columnheader', { name: /Amount at Stake/i })).toHaveAttribute('aria-sort', 'ascending');
      expect(screen.getByRole('columnheader', { name: /Deadline/i })).not.toHaveAttribute('aria-sort');
      expect(screen.getByLabelText(/Sort by/i)).toHaveValue('amount');
    });

    it('clicking the active column header button toggles sort direction', () => {
      renderPage();
      const deadlineButton = screen.getByRole('button', { name: /Sort Deadline column/i });
      fireEvent.click(deadlineButton);

      expect(screen.getByRole('columnheader', { name: /Deadline/i })).toHaveAttribute('aria-sort', 'descending');
      expect(screen.getByRole('button', { name: /Sort direction: Descending/i })).toBeInTheDocument();

      fireEvent.click(deadlineButton);
      expect(screen.getByRole('columnheader', { name: /Deadline/i })).toHaveAttribute('aria-sort', 'ascending');
    });

    it('urgent rows (≤3 days) include a non-color sr-only urgency cue', () => {
      renderPage();
      // v-2 is overdue, which is within the critical threshold.
      const urgentCue = screen.getByText('Urgent');
      expect(urgentCue.className).toContain('sr-only');
    });

    it('non-urgent rows do not include an urgency cue', () => {
      renderPage();
      // Only v-2 is urgent; v-1 and v-3 are not.
      const urgentCues = screen.getAllByText('Urgent');
      expect(urgentCues).toHaveLength(1);
    });

    it('empty table state renders no table role', () => {
      mockStore({ pendingValidations: [], validationHistory: [], batchApprove: vi.fn(), batchReject: vi.fn() });
      renderPage();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('sort selector', () => {
    it('sorts by amount numerically', () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/Sort by/i), {
        target: { value: 'amount' },
      });

      const vaultCells = screen.getAllByText(/Vault$/);
      expect(vaultCells[0].textContent).toBe('Beta Vault');
      expect(vaultCells[1].textContent).toBe('Alpha Vault');
      expect(vaultCells[2].textContent).toBe('Gamma Vault');
    });
  });

  describe('failure-path and boundary coverage', () => {
    it('renders safely when pendingValidations is undefined', () => {
      mockStore({
        pendingValidations: undefined,
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      expect(() => renderPage()).not.toThrow();
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('renders safely when pendingValidations is null', () => {
      mockStore({
        pendingValidations: null,
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      expect(() => renderPage()).not.toThrow();
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });

    it('renders safely when pendingValidations is not an array', () => {
      mockStore({
        pendingValidations: { not: 'an array' },
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      expect(() => renderPage()).not.toThrow();
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });

    it('skips malformed task entries without crashing', () => {
      mockStore({
        pendingValidations: [
          null,
          undefined,
          {},
          { id: 'v-ok', vaultName: 'Valid Vault', owner: '0x1', amount: '1 USDC', deadline: '2026-07-01', status: 'pending', milestone: 'M' },
        ],
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      expect(() => renderPage()).not.toThrow();
      expect(screen.getByText('Valid Vault')).toBeInTheDocument();
    });

    it('handles duplicate task ids deterministically', () => {
      mockStore({
        pendingValidations: [
          { ...makeTasks()[0], id: 'dup', vaultName: 'First Vault' },
          { ...makeTasks()[1], id: 'dup', vaultName: 'Second Vault' },
        ],
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      renderPage();
      expect(screen.getByText('First Vault')).toBeInTheDocument();
      expect(screen.getByText('Second Vault')).toBeInTheDocument();
    });

    it('handles invalid deadline strings without throwing', () => {
      mockStore({
        pendingValidations: [
          { ...makeTasks()[0], id: 'bad-date', deadline: 'not-a-date' },
        ],
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      expect(() => renderPage()).not.toThrow();
      expect(screen.getByText('Alpha Vault')).toBeInTheDocument();
    });

    it('handles invalid amount strings without throwing', () => {
      mockStore({
        pendingValidations: [
          { ...makeTasks()[0], id: 'bad-amount', amount: 'N/A' },
        ],
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      expect(() => renderPage()).not.toThrow();
      expect(screen.getByText('Alpha Vault')).toBeInTheDocument();
    });

    it('handles empty string fields without throwing', () => {
      mockStore({
        pendingValidations: [
          { ...makeTasks()[0], id: '', vaultName: '', owner: '', amount: '', deadline: '', milestone: '' },
        ],
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      expect(() => renderPage()).not.toThrow();
    });

    it('handles very large queues without crashing', () => {
      const many = Array.from({ length: 250 }, (_, i) => ({
        ...makeTasks()[0],
        id: `v-${i}`,
        vaultName: `Vault ${i}`,
      }));
      mockStore({
        pendingValidations: many,
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      expect(() => renderPage()).not.toThrow();
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
    });

    it('handles overdue deadlines (negative daysRemaining) as urgent', () => {
      mockStore({
        pendingValidations: [
          { ...makeTasks()[0], id: 'overdue', deadline: '2026-01-01' },
        ],
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      renderPage();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('handles deadline exactly at the urgency boundary (3 days)', () => {
      mockStore({
        pendingValidations: [
          { ...makeTasks()[0], id: 'boundary', deadline: '2026-06-24' },
        ],
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      renderPage();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('does not mark rows urgent just past the boundary (4 days)', () => {
      mockStore({
        pendingValidations: [
          { ...makeTasks()[0], id: 'just-outside', deadline: '2026-06-25' },
        ],
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      renderPage();
      expect(screen.queryByText('Urgent')).not.toBeInTheDocument();
    });

    it('repeated sort toggles remain deterministic', () => {
      renderPage();
      const toggle = screen.getByRole('button', { name: /Ascending/i });
      for (let i = 0; i < 6; i += 1) {
        fireEvent.click(screen.getByRole('button', { name: /Ascending|Descending/i }));
      }
      expect(screen.getByRole('button', { name: /Ascending/i })).toBeInTheDocument();
      const vaultCells = screen.getAllByText(/Vault$/);
      expect(vaultCells[0].textContent).toBe('Beta Vault');
      expect(toggle).toBeInTheDocument();
    });

    it('navigating twice with the same task is idempotent', () => {
      renderPage();
      const reviewButtons = screen.getAllByRole('button', { name: /Review/i });
      fireEvent.click(reviewButtons[0]);
      fireEvent.click(reviewButtons[0]);
      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenNthCalledWith(1, '/verifier/queue/v-2');
      expect(mockNavigate).toHaveBeenNthCalledWith(2, '/verifier/queue/v-2');
    });

    it('does not expose sensitive data in rendered output', () => {
      renderPage();
      const html = document.body.innerHTML;
      expect(html).not.toMatch(/privateKey|secret|password|mnemonic/i);
    });

    it('recovers when store transitions from empty to populated', () => {
      mockStore({
        pendingValidations: [],
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      const { rerender } = renderPage();
      expect(screen.getByText('All caught up!')).toBeInTheDocument();

      mockStore({
        pendingValidations: makeTasks(),
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      rerender(
        <MemoryRouter>
          <PendingValidations />
        </MemoryRouter>
      );
      expect(screen.getByText('Alpha Vault')).toBeInTheDocument();
    });

    it('recovers when store transitions from populated to empty', () => {
      const { rerender } = renderPage();
      expect(screen.getByText('Alpha Vault')).toBeInTheDocument();

      mockStore({
        pendingValidations: [],
        validationHistory: [],
        batchApprove: vi.fn(),
        batchReject: vi.fn(),
      });
      rerender(
        <MemoryRouter>
          <PendingValidations />
        </MemoryRouter>
      );
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });
  });
 expect(vaultCells[1].textContent).toBe('Alpha Vault');
      expect(vaultCells[2].textContent).toBe('Gamma Vault');
    });

    it('sorts by vault name and reverses with the direction toggle', () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/Sort by/i), {
        target: { value: 'vaultName' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Ascending/i }));

      const vaultCells = screen.getAllByText(/Vault$/);
      expect(vaultCells[0].textContent).toBe('Gamma Vault');
      expect(vaultCells[1].textContent).toBe('Beta Vault');
      expect(vaultCells[2].textContent).toBe('Alpha Vault');
    });
  });

  it('does not have hardcoded color classes on the primary container', () => {
    const { container } = renderPage();
    const primaryContainer = container.firstChild as HTMLElement;
    expect(primaryContainer.className).not.toContain('bg-white');
    expect(primaryContainer.className).not.toContain('text-gray-500');
    expect(primaryContainer.className).not.toContain('text-red-600');
  });

  it('uses design tokens for batch action buttons', () => {
    renderPage();
    // Rejection button
    const rejectBtn = screen.getByRole('button', { name: /Reject Selected/i });
    expect(rejectBtn.getAttribute('style')).toContain('var(--danger)');
    expect(rejectBtn.getAttribute('style')).toContain('var(--danger-transparent)');

    // Approval button
    const approveBtn = screen.getByRole('button', { name: /Approve Selected/i });
    expect(approveBtn.getAttribute('style')).toContain('var(--success)');
    expect(approveBtn.getAttribute('style')).toContain('white');
  });

  describe('search and filter controls', () => {
    it('renders search input and milestone filter', () => {
      renderPage();
      expect(screen.getByLabelText(/Search by Vault Name or Owner/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Filter by Milestone/i)).toBeInTheDocument();
    });

    it('shows all available milestones in dropdown', () => {
      renderPage();
      const milestoneSelect = screen.getByLabelText(/Filter by Milestone/i) as HTMLSelectElement;
      const options = Array.from(milestoneSelect.options).map(opt => opt.value);
      expect(options).toContain('');
      expect(options).toContain('Phase 1');
      expect(options).toContain('Phase 2');
      expect(options).toContain('Phase 3');
    });
  });

  describe('search by vault name', () => {
    it('filters table rows when searching by vault name', () => {
      renderPage();
      const searchInput = screen.getByLabelText(/Search by Vault Name or Owner/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });

      expect(screen.getByText('Alpha Vault')).toBeInTheDocument();
      expect(screen.queryByText('Beta Vault')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Vault')).not.toBeInTheDocument();
    });

    it('search is case-insensitive', () => {
      renderPage();
      const searchInput = screen.getByLabelText(/Search by Vault Name or Owner/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'beta' } });

      expect(screen.getByText('Beta Vault')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Vault')).not.toBeInTheDocument();
    });

    it('search works with partial vault names', () => {
      renderPage();
      const searchInput = screen.getByLabelText(/Search by Vault Name or Owner/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'Vault' } });

      expect(screen.getByText('Alpha Vault')).toBeInTheDocument();
      expect(screen.getByText('Beta Vault')).toBeInTheDocument();
      expect(screen.getByText('Gamma Vault')).toBeInTheDocument();
    });
  });

  describe('search by owner', () => {
    it('filters table rows when searching by owner address', () => {
      renderPage();
      const searchInput = screen.getByLabelText(/Search by Vault Name or Owner/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: '0xAAAA' } });

      expect(screen.getByText('Alpha Vault')).toBeInTheDocument();
      expect(screen.queryByText('Beta Vault')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Vault')).not.toBeInTheDocument();
    });

    it('owner search is case-insensitive', () => {
      renderPage();
      const searchInput = screen.getByLabelText(/Search by Vault Name or Owner/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: '0xbbbb' } });

      expect(screen.getByText('Beta Vault')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Vault')).not.toBeInTheDocument();
    });

    it('search works with partial owner addresses', () => {
      renderPage();
      const searchInput = screen.getByLabelText(/Search by Vault Name or Owner/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: '0xC' } });

      expect(screen.getByText('Gamma Vault')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Vault')).not.toBeInTheDocument();
      expect(screen.queryByText('Beta Vault')).not.toBeInTheDocument();
    });
  });

  describe('milestone filter', () => {
    it('filters table rows by milestone', () => {
      renderPage();
      const milestoneSelect = screen.getByLabelText(/Filter by Milestone/i) as HTMLSelectElement;
      fireEvent.change(milestoneSelect, { target: { value: 'Phase 1' } });

      expect(screen.getByText('Alpha Vault')).toBeInTheDocument();
      expect(screen.queryByText('Gamma Vault')).not.toBeInTheDocument();
      expect(screen.queryByText('Beta Vault')).not.toBeInTheDocument();
    });

    it('shows single vault when filtering by Phase 2', () => {
      renderPage();
      const milestoneSelect = screen.getByLabelText(/Filter by Milestone/i) as HTMLSelectElement;
      fireEvent.change(milestoneSelect, { target: { value: 'Phase 2' } });

      expect(screen.getByText('Beta Vault')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Vault')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Vault')).not.toBeInTheDocument();
    });

    it('shows all results when milestone filter is reset to "All Milestones"', () => {
      renderPage();
      const milestoneSelect = screen.getByLabelText(/Filter by Milestone/i) as HTMLSelectElement;
      fireEvent.change(milestoneSelect, { target: { value: 'Phase 1' } });
      fireEvent.change(milestoneSelect, { target: { value: '' } });

      expect(screen.getByText('Alpha Vault')).toBeInTheDocument();
      expect(screen.getByText('Beta Vault')).toBeInTheDocument();
      expect(screen.getByText('Gamma Vault')).toBeInTheDocument();
    });
  });

  describe('combined search and filter', () => {
    it('applies both search and milestone filter together', () => {
      renderPage();
      const searchInput = screen.getByLabelText(/Search by Vault Name or Owner/i) as HTMLInputElement;
      const milestoneSelect = screen.getByLabelText(/Filter by Milestone/i) as HTMLSelectElement;

      fireEvent.change(searchInput, { target: { value: 'Gamma' } });
      fireEvent.change(milestoneSelect, { target: { value: 'Phase 1' } });

      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
      expect(screen.queryByText('Gamma Vault')).not.toBeInTheDocument();
    });

    it('shows no results when search matches but milestone does not', () => {
      renderPage();
      const searchInput = screen.getByLabelText(/Search by Vault Name or Owner/i) as HTMLInputElement;
      const milestoneSelect = screen.getByLabelText(/Filter by Milestone/i) as HTMLSelectElement;

      fireEvent.change(searchInput, { target: { value: 'Alpha' } });
      fireEvent.change(milestoneSelect, { target: { value: 'Phase 2' } });

      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
      expect(screen.queryByText('Alpha Vault')).not.toBeInTheDocument();
    });

    it('shows "No results found" when no validations match filters', () => {
      renderPage();
      const searchInput = screen.getByLabelText(/Search by Vault Name or Owner/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
      expect(screen.getByText(/Try adjusting your search/i)).toBeInTheDocument();
    });
  });

  describe('select-all with filters', () => {
    it('select-all only selects filtered items', () => {
      renderPage();
      const milestoneSelect = screen.getByLabelText(/Filter by Milestone/i) as HTMLSelectElement;
      fireEvent.change(milestoneSelect, { target: { value: 'Phase 1' } });

      const selectAllCheckbox = screen.getByLabelText(/Select all validations/i) as HTMLInputElement;
      fireEvent.click(selectAllCheckbox);

      const selectedCheckboxes = screen.getAllByRole('checkbox')
        .filter(cb => (cb as HTMLInputElement).checked);
      expect(selectedCheckboxes.length).toBeGreaterThanOrEqual(2);
    });

    it('clears selection when search filter changes', () => {
      renderPage();
      const selectAllCheckbox = screen.getByLabelText(/Select all validations/i) as HTMLInputElement;
      fireEvent.click(selectAllCheckbox);
      expect((selectAllCheckbox as HTMLInputElement).checked).toBe(true);

      const searchInput = screen.getByLabelText(/Search by Vault Name or Owner/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });
      expect(screen.queryByLabelText(/Select all validations/i)).not.toBeInTheDocument();
      expect(screen.getByText('0 selected')).toBeInTheDocument();
    });
  });

  describe('batch actions with filters', () => {
    it('batch approve button is disabled when no items are selected', () => {
      renderPage();
      const approveButton = screen.getByRole('button', { name: /Approve Selected/i });
      expect(approveButton).toBeDisabled();
    });

    it('batch reject button is disabled when no items are selected', () => {
      renderPage();
      const rejectButton = screen.getByRole('button', { name: /Reject Selected/i });
      expect(rejectButton).toBeDisabled();
    });

    it('batch approve button is enabled when items are selected', () => {
      renderPage();
      const selectAllCheckbox = screen.getByLabelText(/Select all validations/i) as HTMLInputElement;
      fireEvent.click(selectAllCheckbox);

      const approveButton = screen.getByRole('button', { name: /Approve Selected/i });
      expect(approveButton).not.toBeDisabled();
    });

    it('selection count updates when filtering changes', () => {
      renderPage();
      const selectAllCheckbox = screen.getByLabelText(/Select all validations/i) as HTMLInputElement;
      fireEvent.click(selectAllCheckbox);

      let selectionText = screen.getByText('3 selected');
      expect(selectionText).toBeInTheDocument();

      const milestoneSelect = screen.getByLabelText(/Filter by Milestone/i) as HTMLSelectElement;
      fireEvent.change(milestoneSelect, { target: { value: 'Phase 1' } });

      selectionText = screen.getByText('0 selected');
      expect(selectionText).toBeInTheDocument();
    });
  });

  describe('empty state messaging', () => {
    it('shows "All caught up!" when there are no pending validations', () => {
      mockStore({ pendingValidations: [], validationHistory: [], batchApprove: vi.fn(), batchReject: vi.fn() });
      renderPage();

      expect(screen.getByText('All caught up!')).toBeInTheDocument();
      expect(screen.getByText(/no pending validations/i)).toBeInTheDocument();
    });

    it('shows "No results found" when filters eliminate all items', () => {
      renderPage();
      const searchInput = screen.getByLabelText(/Search by Vault Name or Owner/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'ZZZ' } });

      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
      expect(screen.getByText(/Try adjusting your search/i)).toBeInTheDocument();
    });
  });
});
