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

// Wrap a route's page element in a per-route ErrorBoundary so that an
// unhandled render error is scoped to that page's slot in <main>. The header,
// nav, and mobile drawer (rendered by Layout outside of <main>) remain mounted
// and navigable when a single page crashes. Layout also provides a secondary
// ErrorBoundary around its <main> content as a backstop.
function RouteErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}

export default function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <AppConfigProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<RouteErrorBoundary><Home /></RouteErrorBoundary>} />
                <Route path="/dashboard" element={<RouteErrorBoundary><Dashboard /></RouteErrorBoundary>} />
                <Route path="/vaults" element={<RouteErrorBoundary><Vaults /></RouteErrorBoundary>} />
                <Route path="/vaults/create" element={<RouteErrorBoundary><RequireWallet><CreateVault /></RequireWallet></RouteErrorBoundary>} />
                <Route path="/vaults/:id" element={<RouteErrorBoundary><RequireWallet><VaultDetail /></RequireWallet></RouteErrorBoundary>} />
                <Route path="/vaults/:id/transactions" element={<RouteErrorBoundary><VaultTransactions /></RouteErrorBoundary>} />
                <Route path="/transactions" element={<RouteErrorBoundary><VaultTransactions /></RouteErrorBoundary>} />
                <Route path="/verifier" element={<RouteErrorBoundary><VerifierDashboard /></RouteErrorBoundary>} />
                <Route path="/verifier/queue" element={<RouteErrorBoundary><RequireWallet><PendingValidations /></RequireWallet></RouteErrorBoundary>} />
                <Route path="/verifier/queue/:vaultId" element={<RouteErrorBoundary><RequireWallet><ValidationDetail /></RequireWallet></RouteErrorBoundary>} />
                <Route path="/verifier/history" element={<RouteErrorBoundary><ValidationHistory /></RouteErrorBoundary>} />
                <Route path="/help" element={<RouteErrorBoundary><HelpCenter /></RouteErrorBoundary>} />
                <Route path="/help/search" element={<RouteErrorBoundary><HelpCenter /></RouteErrorBoundary>} />
                <Route
                  path="/analytics"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={PageFallback}>
                        <Analytics />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={PageFallback}>
                        <Notification />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="/notifications/settings"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={PageFallback}>
                        <NotificationSettings />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
                <Route path="*" element={<RouteErrorBoundary><NotFound /></RouteErrorBoundary>} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </AppConfigProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}
