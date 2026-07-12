import { useState, useEffect, useCallback } from 'react';
import { vehiclesAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import toast from 'react-hot-toast';
import {
  Truck, Search, Plus, Pencil, Trash2,
  AlertCircle, PackageOpen
} from 'lucide-react';

const TYPES = ['VAN', 'TRUCK', 'BUS', 'BIKE', 'CAR'];
const STATUSES = ['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED'];
const REGIONS = ['North', 'South', 'East', 'West'];

const EMPTY_FORM = {
  registrationNo: '', name: '', type: '',
  maxLoadCapacity: '', odometer: '',
  acquisitionCost: '', region: ''
};

function validate(form) {
  const e = {};
  if (!form.registrationNo.trim()) e.registrationNo = 'Registration No is required';
  if (!form.name.trim()) e.name = 'Name is required';
  else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
  if (!form.type) e.type = 'Type is required';
  if (!form.maxLoadCapacity) e.maxLoadCapacity = 'Max load capacity is required';
  else if (parseFloat(form.maxLoadCapacity) <= 0) e.maxLoadCapacity = 'Must be greater than 0';
  if (form.odometer === '' || form.odometer === undefined) e.odometer = 'Odometer is required';
  else if (parseFloat(form.odometer) < 0) e.odometer = 'Must be 0 or greater';
  if (!form.acquisitionCost) e.acquisitionCost = 'Acquisition cost is required';
  else if (parseFloat(form.acquisitionCost) <= 0) e.acquisitionCost = 'Must be greater than 0';
  return e;
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

export default function Vehicles() {
  const { user, theme } = useAuthStore();
  const isDark = theme === 'dark';
  const isManager = user?.role === 'FLEET_MANAGER';

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ type: '', status: '', region: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.region) params.region = filters.region;
      const data = await vehiclesAPI.getAll(params);
      setVehicles(data);
    } catch {
      toast.error('Failed to load vehicles');
    } finally { setLoading(false); }
  }, [search, filters]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const openAdd = () => {
    setEditVehicle(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (v) => {
    setEditVehicle(v);
    setForm({
      registrationNo: v.registrationNo,
      name: v.name,
      type: v.type,
      maxLoadCapacity: String(v.maxLoadCapacity),
      odometer: String(v.odometer),
      acquisitionCost: String(v.acquisitionCost),
      region: v.region || ''
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        registrationNo: form.registrationNo.toUpperCase(),
        maxLoadCapacity: parseFloat(form.maxLoadCapacity),
        odometer: parseFloat(form.odometer),
        acquisitionCost: parseFloat(form.acquisitionCost),
      };
      if (editVehicle) {
        await vehiclesAPI.update(editVehicle.id, payload);
        toast.success('Vehicle updated');
      } else {
        await vehiclesAPI.create(payload);
        toast.success('Vehicle added to fleet');
      }
      setModalOpen(false);
      fetchVehicles();
    } catch (err) {
      toast.error(err.error || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await vehiclesAPI.delete(deleteTarget.id);
      toast.success(`${deleteTarget.registrationNo} removed`);
      setDeleteTarget(null);
      fetchVehicles();
    } catch (err) {
      toast.error(err.error || 'Cannot delete vehicle');
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

  const rowOpacity = (v) =>
    v.status === 'RETIRED' || v.status === 'IN_SHOP' ? 'opacity-70' : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fleet Management</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} in fleet
          </p>
        </div>
        {isManager && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600
                       text-white px-4 py-2.5 rounded-xl text-sm font-medium
                       transition-all shadow-lg shadow-orange-500/20"
          >
            <Plus size={16} /> Add Vehicle
          </button>
        )}
      </div>

      {/* Search + Filters */}
      <div className={`flex flex-col sm:flex-row gap-3 p-4 rounded-2xl border
        ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search registration, name..."
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm
              focus:outline-none focus:ring-2 focus:ring-orange-500/30
              ${isDark
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900'}`}
          />
        </div>
        {[
          { key: 'type', opts: TYPES, label: 'All Types' },
          { key: 'status', opts: STATUSES, label: 'All Statuses' },
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
      ) : vehicles.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border
          ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <PackageOpen size={48} className="text-slate-600 mb-3" />
          <p className="text-slate-500 font-medium">No vehicles found</p>
          <p className="text-slate-600 text-sm mt-1">
            {search || Object.values(filters).some(Boolean)
              ? 'Try adjusting your filters'
              : 'Add your first vehicle to get started'}
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
                  {['Reg No', 'Name', 'Type', 'Capacity', 'Odometer', 'Acq. Cost', 'Status', 'Actions']
                    .map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {vehicles.map(v => (
                  <tr key={v.id}
                    className={`transition-colors ${rowOpacity(v)}
                      ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-orange-400 font-semibold text-xs">
                        {v.registrationNo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{v.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-lg
                        ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        {v.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{v.maxLoadCapacity} kg</td>
                    <td className="px-4 py-3 font-mono text-xs">{v.odometer?.toLocaleString()} km</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      ₹{v.acquisitionCost?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3">
                      {isManager && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(v)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400
                                       hover:bg-blue-500/10 transition"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(v)}
                            disabled={v.status === 'ON_TRIP'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400
                                       hover:bg-red-500/10 transition disabled:opacity-30
                                       disabled:cursor-not-allowed"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {vehicles.map(v => (
              <div key={v.id}
                className={`rounded-2xl border p-4 ${rowOpacity(v)}
                  ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-mono text-orange-400 font-bold text-sm">
                      {v.registrationNo}
                    </span>
                    <p className="font-medium mt-0.5">{v.name}</p>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                <div className={`grid grid-cols-2 gap-2 text-xs mt-3
                  ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Type: <b className="text-slate-300">{v.type}</b></span>
                  <span>Load: <b className="text-slate-300">{v.maxLoadCapacity} kg</b></span>
                  <span>Odo: <b className="text-slate-300">{v.odometer?.toLocaleString()} km</b></span>
                  <span>Cost: <b className="text-slate-300">₹{v.acquisitionCost?.toLocaleString()}</b></span>
                </div>
                {isManager && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                    <button onClick={() => openEdit(v)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2
                                 text-xs text-blue-400 hover:bg-blue-500/10 rounded-lg transition">
                      <Pencil size={13} /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget(v)}
                      disabled={v.status === 'ON_TRIP'}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2
                                 text-xs text-red-400 hover:bg-red-500/10 rounded-lg
                                 transition disabled:opacity-30">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editVehicle ? `Edit ${editVehicle.registrationNo}` : 'Add New Vehicle'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Registration No *" error={errors.registrationNo}>
              <input
                value={form.registrationNo}
                onChange={e => handleChange('registrationNo', e.target.value.toUpperCase())}
                placeholder="MH-01-AB-1234"
                className={inputCls(errors.registrationNo)}
              />
            </Field>
            <Field label="Vehicle Name *" error={errors.name}>
              <input
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="e.g. Tata Ace Gold"
                className={inputCls(errors.name)}
              />
            </Field>
            <Field label="Type *" error={errors.type}>
              <select
                value={form.type}
                onChange={e => handleChange('type', e.target.value)}
                className={selectCls(errors.type)}
              >
                <option value="">Select type</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Max Load Capacity (kg) *" error={errors.maxLoadCapacity}>
              <input
                type="number" min="0"
                value={form.maxLoadCapacity}
                onChange={e => handleChange('maxLoadCapacity', e.target.value)}
                placeholder="5000"
                className={inputCls(errors.maxLoadCapacity)}
              />
            </Field>
            <Field label="Odometer (km) *" error={errors.odometer}>
              <input
                type="number" min="0"
                value={form.odometer}
                onChange={e => handleChange('odometer', e.target.value)}
                placeholder="0"
                className={inputCls(errors.odometer)}
              />
            </Field>
            <Field label="Acquisition Cost (₹) *" error={errors.acquisitionCost}>
              <input
                type="number" min="0"
                value={form.acquisitionCost}
                onChange={e => handleChange('acquisitionCost', e.target.value)}
                placeholder="800000"
                className={inputCls(errors.acquisitionCost)}
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
              {editVehicle ? 'Save Changes' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Vehicle"
        size="sm"
      >
        <p className={`text-sm mb-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Are you sure you want to remove{' '}
          <span className="font-mono text-orange-400 font-bold">
            {deleteTarget?.registrationNo}
          </span>{' '}
          from the fleet? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition
              ${isDark
                ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white
                       py-2.5 rounded-xl text-sm font-medium transition"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
