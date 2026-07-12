import { useState, useEffect, useCallback } from 'react';
import { settingsAPI, healthAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import { PageHeader, SectionHeader, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon, Shield, Plus,
  Eye, EyeOff, AlertCircle, Sun, Moon, Lock
} from 'lucide-react';

const ROLES = ['FLEET_MANAGER','DISPATCHER','SAFETY_OFFICER','FINANCIAL_ANALYST'];

const ROLE_COLORS = {
  FLEET_MANAGER:     'bg-accent/10 text-accent border-accent/20',
  DISPATCHER:        'bg-blue-500/10 text-blue-500 border-blue-500/20',
  SAFETY_OFFICER:    'bg-success/10 text-success border-success/20',
  FINANCIAL_ANALYST: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const EMPTY_USER = { name: '', email: '', password: '', role: '', region: '' };

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs
                      font-medium border font-mono ${ROLE_COLORS[role] || 'bg-recessed text-text-sub border-b-shadow/25'}`}>
      {role?.replaceAll('_', ' ')}
    </span>
  );
}

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-danger shadow-[var(--shadow-glow-danger)]',   text: 'text-danger' };
  if (score <= 3) return { score, label: 'Medium',  color: 'bg-warning shadow-[var(--shadow-glow-warning)]', text: 'text-warning' };
  return            { score, label: 'Strong',  color: 'bg-success shadow-[var(--shadow-glow-success)]', text: 'text-success' };
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider font-mono text-text-sub mb-1.5">{label}</label>
      {children}
      {error && (
        <p className="text-danger text-xs font-mono mt-1 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

export default function Settings() {
  const { user, theme, toggleTheme } = useAuthStore();
  const isDark = theme === 'dark';
  const isManager = user?.role === 'FLEET_MANAGER';

  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]           = useState(EMPTY_USER);
  const [errors, setErrors]       = useState({});
  const [showPass, setShowPass]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [appName]                 = useState('TransitOps');
  const [isOnline, setIsOnline]   = useState(false);

  useEffect(() => {
    healthAPI.check()
      .then(res => setIsOnline(res?.status === 'ok'))
      .catch(() => setIsOnline(false));
  }, []);

  const pw = passwordStrength(form.password);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsAPI.getUsers();
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isManager) fetchUsers(); }, [fetchUsers, isManager]);

  // ── Access denied ────────────────────────────────────────────────────────
  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center">
          <Lock size={28} className="text-danger" />
        </div>
        <h2 className="text-xl font-bold text-text-main">Access Denied</h2>
        <p className="text-sm text-text-sub font-mono uppercase tracking-wider text-center">
          Only Fleet Managers can access the Settings page.
        </p>
      </div>
    );
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters';
    if (!form.role) e.role = 'Select a role';
    return e;
  };

  const handleCreateUser = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await settingsAPI.createUser(form);
      toast.success(`User ${form.name} created`);
      setModalOpen(false);
      setForm(EMPTY_USER);
      setErrors({});
      fetchUsers();
    } catch (err) {
      toast.error(err.error || 'Failed to create user');
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (u) => {
    try {
      await settingsAPI.updateUser(u.id, { isActive: !u.isActive });
      toast.success(`${u.name} ${u.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const inputCls = (err) =>
    `input ${err ? 'ring-2 ring-danger' : ''}`;

  const selectCls = (err) =>
    `select ${err ? 'ring-2 ring-danger' : ''}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Application configuration and user management"
        icon={SettingsIcon}
        action={
          <div className="flex items-center gap-2 text-[10px] px-3 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent font-bold font-mono uppercase tracking-wider">
            <Shield size={12} /> Fleet Manager Only
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: General Settings ─────────────────────────────────── */}
        <div className="rounded-2xl bg-panel shadow-[var(--shadow-card)] p-5 border border-[var(--border-color)] space-y-5">
          <SectionHeader icon={SettingsIcon} title="General" />

          {/* App name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider font-mono text-text-sub mb-1.5">
              Application Name
            </label>
            <div className="px-3 py-2.5 rounded-xl border border-b-shadow/30 bg-recessed text-sm font-mono font-bold text-accent shadow-[var(--shadow-recessed)]">
              {appName}
            </div>
          </div>

          {/* Theme toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider font-mono text-text-sub mb-3">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Dark option */}
              <button
                onClick={() => !isDark && toggleTheme()}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition text-xs font-mono font-bold uppercase tracking-wider
                  ${isDark
                    ? 'bg-recessed border-accent text-accent shadow-[var(--shadow-recessed)]'
                    : 'bg-chassis border-b-shadow/35 text-text-sub hover:bg-recessed'}`}
              >
                <div className="w-full h-10 rounded-lg bg-recessed border border-b-shadow/35 flex items-center justify-center">
                  <Moon size={14} className={isDark ? 'text-accent' : 'text-text-sub'} />
                </div>
                Dark Mode
                {isDark && <span className="text-[10px] text-accent">● Active</span>}
              </button>
              {/* Light option */}
              <button
                onClick={() => isDark && toggleTheme()}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition text-xs font-mono font-bold uppercase tracking-wider
                  ${!isDark
                    ? 'bg-recessed border-accent text-accent shadow-[var(--shadow-recessed)]'
                    : 'bg-chassis border-b-shadow/35 text-text-sub hover:bg-recessed'}`}
              >
                <div className="w-full h-10 rounded-lg bg-recessed border border-b-shadow/35 flex items-center justify-center">
                  <Sun size={14} className={!isDark ? 'text-accent' : 'text-text-sub'} />
                </div>
                Light Mode
                {!isDark && <span className="text-[10px] text-accent">● Active</span>}
              </button>
            </div>
          </div>

          {/* Version info */}
          <div className="text-xs space-y-1 pt-2 border-t border-b-shadow/20 text-text-sub font-mono uppercase tracking-wider text-[9px] font-bold">
            <div className="flex justify-between">
              <span>Version</span>
              <span>v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Backend</span>
              <span className={isOnline ? 'text-success' : 'text-danger'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>AI</span>
              <span className="text-success">Groq LLaMA</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: RBAC User Table ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            icon={Shield}
            title="User Management"
            badge={users.length}
            action={
              <button
                onClick={() => { setForm(EMPTY_USER); setErrors({}); setModalOpen(true); }}
                className="btn-primary py-1.5 px-3 text-xs"
              >
                <Plus size={13} /> Add User
              </button>
            }
          />

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-recessed animate-pulse shadow-[var(--shadow-recessed)]" />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-panel shadow-[var(--shadow-card)] p-1 border border-[var(--border-color)] overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-recessed/30">
                      {['Name','Email','Role','Status','Action']
                        .map(h => <th key={h} className="table-header font-mono text-xs font-bold uppercase tracking-wider text-text-sub border-b border-b-shadow/50">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}
                        className={`table-row ${!u.isActive ? 'opacity-50' : ''}`}>
                        <td className="table-cell font-bold text-sm text-text-main border-b border-b-shadow/20">{u.name}</td>
                        <td className="table-cell text-xs font-mono text-text-sub border-b border-b-shadow/20">
                          {u.email}
                        </td>
                        <td className="table-cell border-b border-b-shadow/20"><RoleBadge role={u.role} /></td>
                        <td className="table-cell border-b border-b-shadow/20">
                          <span className={`text-xs font-bold font-mono
                            ${u.isActive ? 'text-success' : 'text-text-sub'}`}>
                            {u.isActive ? '● Active' : '○ Inactive'}
                          </span>
                        </td>
                        <td className="table-cell border-b border-b-shadow/20">
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`btn-ghost text-xs px-3 py-1.5 ${u.isActive ? 'text-danger' : 'text-success'}`}
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-b-shadow/20">
                {users.map(u => (
                  <div key={u.id}
                    className={`p-4 ${!u.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-bold text-sm text-text-main">{u.name}</p>
                        <p className="text-xs font-mono text-text-sub">{u.email}</p>
                      </div>
                      <RoleBadge role={u.role} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs font-mono font-bold ${u.isActive ? 'text-success' : 'text-text-sub'}`}>
                        {u.isActive ? '● Active' : '○ Inactive'}
                      </span>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`btn-ghost text-xs px-3 py-1.5 ${u.isActive ? 'text-danger' : 'text-success'}`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info note */}
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-warning/20 bg-warning/5 text-xs text-text-main font-mono uppercase tracking-wider">
            <Shield size={14} className="shrink-0 mt-0.5 text-warning" />
            <span>
              Only Fleet Managers can access Settings and manage users.
              Deactivated users cannot log in.
            </span>
          </div>
        </div>
      </div>

      {/* ── Add User Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
             title="Add New User" size="md">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name *" error={errors.name}>
              <input value={form.name}
                onChange={e => {
                  setForm(f => ({ ...f, name: e.target.value }));
                  if (errors.name) setErrors(er => ({ ...er, name: '' }));
                }}
                placeholder="e.g. Rahul Verma"
                className={inputCls(errors.name)} />
            </Field>
            <Field label="Email *" error={errors.email}>
              <input type="email" value={form.email}
                onChange={e => {
                  setForm(f => ({ ...f, email: e.target.value }));
                  if (errors.email) setErrors(er => ({ ...er, email: '' }));
                }}
                placeholder="user@transitops.com"
                className={inputCls(errors.email)} />
            </Field>
          </div>

          {/* Password with strength meter */}
          <Field label="Password *" error={errors.password}>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => {
                  setForm(f => ({ ...f, password: e.target.value }));
                  if (errors.password) setErrors(er => ({ ...er, password: '' }));
                }}
                placeholder="Min 8 characters"
                className={`pr-10 ${inputCls(errors.password)}`}
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub hover:text-text-main">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {/* Strength bar */}
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4,5].map(i => (
                    <div key={i}
                      className={`h-1 flex-1 rounded-full transition-all
                        ${i <= pw.score ? pw.color : 'bg-recessed'}`} />
                  ))}
                </div>
                <p className={`text-xs font-mono font-bold uppercase tracking-wider ${pw.text}`}>{pw.label}</p>
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Role *" error={errors.role}>
              <select value={form.role}
                onChange={e => {
                  setForm(f => ({ ...f, role: e.target.value }));
                  if (errors.role) setErrors(er => ({ ...er, role: '' }));
                }}
                className={selectCls(errors.role)}>
                <option value="">Select role</option>
                {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Region" error={errors.region}>
              <input value={form.region}
                onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                placeholder="Optional"
                className={inputCls(errors.region)} />
            </Field>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)}
              className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="btn-primary bg-accent flex-1">
              {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Create User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
