import type { VaultStatus, Vault } from "../types/vault";
import { formatRelativeTime } from "./relativeTime";

export type { VaultStatus };

export interface VaultPreview {
  id: string;
  name: string;
  amount: number;
  currency: string;
  status: VaultStatus;
  progressPct: number;
  deadline: string;
}

export interface Activity {
  id: string;
  type: "created" | "validated" | "released" | "redirected";
  vault: string;
  timestamp: string;
  amount?: number;
}

export interface Deadline {
  id: string;
  name: string;
  deadline: string;
  amount: number;
}

export interface DashboardSummary {
  totalLocked: number;
  activeVaults: number;
  pendingMilestones: number;
  completionRate: number;
}

export interface FormattedDeadline extends Deadline {
  daysRemaining: number;
  urgencyColor: string;
  formattedDays: string;
  formattedAmount: string;
  formattedDate: string;
}

export interface FormattedActivity extends Activity {
  formattedAmount?: string;
  relativeTime: string;
}

export function daysRemaining(
  deadline: string,
  now: number = Date.now(),
): number {
  return Math.ceil((new Date(deadline).getTime() - now) / 86400000);
}

export function urgencyColor(days: number): string {
  if (days < 0) return "var(--danger)";
  if (days <= 7) return "var(--danger)";
  if (days <= 30) return "var(--warning)";
  return "var(--success)";
}

export function relativeTime(iso: string, now: number = Date.now()): string {
  return formatRelativeTime(iso, now);
}

/**
 * Derive a DashboardSummary from a list of full vaults.
 *
 * - totalLocked: sum of amounts for all active/pending_validation vaults.
 * - activeVaults: count of vaults with status 'active' or 'pending_validation'.
 * - pendingMilestones: count of all milestones with status 'pending' across all vaults.
 * - completionRate: completed / (completed + failed) * 100, guarded against
 *   divide-by-zero (returns 0 when no terminal vaults exist).
 */
export function computeDashboardSummary(vaults: Vault[]): DashboardSummary {
  const ACTIVE_STATUSES: Vault["status"][] = ["active", "pending_validation"];
  const TERMINAL_STATUSES: Vault["status"][] = ["completed", "failed", "cancelled"];

  let totalLocked = 0;
  let activeVaults = 0;
  let pendingMilestones = 0;
  let completedVaults = 0;
  let terminalVaults = 0;

  for (const v of vaults) {
    if (ACTIVE_STATUSES.includes(v.status)) {
      totalLocked += v.amount;
      activeVaults++;
    }
    if (v.status === "completed") completedVaults++;
    if (TERMINAL_STATUSES.includes(v.status)) terminalVaults++;
    
    // Count pending milestones from the vault's milestones array
    pendingMilestones += v.milestones.filter(m => m.status === "pending").length;
  }

  const completionRate =
    terminalVaults === 0
      ? 0
      : Math.round((completedVaults / terminalVaults) * 100);

  return {
    totalLocked,
    activeVaults,
    pendingMilestones,
    completionRate,
  };
}

export function formatSummary(summary: DashboardSummary) {
  return {
    totalLocked: `$${summary.totalLocked.toLocaleString()}`,
    activeVaults: String(summary.activeVaults),
    pendingMilestones: String(summary.pendingMilestones),
    completionRate: `${summary.completionRate}%`,
  };
}

export function processDeadlines(
  deadlines: Deadline[],
  now: number = Date.now(),
): FormattedDeadline[] {
  return [...deadlines]
    .sort(
      (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    )
    .map((d) => {
      const days = daysRemaining(d.deadline, now);
      const color = urgencyColor(days);
      return {
        ...d,
        daysRemaining: days,
        urgencyColor: color,
        formattedDays: days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`,
        formattedAmount: `${d.amount.toLocaleString()} USDC`,
        formattedDate: new Date(d.deadline).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
    });
}

export function processActivity(
  activities: Activity[],
  now: number = Date.now(),
): FormattedActivity[] {
  return [...activities]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .map((a) => {
      return {
        ...a,
        formattedAmount:
          a.amount != null ? `${a.amount.toLocaleString()} USDC` : undefined,
        relativeTime: relativeTime(a.timestamp, now),
      };
    });
}
