import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../api';
import { setToken } from '../api/client';
import toast from 'react-hot-toast';
import { Truck, Eye, EyeOff, AlertCircle } from 'lucide-react';

const DEMO_USERS = [
  { label: 'Fleet Manager', email: 'fleet@transitops.com',
    password: 'Fleet@123', color: 'text-orange-400' },
  { label: 'Dispatcher', email: 'dispatch@transitops.com',
    password: 'Dispatch@123', color: 'text-blue-400' },
  { label: 'Safety Officer', email: 'safety@transitops.com',
    password: 'Safety@123', color: 'text-green-400' },
  { label: 'Financial Analyst', email: 'finance@transitops.com',
    password: 'Finance@123', color: 'text-purple-400' },
];

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { setAuth, user } = useAuthStore();
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
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between
                      p-12 bg-gradient-to-br from-slate-900 to-slate-950
                      border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl
                          flex items-center justify-center">
            <Truck size={20} className="text-white" />
          </div>
          <span className="text-white text-xl font-bold font-mono
                           tracking-wider">TRANSITOPS</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Smart Transport<br />
            <span className="text-orange-500">Operations Platform</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
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
                className="bg-slate-800/50 border border-slate-700
                           rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-orange-400
                                font-mono">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-sm">
          © 2024 TransitOps. Smart Fleet Management.
        </p>
      </div>

      {/* Right panel - login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-orange-500 rounded-lg
                            flex items-center justify-center">
              <Truck size={16} className="text-white" />
            </div>
            <span className="text-white text-lg font-bold font-mono">
              TRANSITOPS
            </span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Sign in to your account
          </h2>
          <p className="text-slate-400 mb-8">
            Enter your credentials to continue
          </p>

          {/* Error banner */}
          {errors.submit && (
            <div className="flex items-center gap-2 bg-red-500/10
                            border border-red-500/30 text-red-400
                            rounded-xl px-4 py-3 mb-6 text-sm">
              <AlertCircle size={16} />
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium
                                text-slate-300 mb-1.5">
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
                className={`w-full bg-slate-800 border rounded-xl px-4 py-3
                           text-white placeholder-slate-500 font-mono text-sm
                           focus:outline-none focus:ring-2 transition
                           ${errors.email
                             ? 'border-red-500 focus:ring-red-500/30'
                             : 'border-slate-700 focus:ring-orange-500/30 focus:border-orange-500'}`}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium
                                text-slate-300 mb-1.5">
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
                  className={`w-full bg-slate-800 border rounded-xl px-4 py-3
                             pr-12 text-white placeholder-slate-500 font-mono
                             text-sm focus:outline-none focus:ring-2 transition
                             ${errors.password
                               ? 'border-red-500 focus:ring-red-500/30'
                               : 'border-slate-700 focus:ring-orange-500/30 focus:border-orange-500'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600
                         active:bg-orange-700 text-white font-semibold
                         py-3 rounded-xl transition-all disabled:opacity-50
                         flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30
                                  border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700
                          rounded-xl">
            <p className="text-xs text-slate-400 font-medium mb-3 uppercase
                          tracking-wider">
              Demo Accounts — Click to fill
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map(u => (
                <button
                  key={u.email}
                  onClick={() => fillDemo(u)}
                  className="text-left p-2 rounded-lg hover:bg-slate-700
                             transition text-xs"
                >
                  <div className={`font-medium ${u.color}`}>{u.label}</div>
                  <div className="text-slate-500 font-mono truncate">
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
