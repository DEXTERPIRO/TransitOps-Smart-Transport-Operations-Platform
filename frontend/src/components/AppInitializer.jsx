import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { setToken } from '../api/client';

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
      <div className="min-h-screen bg-slate-950 flex flex-col
                      items-center justify-center">
        <div className="text-4xl mb-4 animate-pulse">🚛</div>
        <div className="text-white text-lg font-semibold font-mono">
          TRANSITOPS
        </div>
        <div className="text-slate-400 text-sm mt-2">
          Loading platform...
        </div>
        <div className="flex gap-2 mt-4">
          {[0, 150, 300].map(delay => (
            <div
              key={delay}
              className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return children;
}
