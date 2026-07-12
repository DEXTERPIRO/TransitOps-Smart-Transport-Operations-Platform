import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { maintenanceAPI, vehiclesAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import { PageHeader, SectionHeader, EmptyState, StatusBadge, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Wrench, Plus, CheckCircle, AlertCircle,
  Info, PackageOpen, X
} from 'lucide-react';

const TYPES = ['OIL_CHANGE','TYRE_REPLACE','ENGINE_REPAIR',
               'BRAKE_SERVICE','GENERAL_SERVICE','OTHER'];

const TYPE_COLORS = {
  OIL_CHANGE:      'bg-warning/10 text-warning border border-warning/20',
  TYRE_REPLACE:    'bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20',
  ENGINE_REPAIR:   'bg-danger/10 text-danger border border-danger/20',
  BRAKE_SERVICE:   'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  GENERAL_SERVICE: 'bg-success/10 text-success border border-success/20',
  OTHER:           'bg-recessed text-text-sub border border-b-shadow/20',
};

const EMPTY_FORM = {
  vehicleId: '', type: '', description: '', cost: '0', serviceCenter: ''
};

function TypeBadge({ type }) {
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded-lg font-medium
                      ${TYPE_COLORS[type] || TYPE_COLORS.OTHER}`}>
      {type?.replaceAll('_', ' ')}
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
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

export default function Maintenance() {
  const { theme } = useAuthStore();
  const isDark = theme === 'dark';
  const location = useLocation();

  const [logs, setLogs]         = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState(null);
  const [submitting, setSubmitting]   = useState(false);

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [logsData, vehiclesData] = await Promise.all([
        maintenanceAPI.getAll(),
        vehiclesAPI.getAll({ isActive: true }),
      ]);
      setLogs(logsData);
      setVehicles(vehiclesData.filter(v => v.status !== 'RETIRED'));
    } catch {
      toast.error('Failed to load maintenance data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Prefill vehicleId if passed via route state
  useEffect(() => {
    if (location.state?.vehicleId && vehicles.length > 0) {
      const exists = vehicles.some(v => v.id === location.state.vehicleId);
      if (exists) {
        setForm(f => ({ ...f, vehicleId: location.state.vehicleId }));
      }
    }
  }, [location.state, vehicles]);

  const validate = () => {
    const e = {};
    if (!form.vehicleId) e.vehicleId = 'Select a vehicle';
    if (!form.type) e.type = 'Select maintenance type';
    if (form.cost !== '' && parseFloat(form.cost) < 0)
      e.cost = 'Cost cannot be negative';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await maintenanceAPI.create({
        ...form,
        cost: parseFloat(form.cost) || 0,
      });
      toast.success(`${selectedVehicle?.name} sent to maintenance`);
      setForm(EMPTY_FORM);
      setErrors({});
      setConfirmOpen(false);
      fetchAll();
    } catch (err) {
      toast.error(err.error || 'Failed to create record');
    } finally { setSubmitting(false); }
  };

  const handleClose = async () => {
    if (!closeTarget) return;
    try {
      await maintenanceAPI.close(closeTarget.id);
      toast.success('Maintenance closed — vehicle restored to Available');
      setCloseTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.error || 'Failed to close record');
    }
  };

  const inputCls = (err) =>
    `input ${err ? 'ring-2 ring-danger' : ''}`;

  const selectCls = (err) =>
    `select ${err ? 'ring-2 ring-danger' : ''}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Management"
        subtitle="Track vehicle service records and shop status"
        icon={Wrench}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── LEFT: New Service Record Form ───────────────────────────── */}
        <div className="rounded-2xl bg-panel shadow-[var(--shadow-card)] p-5 border border-[var(--border-color)]">
          <SectionHeader icon={Wrench} title="New Service Record" />

          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Vehicle *" error={errors.vehicleId}>
              <select
                value={form.vehicleId}
                onChange={e => {
                  setForm(f => ({ ...f, vehicleId: e.target.value }));
                  if (errors.vehicleId) setErrors(er => ({ ...er, vehicleId: '' }));
                }}
                className={selectCls(errors.vehicleId)}
              >
                <option value="">Select vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} — {v.name} [{v.status}]
                  </option>
                ))}
              </select>
              {selectedVehicle?.status === 'IN_SHOP' && (
                <p className="text-warning text-xs mt-1 flex items-center gap-1 font-mono">
                  <AlertCircle size={11} />
                  This vehicle is already In Shop
                </p>
              )}
              {selectedVehicle?.status === 'ON_TRIP' && (
                <p className="text-danger text-xs mt-1 flex items-center gap-1 font-mono">
                  <AlertCircle size={11} />
                  Cannot service a vehicle currently on a trip
                </p>
              )}
            </Field>

            <Field label="Maintenance Type *" error={errors.type}>
              <select
                value={form.type}
                onChange={e => {
                  setForm(f => ({ ...f, type: e.target.value }));
                  if (errors.type) setErrors(er => ({ ...er, type: '' }));
                }}
                className={selectCls(errors.type)}
              >
                <option value="">Select type</option>
                {TYPES.map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </Field>

            <Field label="Description" error={errors.description}>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the work to be done..."
                className={`${inputCls(errors.description)} resize-none`}
              />
            </Field>

            <Field label="Estimated Cost (₹)" error={errors.cost}>
              <input
                type="number" min="0"
                value={form.cost}
                onChange={e => {
                  setForm(f => ({ ...f, cost: e.target.value }));
                  if (errors.cost) setErrors(er => ({ ...er, cost: '' }));
                }}
                placeholder="0"
                className={inputCls(errors.cost)}
              />
            </Field>

            <Field label="Service Center" error={errors.serviceCenter}>
              <input
                value={form.serviceCenter}
                onChange={e => setForm(f => ({ ...f, serviceCenter: e.target.value }))}
                placeholder="e.g. Tata Authorized Service"
                className={inputCls(errors.serviceCenter)}
              />
            </Field>

            <button
              type="submit"
              disabled={selectedVehicle?.status === 'ON_TRIP'}
              className="btn-primary w-full mt-2"
            >
              <Wrench size={15} /> Create Service Record
            </button>
          </form>
        </div>

        {/* ── RIGHT: Live Service Log ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader icon={Wrench} title="Live Service Log" badge={logs.length} />

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-recessed animate-pulse shadow-[var(--shadow-recessed)]" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="No maintenance records"
              description="No vehicle service history has been created yet"
            />
          ) : (
            <div className="rounded-2xl bg-panel shadow-[var(--shadow-card)] p-1 border border-[var(--border-color)] overflow-hidden">

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-recessed/30">
                      {['Vehicle','Type','Description','Cost','Center','Status','Started','Action']
                        .map(h => <th key={h} className="table-header font-mono text-xs font-bold uppercase tracking-wider text-text-sub border-b border-b-shadow/50">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}
                        className="table-row">
                        <td className="table-cell border-b border-b-shadow/20">
                          <div className="font-mono text-accent text-xs font-bold">
                            {log.vehicle?.registrationNo}
                          </div>
                          <div className="text-xs text-text-sub">
                            {log.vehicle?.name}
                          </div>
                        </td>
                        <td className="table-cell border-b border-b-shadow/20"><TypeBadge type={log.type} /></td>
                        <td className="table-cell border-b border-b-shadow/20">
                          <span className="text-xs text-text-sub">
                            {log.description || '—'}
                          </span>
                        </td>
                        <td className="table-cell font-mono text-xs text-text-main border-b border-b-shadow/20">
                          ₹{log.cost?.toLocaleString()}
                        </td>
                        <td className="table-cell text-xs text-text-main border-b border-b-shadow/20">
                          {log.serviceCenter || '—'}
                        </td>
                        <td className="table-cell border-b border-b-shadow/20">
                          <StatusBadge status={log.status} />
                        </td>
                        <td className="table-cell text-xs font-mono text-text-sub border-b border-b-shadow/20">
                          {new Date(log.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="table-cell border-b border-b-shadow/20">
                          {log.status === 'ACTIVE' && (
                            <button
                              onClick={() => setCloseTarget(log)}
                              className="btn-ghost text-success px-2 py-1"
                            >
                              <CheckCircle size={12} /> Close
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-b-shadow/20">
                {logs.map(log => (
                  <div key={log.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-accent font-bold text-xs">
                          {log.vehicle?.registrationNo}
                        </span>
                        <span className="text-xs ml-2 text-text-sub font-mono">
                          {log.vehicle?.name}
                        </span>
                      </div>
                      <StatusBadge status={log.status} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TypeBadge type={log.type} />
                      <span className="font-mono text-xs text-success font-bold">
                        ₹{log.cost?.toLocaleString()}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-text-sub text-xs font-mono">
                        {log.description}
                      </p>
                    )}
                    {log.status === 'ACTIVE' && (
                      <button
                        onClick={() => setCloseTarget(log)}
                        className="btn-ghost text-success py-1.5 w-full justify-center"
                      >
                        <CheckCircle size={12} /> Close Maintenance
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-warning/20 bg-warning/5 text-xs text-text-main font-mono uppercase tracking-wider">
            <Info size={14} className="shrink-0 mt-0.5 text-warning" />
            <span>
              Closing a maintenance record automatically restores the vehicle to{' '}
              <strong>Available</strong> status for dispatch. Retired vehicles stay Retired.
            </span>
          </div>
        </div>
      </div>

      {/* ── Confirm Create Modal ─────────────────────────────────────────── */}
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)}
             title="Confirm Maintenance" size="sm">
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-b-shadow/30 bg-chassis shadow-[var(--shadow-recessed)] text-sm">
            <p className="text-text-main">
              This will change{' '}
              <b className="text-accent">{selectedVehicle?.name}</b>{' '}
              ({selectedVehicle?.registrationNo}) status to{' '}
              <b className="text-warning">In Shop</b> and remove it from
              dispatch until maintenance is closed.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConfirmOpen(false)}
              className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={submitting}
              className="btn-primary flex-1 disabled:opacity-50">
              {submitting && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm Close Modal ──────────────────────────────────────────── */}
      <Modal isOpen={!!closeTarget} onClose={() => setCloseTarget(null)}
             title="Close Maintenance Record" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-main">
            Close maintenance for{' '}
            <b className="text-accent">{closeTarget?.vehicle?.registrationNo}</b>?
            The vehicle will be restored to <b className="text-success">Available</b>.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setCloseTarget(null)}
              className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={handleClose}
              className="btn-primary bg-success flex-1">
              <CheckCircle size={14} /> Close Record
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
