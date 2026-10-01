/**
 * Canonical runtime-agnostic logger shared by the design-system and app.
 *
 * Detects production via import.meta.env.MODE (Vite) or
 * process.env.NODE_ENV (Node), so it works in both runtimes from a
 * single source of truth.
 *
 * The app re-exports this module from src/utils/logger.ts rather than
 * maintaining its own copy. When changing behaviour here, confirm both
 * packages' tests still pass before merging.
 */

const isProd = (): boolean => {
  // Vite: import.meta.env.MODE
  if (
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.MODE === 'production'
  ) {
    return true;
  }

  // Node: process.env.NODE_ENV (accessed via globalThis to avoid requiring
  // @types/node in consumers that don't otherwise depend on Node typings)
  const nodeProcess = (globalThis as any).process;
  if (
    typeof nodeProcess !== 'undefined' &&
    nodeProcess.env?.NODE_ENV === 'production'
  ) {
    return true;
  }

  return false;
};

/* eslint-disable no-console */
export const logger = {
  debug: (...args: unknown[]): void => {
    if (!isProd()) console.debug(...args);
  },
  info: (...args: unknown[]): void => {
    if (!isProd()) console.info(...args);
  },
  warn: (...args: unknown[]): void => {
    if (!isProd()) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
/* eslint-enable no-console */
