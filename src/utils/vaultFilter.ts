/**
 * vaultFilter.ts
 *
 * Pure functions for filtering and sorting vault lists.
 * Extracted for unit-testability in isolation from React components.
 */

import type { Vault, VaultStatus } from '../types/vault';

/**
 * Filter options for vault list.
 */
export interface VaultFilters {
  /** Status to filter by; undefined or 'all' returns all statuses */
  status?: VaultStatus | 'all';
  /** Search query to match against vault name (case-insensitive) */
  query: string;
}

/**
 * Sort options for vault list.
 */
export interface VaultSortOptions {
  /** Field to sort by */
  by: 'deadline' | 'amount';
  /** Sort direction: 'asc' for ascending, 'desc' for descending */
  dir: 'asc' | 'desc';
}

/**
 * Filters vaults by status and/or name search query.
 *
 * @param vaults - Array of vaults to filter
 * @param options - Filter options (status, query)
 * @returns Filtered array of vaults (new array, does not mutate input)
 *
 * @example
 * filterVaults(vaults, { status: 'active', query: 'alpha' })
 */
export function filterVaults(
  vaults: Vault[],
  options: Partial<VaultFilters> = {},
): Vault[] {
  const { status, query = '' } = options;
  const normalizedQuery = query.trim().toLowerCase();

  // Whitespace-only query should return empty results
  if (query && !normalizedQuery) {
    return [];
  }

  return vaults.filter((vault) => {
    // Filter by status if provided (and not 'all')
    if (status && status !== 'all' && vault.status !== status) {
      return false;
    }

    // Filter by search query if provided (case-insensitive match on name)
    if (normalizedQuery) {
      const nameMatch = vault.name.toLowerCase().includes(normalizedQuery);
      if (!nameMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts vaults by deadline or amount.
 *
 * @param vaults - Array of vaults to sort
 * @param options - Sort options (by, dir)
 * @returns Sorted array of vaults (new array, does not mutate input)
 *
 * @example
 * sortVaults(vaults, { by: 'deadline', dir: 'asc' })
 */
export function sortVaults(
  vaults: Vault[],
  options: VaultSortOptions,
): Vault[] {
  const { by, dir } = options;
  const multiplier = dir === 'asc' ? 1 : -1;

  return [...vaults].sort((a, b) => {
    let comparison = 0;

    if (by === 'deadline') {
      const dateA = new Date(a.deadline).getTime();
      const dateB = new Date(b.deadline).getTime();
      comparison = dateA - dateB;
    } else if (by === 'amount') {
      comparison = a.amount - b.amount;
    }

    // Stable sort: use id as tiebreaker to maintain consistent ordering
    if (comparison === 0) {
      return a.id.localeCompare(b.id) * multiplier;
    }

    return comparison * multiplier;
  });
}
