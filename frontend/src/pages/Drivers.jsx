import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Search, Edit2, Trash2, Star } from 'lucide-react';
import { driversApi } from '../api';
import { StatusBadge, Modal, Table, Pagination, EmptyState, FormField } from '../components/ui';
import toast from 'react-hot-toast';

const STATUSES = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'SUSPENDED'];

const defaultForm = {
  employeeId: '', name: '', email: '', phone: '',
  licenseNumber: '', licenseExpiry: '', status: 'ACTIVE', experience: 0,
};

export default function Drivers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', page, search, statusFilter],
    queryFn: () => driversApi.getAll({ page, limit: 15, search, status: statusFilter || undefined }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (d) => editing ? driversApi.update(editing.id, d) : driversApi.create(d),
    onSuccess: () => {
      toast.success(editing ? 'Driver updated' : 'Driver added');
      qc.invalidateQueries(['drivers']);
      setModalOpen(false);
      setEditing(null);
      setForm(defaultForm);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: driversApi.remove,
    onSuccess: () => { toast.success('Driver removed'); qc.invalidateQueries(['drivers']); },
  });

  const openCreate = () => { setEditing(null); setForm(defaultForm); setModalOpen(true); };
  const openEdit   = (d)  => { setEditing(d); setForm({ ...d, licenseExpiry: d.licenseExpiry?.split('T')[0] }); setModalOpen(true); };

  const columns = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'name',       label: 'Name' },
    { key: 'phone',      label: 'Phone' },
    { key: 'licenseNumber', label: 'License No.' },
    { key: 'experience', label: 'Experience', render: (v) => `${v} yrs` },
    {
      key: 'rating', label: 'Rating',
      render: (v) => (
        <span className="flex items-center gap-1 text-yellow-400">
          <Star size={13} fill="currentColor" /> {v?.toFixed(1)}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row)} className="btn-ghost p-1.5"><Edit2 size={14} /></button>
          <button onClick={() => { if (confirm(`Remove ${row.name}?`)) deleteMutation.mutate(row.id); }}
                  className="btn-ghost p-1.5 text-red-400"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Drivers</h1>
          <p className="page-subtitle">{data?.total || 0} drivers registered</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Driver</button>
      </div>

      <div className="card flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input className="input pl-9" placeholder="Search by name or ID…" value={search}
                 onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="select w-40" value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {data?.drivers?.length === 0
          ? <EmptyState icon={Users} title="No drivers found" action={<button onClick={openCreate} className="btn-primary"><Plus size={15}/> Add Driver</button>} />
          : <Table columns={columns} data={data?.drivers} loading={isLoading} />
        }
      </div>
      <Pagination page={page} pages={data?.pages} onPageChange={setPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
             title={editing ? 'Edit Driver' : 'Add Driver'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
              className="grid grid-cols-2 gap-4">
          {[
            { key: 'employeeId',    label: 'Employee ID',   type: 'text' },
            { key: 'name',         label: 'Full Name',     type: 'text' },
            { key: 'email',        label: 'Email',         type: 'email' },
            { key: 'phone',        label: 'Phone',         type: 'tel' },
            { key: 'licenseNumber',label: 'License No.',   type: 'text' },
            { key: 'licenseExpiry',label: 'License Expiry',type: 'date' },
            { key: 'experience',   label: 'Experience (yrs)', type: 'number' },
          ].map(({ key, label, type }) => (
            <FormField key={key} label={label}>
              <input className="input" type={type} value={form[key] || ''}
                     onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} required={key !== 'experience'} />
            </FormField>
          ))}
          <FormField label="Status">
            <select className="select" value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </FormField>
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving…' : editing ? 'Update' : 'Add Driver'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
