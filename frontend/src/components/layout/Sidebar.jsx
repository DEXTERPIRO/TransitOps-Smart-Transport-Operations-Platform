import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, MapPin, Wrench,
  Fuel, CreditCard, BarChart3, Bot, Settings,
  ChevronLeft, Bus
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { usePermissionsStore } from '../../store/permissionsStore';
import { settingsAPI } from '../../api';

const ROUTE_MODULE = {
  '/dashboard':   'Dashboard',
  '/vehicles':    'Fleet/Vehicles',
  '/drivers':     'Drivers',
  '/trips':       'Trips',
  '/maintenance': 'Maintenance',
  '/fuel':        'Fuel/Expenses',
  '/expenses':    'Fuel/Expenses',
  '/reports':     'Reports',
  '/settings':    'Settings',
};

const STATIC = {
  FLEET_MANAGER:     { Dashboard:'Full Access','Fleet/Vehicles':'Full Access',Drivers:'Full Access',Trips:'Full Access',Maintenance:'Full Access','Fuel/Expenses':'Full Access',Reports:'Full Access',Settings:'Full Access' },
  DISPATCHER:        { Dashboard:'Read','Fleet/Vehicles':'Read',Drivers:'Read',Trips:'Full Access',Maintenance:'No Access','Fuel/Expenses':'No Access',Reports:'No Access',Settings:'No Access' },
  SAFETY_OFFICER:    { Dashboard:'Read','Fleet/Vehicles':'No Access',Drivers:'Full Access',Trips:'No Access',Maintenance:'No Access','Fuel/Expenses':'No Access',Reports:'No Access',Settings:'No Access' },
  FINANCIAL_ANALYST: { Dashboard:'Read','Fleet/Vehicles':'No Access',Drivers:'No Access',Trips:'No Access',Maintenance:'No Access','Fuel/Expenses':'Full Access',Reports:'Full Access',Settings:'No Access' },
};

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vehicles',    icon: Truck,            label: 'Fleet' },
  { to: '/drivers',     icon: Users,            label: 'Drivers' },
  { to: '/trips',       icon: MapPin,           label: 'Trips' },
  { to: '/maintenance', icon: Wrench,           label: 'Maintenance' },
  { to: '/fuel',        icon: Fuel,             label: 'Fuel & Expenses' },
  { to: '/reports',     icon: BarChart3,        label: 'Reports' },
  { to: '/ai',          icon: Bot,              label: 'AI Assistant' },
  { to: '/settings',    icon: Settings,         label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();

  // ── TWO sources of permissions ──────────────────────────────────────────
  // 1) Direct API fetch (guaranteed to work on mount)
  const [localPerms, setLocalPerms] = useState([]);
  // 2) Global store (for real-time socket updates)
  const storePerms = usePermissionsStore((s) => s.permissions);
  const storeLoaded = usePermissionsStore((s) => s.loaded);

  // Direct fetch — runs every time user changes (login/refresh)
  useEffect(() => {
    if (!user) return;
    settingsAPI.getPermissions()
      .then((data) => {
        console.log('[Sidebar] Fetched', data?.length, 'permissions directly');
        setLocalPerms(data || []);
      })
      .catch((err) => console.error('[Sidebar] Direct fetch failed:', err));
  }, [user]);

  // Use store data if available (real-time), otherwise use local fetch
  const permissions = (storeLoaded && storePerms.length > 0) ? storePerms : localPerms;

  const isVisible = (item) => {
    if (!user) return false;
    if (item.to === '/ai') return true;

    const mod = ROUTE_MODULE[item.to];
    if (!mod) return true;

    // Check from live permissions (DB data)
    if (permissions.length > 0) {
      const match = permissions.find((p) => p.role === user.role && p.module === mod);
      if (match) return match.accessLevel !== 'No Access';
    }

    // Fallback to static defaults
    return STATIC[user.role]?.[mod] !== 'No Access';
  };

  const visibleItems = navItems.filter(isVisible);

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-30 bg-dark-900 border-r border-dark-800
                  flex flex-col transition-all duration-300 ease-in-out
                  ${sidebarOpen ? 'w-64' : 'w-16'}`}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-dark-800 gap-3 flex-shrink-0">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Bus size={18} className="text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <span className="text-white font-bold text-base tracking-tight block">TransitOps</span>
            <span className="text-dark-400 text-xs">Fleet Management</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`ml-auto text-dark-400 hover:text-white transition-transform duration-300
                      ${!sidebarOpen ? 'rotate-180' : ''}`}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
               transition-all duration-150 group relative
               ${isActive
                 ? 'bg-brand-500/15 text-brand-400'
                 : 'text-dark-400 hover:text-white hover:bg-dark-800'
               }`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {sidebarOpen && <span className="truncate">{label}</span>}
            {!sidebarOpen && (
              <div className="absolute left-16 bg-dark-800 text-white text-xs px-2 py-1 rounded
                              opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap
                              transition-opacity border border-dark-700 z-50">
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {sidebarOpen && user && (
        <div className="p-3 border-t border-dark-800">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-dark-800">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center
                            text-brand-400 font-bold text-sm flex-shrink-0">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-dark-400 truncate">{user.role?.replaceAll('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
