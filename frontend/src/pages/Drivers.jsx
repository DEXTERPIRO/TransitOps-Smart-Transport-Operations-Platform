import { useState, useEffect, useCallback } from 'react';
import { driversAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import { PageHeader, SectionHeader, EmptyState, StatusBadge, Modal } from '../components/ui';
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
    ? 'bg-success'
    : pct >= 70
      ? 'bg-warning'
      : 'bg-danger';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-recessed rounded-full overflow-hidden shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)]">
        <div className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono font-bold
        ${pct >= 90 ? 'text-success' : pct >= 70 ? 'text-warning' : 'text-danger'}`}>
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
      <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider text-danger bg-danger/10 px-2 py-0.5 rounded-full border border-danger/20">
        <AlertTriangle size={11} /> EXPIRED
      </span>
    );
  }
  if (daysLeft <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider text-warning bg-warning/10 px-2 py-0.5 rounded-full border border-warning/20">
        <AlertTriangle size={11} /> Expiring in {daysLeft}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
      <CheckCircle size={11} /> Valid
    </span>
  );
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
  const [sendingReminders, setSendingReminders] = useState(false);

  const handleSendReminders = async () => {
    setSendingReminders(true);
    const loadId = toast.loading('Checking expiries and sending emails...');
    try {
      const res = await driversAPI.sendExpiryReminders();
      if (res.sent) {
        toast.success(`License warnings emailed! (${res.expiredCount} expired, ${res.expiringSoonCount} expiring)`, { id: loadId });
      } else {
        toast.success('No warnings needed — all licenses valid.', { id: loadId });
      }
    } catch (err) {
      toast.error(err.error || 'Failed to send reminders.', { id: loadId });
    } finally {
      setSendingReminders(false);
    }
  };

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
    `input ${err ? 'ring-2 ring-danger' : ''}`;

  const selectCls = (err) =>
    `select ${err ? 'ring-2 ring-danger' : ''}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Driver Management"
        subtitle={`${drivers.length} driver${drivers.length !== 1 ? 's' : ''} registered`}
        icon={Users}
        action={
          <div className="flex gap-3">
            <button
              onClick={handleSendReminders}
              disabled={sendingReminders}
              className="btn border border-[var(--border-color)] text-text-main font-mono text-xs uppercase flex items-center gap-1.5 hover:bg-[var(--accent)]/10"
            >
              {sendingReminders ? 'Sending...' : 'Send Reminders'}
            </button>
            <button
              onClick={openAdd}
              className="btn-primary"
            >
              <Plus size={16} /> Add Driver
            </button>
          </div>
        }
      />

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-panel shadow-[var(--shadow-card)] border border-[var(--border-color)]">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, license number..."
            className="input pl-9"
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
            className="select w-auto py-1.5 px-3"
          >
            <option value="">{f.label}</option>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Table / Skeleton / Empty */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-recessed animate-pulse shadow-[var(--shadow-recessed)]" />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No drivers found"
          description={
            search || Object.values(filters).some(Boolean)
              ? 'Try adjusting your filters'
              : 'Add your first driver to get started'
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-2xl bg-panel shadow-[var(--shadow-card)] p-1 border border-[var(--border-color)] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-recessed/30">
                  {['Name', 'License No', 'Category', 'Expiry', 'Contact', 'Safety', 'Status', 'Actions']
                    .map(h => <th key={h} className="table-header font-mono text-xs font-bold uppercase tracking-wider text-text-sub border-b border-b-shadow/50">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {drivers.map(d => {
                  const isSuspended = d.status === 'SUSPENDED';
                  return (
                    <tr key={d.id}
                      className={`table-row ${isSuspended ? 'bg-danger/5' : ''}`}>
                      <td className="table-cell font-medium text-text-main border-b border-b-shadow/20">{d.name}</td>
                      <td className="table-cell border-b border-b-shadow/20">
                        <span className="font-mono text-xs text-text-main">{d.licenseNo}</span>
                      </td>
                      <td className="table-cell border-b border-b-shadow/20">
                        <span className="text-xs font-mono text-text-main bg-recessed px-2 py-0.5 rounded-lg">
                          {d.licenseCategory}
                        </span>
                      </td>
                      <td className="table-cell border-b border-b-shadow/20">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-mono text-text-sub">
                            {new Date(d.licenseExpiry).toLocaleDateString('en-IN')}
                          </span>
                          <LicenseStatus expiry={d.licenseExpiry} />
                        </div>
                      </td>
                      <td className="table-cell font-mono text-xs text-text-sub border-b border-b-shadow/20">
                        {d.contactNumber}
                      </td>
                      <td className="table-cell border-b border-b-shadow/20">
                        <SafetyBar score={d.safetyScore} />
                      </td>
                      <td className="table-cell border-b border-b-shadow/20"><StatusBadge status={d.status} /></td>
                      <td className="table-cell border-b border-b-shadow/20">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(d)}
                            className="btn-ghost p-1.5"
                          >
                            <Pencil size={14} />
                          </button>
                          {d.status !== 'ON_TRIP' && (
                            <select
                              value={d.status}
                              onChange={e => handleStatusChange(d, e.target.value)}
                              className="select text-xs py-1 px-2 w-auto"
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
                  className={`card ${isSuspended ? 'border border-danger/30' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-text-main">{d.name}</p>
                      <span className="font-mono text-xs text-text-sub">{d.licenseNo}</span>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <LicenseStatus expiry={d.licenseExpiry} />
                    <span className="text-xs text-text-sub font-mono">
                      {new Date(d.licenseExpiry).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="mt-3 font-mono text-xs">
                    <span className="text-text-sub mr-2">SAFETY SCORE</span>
                    <SafetyBar score={d.safetyScore} />
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-b-shadow/30">
                    <button onClick={() => openEdit(d)}
                      className="btn-ghost flex-1 py-1.5 justify-center">
                      <Pencil size={13} /> Edit
                    </button>
                    {d.status !== 'ON_TRIP' && (
                      <select
                        value={d.status}
                        onChange={e => handleStatusChange(d, e.target.value)}
                        className="select text-xs py-1 px-2 flex-1"
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
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-warning/20 bg-warning/5 text-xs text-text-main font-mono uppercase tracking-wider">
        <Info size={14} className="shrink-0 mt-0.5 text-warning" />
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
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {saving && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {editDriver ? 'Save Changes' : 'Add Driver'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
