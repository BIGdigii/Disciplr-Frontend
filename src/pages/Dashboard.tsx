import { Link } from "react-router-dom";
import { Text } from "../components/Text";
import VaultCard from "../components/VaultCard";
import UpcomingDeadlines from "../components/UpcomingDeadlines";
import { getAtRiskVaults } from "../utils/atRiskVaults";

// ── Types ─────────────────────────────────────────────────────────────────────
import { useCallback, useMemo, useState, useEffect } from "react";
import * as dashboardUtils from "../utils/dashboard";
import type { VaultPreview, Activity, Deadline } from "../utils/dashboard";
import type { VaultStatus, Vault } from "../types/vault";
import { timelineProgress } from "../utils/vaultLifecycle";
import { validateVaultPreview, sanitizeActivity } from "../utils/dashboardValidation";

// ── Mock Data ─────────────────────────────────────────────────────────────────
// Seed data lives in src/fixtures/dashboard.ts. VAULTS are loaded async from
// vaultService (see Dashboard component below).
import { ACTIVITY, DEADLINES, CHART_DATA } from "../fixtures/dashboard";
import { listVaults } from "../services/vaultService";

// ── Helpers ───────────────────────────────────────────────────────────────────


/**
 * Invariant: only vaults whose preview passes validation are rendered.
 * Invalid entries are dropped and logged (no sensitive fields) so that
 * malformed upstream data cannot produce inconsistent summaries or cards.
 */
function toSafePreviews(loaded: Vault[]): VaultPreview[] {
  const safe: VaultPreview[] = [];
  for (const v of loaded) {
    const preview: VaultPreview = {
      id: v.id,
      name: v.name,
      amount: v.amount,
      currency: v.currency,
      status: v.status as VaultStatus,
      deadline: v.deadline,
      progressPct: timelineProgress(v.createdAt, v.deadline),
    };
    const result = validateVaultPreview(preview);
    if (result.ok) {
      safe.push(preview);
    } else {
      // eslint-disable-next-line no-console
      console.warn("[Dashboard] dropped invalid vault preview", {
        id: v.id,
        reason: result.reason,
      });
    }
  }
  return safe;
}

const ACTIVITY_CFG: Record<
  Activity["type"],
  { label: string; icon: string; color: string }
> = {
  created: { label: "Vault created", icon: "＋", color: "var(--accent)" },
  validated: {
    label: "Milestone validated",
    icon: "✓",
    color: "var(--success)",
  },
  released: {
    label: "Funds released",
    icon: "↑",
    color: "var(--info)",
  },
  redirected: { label: "Funds redirected", icon: "→", color: "var(--warning)" },
};

// Pure formatting functions have been extracted to src/utils/dashboard.ts and src/utils/vaultLifecycle.ts

// ── Sub-components ────────────────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <Text
        role="caption"
        as="div"
        style={{
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </Text>
      <Text
        role="title"
        as="div"
        style={{
          color: accent ? "var(--accent)" : "var(--text)",
          fontWeight: 700,
        }}
      >
        {value}
      </Text>
      {sub && (
        <Text role="caption" as="div" style={{ color: "var(--muted)" }}>
          {sub}
        </Text>
      )}
    </div>
  );
}


function SectionHeader({
  title,
  action,
  to,
}: {
  title: string;
  action?: string;
  to?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "0.75rem",
      }}
    >
      <Text role="body" as="h2" style={{ margin: 0, fontWeight: 600 }}>
        {title}
      </Text>
      {action && to && (
        <Link to={to} style={{ color: "var(--accent)", fontSize: 13 }}>
          {action}
        </Link>
      )}
    </div>
  );
}

// ── At Risk Section ───────────────────────────────────────────────────────────
function AtRiskSection({ vaults }: { vaults: VaultPreview[] }) {
  const atRiskVaults = getAtRiskVaults(vaults);

  if (atRiskVaults.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: '1.75rem',
        background: 'var(--danger-transparent)',
        border: '1px solid var(--danger)',
        borderRadius: 'var(--radius)',
        padding: '1.25rem',
      }}
    >
      <SectionHeader title={`⚠️ At Risk (${atRiskVaults.length})`} />
      <Text
        role="caption"
        as="p"
        style={{ color: 'var(--danger)', margin: '0 0 1rem' }}
      >
        These vaults need immediate attention — their deadlines are approaching
        or critical.
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {atRiskVaults.map((v) => (
          <VaultCard
            key={v.id}
            id={v.id}
            name={v.name}
            amount={v.amount}
            currency={v.currency}
            status={v.status}
            deadline={v.deadline}
            progressPct={v.progressPct}
          />
        ))}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({
  activity = ACTIVITY,
  deadlines = DEADLINES,
}: {
  activity?: Activity[];
  deadlines?: Deadline[];
} = {}) {
  const [vaults, setVaults] = useState<VaultPreview[]>([]);
  const [fullVaults, setFullVaults] = useState<Vault[]>([]);
  const [vaultStatus, setVaultStatus] = useState<
    "loading" | "empty" | "data" | "error"
  >("loading");
  const [retryCount, setRetryCount] = useState(0);
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const currentRequest = requestId;
    setVaultStatus("loading");
    listVaults()
      .then((loaded) => {
        if (cancelled || currentRequest !== requestId) return;
        const safePreviews = toSafePreviews(loaded);
        setFullVaults(loaded);
        setVaults(safePreviews);
        setVaultStatus(safePreviews.length === 0 ? "empty" : "data");
      })
      .catch(() => {
        if (!cancelled && currentRequest === requestId) setVaultStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [retryCount, requestId]);

  const retryVaults = useCallback(() => {
    setRetryCount((c) => c + 1);
    setRequestId((r) => r + 1);
  }, []);

  const computedSummary = useMemo(
    () => dashboardUtils.computeDashboardSummary(fullVaults),
    [fullVaults],
  );
  const memoizedSummary = useMemo(
    () => dashboardUtils.formatSummary(computedSummary),
    [computedSummary],
  );
  const memoizedActivity = useMemo(
    () => dashboardUtils.processActivity(sanitizeActivity(activity)),
    [activity],
  );

  return (
    <div
      style={{
        maxWidth: "var(--container-wide)",
        margin: "0 auto",
        padding: "0 0 3rem",
      }}
    >
      {/* Welcome */}
      <div style={{ marginBottom: "1.75rem" }}>
        <Text role="title" as="h1" style={{ margin: "0 0 0.25rem" }}>
          Dashboard
        </Text>
        <Text role="body" as="p" style={{ color: "var(--muted)", margin: 0 }}>
          Your vault overview at a glance.
        </Text>
      </div>

      {/* ── Summary Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <SummaryCard
          label="Total Locked"
          value={memoizedSummary.totalLocked}
          sub="USDC"
          accent
        />
        <SummaryCard
          label="Active Vaults"
          value={memoizedSummary.activeVaults}
        />
        <SummaryCard
          label="Pending Milestones"
          value={memoizedSummary.pendingMilestones}
        />
        <SummaryCard
          label="Completion Rate"
          value={memoizedSummary.completionRate}
          sub="all time"
        />
      </div>

      {/* ── Quick Actions ── */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1.75rem",
        }}
      >
        <Link
          to="/vaults/create"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            padding: "0.6rem 1.25rem",
            borderRadius: "var(--radius)",
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          + Create Vault
        </Link>
        <Link
          to="/vaults"
          style={{
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "0.6rem 1.25rem",
            borderRadius: "var(--radius)",
            fontWeight: 500,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          View All Vaults
        </Link>
        <Link
          to="/verifier/queue"
          style={{
            background: "var(--surface)",
            color: "var(--warning)",
            border: "1px solid var(--warning)",
            padding: "0.6rem 1.25rem",
            borderRadius: "var(--radius)",
            fontWeight: 500,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Verify Milestone
        </Link>
      </div>

      {/* ── At Risk Vaults ── */}
      <AtRiskSection vaults={vaults} />

      {/* ── Main grid: vault list + sidebar ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,340px)",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* Left column */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {/* Vault Preview List */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "1.25rem",
            }}
          >
            <SectionHeader
              title="Active Vaults"
              action="View all →"
              to="/vaults"
            />
            {vaultStatus === "loading" && (
              <Text role="body" as="p" style={{ color: "var(--muted)" }}>
                Loading vaults…
              </Text>
            )}

            {vaultStatus === "error" && (
              <div
                style={{
                  textAlign: "center",
                  padding: "2.5rem 1rem",
                  color: "var(--muted)",
                }}
              >
                <Text role="body" as="p">
                  Failed to load vaults.
                </Text>
                <button onClick={retryVaults}>Retry</button>
              </div>
            )}

            {vaultStatus === "empty" && (
              <div
                style={{
                  textAlign: "center",
                  padding: "2.5rem 1rem",
                  color: "var(--muted)",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: "0.75rem" }}>🔒</div>
                <Text
                  role="body"
                  as="div"
                  style={{ fontWeight: 600, marginBottom: 4 }}
                >
                  No vaults yet
                </Text>
                <Text role="caption" as="div" style={{ marginBottom: "1rem" }}>
                  Create your first vault to start locking capital.
                </Text>
                <Link
                  to="/vaults/create"
                  style={{
                    background: "var(--accent)",
                    color: "var(--bg)",
                    padding: "0.5rem 1.25rem",
                    borderRadius: "var(--radius)",
                    fontWeight: 600,
                    fontSize: 13,
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  Create Vault
                </Link>
              </div>
            )}

            {vaultStatus === "data" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {vaults.map((v) => (
                  <VaultCard
                    key={v.id}
                    id={v.id}
                    name={v.name}
                    amount={v.amount}
                    currency={v.currency}
                    status={v.status}
                    deadline={v.deadline}
                    progressPct={v.progressPct}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "1.25rem",
            }}
          >
            <SectionHeader title="Recent Activity" />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {memoizedActivity.map((a) => {
                const cfg = ACTIVITY_CFG[a.type];
                return (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.5rem 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: "var(--bg)",
                        border: `1px solid var(--border)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: cfg.color,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {cfg.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text role="caption" as="div" style={{ fontWeight: 600 }}>
                        {cfg.label} ·{" "}
                        <span
                          style={{ color: "var(--muted)", fontWeight: 400 }}
                        >
                          {a.vault}
                        </span>
                      </Text>
                      {a.formattedAmount != null && (
                        <Text
                          role="caption"
                          as="div"
                          style={{ color: "var(--muted)" }}
                        >
                          {a.formattedAmount}
                        </Text>
                      )}
                    </div>
                    <Text
                      role="caption"
                      as="span"
                      style={{ color: "var(--muted)", whiteSpace: "nowrap" }}
                    >
                      {a.relativeTime}
                    </Text>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <UpcomingDeadlines deadlines={deadlines} />

          {/* Success Rate Chart (sparkline bars) */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "1.25rem",
            }}
          >
            <SectionHeader title="Success Rate" />
            <Text
              role="caption"
              as="div"
              style={{ color: "var(--muted)", marginBottom: "0.75rem" }}
            >
              Last 6 months
            </Text>
            <SuccessChart />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Success Rate Sparkline ────────────────────────────────────────────────────
// CHART_DATA lives in src/fixtures/dashboard.ts (imported at top of file).

function SuccessChart() {
  return (
    <div
      style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}
    >
      {CHART_DATA.map((d) => (
        <div
          key={d.month}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              width: "100%",
              height: `${d.rate * 0.64}px`,
              background: "var(--accent-transparent)",
              border: "1px solid var(--accent)",
              borderRadius: 3,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: `${d.rate}%`,
                background: "var(--accent)",
                borderRadius: 2,
                opacity: 0.7,
              }}
            />
          </div>
          <Text
            role="caption"
            as="span"
            style={{ color: "var(--muted)", fontSize: 10 }}
          >
            {d.month}
          </Text>
        </div>
      ))}
    </div>
  );
}
