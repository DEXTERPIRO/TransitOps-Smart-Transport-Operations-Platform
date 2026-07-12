import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Truck, Search, Edit2, Trash2 } from 'lucide-react';
import { vehiclesApi } from '../api';
import { StatusBadge, Modal, Table, Pagination, EmptyState, FormField } from '../components/ui';
import toast from 'react-hot-toast';

const VEHICLE_TYPES = ['BUS', 'MINIBUS', 'VAN', 'TRUCK', 'CAR'];
const FUEL_TYPES    = ['DIESEL', 'PETROL', 'CNG', 'ELECTRIC', 'HYBRID'];
const STATUSES      = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'];

const defaultForm = {
  regNumber: '', make: '', model: '', year: new Date().getFullYear(),
  type: 'BUS', fuelType: 'DIESEL', capacity: 50, status: 'ACTIVE',
  color: '', vin: '',
};

export default function Vehicles() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', page, search, statusFilter],
    queryFn: () => vehiclesApi.getAll({ page, limit: 15, search, status: statusFilter || undefined }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (d) => editing ? vehiclesApi.update(editing.id, d) : vehiclesApi.create(d),
    onSuccess: () => {
      toast.success(editing ? 'Vehicle updated' : 'Vehicle created');
      qc.invalidateQueries(['vehicles']);
      setModalOpen(false);
      setEditing(null);
      setForm(defaultForm);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: vehiclesApi.remove,
    onSuccess: () => { toast.success('Vehicle deleted'); qc.invalidateQueries(['vehicles']); },
    onError: () => toast.error('Delete failed'),
  });

  const openCreate = () => { setEditing(null); setForm(defaultForm); setModalOpen(true); };
  const openEdit   = (v)  => { setEditing(v); setForm({ ...v }); setModalOpen(true); };

  const handleSubmit = (e) => { e.preventDefault(); saveMutation.mutate(form); };

  const columns = [
    { key: 'regNumber', label: 'Reg. Number' },
    { key: 'make',      label: 'Make / Model', render: (_, r) => `${r.make} ${r.model} (${r.year})` },
    { key: 'type',      label: 'Type' },
    { key: 'capacity',  label: 'Capacity', render: (v) => v ? `${v} seats` : '—' },
    { key: 'fuelType',  label: 'Fuel' },
    { key: 'status',    label: 'Status', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)} className="btn-ghost p-1.5"><Edit2 size={14} /></button>
          <button
            onClick={() => { if (confirm(`Delete ${row.regNumber}?`)) deleteMutation.mutate(row.id); }}
            className="btn-ghost p-1.5 text-red-400 hover:text-red-300"
          ><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicles</h1>
          <p className="page-subtitle">{data?.total || 0} vehicles in fleet</p>
        </div>
        <button id="add-vehicle-btn" onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            className="input pl-9"
            placeholder="Search by reg, make, model…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="select w-40" value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {data?.vehicles?.length === 0
          ? <EmptyState icon={Truck} title="No vehicles found" description="Add your first vehicle to get started." action={<button onClick={openCreate} className="btn-primary"><Plus size={15}/> Add Vehicle</button>} />
          : <Table columns={columns} data={data?.vehicles} loading={isLoading} />
        }
      </div>

      <Pagination page={page} pages={data?.pages} onPageChange={setPage} />

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
             title={editing ? 'Edit Vehicle' : 'Add Vehicle'} size="lg">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <FormField label="Reg. Number">
            <input className="input" value={form.regNumber} required
                   onChange={(e) => setForm((f) => ({ ...f, regNumber: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Make">
            <input className="input" value={form.make} required
                   onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))} />
          </FormField>
          <FormField label="Model">
            <input className="input" value={form.model} required
                   onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
          </FormField>
          <FormField label="Year">
            <input className="input" type="number" min="2000" max="2030" value={form.year} required
                   onChange={(e) => setForm((f) => ({ ...f, year: +e.target.value }))} />
          </FormField>
          <FormField label="Type">
            <select className="select" value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Fuel Type">
            <select className="select" value={form.fuelType}
                    onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))}>
              {FUEL_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Capacity (seats)">
            <input className="input" type="number" value={form.capacity}
                   onChange={(e) => setForm((f) => ({ ...f, capacity: +e.target.value }))} />
          </FormField>
          <FormField label="Status">
            <select className="select" value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Color">
            <input className="input" value={form.color}
                   onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
          </FormField>
          <FormField label="VIN">
            <input className="input" value={form.vin}
                   onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))} />
          </FormField>
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving…' : editing ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
