import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
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

function RootContainer() {
  const { theme } = useAuthStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
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
      <Outlet />
    </AppInitializer>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootContainer />,
    children: [
      { path: 'login', element: <Login /> },
      {
        path: '',
        element: <Guard><AppLayout /></Guard>,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'vehicles', element: <VehiclesPage /> },
          { path: 'drivers', element: <DriversPage /> },
          { path: 'trips', element: <TripsPage /> },
          { path: 'maintenance', element: <MaintenancePage /> },
          { path: 'fuel', element: <FuelExpensesPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ]
      },
      { path: '*', element: <Navigate to="/dashboard" replace /> }
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
