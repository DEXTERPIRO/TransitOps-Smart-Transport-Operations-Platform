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
  const [rememberMe, setRememberMe] = useState(false);
  const { setAuth, user, theme } = useAuthStore();

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
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
      console.error("LOGIN SUBMIT ERROR:", err);
      toast.error(err.message || err.error || 'Login failed. Check your credentials.');
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

        <p style={{ color: '#334155', fontSize: '11px' }}>
          transitops © 2026 — Smart Fleet Platform
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
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
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
                  autoComplete="new-password"
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

            <div style={{ display: 'flex', alignItems: 'center', 
                          justifyContent: 'space-between', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', 
                              gap: '8px', fontSize: '13px', color: '#94a3b8',
                              cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#22c55e', width: '14px', height: '14px' }}
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(form.email);
                  setForgotOtp('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setForgotStep(1);
                  setForgotOpen(true);
                }}
                style={{ background: 'none', border: 'none', color: '#22c55e',
                         fontSize: '13px', cursor: 'pointer' }}
              >
                Forgot password?
              </button>
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
                  title={`Password: ${u.password}`}
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

          <div style={{
            marginTop: '20px',
            padding: '14px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontSize: '12px',
            color: '#64748b'
          }}>
            <p style={{ fontWeight: '700', color: '#94a3b8', 
                        marginBottom: '8px', fontSize: '11px',
                        letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Role-based access:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, 
                         display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#f97316', fontWeight: '600', 
                               minWidth: '130px' }}>Fleet Manager</span>
                <span>→ Fleet, Maintenance</span>
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#3b82f6', fontWeight: '600',
                               minWidth: '130px' }}>Dispatcher</span>
                <span>→ Dashboard, Trips</span>
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#22c55e', fontWeight: '600',
                               minWidth: '130px' }}>Safety Officer</span>
                <span>→ Drivers, Compliance</span>
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#a855f7', fontWeight: '600',
                               minWidth: '130px' }}>Financial Analyst</span>
                <span>→ Fuel, Expenses, Analytics</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--foreground)] border border-[var(--border-color)] rounded-3xl p-8 shadow-[var(--shadow-floating)] relative">
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="absolute right-4 top-4 text-text-sub hover:text-text-main font-bold font-mono text-lg"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold font-mono text-text-main mb-2">
              Reset Password
            </h3>
            <p className="text-xs font-mono text-text-sub mb-6 uppercase tracking-wider">
              Step {forgotStep} of 3
            </p>

            {forgotStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider font-mono text-text-sub mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@transitops.com"
                    className="input border border-[var(--border-color)]"
                  />
                </div>
                <button
                  type="button"
                  disabled={forgotLoading}
                  onClick={async () => {
                    if (!forgotEmail.trim()) {
                      toast.error('Email is required');
                      return;
                    }
                    setForgotLoading(true);
                    try {
                      await authAPI.sendOTP({ email: forgotEmail });
                      toast.success('OTP code sent to your email.');
                      setForgotStep(2);
                    } catch (err) {
                      toast.error(err.message || err.error || 'Failed to send OTP.');
                    } finally {
                      setForgotLoading(false);
                    }
                  }}
                  className="btn-primary w-full py-3"
                >
                  {forgotLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            )}

            {forgotStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-text-sub font-mono">
                  Enter the 6-digit verification code sent to {forgotEmail}
                </p>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider font-mono text-text-sub mb-1.5">
                    Verification OTP
                  </label>
                  <input
                    type="text"
                    value={forgotOtp}
                    onChange={e => setForgotOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="input border border-[var(--border-color)] tracking-[6px] text-center font-bold"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="btn border border-[var(--border-color)] flex-1 py-3 text-text-main font-mono text-xs uppercase"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={forgotLoading}
                    onClick={async () => {
                      if (forgotOtp.trim().length !== 6) {
                        toast.error('Enter valid 6-digit OTP code');
                        return;
                      }
                      setForgotLoading(true);
                      try {
                        await authAPI.verifyOTP({ email: forgotEmail, otp: forgotOtp });
                        toast.success('OTP code verified successfully.');
                        setForgotStep(3);
                      } catch (err) {
                        toast.error(err.message || err.error || 'Invalid OTP code.');
                      } finally {
                        setForgotLoading(false);
                      }
                    }}
                    className="btn-primary flex-1 py-3"
                  >
                    {forgotLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </div>
            )}

            {forgotStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider font-mono text-text-sub mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input border border-[var(--border-color)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider font-mono text-text-sub mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input border border-[var(--border-color)]"
                  />
                </div>
                <button
                  type="button"
                  disabled={forgotLoading}
                  onClick={async () => {
                    if (newPassword.length < 6) {
                      toast.error('Password must be at least 6 characters');
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      toast.error('Passwords do not match');
                      return;
                    }
                    setForgotLoading(true);
                    try {
                      await authAPI.resetPasswordOTP({
                        email: forgotEmail,
                        otp: forgotOtp,
                        newPassword
                      });
                      toast.success('Password reset successfully. You can now log in.');
                      setForgotOpen(false);
                    } catch (err) {
                      toast.error(err.message || err.error || 'Failed to reset password.');
                    } finally {
                      setForgotLoading(false);
                    }
                  }}
                  className="btn-primary w-full py-3"
                >
                  {forgotLoading ? 'Saving...' : 'Reset Password'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
