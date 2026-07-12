import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../api';
import { setToken } from '../api/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Logo from '../components/ui/Logo';

const DEMO_USERS = [
  { label: 'Fleet Manager', email: 'fleet@transitops.com',
    password: 'Fleet@123', color: 'text-[var(--accent)]' },
  { label: 'Dispatcher', email: 'dispatch@transitops.com',
    password: 'Dispatch@123', color: 'text-blue-500 dark:text-blue-400' },
  { label: 'Safety Officer', email: 'safety@transitops.com',
    password: 'Safety@123', color: 'text-amber-500 dark:text-amber-400' },
  { label: 'Financial Analyst', email: 'finance@transitops.com',
    password: 'Finance@123', color: 'text-purple-500 dark:text-purple-400' },
];

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { setAuth, user, theme } = useAuthStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user]);

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6)
      e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authAPI.login(form);
      setToken(res.accessToken);
      setAuth(res.user, res.accessToken);
      toast.success(`Welcome back, ${res.user.name}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.error || 'Login failed. Check your credentials.');
      setErrors({ submit: err.error || 'Invalid credentials' });
    } finally { setLoading(false); }
  };

  const fillDemo = (user) => {
    setForm({ email: user.email, password: user.password });
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-chassis flex relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
      <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none" />

      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r relative z-10 bg-gradient-to-br from-[var(--background)] to-[var(--foreground)] border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center
            ${isDark
              ? 'bg-[#14161a] border border-black/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6),_inset_-2px_-2px_4px_rgba(255,255,255,0.05)]'
              : 'bg-[var(--background)] border border-[var(--border-color)] shadow-[var(--shadow-recessed)]'
            }`}>
            <Logo size={20} />
          </div>
          <span className={`text-xl font-bold font-mono tracking-wider
            ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
            TRANSITOPS
          </span>
        </div>

        <div>
          <h1 className={`text-4xl font-bold leading-tight mb-4 font-mono
            ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
            Smart Transport<br />
            <span className="text-[var(--accent)]">Operations Platform</span>
          </h1>
          <p className={`text-lg leading-relaxed font-mono
            ${isDark ? 'text-slate-300' : 'text-[var(--text-muted)]'}`}>
            Digitize your fleet operations — from vehicle dispatch
            and driver compliance to maintenance scheduling
            and financial analytics.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { label: 'Vehicles Tracked', value: '500+' },
              { label: 'Trips Managed', value: '10K+' },
              { label: 'Cost Saved', value: '30%' },
            ].map(stat => (
              <div key={stat.label}
                className={`rounded-xl p-4 text-center
                  ${isDark
                    ? 'bg-[#14161a] border border-black/40 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.6),_inset_-4px_-4px_8px_rgba(255,255,255,0.05)]'
                    : 'bg-[var(--background)] border border-[var(--border-color)] shadow-[var(--shadow-recessed)]'
                  }`}>
                <div className="text-2xl font-bold text-[var(--accent)] font-mono">{stat.value}</div>
                <div className={`text-[9px] font-bold font-mono uppercase tracking-wider mt-1
                  ${isDark ? 'text-slate-400' : 'text-[var(--text-muted)]'}`}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className={`font-mono text-xs uppercase tracking-wider
          ${isDark ? 'text-slate-500' : 'text-[var(--text-muted)] opacity-60'}`}>
          © 2026 TransitOps. Smart Fleet Management.
        </p>
      </div>

      {/* Right panel - login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10 bg-[var(--muted)]">
        <div className="w-full max-w-md bg-[var(--foreground)] p-8 rounded-3xl border border-[var(--border-color)] shadow-[var(--shadow-floating)]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-recessed border border-b-shadow/30 rounded-lg flex items-center justify-center shadow-[var(--shadow-recessed)]">
              <Logo size={16} />
            </div>
            <span className="text-text-main text-lg font-bold font-mono">
              TRANSITOPS
            </span>
          </div>

          <h2 className="text-2xl font-bold text-text-main mb-2 font-mono">
            Sign in to your account
          </h2>
          <p className="text-text-sub mb-8 font-mono text-sm uppercase tracking-wider">
            Enter your credentials to continue
          </p>

          {/* Error banner */}
          {errors.submit && (
            <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger rounded-xl px-4 py-3 mb-6 text-xs font-mono uppercase tracking-wider">
              <AlertCircle size={16} />
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider font-mono text-text-sub mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => {
                  setForm({ ...form, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                placeholder="you@transitops.com"
                className={`input border border-[var(--border-color)] ${errors.email ? 'ring-2 ring-danger border-danger/50' : ''}`}
              />
              {errors.email && (
                <p className="text-danger text-xs font-mono mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider font-mono text-text-sub mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => {
                    setForm({ ...form, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  placeholder="••••••••"
                  className={`input pr-12 border border-[var(--border-color)] ${errors.password ? 'ring-2 ring-danger border-danger/50' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub hover:text-text-main"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-danger text-xs font-mono mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 py-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-[var(--background)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-recessed)]">
            <p className="text-[9px] font-bold text-text-sub font-mono uppercase tracking-wider mb-3">
              Demo Accounts — Click to fill
            </p>
            <div className="grid grid-cols-2 gap-3">
              {DEMO_USERS.map(u => (
                <button
                  key={u.email}
                  onClick={() => fillDemo(u)}
                  className="text-left p-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-floating)] hover:border-[var(--accent)]/40 active:shadow-[var(--shadow-pressed)] hover:-translate-y-[1px] active:translate-y-[1px] transition-all duration-150 text-xs font-mono"
                >
                  <div className={`font-bold ${u.color}`}>{u.label}</div>
                  <div className="text-text-sub truncate text-[10px] mt-0.5 opacity-80">
                    {u.email}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
