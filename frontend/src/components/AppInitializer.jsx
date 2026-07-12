import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { setToken } from '../api/client';
import Logo from './ui/Logo';

export default function AppInitializer({ children }) {
  const [ready, setReady] = useState(false);
  const { user, setAuth, logout } = useAuthStore();

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
            setToken(data.accessToken);
            setAuth(user, data.accessToken);
          } else {
            logout();
          }
        } catch {
          // Network error - keep user logged in
        }
      }
      setReady(true);
    };
    init();
  }, []);

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
