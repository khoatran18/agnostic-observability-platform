import { useState } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ConfigPage } from './pages/ConfigPage';
import { AlertHistoryPage } from './pages/AlertHistoryPage';
import { ToastContainer } from './components/shared/Toast';
import { useAlertHistory } from './hooks/useAlertHistory';
import './index.css';

type Page = 'dashboard' | 'config' | 'history';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const { toasts, dismissToast } = useAlertHistory();

  return (
    <>
      {/* Floating Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Sidebar */}
      <Sidebar activePage={page} onNavigate={p => setPage(p as Page)} />

      {/* Main content area */}
      <main className="main-content">
        {page === 'dashboard' && <DashboardPage />}
        {page === 'config'    && <ConfigPage />}
        {page === 'history'   && <AlertHistoryPage />}
      </main>
    </>
  );
}
