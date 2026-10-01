/**
 * singleFlight.ts
 *
 * Prevents replay of a sensitive async operation: while one invocation is
 * in flight, concurrent callers receive the SAME promise instead of firing
 * the underlying operation again. This is the boundary guard against
 * double-submits of irreversible vault actions (validate / cancel), even if
 * the UI (or a hostile script) calls the seam more than once in a tick.
 */

export interface SingleFlightRunner<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult>;
  isPending: () => boolean;
}

/**
 * Wraps an async runner so overlapping calls are coalesced into one execution.
 * After the promise settles (resolve or reject) the runner becomes available
 * again, so a legitimate later action still executes.
 */
export function createSingleFlightRunner<TArgs extends unknown[], TResult>(
  runner: (...args: TArgs) => Promise<TResult>,
): SingleFlightRunner<TArgs, TResult> {
  let inflight: Promise<TResult> | null = null;

  const run = (...args: TArgs): Promise<TResult> => {
    if (inflight) {
      return inflight;
    }
    inflight = Promise.resolve()
      .then(() => runner(...args))
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  return { run, isPending: () => inflight !== null };
}