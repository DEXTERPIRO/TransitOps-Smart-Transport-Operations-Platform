import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, User, Settings as SettingsIcon } from 'lucide-react';
import { settingsApi } from '../api';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen, FormField, StatusBadge } from '../components/ui';
import toast from 'react-hot-toast';

const ROLES = ['ADMIN', 'FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCE', 'DRIVER'];

export default function Settings() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState('general');
  const [settingsForm, setSettingsForm] = useState({});
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'DISPATCHER' });
  const [showNewUserForm, setShowNewUserForm] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
    onSuccess: (d) => setSettingsForm(d),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => settingsApi.getUsers().then((r) => r.data),
    enabled: user?.role === 'ADMIN',
  });

  const saveSettingsMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries(['settings']); },
    onError: () => toast.error('Failed to save'),
  });

  const createUserMutation = useMutation({
    mutationFn: settingsApi.createUser,
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries(['users']);
      setShowNewUserForm(false);
      setNewUser({ name: '', email: '', password: '', role: 'DISPATCHER' });
    },
    onError: () => toast.error('Failed to create user'),
  });

  if (isLoading) return <LoadingScreen />;

  const tabs = [
    { key: 'general', label: 'General', icon: SettingsIcon },
    ...(user?.role === 'ADMIN' ? [{ key: 'users', label: 'Users', icon: User }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your TransitOps instance</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 p-1 rounded-xl w-fit border border-dark-700">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === key ? 'bg-brand-500 text-white shadow' : 'text-dark-400 hover:text-white'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {tab === 'general' && (
        <div className="card max-w-xl">
          <h3 className="font-semibold text-white mb-4">General Configuration</h3>
          <form
            onSubmit={(e) => { e.preventDefault(); saveSettingsMutation.mutate(settingsForm); }}
            className="space-y-4"
          >
            {[
              { key: 'company_name',            label: 'Company Name' },
              { key: 'currency',                label: 'Currency Code' },
              { key: 'timezone',                label: 'Timezone' },
              { key: 'fuel_alert_threshold',    label: 'Fuel Alert Threshold (%)' },
              { key: 'maintenance_alert_days',  label: 'Maintenance Alert (days ahead)' },
            ].map(({ key, label }) => (
              <FormField key={key} label={label}>
                <input
                  className="input"
                  value={settingsForm[key] || ''}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </FormField>
            ))}
            <div className="pt-2">
              <button type="submit" disabled={saveSettingsMutation.isPending} className="btn-primary">
                <Save size={15} />
                {saveSettingsMutation.isPending ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">User Management</h3>
            <button onClick={() => setShowNewUserForm((v) => !v)} className="btn-primary">
              <Plus size={15} /> Add User
            </button>
          </div>

          {showNewUserForm && (
            <div className="card max-w-lg">
              <h4 className="font-medium text-white mb-4">New User</h4>
              <form
                onSubmit={(e) => { e.preventDefault(); createUserMutation.mutate(newUser); }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Name">
                    <input className="input" value={newUser.name} required
                           onChange={(e) => setNewUser((f) => ({ ...f, name: e.target.value }))} />
                  </FormField>
                  <FormField label="Email">
                    <input className="input" type="email" value={newUser.email} required
                           onChange={(e) => setNewUser((f) => ({ ...f, email: e.target.value }))} />
                  </FormField>
                  <FormField label="Password">
                    <input className="input" type="password" value={newUser.password} required
                           onChange={(e) => setNewUser((f) => ({ ...f, password: e.target.value }))} />
                  </FormField>
                  <FormField label="Role">
                    <select className="select" value={newUser.role}
                            onChange={(e) => setNewUser((f) => ({ ...f, role: e.target.value }))}>
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={createUserMutation.isPending} className="btn-primary">
                    {createUserMutation.isPending ? 'Creating…' : 'Create User'}
                  </button>
                  <button type="button" onClick={() => setShowNewUserForm(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-dark-900/50">
                  {['Name', 'Email', 'Role', 'Status', 'Last Login'].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersData?.map((u) => (
                  <tr key={u.id} className="table-row">
                    <td className="table-cell font-medium text-white">{u.name}</td>
                    <td className="table-cell text-dark-400">{u.email}</td>
                    <td className="table-cell">
                      <span className="badge-blue">{u.role.replace('_', ' ')}</span>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className="table-cell text-dark-400">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
