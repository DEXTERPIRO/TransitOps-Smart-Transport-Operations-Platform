import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../api';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Truck, Users, Route, Wrench,
  Fuel, BarChart3, Settings, LogOut, Sun, Moon,
  Menu, X, ChevronRight, Bell, Bot
} from 'lucide-react';
import AIChatbot from '../ui/AIChatbot';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',
    roles: ['FLEET_MANAGER','DISPATCHER','SAFETY_OFFICER','FINANCIAL_ANALYST'] },
  { to: '/vehicles', icon: Truck, label: 'Fleet',
    roles: ['FLEET_MANAGER','DISPATCHER'] },
  { to: '/drivers', icon: Users, label: 'Drivers',
    roles: ['FLEET_MANAGER','SAFETY_OFFICER','DISPATCHER'] },
  { to: '/trips', icon: Route, label: 'Trips',
    roles: ['FLEET_MANAGER','DISPATCHER'] },
  { to: '/maintenance', icon: Wrench, label: 'Maintenance',
    roles: ['FLEET_MANAGER'] },
  { to: '/fuel', icon: Fuel, label: 'Fuel & Expenses',
    roles: ['FLEET_MANAGER','FINANCIAL_ANALYST'] },
  { to: '/reports', icon: BarChart3, label: 'Reports',
    roles: ['FLEET_MANAGER','FINANCIAL_ANALYST'] },
  { to: '/settings', icon: Settings, label: 'Settings',
    roles: ['FLEET_MANAGER'] },
];

const ROLE_COLORS = {
  FLEET_MANAGER: 'bg-orange-500/20 text-orange-400',
  DISPATCHER: 'bg-blue-500/20 text-blue-400',
  SAFETY_OFFICER: 'bg-green-500/20 text-green-400',
  FINANCIAL_ANALYST: 'bg-purple-500/20 text-purple-400',
};

const ROLE_LABELS = {
  FLEET_MANAGER: 'Fleet Manager',
  DISPATCHER: 'Dispatcher',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
};

export default function AppLayout() {
  const { user, logout, theme, toggleTheme } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const allowedNav = NAV_ITEMS.filter(n => n.roles.includes(user?.role));

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {}
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex h-screen overflow-hidden
      ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 flex flex-col border-r transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isDark
          ? 'bg-slate-900 border-slate-800'
          : 'bg-white border-slate-200'}
      `}>

        {/* Logo */}
        <div className={`p-6 border-b flex items-center justify-between
          ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg
                              flex items-center justify-center">
                <Truck size={16} className="text-white" />
              </div>
              <span className="text-lg font-bold font-mono tracking-wider">
                TRANSITOPS
              </span>
            </div>
            <p className={`text-xs mt-0.5
              ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Smart Fleet Platform
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className={`px-4 py-3 border-b
          ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-500/20
                            border border-orange-500/30 flex items-center
                            justify-center text-orange-400 font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{user?.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${ROLE_COLORS[user?.role]}`}>
                {ROLE_LABELS[user?.role]}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allowedNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl
                text-sm font-medium transition-all group
                ${isActive
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : isDark
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
              `}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              <ChevronRight size={14} className="ml-auto opacity-0
                group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className={`p-4 border-t space-y-2
          ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            onClick={() => setShowAI(!showAI)}
            className={`w-full flex items-center gap-3 px-3 py-2.5
                        rounded-xl text-sm font-medium transition-all
                        ${isDark
                          ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Bot size={18} className="text-purple-400" />
            <span>AI Assistant</span>
          </button>
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-3 py-2.5
                        rounded-xl text-sm font-medium transition-all
                        ${isDark
                          ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5
                       rounded-xl text-sm font-medium text-red-400
                       hover:bg-red-500/10 transition-all"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className={`h-14 flex items-center justify-between
                            px-4 lg:px-6 border-b flex-shrink-0
          ${isDark
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200'}`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`lg:hidden p-2 rounded-lg
              ${isDark
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {/* Live status dot */}
            <div className="flex items-center gap-2 text-xs font-mono
                            text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full
                              animate-pulse" />
              LIVE
            </div>
            <div className={`h-6 w-px mx-2
              ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className={`text-xs font-mono
              ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {new Date().toLocaleDateString('en-IN',
                { weekday: 'short', day: '2-digit',
                  month: 'short', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* AI Chatbot */}
      {showAI && <AIChatbot onClose={() => setShowAI(false)} />}
    </div>
  );
}
