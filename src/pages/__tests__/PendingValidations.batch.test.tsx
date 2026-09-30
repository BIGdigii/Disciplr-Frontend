import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PendingValidations from '../PendingValidations';
import { useVerifierStore, type ValidationTask } from '../../Zustand/Store';

// focus-trap-react misbehaves in jsdom; render children directly.
vi.mock('focus-trap-react', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const task = (id: string, vaultName: string): ValidationTask => ({
  id,
  vaultName,
  owner: '0xowner',
  amount: '1,000 USDC',
  deadline: '2026-06-01',
  status: 'pending',
  milestone: `Milestone ${id}`,
});

const seed = () => [
  task('v-1', 'Alpha Vault'),
  task('v-2', 'Beta Vault'),
  task('v-3', 'Gamma Vault'),
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <PendingValidations />
    </MemoryRouter>,
  );

const selectAll = () => screen.getByLabelText('Select all validations') as HTMLInputElement;

beforeEach(() => {
  useVerifierStore.setState({ pendingValidations: seed(), validationHistory: [] });
  mockNavigate.mockClear();
});

describe('PendingValidations — batch actions', () => {
  it('disables the action bar when nothing is selected', () => {
    renderPage();
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve selected/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject selected/i })).toBeDisabled();
  });

  it('selects a single row and reflects an indeterminate header', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Select Alpha Vault'));

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(selectAll().indeterminate).toBe(true);
    expect(selectAll().checked).toBe(false);
    expect(screen.getByRole('button', { name: /approve selected/i })).toBeEnabled();
  });

  it('select-all checks every row and toggles back off', () => {
    renderPage();
    fireEvent.click(selectAll());

    expect(screen.getByText('3 selected')).toBeInTheDocument();
    expect(selectAll().checked).toBe(true);
    expect(selectAll().indeterminate).toBe(false);

    fireEvent.click(selectAll());
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(selectAll().checked).toBe(false);
  });

  it('batch approves the selected tasks into history', () => {
    renderPage();
    fireEvent.click(selectAll());
    fireEvent.click(screen.getByRole('button', { name: /approve selected/i }));

    // Modal shows how many tasks are affected.
    expect(screen.getByTestId('batch-affected-count')).toHaveTextContent('3');

    fireEvent.click(screen.getByRole('button', { name: /confirm approve/i }));

    const { pendingValidations, validationHistory } = useVerifierStore.getState();
    expect(pendingValidations).toHaveLength(0);
    expect(validationHistory.map((t) => t.id).sort()).toEqual(['v-1', 'v-2', 'v-3']);
    expect(validationHistory.every((t) => t.status === 'approved')).toBe(true);
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
  });

  it('batch rejects only the selected tasks and carries notes to history', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Select Alpha Vault'));
    fireEvent.click(screen.getByLabelText('Select Beta Vault'));
    fireEvent.click(screen.getByRole('button', { name: /reject selected/i }));

    // Reject requires notes before confirmation is possible.
    const confirmBtn = screen.getByRole('button', { name: /confirm reject/i });
    expect(confirmBtn).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/reason for rejection/i), {
      target: { value: 'Evidence is incomplete.' },
    });
    expect(confirmBtn).toBeEnabled();
    fireEvent.click(confirmBtn);

    const { pendingValidations, validationHistory } = useVerifierStore.getState();
    expect(pendingValidations.map((t) => t.id)).toEqual(['v-3']);
    expect(validationHistory.map((t) => t.id).sort()).toEqual(['v-1', 'v-2']);
    expect(validationHistory.every((t) => t.status === 'rejected')).toBe(true);
    expect(validationHistory.every((t) => t.notes === 'Evidence is incomplete.')).toBe(true);
  });

  it('clears the selection after a batch action completes', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Select Alpha Vault'));
    fireEvent.click(screen.getByRole('button', { name: /approve selected/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm approve/i }));

    expect(screen.getByText('0 selected')).toBeInTheDocument();
  });

  it('keeps the per-row Review navigation working', () => {
    renderPage();
    const row = screen.getByText('Gamma Vault').closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: /review/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/verifier/queue/v-3');
  });
});

describe('PendingValidations — failure paths and boundaries', () => {
  it('renders the empty state when there are no pending validations', () => {
    useVerifierStore.setState({ pendingValidations: [], validationHistory: [] });
    renderPage();

    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    expect(screen.queryByLabelText('Select all validations')).not.toBeInTheDocument();
  });

  it('keeps batch actions disabled when the queue is empty', () => {
    useVerifierStore.setState({ pendingValidations: [], validationHistory: [] });
    renderPage();

    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve selected/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject selected/i })).toBeDisabled();
  });

  it('handles a single-row queue without assuming multiple rows', () => {
    useVerifierStore.setState({ pendingValidations: [task('v-1', 'Alpha Vault')], validationHistory: [] });
    renderPage();

    fireEvent.click(selectAll());
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(selectAll().checked).toBe(true);
    expect(selectAll().indeterminate).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /approve selected/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm approve/i }));

    expect(useVerifierStore.getState().pendingValidations).toHaveLength(0);
    expect(useVerifierStore.getState().validationHistory.map((t) => t.id)).toEqual(['v-1']);
  });

  it('rejects whitespace-only notes and keeps the tasks pending', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Select Alpha Vault'));
    fireEvent.click(screen.getByRole('button', { name: /reject selected/i }));

    const confirmBtn = screen.getByRole('button', { name: /confirm reject/i });
    fireEvent.change(screen.getByPlaceholderText(/reason for rejection/i), {
      target: { value: '   ' },
    });
    expect(confirmBtn).toBeDisabled();

    expect(useVerifierStore.getState().pendingValidations.map((t) => t.id).sort()).toEqual(['v-1', 'v-2', 'v-3']);
    expect(useVerifierStore.getState().validationHistory).toHaveLength(0);
  });

  it('cancelling a batch modal leaves state and selection unchanged', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Select Alpha Vault'));
    fireEvent.click(screen.getByRole('button', { name: /approve selected/i }));

    const cancel = screen.queryByRole('button', { name: /cancel/i });
    if (cancel) {
      fireEvent.click(cancel);
    } else {
      // Fall back to Escape key if no explicit cancel control is present.
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    }

    expect(useVerifierStore.getState().pendingValidations.map((t) => t.id).sort()).toEqual(['v-1', 'v-2', 'v-3']);
    expect(useVerifierStore.getState().validationHistory).toHaveLength(0);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('does not double-apply a batch action when confirm is clicked twice', () => {
    renderPage();
    fireEvent.click(selectAll());
    fireEvent.click(screen.getByRole('button', { name: /approve selected/i }));

    const confirm = screen.getByRole('button', { name: /confirm approve/i });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    const { pendingValidations, validationHistory } = useVerifierStore.getState();
    expect(pendingValidations).toHaveLength(0);
    expect(validationHistory).toHaveLength(3);
    expect(new Set(validationHistory.map((t) => t.id)).size).toBe(3);
  });

  it('ignores stale selection ids that are no longer in the queue', () => {
    renderPage();
    fireEvent.click(selectAll());

    // Simulate a concurrent update that removes one task before confirmation.
    useVerifierStore.setState({
      pendingValidations: [task('v-1', 'Alpha Vault'), task('v-3', 'Gamma Vault')],
    });

    fireEvent.click(screen.getByRole('button', { name: /approve selected/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm approve/i }));

    const { pendingValidations, validationHistory } = useVerifierStore.getState();
    // Only the tasks that were still present and selected may be moved.
    expect(pendingValidations.map((t) => t.id).sort()).toEqual(['v-3']);
    expect(validationHistory.map((t) => t.id).sort()).toEqual(['v-1']);
  });

  it('resets the selection when the queue becomes empty while rows are selected', () => {
    renderPage();
    fireEvent.click(selectAll());
    expect(screen.getByText('3 selected')).toBeInTheDocument();

    useVerifierStore.setState({ pendingValidations: [] });

    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
  });

  it('preserves the order of history entries and does not mutate existing history', () => {
    const existingHistory: ValidationTask[] = [
      { ...task('v-0', 'Prior Vault'), status: 'approved' },
    ];
    useVerifierStore.setState({ pendingValidations: seed(), validationHistory: existingHistory });
    renderPage();

    fireEvent.click(screen.getByLabelText('Select Beta Vault'));
    fireEvent.click(screen.getByRole('button', { name: /approve selected/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm approve/i }));

    const { validationHistory } = useVerifierStore.getState();
    expect(validationHistory.map((t) => t.id)).toEqual(['v-0', 'v-2']);
  });

  it('renders and acts on a large queue without losing tasks', () => {
    const large = Array.from({ length: 50 }, ( _, i) => task(`v-${i + 1}`, `Vault ${i + 1}`));
    useVerifierStore.setState({ pendingValidations: large, validationHistory: [] });
    renderPage();

    fireEvent.click(selectAll());
    expect(screen.getByText('50 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /approve selected/i }));
    expect(screen.getByTestId('batch-affected-count')).toHaveTextContent('50');
    fireEvent.click(screen.getByRole('button', { name: /confirm approve/i }));

    const { pendingValidations, validationHistory } = useVerifierStore.getState();
    expect(pendingValidations).toHaveLength(0);
    expect(validationHistory).toHaveLength(50);
    expect(new Set(validationHistory.map((t) => t.id)).size).toBe(50);
  });

  it('recovers from an approval that throws and leaves the queue intact', () => {
    const originalSetState = useVerifierStore.setState;
    const spy = vi.spyOn(useVerifierStore, 'setState').mockImplementation(() => {
      throw new Error('transient store failure');
    });

    try {
      renderPage();
      fireEvent.click(screen.getByLabelText('Select Alpha Vault'));
      fireEvent.click(screen.getByRole('button', { name: /approve selected/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm approve/i }));
    } finally {
      spy.mockRestore();
    }

    // The queue must not have been partially mutated by the failed action.
    expect(useVerifierStore.getState().pendingValidations.map((t) => t.id).sort()).toEqual(['v-1', 'v-2', 'v-3']);
    expect(useVerifierStore.getState().validationHistory).toHaveLength(0);
    expect(originalSetState).toBe(useVerifierStore.setState);
  });

  it('keeps the action bar disabled after a batch action empties the queue', () => {
    useVerifierStore.setState({ pendingValidations: [task('v-1', 'Alpha Vault')], validationHistory: [] });
    renderPage();
    fireEvent.click(selectAll());
    fireEvent.click(screen.getByRole('button', { name: /approve selected/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm approve/i }));

    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve selected/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject selected/i })).toBeDisabled();
  });
});
