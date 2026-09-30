import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'
import { AppConfigProvider } from './context/AppConfigContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import RequireWallet from './components/RequireWallet'
import Skeleton from './components/Skeleton'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Vaults from './pages/Vaults'
import CreateVault from './pages/CreateVault'
import VaultDetail from './pages/VaultDetail'
import VaultTransactions from './pages/VaultTransactions'
import VerifierDashboard from './pages/VerifierDashboard'
import PendingValidations from './pages/PendingValidations'
import ValidationDetail from './pages/ValidationDetail'
import ValidationHistory from './pages/ValidationHistory'
import HelpCenter from './pages/HelpCenter'
import NotFound from './pages/NotFound'

const Analytics = lazy(() => import('./pages/Analytics'))
const Notification = lazy(() => import('./pages/Notification'))
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'))

const PageFallback = <Skeleton className="w-full h-screen" />

/**
 * Route authorization invariant:
 * - Routes that mutate or expose wallet-scoped state MUST be wrapped in
 *   <RequireWallet /> so unauthenticated users cannot reach them.
 * - Routes that are read-only/public MUST NOT be wrapped, so they remain
 *   reachable without a connected wallet.
 * - Every protected route must render a deterministic fallback (never a
 *   blank screen) while authorization is being resolved.
 *
 * The helper below centralizes that contract so new routes cannot silently
 * bypass the guard by forgetting the wrapper.
 */
type ProtectedRouteProps = {
  children: ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <RequireWallet>{children}</RequireWallet>
}

/**
 * Lazy routes must be wrapped in Suspense with a deterministic fallback so
 * that a slow/failed chunk load cannot leave the app in an inconsistent
 * state (blank screen, stale route, or unhandled rejection).
 */
function LazyRoute({ children }: ProtectedRouteProps) {
  return <Suspense fallback={PageFallback}>{children}</Suspense>
}

/**
 * Route table invariants (regression coverage in src/App.test.tsx):
 * 1. Protected paths: /vaults/create, /vaults/:id, /verifier/queue,
 *    /verifier/queue/:vaultId. These require a connected wallet.
 * 2. Public paths: /, /dashboard, /vaults, /vaults/:id/transactions,
 *    /transactions, /verifier, /verifier/history, /help, /help/search.
 * 3. Lazy paths: /analytics, /notifications, /notifications/settings.
 * 4. Unknown paths fall through to NotFound (deterministic 404).
 * 5. Route order matters: more specific paths must be declared before
 *    wildcard/param routes that could shadow them.
 */
const PROTECTED_PATHS = [
  '/vaults/create',
  '/vaults/:id',
  '/verifier/queue',
  '/verifier/queue/:vaultId',
] as const

export default function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <AppConfigProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/vaults" element={<Vaults />} />
                  <Route path="/vaults/create" element={<ProtectedRoute><CreateVault /></ProtectedRoute>} />
                  <Route path="/vaults/:id" element={<ProtectedRoute><VaultDetail /></ProtectedRoute>} />
                  <Route path="/vaults/:id/transactions" element={<VaultTransactions />} />
                  <Route path="/transactions" element={<VaultTransactions />} />
                  <Route path="/verifier" element={<VerifierDashboard />} />
                  <Route path="/verifier/queue" element={<ProtectedRoute><PendingValidations /></ProtectedRoute>} />
                  <Route path="/verifier/queue/:vaultId" element={<ProtectedRoute><ValidationDetail /></ProtectedRoute>} />
                  <Route path="/verifier/history" element={<ValidationHistory />} />
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/help/search" element={<HelpCenter />} />
                  <Route
                    path="/analytics"
                    element={
                      <LazyRoute>
                        <Analytics />
                      </LazyRoute>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <LazyRoute>
                        <Notification />
                      </LazyRoute>
                    }
                  />
                  <Route
                    path="/notifications/settings"
                    element={
                      <LazyRoute>
                        <NotificationSettings />
                      </LazyRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </ErrorBoundary>
          </BrowserRouter>
        </AppConfigProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}

export { PROTECTED_PATHS }
export type { ProtectedRouteProps }
