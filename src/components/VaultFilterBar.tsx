import type { CSSProperties } from 'react';
import type { VaultStatus } from '../types/vault';
import { VAULT_STATUS_ORDER } from '../types/vault';
import type { VaultFilters } from '../utils/vaultFilter';

interface VaultFilterBarProps {
  value: VaultFilters;
  onChange: (filters: VaultFilters) => void;
}

const STATUS_LABELS: Record<VaultStatus, string> = {
  active: 'Active',
  pending_validation: 'Pending Validation',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const selectStyle: CSSProperties = {
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '0.5rem 0.75rem',
  fontSize: 14,
  cursor: 'pointer',
  minHeight: 44,
};

const inputStyle: CSSProperties = {
  ...selectStyle,
  flex: 1,
  minWidth: 0,
  cursor: 'text',
};

export function VaultFilterBar({ value, onChange }: VaultFilterBarProps) {
  return (
    <div
      role="search"
      aria-label="Filter vaults"
      style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}
    >
      <label htmlFor="vault-filter-status" style={{ display: 'contents' }}>
        <span className="sr-only">Status</span>
        <select
          id="vault-filter-status"
          aria-label="Filter by status"
          value={value.status}
          onChange={(e) =>
            onChange({ ...value, status: e.target.value as VaultFilters['status'] })
          }
          style={selectStyle}
        >
          <option value="all">All statuses</option>
          {VAULT_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <input
        id="vault-filter-query"
        type="search"
        aria-label="Search vaults by name"
        placeholder="Search by name…"
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        style={inputStyle}
      />
    </div>
  );
}
