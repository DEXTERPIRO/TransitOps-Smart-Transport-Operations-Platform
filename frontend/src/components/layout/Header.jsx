import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, Search, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { authApi } from '../../api';
import toast from 'react-hot-toast';

const PAGE_TITLES = {
  '/dashboard':   'Dashboard',
  '/vehicles':    'Vehicles',
  '/drivers':     'Drivers',
  '/trips':       'Trips',
  '/maintenance': 'Maintenance',
  '/fuel':        'Fuel Logs',
  '/expenses':    'Expenses',
  '/reports':     'Reports',
  '/ai':          'AI Assistant',
  '/settings':    'Settings',
};

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearAuth, user } = useAuthStore();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const [showDropdown, setShowDropdown] = useState(false);

  const pageTitle = PAGE_TITLES[location.pathname] || 'TransitOps';

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (_) {}
    clearAuth();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <header className="h-16 bg-dark-900 border-b border-dark-800 flex items-center px-4 gap-4 flex-shrink-0">
      <button onClick={toggleSidebar} className="btn-ghost p-2 md:hidden">
        <Menu size={20} />
      </button>

      <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>

      <div className="ml-auto flex items-center gap-2">
        {/* Search (decorative — can be wired up) */}
        <div className="relative hidden md:flex items-center">
          <Search size={15} className="absolute left-3 text-dark-500" />
          <input
            className="input pl-9 w-56 h-9 text-sm"
            placeholder="Search…"
            readOnly
          />
        </div>

        {/* Notifications */}
        <button className="btn-ghost p-2 relative">
          <Bell size={19} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-dark-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-dark-200 hidden md:block">{user?.name}</span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up">
              <div className="px-3 py-2 border-b border-dark-700">
                <p className="text-xs text-dark-400">Signed in as</p>
                <p className="text-sm font-medium text-white truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setShowDropdown(false); navigate('/settings'); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-200 hover:bg-dark-700 transition-colors"
              >
                <User size={15} /> Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
