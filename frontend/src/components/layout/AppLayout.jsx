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
import Logo from '../ui/Logo';

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
  FLEET_MANAGER: 'bg-orange-500/10 text-orange-500 dark:text-orange-400 border border-orange-500/20',
  DISPATCHER: 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20',
  SAFETY_OFFICER: 'bg-green-500/10 text-green-500 dark:text-green-400 border border-green-500/20',
  FINANCIAL_ANALYST: 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20',
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
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)] transition-all">

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
        w-64 flex flex-col transition-transform duration-300
        bg-[var(--background)] bg-gradient-to-br from-[var(--background)] to-[var(--foreground)] border-r border-b-shadow/30 shadow-[var(--shadow-card)]
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="p-6 border-b border-b-shadow/30 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--muted)] border border-b-shadow/30 rounded-lg flex items-center justify-center shadow-[var(--shadow-recessed)]">
                <Logo size={16} />
              </div>
              <span className="text-base font-extrabold font-mono tracking-wider text-[var(--text-primary)]">
                TRANSITOPS
              </span>
            </div>
            <p className="text-[10px] uppercase font-mono font-bold tracking-wider mt-1 text-[var(--text-muted)]">
              Smart Fleet Platform
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-text-sub hover:text-text-main"
          >
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-b-shadow/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--background)] shadow-[var(--shadow-recessed)] flex items-center justify-center text-[var(--accent)] font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate text-[var(--text-primary)]">{user?.name}</p>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold
                ${ROLE_COLORS[user?.role]}`}>
                {ROLE_LABELS[user?.role]}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {allowedNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3.5 py-2.5 rounded-xl
                text-xs uppercase font-mono font-bold tracking-wider transition-all group
                ${isActive
                  ? 'bg-[var(--muted)] text-[var(--accent)] shadow-[var(--shadow-recessed)] translate-y-[1px]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--foreground)] hover:shadow-[var(--shadow-card)] hover:-translate-y-[1px]'
                }
              `}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
              <ChevronRight size={12} className="ml-auto opacity-0
                group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-b-shadow/30 space-y-3">
          {/* AI Assistant Button */}
          <button
            onClick={() => setShowAI(!showAI)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs uppercase font-mono font-bold tracking-wider transition-all
                       bg-[var(--background)] shadow-[var(--shadow-card)] active:shadow-[var(--shadow-pressed)] text-[var(--text-primary)] hover:text-purple-400"
          >
            <Bot size={16} className="text-purple-400" />
            <span>AI Assistant</span>
          </button>

          {/* Physical Rocker Theme Toggle Switch */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-60">
              THEME CHASSIS
            </span>
            <button
              onClick={toggleTheme}
              className="w-full h-8 rounded-full bg-[var(--muted)] shadow-[var(--shadow-recessed)] relative flex items-center p-1 focus:outline-none"
            >
              <div
                className={`w-6 h-6 rounded-full bg-[var(--background)] shadow-[var(--shadow-floating)] flex items-center justify-center transition-all duration-300 absolute
                  ${isDark ? 'left-[calc(100%-1.75rem)]' : 'left-1'}`}
              >
                {isDark ? <Moon size={12} className="text-purple-400" /> : <Sun size={12} className="text-amber-500" />}
              </div>
              <span className={`absolute text-[8px] font-mono font-bold uppercase tracking-wider pointer-events-none transition-all duration-300
                ${isDark ? 'left-3 text-[var(--text-muted)]' : 'right-3 text-[var(--text-muted)]'}`}>
                {isDark ? 'DARK MODE' : 'LIGHT MODE'}
              </span>
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs uppercase font-mono font-bold tracking-wider transition-all
                       bg-[var(--background)] shadow-[var(--shadow-card)] active:shadow-[var(--shadow-pressed)] text-danger hover:text-red-400"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-b-shadow/30 flex-shrink-0 bg-panel shadow-[var(--shadow-card)] z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--foreground)]"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {/* Live status dot */}
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-wider text-success">
              <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse shadow-[var(--shadow-glow-success)]" />
              LIVE
            </div>
            <div className="h-6 w-px mx-2 bg-b-shadow/30" />
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {new Date().toLocaleDateString('en-IN',
                { weekday: 'short', day: '2-digit',
                  month: 'short', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[var(--background)]">
          <Outlet />
        </main>
      </div>

      {/* AI Chatbot */}
      {showAI && <AIChatbot onClose={() => setShowAI(false)} />}
    </div>
  );
}
