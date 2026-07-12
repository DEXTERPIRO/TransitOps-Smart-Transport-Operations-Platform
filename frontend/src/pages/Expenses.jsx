import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CreditCard, Trash2 } from 'lucide-react';
import { expensesApi, vehiclesApi } from '../api';
import { Modal, Table, Pagination, EmptyState, FormField, StatCard } from '../components/ui';
import { ExpenseCategoryChart } from '../components/charts';
import toast from 'react-hot-toast';

const CATEGORIES = ['FUEL', 'MAINTENANCE', 'INSURANCE', 'TOLL', 'DRIVER_SALARY', 'PERMIT', 'MISCELLANEOUS'];

const defaultForm = { vehicleId: '', category: 'FUEL', amount: '', date: new Date().toISOString().split('T')[0], description: '' };

export default function Expenses() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [catFilter, setCatFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page, catFilter],
    queryFn: () => expensesApi.getAll({ page, limit: 15, category: catFilter || undefined }).then((r) => r.data),
  });

  const { data: summary = [] } = useQuery({
    queryKey: ['expense-summary'],
    queryFn: () => expensesApi.getSummary().then((r) => r.data),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: () => vehiclesApi.getAll({ limit: 100 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      toast.success('Expense recorded');
      qc.invalidateQueries(['expenses']);
      qc.invalidateQueries(['expense-summary']);
      setModalOpen(false);
      setForm(defaultForm);
    },
    onError: () => toast.error('Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['expenses']); },
  });

  const totalExpenses = summary.reduce((acc, s) => acc + (s._sum?.amount || 0), 0);

  const columns = [
    { key: 'date',        label: 'Date',       render: (v) => new Date(v).toLocaleDateString('en-IN') },
    { key: 'category',    label: 'Category',   render: (v) => <span className="badge-orange">{v}</span> },
    { key: 'amount',      label: 'Amount',     render: (v) => `₹${Number(v).toLocaleString()}` },
    { key: 'description', label: 'Description' },
    { key: 'vehicle',     label: 'Vehicle',    render: (v) => v?.regNumber || '—' },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(row.id); }}
                className="btn-ghost p-1.5 text-red-400"><Trash2 size={14} /></button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Total: ₹{totalExpenses.toLocaleString()}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={16} /> Add Expense</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Expenses by Category</h3>
          <ExpenseCategoryChart data={summary} />
        </div>
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            {summary.map((s) => (
              <div key={s.category} className="flex items-center justify-between">
                <span className="text-sm text-dark-300">{s.category}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full"
                         style={{ width: `${((s._sum?.amount || 0) / totalExpenses) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium text-white w-24 text-right">
                    ₹{Number(s._sum?.amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card flex gap-3">
        <select className="select w-48" value={catFilter}
                onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {data?.expenses?.length === 0
          ? <EmptyState icon={CreditCard} title="No expenses recorded" />
          : <Table columns={columns} data={data?.expenses} loading={isLoading} />
        }
      </div>
      <Pagination page={page} pages={data?.pages} onPageChange={setPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, amount: +form.amount }); }}
              className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <select className="select" value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Amount (₹)">
              <input className="input" type="number" step="0.01" value={form.amount} required
                     onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </FormField>
            <FormField label="Date">
              <input className="input" type="date" value={form.date} required
                     onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Vehicle (optional)">
              <select className="select" value={form.vehicleId}
                      onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value || undefined }))}>
                <option value="">— None —</option>
                {vehiclesData?.vehicles?.map((v) => <option key={v.id} value={v.id}>{v.regNumber}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Description">
            <input className="input" value={form.description}
                   onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Saving…' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
