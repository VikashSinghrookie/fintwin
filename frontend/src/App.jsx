import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import DigitalTwin from './pages/DigitalTwin';
import RiskAnalysis from './pages/RiskAnalysis';
import Portfolio from './pages/Portfolio';
import Notifications from './pages/Notifications';

export default function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text3)' }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <Toast />
      </>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'accounts': return <Accounts />;
      case 'transactions': return <Transactions />;
      case 'twin': return <DigitalTwin />;
      case 'risk': return <RiskAnalysis />;
      case 'portfolio': return <Portfolio />;
      case 'notifications': return <Notifications />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Topbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        currentPage={currentPage}
      />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      <div className="app-content">
        {renderPage()}
      </div>
      <Toast />
    </div>
  );
}
