import { useState, useEffect, useCallback } from 'react';
import { vehiclesAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';
import { useTranslation } from '../hooks/useTranslation';
import { PageHeader, SectionHeader, EmptyState, StatusBadge, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Truck, Search, Plus, Pencil, Trash2,
  AlertCircle, PackageOpen, Eye
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

export default function Vehicles() {
  const { user, theme } = useAuthStore();
  const isDark = theme === 'dark';
  const isManager = user?.role === 'FLEET_MANAGER';
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('vehicles');
  const { t } = useTranslation();

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
    `input ${err ? 'ring-2 ring-danger' : ''}`;

  const selectCls = (err) =>
    `select ${err ? 'ring-2 ring-danger' : ''}`;

  const rowOpacity = (v) =>
    v.status === 'RETIRED' || v.status === 'IN_SHOP' ? 'opacity-70' : '';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('fleetManagement')}
        subtitle={`${vehicles.length} ${t('vehiclesInFleet')}`}
        icon={Truck}
        action={
          canCreate && (
            <button
              onClick={openAdd}
              className="btn-primary"
            >
              <Plus size={16} /> {t('addVehicle')}
            </button>
          )
        }
      />

      {isReadOnly && (
        <div style={{
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '12px',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#60a5fa'
        }}>
          <Eye size={15} className="text-blue-400 shrink-0" />
          <span>
            {t('youHaveReadOnly')}
          </span>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-panel shadow-[var(--shadow-card)] border border-[var(--border-color)]">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchRegName')}
            className="input pl-9"
          />
        </div>
        {[
          { key: 'type', opts: TYPES, label: t('allTypes') },
          { key: 'status', opts: STATUSES, label: t('allStatuses') },
          { key: 'region', opts: REGIONS, label: t('allRegions') },
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
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={t('noVehiclesFound')}
          description={
            search || Object.values(filters).some(Boolean)
              ? t('adjustFilters')
              : t('addFirstVehicle')
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-2xl bg-panel shadow-[var(--shadow-card)] p-1 border border-[var(--border-color)] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-recessed/30">
                  {[
                    { key: 'regNo', default: 'Reg No' },
                    { key: 'name', default: 'Name' },
                    { key: 'type', default: 'Type' },
                    { key: 'capacity', default: 'Capacity' },
                    { key: 'odometer', default: 'Odometer' },
                    { key: 'acqCost', default: 'Acq. Cost' },
                    { key: 'status', default: 'Status' },
                    { key: 'actions', default: 'Actions' }
                  ].map(h => <th key={h.key} className="table-header font-mono text-xs font-bold uppercase tracking-wider text-text-sub border-b border-b-shadow/50">{t(h.key) || h.default}</th>)}
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}
                    className={`table-row ${rowOpacity(v)}`}>
                    <td className="table-cell font-mono text-sm text-accent border-b border-b-shadow/20">
                      {v.registrationNo}
                    </td>
                    <td className="table-cell font-medium text-text-main border-b border-b-shadow/20">{v.name}</td>
                    <td className="table-cell font-mono text-xs text-text-main border-b border-b-shadow/20">
                      {v.type}
                    </td>
                    <td className="table-cell font-mono text-xs text-text-main border-b border-b-shadow/20">{v.maxLoadCapacity} kg</td>
                    <td className="table-cell font-mono text-xs text-text-main border-b border-b-shadow/20">{v.odometer?.toLocaleString()} km</td>
                    <td className="table-cell font-mono text-xs text-text-main border-b border-b-shadow/20">
                      ₹{v.acquisitionCost?.toLocaleString()}
                    </td>
                    <td className="table-cell border-b border-b-shadow/20"><StatusBadge status={v.status} /></td>
                    <td className="table-cell border-b border-b-shadow/20">
                      {isReadOnly ? (
                        <span className="text-xs font-mono text-blue-500 dark:text-blue-400 font-bold uppercase tracking-wider">{t('viewOnly')}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <button
                              onClick={() => openEdit(v)}
                              className="btn-ghost p-1.5"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(v)}
                              disabled={v.status === 'ON_TRIP'}
                              className="btn-ghost p-1.5 text-danger disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
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
                className={`card ${rowOpacity(v)}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-mono text-accent font-bold text-sm">
                      {v.registrationNo}
                    </span>
                    <p className="font-medium mt-0.5 text-text-main">{v.name}</p>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-3 text-text-sub font-mono">
                  <span>{t('type')}: <b className="text-text-main">{v.type}</b></span>
                  <span>{t('capacity')}: <b className="text-text-main">{v.maxLoadCapacity} kg</b></span>
                  <span>{t('odometer')}: <b className="text-text-main">{v.odometer?.toLocaleString()} km</b></span>
                  <span>{t('cost')}: <b className="text-text-main">₹{v.acquisitionCost?.toLocaleString()}</b></span>
                </div>
                {(canEdit || canDelete) && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-b-shadow/30">
                    {canEdit && (
                      <button onClick={() => openEdit(v)}
                        className="btn-ghost flex-1 py-1.5 justify-center">
                        <Pencil size={13} /> {t('edit')}
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleteTarget(v)}
                        disabled={v.status === 'ON_TRIP'}
                        className="btn-ghost flex-1 py-1.5 justify-center text-danger disabled:opacity-30 disabled:pointer-events-none">
                        <Trash2 size={13} /> {t('delete')}
                      </button>
                    )}
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
        title={editVehicle ? `${t('edit')} ${editVehicle.registrationNo}` : t('addVehicle')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`${t('registrationNo')} *`} error={errors.registrationNo}>
              <input
                value={form.registrationNo}
                onChange={e => handleChange('registrationNo', e.target.value.toUpperCase())}
                placeholder="MH-01-AB-1234"
                className={inputCls(errors.registrationNo)}
              />
            </Field>
            <Field label={`${t('vehicleName')} *`} error={errors.name}>
              <input
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="e.g. Tata Ace Gold"
                className={inputCls(errors.name)}
              />
            </Field>
            <Field label={`${t('type')} *`} error={errors.type}>
              <select
                value={form.type}
                onChange={e => handleChange('type', e.target.value)}
                className={selectCls(errors.type)}
              >
                <option value="">{t('selectType')}</option>
                {TYPES.map(tOption => <option key={tOption} value={tOption}>{tOption}</option>)}
              </select>
            </Field>
            <Field label={`${t('maxLoadCapacity')} *`} error={errors.maxLoadCapacity}>
              <input
                type="number" min="0"
                value={form.maxLoadCapacity}
                onChange={e => handleChange('maxLoadCapacity', e.target.value)}
                placeholder="5000"
                className={inputCls(errors.maxLoadCapacity)}
              />
            </Field>
            <Field label={`${t('currentOdometer')} *`} error={errors.odometer}>
              <input
                type="number" min="0"
                value={form.odometer}
                onChange={e => handleChange('odometer', e.target.value)}
                placeholder="0"
                className={inputCls(errors.odometer)}
              />
            </Field>
            <Field label={`${t('acquisitionCost')} *`} error={errors.acquisitionCost}>
              <input
                type="number" min="0"
                value={form.acquisitionCost}
                onChange={e => handleChange('acquisitionCost', e.target.value)}
                placeholder="800000"
                className={inputCls(errors.acquisitionCost)}
              />
            </Field>
            <Field label={t('region')} error={errors.region}>
              <select
                value={form.region}
                onChange={e => handleChange('region', e.target.value)}
                className={selectCls(errors.region)}
              >
                <option value="">{t('selectRegion')}</option>
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
              {t('cancel2')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {saving && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {editVehicle ? t('saveChanges') : t('addVehicle')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('delete')}
        size="sm"
      >
        <p className="text-sm mb-5 text-text-main">
          Are you sure you want to remove{' '}
          <span className="font-mono text-accent font-bold">
            {deleteTarget?.registrationNo}
          </span>{' '}
          from the fleet? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="btn-secondary flex-1"
          >
            {t('cancel2')}
          </button>
          <button
            onClick={handleDelete}
            className="btn-danger flex-1"
          >
            {t('delete')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
