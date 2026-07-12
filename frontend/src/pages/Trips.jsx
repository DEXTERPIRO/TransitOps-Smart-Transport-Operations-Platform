import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, Edit2, Trash2 } from 'lucide-react';
import { tripsApi, vehiclesApi, driversApi } from '../api';
import { StatusBadge, Modal, Table, Pagination, EmptyState, FormField } from '../components/ui';
import toast from 'react-hot-toast';

const STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED'];

const defaultForm = {
  vehicleId: '', driverId: '', status: 'SCHEDULED',
  scheduledStart: '', scheduledEnd: '', notes: '',
};

export default function Trips() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ['trips', page, statusFilter],
    queryFn: () => tripsApi.getAll({ page, limit: 15, status: statusFilter || undefined }).then((r) => r.data),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: () => vehiclesApi.getAll({ limit: 100 }).then((r) => r.data),
  });

  const { data: driversData } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: () => driversApi.getAll({ limit: 100 }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (d) => editing ? tripsApi.update(editing.id, d) : tripsApi.create(d),
    onSuccess: () => {
      toast.success(editing ? 'Trip updated' : 'Trip created');
      qc.invalidateQueries(['trips']);
      setModalOpen(false);
      setEditing(null);
      setForm(defaultForm);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: tripsApi.remove,
    onSuccess: () => { toast.success('Trip deleted'); qc.invalidateQueries(['trips']); },
  });

  const openCreate = () => { setEditing(null); setForm(defaultForm); setModalOpen(true); };
  const openEdit   = (t)  => {
    setEditing(t);
    setForm({
      ...t,
      scheduledStart: t.scheduledStart?.slice(0, 16),
      scheduledEnd:   t.scheduledEnd?.slice(0, 16),
    });
    setModalOpen(true);
  };

  const columns = [
    { key: 'tripNumber', label: 'Trip #' },
    { key: 'vehicle',    label: 'Vehicle',  render: (v) => v?.regNumber || '—' },
    { key: 'driver',     label: 'Driver',   render: (v) => v?.name || '—' },
    { key: 'route',      label: 'Route',    render: (v) => v?.name || '—' },
    {
      key: 'scheduledStart', label: 'Scheduled',
      render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—',
    },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row)} className="btn-ghost p-1.5"><Edit2 size={14} /></button>
          <button onClick={() => { if (confirm('Delete trip?')) deleteMutation.mutate(row.id); }}
                  className="btn-ghost p-1.5 text-red-400"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trips</h1>
          <p className="page-subtitle">{data?.total || 0} total trips</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Schedule Trip</button>
      </div>

      <div className="card flex gap-3">
        <select className="select w-48" value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {data?.trips?.length === 0
          ? <EmptyState icon={MapPin} title="No trips found" action={<button onClick={openCreate} className="btn-primary"><Plus size={15}/> Schedule Trip</button>} />
          : <Table columns={columns} data={data?.trips} loading={isLoading} />
        }
      </div>
      <Pagination page={page} pages={data?.pages} onPageChange={setPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
             title={editing ? 'Edit Trip' : 'Schedule Trip'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
              className="grid grid-cols-2 gap-4">
          <FormField label="Vehicle">
            <select className="select" value={form.vehicleId} required
                    onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}>
              <option value="">Select vehicle</option>
              {vehiclesData?.vehicles?.map((v) => (
                <option key={v.id} value={v.id}>{v.regNumber} — {v.make} {v.model}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Driver">
            <select className="select" value={form.driverId} required
                    onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}>
              <option value="">Select driver</option>
              {driversData?.drivers?.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.employeeId})</option>
              ))}
            </select>
          </FormField>
          <FormField label="Scheduled Start">
            <input className="input" type="datetime-local" value={form.scheduledStart} required
                   onChange={(e) => setForm((f) => ({ ...f, scheduledStart: e.target.value }))} />
          </FormField>
          <FormField label="Scheduled End">
            <input className="input" type="datetime-local" value={form.scheduledEnd} required
                   onChange={(e) => setForm((f) => ({ ...f, scheduledEnd: e.target.value }))} />
          </FormField>
          <FormField label="Status">
            <select className="select" value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Notes">
            <input className="input" value={form.notes}
                   onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </FormField>
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving…' : editing ? 'Update' : 'Create Trip'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
