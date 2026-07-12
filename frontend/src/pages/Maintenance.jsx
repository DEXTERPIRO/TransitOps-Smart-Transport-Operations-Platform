import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { maintenanceAPI, vehiclesAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import toast from 'react-hot-toast';
import {
  Wrench, Plus, CheckCircle, AlertCircle,
  Info, PackageOpen, X
} from 'lucide-react';

const TYPES = ['OIL_CHANGE','TYRE_REPLACE','ENGINE_REPAIR',
               'BRAKE_SERVICE','GENERAL_SERVICE','OTHER'];

const TYPE_COLORS = {
  OIL_CHANGE:      'bg-amber-500/15 text-amber-400',
  TYRE_REPLACE:    'bg-blue-500/15 text-blue-400',
  ENGINE_REPAIR:   'bg-red-500/15 text-red-400',
  BRAKE_SERVICE:   'bg-purple-500/15 text-purple-400',
  GENERAL_SERVICE: 'bg-green-500/15 text-green-400',
  OTHER:           'bg-slate-500/15 text-slate-400',
};

const EMPTY_FORM = {
  vehicleId: '', type: '', description: '', cost: '0', serviceCenter: ''
};

function TypeBadge({ type }) {
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded-lg font-medium
                      ${TYPE_COLORS[type] || TYPE_COLORS.OTHER}`}>
      {type?.replace('_', ' ')}
    </span>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      {children}
      {error && (
        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
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
      <div>
        <h1 className="text-2xl font-bold">Maintenance Management</h1>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Track vehicle service records and shop status
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── LEFT: New Service Record Form ───────────────────────────── */}
        <div className={`rounded-2xl border p-5
          ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            <Wrench size={16} className="text-orange-400" /> New Service Record
          </h2>

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
                <p className="text-amber-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={11} />
                  This vehicle is already In Shop
                </p>
              )}
              {selectedVehicle?.status === 'ON_TRIP' && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
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
              className="w-full bg-orange-500 hover:bg-orange-600 text-white
                         py-2.5 rounded-xl text-sm font-semibold transition-all
                         flex items-center justify-center gap-2 mt-2
                         shadow-lg shadow-orange-500/20 disabled:opacity-40
                         disabled:cursor-not-allowed"
            >
              <Wrench size={15} /> Create Service Record
            </button>
          </form>
        </div>

        {/* ── RIGHT: Live Service Log ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Wrench size={16} className="text-amber-400" /> Live Service Log
            <span className={`text-xs font-mono ml-1
              ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              ({logs.length} records)
            </span>
          </h2>

          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`h-14 rounded-xl
                  ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-20
                             rounded-2xl border
              ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <PackageOpen size={40} className="text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No maintenance records</p>
            </div>
          ) : (
            <div className={`rounded-2xl border overflow-hidden
              ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-xs uppercase tracking-wider font-semibold
                      ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                      {['Vehicle','Type','Description','Cost','Center','Status','Started','Action']
                        .map(h => <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                    {logs.map(log => (
                      <tr key={log.id}
                        className={`transition-colors
                          ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3">
                          <div className="font-mono text-orange-400 text-xs font-bold">
                            {log.vehicle?.registrationNo}
                          </div>
                          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {log.vehicle?.name}
                          </div>
                        </td>
                        <td className="px-4 py-3"><TypeBadge type={log.type} /></td>
                        <td className="px-4 py-3">
                          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {log.description || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          ₹{log.cost?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {log.serviceCenter || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={log.status} />
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-400">
                          {new Date(log.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          {log.status === 'ACTIVE' && (
                            <button
                              onClick={() => setCloseTarget(log)}
                              className="flex items-center gap-1 text-xs text-green-400
                                         hover:bg-green-500/10 px-2 py-1 rounded-lg transition"
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
              <div className="md:hidden divide-y divide-slate-800">
                {logs.map(log => (
                  <div key={log.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-orange-400 font-bold text-xs">
                          {log.vehicle?.registrationNo}
                        </span>
                        <span className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {log.vehicle?.name}
                        </span>
                      </div>
                      <StatusBadge status={log.status} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TypeBadge type={log.type} />
                      <span className="font-mono text-xs text-green-400">
                        ₹{log.cost?.toLocaleString()}
                      </span>
                    </div>
                    {log.description && (
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {log.description}
                      </p>
                    )}
                    {log.status === 'ACTIVE' && (
                      <button
                        onClick={() => setCloseTarget(log)}
                        className="flex items-center gap-1 text-xs text-green-400
                                   hover:bg-green-500/10 px-2 py-1.5 rounded-lg
                                   border border-green-500/20 transition w-full justify-center"
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
          <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-xs
            ${isDark
              ? 'bg-slate-900 border-slate-800 text-slate-500'
              : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
            <Info size={14} className="shrink-0 mt-0.5" />
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
          <div className={`p-4 rounded-xl border text-sm
            ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
              This will change{' '}
              <b className="text-orange-400">{selectedVehicle?.name}</b>{' '}
              ({selectedVehicle?.registrationNo}) status to{' '}
              <b className="text-amber-400">In Shop</b> and remove it from
              dispatch until maintenance is closed.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConfirmOpen(false)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition
                ${isDark
                  ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={submitting}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white
                         py-2.5 rounded-xl text-sm font-medium transition
                         flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white
                                rounded-full animate-spin" />
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
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Close maintenance for{' '}
            <b className="text-orange-400">{closeTarget?.vehicle?.registrationNo}</b>?
            The vehicle will be restored to <b className="text-green-400">Available</b>.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setCloseTarget(null)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition
                ${isDark
                  ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Cancel
            </button>
            <button onClick={handleClose}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white
                         py-2.5 rounded-xl text-sm font-medium transition
                         flex items-center justify-center gap-2">
              <CheckCircle size={14} /> Close Record
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
