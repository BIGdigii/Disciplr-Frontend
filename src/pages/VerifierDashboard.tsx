import { useNavigate } from 'react-router-dom';
import { Text } from '../components/Text';
import { useVerifierStore, type ValidationTask } from '../Zustand/Store';
import VerifierMetrics from '../components/VerifierMetrics';
import { StatusChip, type ChipStatus } from '../components/StatusChip';
import { daysRemaining } from '../utils/dashboard';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { CRITICAL_DAYS_THRESHOLD } from '../utils/verifierMetrics';

export function mapValidationStatusToChipStatus(status: ValidationTask['status']): ChipStatus {
  switch (status) {
    case 'pending':
      return 'pending_validation';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    default: {}
  }
}

export default function VerifierDashboard() {
  const navigate = useNavigate();
  const now = useCurrentTime();
  
  const pendingValidations = useVerifierStore((state) => state.pendingValidations);
  const validationHistory = useVerifierStore((state) => state.validationHistory);

  const totalPending = pendingValidations.length;
  const totalCompleted = validationHistory.length;
  const totalAssigned = totalPending + totalCompleted;

  return (
    <div className="flex flex-col gap-6 p-6">
      <VerifierMetrics />
      <header className="mb-4">
        <Text role="display" as="h1">Verifier Dashboard</Text>
        <Text role="body" as="p" className="mt-1" style={{ color: 'var(--muted)' }}>
          Overview of your assigned vaults and validation activity.
        </Text>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 border rounded-lg shadow-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <Text role="body" as="p" className="mb-2" style={{ color: 'var(--muted)' }}>Total Assigned</Text>
          <Text role="display" as="h1">{totalAssigned}</Text>
        </div>
        <div className="p-6 border rounded-lg shadow-sm border-l-4" style={{ background: 'var(--bg)', borderColor: 'var(--border)', borderLeftColor: 'var(--accent)' }}>
          <Text role="body" as="p" className="mb-2" style={{ color: 'var(--muted)' }}>Pending Validations</Text>
          <Text role="display" as="h1">{totalPending}</Text>
        </div>
        <div className="p-6 border rounded-lg shadow-sm border-l-4" style={{ background: 'var(--bg)', borderColor: 'var(--border)', borderLeftColor: 'var(--success)' }}>
          <Text role="body" as="p" className="mb-2" style={{ color: 'var(--muted)' }}>Completed</Text>
          <Text role="display" as="h1">{totalCompleted}</Text>
        </div>
      </section>

      <section className="flex gap-4 mt-4">
        <button
          onClick={() => navigate('/verifier/queue')}
          className="px-6 py-3 font-medium rounded transition focus-visible:outline focus-visible:outline-[var(--focus-ring-width)] focus-visible:outline-offset-[var(--focus-ring-offset)] focus-visible:outline-[var(--focus-ring-color)]"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          View Pending Queue
        </button>
        <button
          onClick={() => navigate('/verifier/history')}
          className="px-6 py-3 border font-medium rounded transition focus-visible:outline focus-visible:outline-[var(--focus-ring-width)] focus-visible:outline-offset-[var(--focus-ring-offset)] focus-visible:outline-[var(--focus-ring-color)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'transparent' }}
        >
          View History
        </button>
      </section>

      <section className="mt-8">
        <Text role="display" as="h2" className="mb-4">Urgent Pending Validations</Text>
        <div className="flex flex-col gap-3">
          {pendingValidations.length === 0 ? (
            <div className="p-8 border rounded shadow-sm text-center" style={{ color: 'var(--muted)', background: 'var(--surface)' }}>
              <Text role="body" as="p">You have no pending validations at this time.</Text>
            </div>
          ) : (
            pendingValidations.slice(0, 3).map((task) => {
              const remaining = daysRemaining(task.deadline, now);
              return (
                <div
                  key={task.id}
                  className="p-4 border rounded shadow-sm flex flex-col md:flex-row justify-between md:items-center transition gap-4"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                >
                  <div>
                    <Text role="body" as="h3">{task.vaultName}</Text>
                    <Text role="body" as="p" className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                      Milestone: {task.milestone}
                    </Text>
                  </div>
                  <div className="text-left md:text-right">
                    <Text
                      role="body"
                      as="p"
                      className="font-bold"
                      style={{ color: remaining <= CRITICAL_DAYS_THRESHOLD ? 'var(--danger)' : 'var(--text)' }}
                    >
                      {remaining <= CRITICAL_DAYS_THRESHOLD && (
                        <span aria-hidden="true">⚠ </span>
                      )}
                      {remaining} days left
                      {remaining <= CRITICAL_DAYS_THRESHOLD && (
                        <span className="sr-only"> (urgent)</span>
                      )}
                    </Text>
                    <button
                      onClick={() => navigate(`/verifier/queue/${task.id}`)}
                      aria-label={`Review ${task.vaultName}`}
                      className="font-medium text-sm mt-2 transition focus-visible:outline focus-visible:outline-[var(--focus-ring-width)] focus-visible:outline-offset-[var(--focus-ring-offset)] focus-visible:outline-[var(--focus-ring-color)]"
                      style={{ color: 'var(--accent)' }}
                    >
                      Review Now &rarr;
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-8" aria-label="Recent Decisions">
        <Text role="display" as="h2" className="mb-4">Recent Decisions</Text>
        <div className="flex flex-col gap-3">
          {validationHistory.length === 0 ? (
            <div className="p-8 border rounded shadow-sm text-center" style={{ color: 'var(--muted)', background: 'var(--surface)' }}>
              <Text role="body" as="p">No recent decisions found.</Text>
            </div>
          ) : (
            validationHistory.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="p-4 border rounded shadow-sm flex flex-col md:flex-row justify-between md:items-center transition gap-4"
                style={{ background: 'var(--bg)', borderColor: 'var(--border')' }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Text role="body" as="h3">{task.vaultName}</Text>
                    <StatusChip status={mapValidationStatusToChipStatus(task.status)} size="sm" />
                  </div>
                  <Text role="body" as="p" className="text-sm" style={{ color: 'var(--muted)' }}>
                    Milestone: {task.milestone}
                  </Text>
                </div>
                <div className="text-left md:text-right flex flex-col md:items-end justify-center">
                  <Text role="body" as="p" className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                    {task.decidedAt || task.deadline}
                  </Text>
                  <button
                    onClick={() => navigate('/verifier/history')}
                    aria-label={`View ${task.vaultName} in History`}
                    className="font-medium text-sm mt-2 transition text-left md:text-right focus-visible:outline focus-visible:outline-[var(--focus-ring-width)] focus-visible:outline-offset-[var(--focus-ring-offset)] focus-visible:outline-[var(--focus-ring-color)]"
                    style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    View in History &rarr;
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
