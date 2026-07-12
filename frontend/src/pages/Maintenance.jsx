import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wrench, Edit2, Trash2 } from 'lucide-react';
import { maintenanceApi, vehiclesApi } from '../api';
import { StatusBadge, Modal, Table, Pagination, EmptyState, FormField } from '../components/ui';
import toast from 'react-hot-toast';

const TYPES    = ['SCHEDULED', 'EMERGENCY', 'INSPECTION', 'REPAIR'];
const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const defaultForm = {
  vehicleId: '', type: 'SCHEDULED', status: 'PENDING',
  title: '', description: '', scheduledDate: '',
  cost: '', vendor: '',
};

export default function Maintenance() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', page, statusFilter],
    queryFn: () => maintenanceApi.getAll({ page, limit: 15, status: statusFilter || undefined }).then((r) => r.data),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: () => vehiclesApi.getAll({ limit: 100 }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (d) => editing ? maintenanceApi.update(editing.id, d) : maintenanceApi.create(d),
    onSuccess: () => {
      toast.success(editing ? 'Record updated' : 'Record created');
      qc.invalidateQueries(['maintenance']);
      setModalOpen(false);
      setEditing(null);
      setForm(defaultForm);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: maintenanceApi.remove,
    onSuccess: () => { toast.success('Record deleted'); qc.invalidateQueries(['maintenance']); },
  });

  const openEdit = (r) => {
    setEditing(r);
    setForm({ ...r, scheduledDate: r.scheduledDate?.split('T')[0], cost: r.cost || '' });
    setModalOpen(true);
  };

  const columns = [
    { key: 'vehicle',       label: 'Vehicle',   render: (v) => v?.regNumber || '—' },
    { key: 'title',         label: 'Title' },
    { key: 'type',          label: 'Type',      render: (v) => <StatusBadge status={v} /> },
    { key: 'scheduledDate', label: 'Date',      render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'cost',          label: 'Cost',      render: (v) => v ? `₹${Number(v).toLocaleString()}` : '—' },
    { key: 'vendor',        label: 'Vendor' },
    { key: 'status',        label: 'Status',    render: (v) => <StatusBadge status={v} /> },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row)} className="btn-ghost p-1.5"><Edit2 size={14} /></button>
          <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(row.id); }}
                  className="btn-ghost p-1.5 text-red-400"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">{data?.total || 0} records</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(defaultForm); setModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> Add Record
        </button>
      </div>

      <div className="card flex gap-3">
        <select className="select w-48" value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {data?.records?.length === 0
          ? <EmptyState icon={Wrench} title="No maintenance records" />
          : <Table columns={columns} data={data?.records} loading={isLoading} />
        }
      </div>
      <Pagination page={page} pages={data?.pages} onPageChange={setPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
             title={editing ? 'Edit Record' : 'Add Maintenance Record'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, cost: form.cost ? +form.cost : undefined }); }}
              className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FormField label="Vehicle">
              <select className="select" value={form.vehicleId} required
                      onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}>
                <option value="">Select vehicle</option>
                {vehiclesData?.vehicles?.map((v) => (
                  <option key={v.id} value={v.id}>{v.regNumber} — {v.make} {v.model}</option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Title">
              <input className="input" value={form.title} required
                     onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Type">
            <select className="select" value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select className="select" value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Scheduled Date">
            <input className="input" type="date" value={form.scheduledDate} required
                   onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
          </FormField>
          <FormField label="Cost (₹)">
            <input className="input" type="number" value={form.cost}
                   onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Vendor">
              <input className="input" value={form.vendor}
                     onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Description">
              <textarea className="input h-20 resize-none" value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </FormField>
          </div>
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving…' : editing ? 'Update' : 'Add Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
