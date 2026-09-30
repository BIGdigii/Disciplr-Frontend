import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import './index.css'
import { reportWebVitals } from './utils/reportWebVitals'

/**
 * Entry point invariants:
 * 1. The #root container must exist before mounting. If it is missing we fail fast
 *    with a non-sensitive diagnostic message rather than crashing with a
 *    confusing TypeError or silently doing nothing.
 * 2. Mounting must be idempotent: repeated calls (Hmr hot reload, double import)
 *    must not create a second root or lose the existing tree.
 * 3. Web vitals reporting must never break the app and must not leak sensitive
 *    data into the console.
 * 4. Failures in the root render must be surfaced and not swallowed.
 */

export interface MountOptions {
  /** Element to mount into. Defaults to document.getElementById('root'). */
  container?: HTMLElement | null
  /** Optional callback for web vitals. Defaults to a console reporter. */
  onWebVitals?: (callback: (metric: unknown) => void) => void
}

export interface MountResult {
  root: Root
  container: HTMLElement
}

let activeRoot: Root | null = null
let activeContainer: HTMLElement | null = null

/**
 * Resolve the root container. Throws a deterministic, diagnosable error when
 * the container is missing or is not an HTMLElement.
 */
export function resolveRootContainer(
  container?: HTMLElement | null,
  doc: Document = document,
): HTMLElement {
  const resolved = container ?? doc.getElementById('root')
  if (!resolved) {
    throw new Error('Root element #root not found')
  }
  if (!(resolved instanceof HTMLElement)) {
    throw new Error('Root container is not an HTMLElement')
  }
  return resolved

}

/**
 * Safe web-vitals reporter. Never throws and never logs the raw metric object
 * (console logging is limited to a stable label + value when available).
 */
export function createWebVitalsReporter(
  log: (message: string, value?: number) => void = (_message, _value) => {},
): (metric: unknown) => void {
  return (metric) => {
    try {
      const m = metric as { name?: unknown; value?: unknown } | null | undefined
      if (!m || typeof m !== 'object') return
      const name = typeof m.name === 'string' ? m.name : 'unknown'
      const value = typeof m.value === 'number' ? m.value : undefined
      log(`[Web Vitals] ${name}`, value)
    } catch {
      // Never allow observability to break the app.
    }
  }
}

/**
 * Mount the app. Idempotent: calling twice with the same container reuses the
 * existing root. Calling with a different container unmounts the previous root
 * first to avoid leaking a second React tree.
 */
export function mountApp(options: MountOptions = {}): MountResult {
  const container = resolveRootContainer(options.container)

  if (activeRoot && activeContainer === container) {
    // Already mounted into this container; nothing to do.
    return { root: activeRoot, container }
  }

  if (activeRoot && activeContainer !== container) {
    // Recycle the previous root to avoid leaking a second tree.
    try {
      activeRoot.unmount()
    } catch {
      // Unmount failures must not prevent the new mount.
    }
    activeRoot = null
    activeContainer = null
  }

  const root = createRoot(container)
  activeRoot = root
  activeContainer = container

  try {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (error) {
    // Roll back the active references so a retry can attempt a fresh mount.
    activeRoot = null
    activeContainer = null
    try {
      root.unmount()
    } catch {
      // ignore rollback failures
    }
    throw error
  }

  const onWebVitals = options.onWebVitals ?? reportWebVitals
  try {
    onWebVitals(createWebVitalsReporter())
  } catch {
    // Observability must never break the app.
  }

  return { root, container }
}

/** Test-only helper to reset module state between tests. */
export function __resetMountStateForTests(): void {
  if (activeRoot) {
    try {
      activeRoot.unmount()
    } catch {
      // ignore
    }
  }
  activeRoot = null
  activeContainer = null
}

/** Test-only accessor for the current active container. */
export function __getActiveContainerForTests(): HTMLElement | null {
  return activeContainer
}

// Auto-mount when executed in a browser environment with a #root element.
// Guarded so importing this module in a test or SSR environment does not throw.
if (typeof document !== 'undefined') {
  const autoRoot = document.getElementById('root')
  if (autoRoot) {
    mountApp({ container: autoRoot })
  } else {
    // Fail fast with a deterministic message when the container is missing.
    throw new Error('Root element #root not found')
  }
}
