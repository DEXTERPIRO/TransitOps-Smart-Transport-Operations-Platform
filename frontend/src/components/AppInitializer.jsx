import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePermissionsStore } from '../store/permissionsStore';
import { useSocket } from '../hooks/useSocket';
import { setToken } from '../api/client';
import Logo from './ui/Logo';

export default function AppInitializer({ children }) {
  const [ready, setReady] = useState(false);
  const { user, setAuth, logout } = useAuthStore();
  const { fetchPermissions, setPermissions } = usePermissionsStore();

  // Initialize the global socket singleton (useState inside useSocket triggers re-render when ready)
  const socket = useSocket();

  // ── Real-time permission updates via WebSocket ─────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = (updatedPermissions) => {
      setPermissions(updatedPermissions);
    };
    socket.on('permissions:updated', handler);
    return () => socket.off('permissions:updated', handler);
  }, [socket, setPermissions]);

  // ── Auth refresh + permissions load (sequential, not racing) ──────────
  useEffect(() => {
    const init = async () => {
      if (user) {
        try {
          const res = await fetch(
            'http://localhost:5000/api/auth/refresh',
            { method: 'POST', credentials: 'include' }
          );
          if (res.ok) {
            const data = await res.json();
            setToken(data.accessToken);   // token ready in axios
            setAuth(user, data.accessToken);
          } else {
            logout();
            setReady(true);
            return;
          }
        } catch {
          // Network error - keep user logged in, try fetching with existing token
        }

        // ← Fetch permissions AFTER token is set (no race condition)
        await fetchPermissions();
      }
      setReady(true);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-fetch when tab regains focus (catches missed socket events) ─────
  useEffect(() => {
    const handleFocus = () => {
      if (user) fetchPermissions();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, fetchPermissions]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background textures */}
        <div className="absolute inset-0 scanlines opacity-35 pointer-events-none" />
        <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none" />

        {/* Panel wrapper */}
        <div className="card max-w-xs w-full flex flex-col items-center justify-center p-8 relative z-10 text-center">
          <div className="w-16 h-16 rounded-full bg-recessed border border-b-shadow/30 flex items-center justify-center mb-4 shadow-[var(--shadow-recessed)] relative">
            <Logo size={32} className="animate-pulse" />
            {/* Spinning ring outer */}
            <div className="absolute -inset-0.5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>

          <div className="text-text-main text-lg font-bold font-mono tracking-widest uppercase">
            TRANSITOPS
          </div>
          <div className="text-text-sub font-mono uppercase tracking-wider text-[9px] font-bold mt-2">
            Loading Platform...
          </div>

          {/* Dots Indicator */}
          <div className="flex gap-2 mt-5">
            {[0, 150, 300].map(delay => (
              <div
                key={delay}
                className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce shadow-[var(--shadow-glow)]"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return children;
}
