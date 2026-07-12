import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import Fuel from './pages/Fuel';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AIAssistant from './pages/AIAssistant';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="vehicles"    element={<Vehicles />} />
          <Route path="drivers"     element={<Drivers />} />
          <Route path="trips"       element={<Trips />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="fuel"        element={<Fuel />} />
          <Route path="expenses"    element={<Expenses />} />
          <Route path="reports"     element={<Reports />} />
          <Route path="ai"          element={<AIAssistant />} />
          <Route path="settings"    element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
