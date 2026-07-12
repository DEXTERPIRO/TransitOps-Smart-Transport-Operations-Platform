import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { setToken } from './api/client';
import AppInitializer from './components/AppInitializer';

// Pages
import Login from './pages/Login';
import DashboardPage from './pages/Dashboard';
import VehiclesPage from './pages/Vehicles';
import DriversPage from './pages/Drivers';
import TripsPage from './pages/Trips';
import MaintenancePage from './pages/Maintenance';
import FuelExpensesPage from './pages/FuelExpenses';
import ReportsPage from './pages/Reports';
import SettingsPage from './pages/Settings';
import AppLayout from './components/layout/AppLayout';

function Guard({ children }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { theme } = useAuthStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <BrowserRouter>
      <AppInitializer>
        {/* Global SVG Noise Overlay Layer */}
        <svg
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: theme === 'dark' ? 0.08 : 0.16, // 8% in dark mode, 16% in light mode
            mixBlendMode: theme === 'dark' ? 'overlay' : 'multiply'
          }}
          aria-hidden="true"
        >
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: theme === 'dark' ? '#1e293b' : '#fff',
              color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
              border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <Guard><AppLayout /></Guard>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="drivers" element={<DriversPage />} />
            <Route path="trips" element={<TripsPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="fuel" element={<FuelExpensesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppInitializer>
    </BrowserRouter>
  );
}
