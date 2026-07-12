import { useState, useEffect, useCallback } from 'react';
import { settingsAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon, Shield, Plus,
  Eye, EyeOff, AlertCircle, Sun, Moon, Lock
} from 'lucide-react';

const ROLES = ['FLEET_MANAGER','DISPATCHER','SAFETY_OFFICER','FINANCIAL_ANALYST'];

const ROLE_COLORS = {
  FLEET_MANAGER:     'bg-orange-500/15 text-orange-400 border-orange-500/30',
  DISPATCHER:        'bg-blue-500/15 text-blue-400 border-blue-500/30',
  SAFETY_OFFICER:    'bg-green-500/15 text-green-400 border-green-500/30',
  FINANCIAL_ANALYST: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const EMPTY_USER = { name: '', email: '', password: '', role: '', region: '' };

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs
                      font-medium border font-mono ${ROLE_COLORS[role] || 'bg-slate-500/15 text-slate-400'}`}>
      {role?.replace('_', ' ')}
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
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-500',   text: 'text-red-400' };
  if (score <= 3) return { score, label: 'Medium',  color: 'bg-amber-500', text: 'text-amber-400' };
  return            { score, label: 'Strong',  color: 'bg-green-500', text: 'text-green-400' };
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      {children}
      {error && (
        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
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
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20
                        flex items-center justify-center">
          <Lock size={28} className="text-red-400" />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
    `w-full bg-slate-800 border rounded-xl px-3 py-2.5 text-white
     placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition
     ${err
       ? 'border-red-500 focus:ring-red-500/30'
       : 'border-slate-700 focus:ring-orange-500/30 focus:border-orange-500'}`;

  const selectCls = (err) =>
    `w-full bg-slate-800 border rounded-xl px-3 py-2.5 text-white text-sm
     focus:outline-none focus:ring-2 transition
     ${err
       ? 'border-red-500 focus:ring-red-500/30'
       : 'border-slate-700 focus:ring-orange-500/30 focus:border-orange-500'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Application configuration and user management
          </p>
        </div>
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full
                          border font-medium
          ${isDark
            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
            : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
          <Shield size={12} /> Fleet Manager Only
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: General Settings ─────────────────────────────────── */}
        <div className={`rounded-2xl border p-5 space-y-5
          ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h2 className="font-semibold text-base flex items-center gap-2">
            <SettingsIcon size={16} className="text-orange-400" /> General
          </h2>

          {/* App name */}
          <div>
            <label className={`block text-sm font-medium mb-1.5
              ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Application Name
            </label>
            <div className={`px-3 py-2.5 rounded-xl border text-sm font-mono
                             font-semibold text-orange-400
              ${isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-slate-50 border-slate-200'}`}>
              {appName}
            </div>
          </div>

          {/* Theme toggle */}
          <div>
            <label className={`block text-sm font-medium mb-3
              ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Dark option */}
              <button
                onClick={() => !isDark && toggleTheme()}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border
                            text-xs font-medium transition
                  ${isDark
                    ? 'bg-slate-800 border-orange-500 text-orange-400'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                <div className="w-full h-10 rounded-lg bg-slate-900 border
                                border-slate-700 flex items-center justify-center">
                  <Moon size={14} className="text-slate-400" />
                </div>
                Dark Mode
                {isDark && <span className="text-xs text-orange-400">● Active</span>}
              </button>
              {/* Light option */}
              <button
                onClick={() => isDark && toggleTheme()}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border
                            text-xs font-medium transition
                  ${!isDark
                    ? 'bg-slate-50 border-orange-500 text-orange-600'
                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                <div className="w-full h-10 rounded-lg bg-white border border-slate-200
                                flex items-center justify-center">
                  <Sun size={14} className="text-amber-500" />
                </div>
                Light Mode
                {!isDark && <span className="text-xs text-orange-500">● Active</span>}
              </button>
            </div>
          </div>

          {/* Version info */}
          <div className={`text-xs space-y-1 pt-2 border-t
            ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
            <div className="flex justify-between">
              <span>Version</span>
              <span className="font-mono">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Backend</span>
              <span className="font-mono text-green-400">Online</span>
            </div>
            <div className="flex justify-between">
              <span>AI</span>
              <span className="font-mono text-green-400">Claude 3</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: RBAC User Table ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Shield size={16} className="text-blue-400" />
              User Management
              <span className="text-xs font-mono text-slate-500">({users.length})</span>
            </h2>
            <button
              onClick={() => { setForm(EMPTY_USER); setErrors({}); setModalOpen(true); }}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600
                         text-white px-3 py-2 rounded-xl text-xs font-medium
                         transition shadow-md shadow-orange-500/20">
              <Plus size={13} /> Add User
            </button>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`h-14 rounded-xl
                  ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              ))}
            </div>
          ) : (
            <div className={`rounded-2xl border overflow-hidden
              ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-xs uppercase tracking-wider font-semibold
                      ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                      {['Name','Email','Role','Status','Action']
                        .map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                    {users.map(u => (
                      <tr key={u.id}
                        className={`transition-colors
                          ${!u.isActive ? 'opacity-50' : ''}
                          ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3 font-medium text-sm">{u.name}</td>
                        <td className={`px-4 py-3 text-xs font-mono
                          ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {u.email}
                        </td>
                        <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium
                            ${u.isActive ? 'text-green-400' : 'text-slate-500'}`}>
                            {u.isActive ? '● Active' : '○ Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`text-xs px-3 py-1.5 rounded-lg border
                                          font-medium transition
                                ${u.isActive
                                  ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                  : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}>
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
              <div className="sm:hidden divide-y divide-slate-800">
                {users.map(u => (
                  <div key={u.id}
                    className={`p-4 ${!u.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-xs font-mono text-slate-400">{u.email}</p>
                      </div>
                      <RoleBadge role={u.role} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs ${u.isActive ? 'text-green-400' : 'text-slate-500'}`}>
                        {u.isActive ? '● Active' : '○ Inactive'}
                      </span>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition
                            ${u.isActive
                              ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                              : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}>
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
          <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-xs
            ${isDark
              ? 'bg-slate-900 border-slate-800 text-slate-500'
              : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
            <Shield size={14} className="shrink-0 mt-0.5" />
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
                className="absolute right-3 top-1/2 -translate-y-1/2
                           text-slate-500 hover:text-slate-300">
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
                        ${i <= pw.score ? pw.color : 'bg-slate-700'}`} />
                  ))}
                </div>
                <p className={`text-xs font-medium ${pw.text}`}>{pw.label}</p>
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
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition
                ${isDark
                  ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white
                         py-2.5 rounded-xl text-sm font-medium transition
                         flex items-center justify-center gap-2 disabled:opacity-50">
              {saving && <div className="w-3.5 h-3.5 border-2 border-white/30
                                         border-t-white rounded-full animate-spin" />}
              Create User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
