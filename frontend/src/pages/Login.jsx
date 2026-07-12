import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      setAuth(data.accessToken, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email, password) => setForm({ email, password });

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-dark-900 via-dark-900 to-dark-950 p-12 border-r border-dark-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <Bus size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">TransitOps</span>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Smart Fleet<br />
            <span className="text-gradient">Management</span><br />
            Platform
          </h2>
          <p className="text-dark-400 text-lg leading-relaxed">
            Real-time vehicle tracking, driver management, expense analytics,
            and AI-powered insights — all in one platform.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Vehicles Tracked', value: '500+' },
            { label: 'Routes Managed', value: '120+' },
            { label: 'Daily Trips', value: '1,200+' },
            { label: 'Cost Savings', value: '35%' },
          ].map((stat) => (
            <div key={stat.label} className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <p className="text-2xl font-bold text-brand-400">{stat.value}</p>
              <p className="text-sm text-dark-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <Bus size={19} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">TransitOps</span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Sign In</h1>
          <p className="text-dark-400 mb-8">Welcome back. Enter your credentials to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Email address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
              id="login-btn"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <p className="text-xs text-dark-500 uppercase tracking-wider mb-3 text-center">
              Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Fleet Manager',  email: 'fleet@transitops.com',    pass: 'Fleet@123' },
                { label: 'Dispatcher',     email: 'dispatch@transitops.com', pass: 'Dispatch@123' },
                { label: 'Safety Officer', email: 'safety@transitops.com',   pass: 'Safety@123' },
                { label: 'Finance',        email: 'finance@transitops.com',  pass: 'Finance@123' },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc.email, acc.pass)}
                  className="text-left p-2.5 rounded-lg border border-dark-700 hover:border-brand-500/50 
                             hover:bg-brand-500/5 transition-all"
                >
                  <p className="text-xs font-medium text-dark-200">{acc.label}</p>
                  <p className="text-xs text-dark-500 truncate">{acc.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
