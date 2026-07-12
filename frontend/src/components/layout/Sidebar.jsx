import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, MapPin, Wrench,
  Fuel, CreditCard, BarChart3, Bot, Settings,
  ChevronLeft, Bus
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vehicles',    icon: Truck,            label: 'Vehicles' },
  { to: '/drivers',     icon: Users,            label: 'Drivers' },
  { to: '/trips',       icon: MapPin,           label: 'Trips' },
  { to: '/maintenance', icon: Wrench,           label: 'Maintenance' },
  { to: '/fuel',        icon: Fuel,             label: 'Fuel Logs' },
  { to: '/expenses',    icon: CreditCard,       label: 'Expenses' },
  { to: '/reports',     icon: BarChart3,        label: 'Reports' },
  { to: '/ai',          icon: Bot,              label: 'AI Assistant' },
  { to: '/settings',    icon: Settings,         label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();

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
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
               transition-all duration-150 group
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
              <p className="text-xs text-dark-400 truncate">{user.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
