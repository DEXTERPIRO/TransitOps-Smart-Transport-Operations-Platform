import { useState, useEffect, useCallback } from 'react';
import { driversAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import toast from 'react-hot-toast';
import {
  Users, Search, Plus, Pencil, AlertTriangle,
  CheckCircle, AlertCircle, Info, PackageOpen
} from 'lucide-react';

const CATEGORIES = ['LMV', 'HMV', 'HPMV', 'MOTORCYCLE', 'TRANSPORT'];
const STATUSES_EDIT = ['AVAILABLE', 'OFF_DUTY', 'SUSPENDED'];
const REGIONS = ['North', 'South', 'East', 'West'];

const EMPTY_FORM = {
  name: '', licenseNo: '', licenseCategory: '',
  licenseExpiry: '', contactNumber: '',
  safetyScore: '100', region: ''
};

function validate(form) {
  const e = {};
  if (!form.name.trim()) e.name = 'Name is required';
  if (!form.licenseNo.trim()) e.licenseNo = 'License number is required';
  if (!form.licenseCategory) e.licenseCategory = 'License category is required';
  if (!form.licenseExpiry) {
    e.licenseExpiry = 'Expiry date is required';
  } else if (new Date(form.licenseExpiry) <= new Date()) {
    e.licenseExpiry = 'License expiry must be a future date';
  }
  if (!form.contactNumber.trim()) {
    e.contactNumber = 'Contact number is required';
  } else if (!/^[6-9]\d{9}$/.test(form.contactNumber.replace(/\s/g, ''))) {
    e.contactNumber = 'Enter a valid 10-digit phone number';
  }
  const score = parseFloat(form.safetyScore);
  if (form.safetyScore !== '' && (isNaN(score) || score < 0 || score > 100)) {
    e.safetyScore = 'Safety score must be between 0 and 100';
  }
  return e;
}

function SafetyBar({ score }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  const color = pct >= 90
    ? 'bg-green-500'
    : pct >= 70
      ? 'bg-amber-500'
      : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono font-medium
        ${pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
        {pct}
      </span>
    </div>
  );
}

function LicenseStatus({ expiry }) {
  if (!expiry) return null;
  const today = new Date();
  const exp = new Date(expiry);
  const daysLeft = Math.floor((exp - today) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium
                        text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
        <AlertTriangle size={11} /> EXPIRED
      </span>
    );
  }
  if (daysLeft <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium
                        text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
        <AlertTriangle size={11} /> Expiring in {daysLeft}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium
                      text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
      <CheckCircle size={11} /> Valid
    </span>
  );
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

export default function Drivers() {
  const { user, theme } = useAuthStore();
  const isDark = theme === 'dark';

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', region: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filters.status) params.status = filters.status;
      if (filters.region) params.region = filters.region;
      const data = await driversAPI.getAll(params);
      setDrivers(data);
    } catch {
      toast.error('Failed to load drivers');
    } finally { setLoading(false); }
  }, [search, filters]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const openAdd = () => {
    setEditDriver(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (d) => {
    setEditDriver(d);
    setForm({
      name: d.name,
      licenseNo: d.licenseNo,
      licenseCategory: d.licenseCategory,
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.split('T')[0] : '',
      contactNumber: d.contactNumber || '',
      safetyScore: String(d.safetyScore ?? 100),
      region: d.region || ''
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  const handleStatusChange = async (driver, status) => {
    try {
      await driversAPI.update(driver.id, { status });
      toast.success(`${driver.name} status updated`);
      fetchDrivers();
    } catch (err) {
      toast.error(err.error || 'Status update failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        safetyScore: form.safetyScore ? parseFloat(form.safetyScore) : 100,
      };
      if (editDriver) {
        await driversAPI.update(editDriver.id, payload);
        toast.success('Driver updated');
      } else {
        await driversAPI.create(payload);
        toast.success('Driver added');
      }
      setModalOpen(false);
      fetchDrivers();
    } catch (err) {
      toast.error(err.error || 'Operation failed');
    } finally { setSaving(false); }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Driver Management</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {drivers.length} driver{drivers.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600
                     text-white px-4 py-2.5 rounded-xl text-sm font-medium
                     transition-all shadow-lg shadow-orange-500/20"
        >
          <Plus size={16} /> Add Driver
        </button>
      </div>

      {/* Search + Filters */}
      <div className={`flex flex-col sm:flex-row gap-3 p-4 rounded-2xl border
        ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, license number..."
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm
              focus:outline-none focus:ring-2 focus:ring-orange-500/30
              ${isDark
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900'}`}
          />
        </div>
        {[
          { key: 'status', opts: ['AVAILABLE','ON_TRIP','OFF_DUTY','SUSPENDED'], label: 'All Statuses' },
          { key: 'region', opts: REGIONS, label: 'All Regions' },
        ].map(f => (
          <select
            key={f.key}
            value={filters[f.key]}
            onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
            className={`text-sm px-3 py-2.5 rounded-xl border focus:outline-none
              focus:ring-2 focus:ring-orange-500/30
              ${isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'}`}
          >
            <option value="">{f.label}</option>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Table / Skeleton / Empty */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`h-14 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border
          ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <PackageOpen size={48} className="text-slate-600 mb-3" />
          <p className="text-slate-500 font-medium">No drivers found</p>
          <p className="text-slate-600 text-sm mt-1">
            {search || Object.values(filters).some(Boolean)
              ? 'Try adjusting your filters'
              : 'Add your first driver to get started'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className={`hidden md:block rounded-2xl border overflow-hidden
            ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-xs uppercase tracking-wider font-semibold
                  ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                  {['Name', 'License No', 'Category', 'Expiry', 'Contact', 'Safety', 'Status', 'Actions']
                    .map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {drivers.map(d => {
                  const isSuspended = d.status === 'SUSPENDED';
                  return (
                    <tr key={d.id}
                      className={`transition-colors
                        ${isSuspended ? 'bg-red-500/5' : ''}
                        ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3 font-medium">{d.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-300">{d.licenseNo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-lg
                          ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          {d.licenseCategory}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-mono text-slate-400">
                            {new Date(d.licenseExpiry).toLocaleDateString('en-IN')}
                          </span>
                          <LicenseStatus expiry={d.licenseExpiry} />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {d.contactNumber}
                      </td>
                      <td className="px-4 py-3">
                        <SafetyBar score={d.safetyScore} />
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(d)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400
                                       hover:bg-blue-500/10 transition"
                          >
                            <Pencil size={14} />
                          </button>
                          {d.status !== 'ON_TRIP' && (
                            <select
                              value={d.status}
                              onChange={e => handleStatusChange(d, e.target.value)}
                              className="text-xs bg-slate-800 border border-slate-700
                                         rounded-lg px-2 py-1 text-slate-300
                                         focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                            >
                              {STATUSES_EDIT.map(s =>
                                <option key={s} value={s}>{s}</option>
                              )}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {drivers.map(d => {
              const isSuspended = d.status === 'SUSPENDED';
              return (
                <div key={d.id}
                  className={`rounded-2xl border p-4
                    ${isSuspended ? 'border-red-500/30 bg-red-500/5' : ''}
                    ${isDark && !isSuspended ? 'bg-slate-900 border-slate-800' : ''}
                    ${!isDark && !isSuspended ? 'bg-white border-slate-200' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <span className="font-mono text-xs text-slate-400">{d.licenseNo}</span>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <LicenseStatus expiry={d.licenseExpiry} />
                    <span className="text-xs text-slate-500">
                      {new Date(d.licenseExpiry).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-xs text-slate-500 mr-2">Safety</span>
                    <SafetyBar score={d.safetyScore} />
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                    <button onClick={() => openEdit(d)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2
                                 text-xs text-blue-400 hover:bg-blue-500/10 rounded-lg transition">
                      <Pencil size={13} /> Edit
                    </button>
                    {d.status !== 'ON_TRIP' && (
                      <select
                        value={d.status}
                        onChange={e => handleStatusChange(d, e.target.value)}
                        className="text-xs bg-slate-800 border border-slate-700
                                   rounded-lg px-2 py-1.5 text-slate-300
                                   focus:outline-none flex-1"
                      >
                        {STATUSES_EDIT.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Info note */}
      <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-xs
        ${isDark
          ? 'bg-slate-900 border-slate-800 text-slate-500'
          : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          Suspended or expired-license drivers are automatically hidden from trip dispatch.
          Only AVAILABLE drivers with a valid license can be assigned to trips.
        </span>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editDriver ? `Edit ${editDriver.name}` : 'Add New Driver'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name *" error={errors.name}>
              <input
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className={inputCls(errors.name)}
              />
            </Field>
            <Field label="License Number *" error={errors.licenseNo}>
              <input
                value={form.licenseNo}
                onChange={e => handleChange('licenseNo', e.target.value.toUpperCase())}
                placeholder="MH1220230012345"
                className={inputCls(errors.licenseNo)}
              />
            </Field>
            <Field label="License Category *" error={errors.licenseCategory}>
              <select
                value={form.licenseCategory}
                onChange={e => handleChange('licenseCategory', e.target.value)}
                className={selectCls(errors.licenseCategory)}
              >
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="License Expiry Date *" error={errors.licenseExpiry}>
              <input
                type="date"
                value={form.licenseExpiry}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => handleChange('licenseExpiry', e.target.value)}
                className={inputCls(errors.licenseExpiry)}
              />
            </Field>
            <Field label="Contact Number *" error={errors.contactNumber}>
              <input
                type="tel"
                value={form.contactNumber}
                onChange={e => handleChange('contactNumber', e.target.value)}
                placeholder="9876543210"
                maxLength={10}
                className={inputCls(errors.contactNumber)}
              />
            </Field>
            <Field label="Safety Score (0–100)" error={errors.safetyScore}>
              <input
                type="number" min="0" max="100"
                value={form.safetyScore}
                onChange={e => handleChange('safetyScore', e.target.value)}
                placeholder="100"
                className={inputCls(errors.safetyScore)}
              />
            </Field>
            <Field label="Region" error={errors.region}>
              <select
                value={form.region}
                onChange={e => handleChange('region', e.target.value)}
                className={selectCls(errors.region)}
              >
                <option value="">Select region (optional)</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition
                ${isDark
                  ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white
                         py-2.5 rounded-xl text-sm font-medium transition
                         flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving && (
                <div className="w-3.5 h-3.5 border-2 border-white/30
                                border-t-white rounded-full animate-spin" />
              )}
              {editDriver ? 'Save Changes' : 'Add Driver'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
