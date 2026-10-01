/** Vaults with <= 24 h remaining are classified as critical. */
export const URGENCY_CRITICAL_MS = 24 * 60 * 60 * 1000;
/** Vaults with > 24 h and <= 7 d remaining are classified as soon. */
export const URGENCY_SOON_MS = 7 * 24 * 60 * 60 * 1000;

export type UrgencyTier = 'safe' | 'soon' | 'critical' | 'expired';

/** Returns urgency tier based on time remaining. Invalid deadlines return 'safe'. */
export function deadlineUrgency(deadline: string, now: Date | number = Date.now()): UrgencyTier {
  const deadlineMs = new Date(deadline).getTime();
  const nowMs = typeof now === 'number' ? now : now.getTime();

  if (Number.isNaN(deadlineMs)) return 'safe';

  const msRemaining = deadlineMs - nowMs;
  if (msRemaining <= 0) return 'expired';
  if (msRemaining <= URGENCY_CRITICAL_MS) return 'critical';
  if (msRemaining <= URGENCY_SOON_MS) return 'soon';
  return 'safe';
}
