import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '../../store/uiStore';

export default function Layout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950">
      <Sidebar />
      <div
        className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
