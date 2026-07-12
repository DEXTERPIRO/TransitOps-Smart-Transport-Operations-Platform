import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Fuel as FuelIcon, TrendingUp } from 'lucide-react';
import { fuelApi, vehiclesApi } from '../api';
import { Modal, Table, Pagination, EmptyState, FormField, StatCard } from '../components/ui';
import { FuelConsumptionChart } from '../components/charts';
import toast from 'react-hot-toast';

const defaultForm = {
  vehicleId: '', date: new Date().toISOString().split('T')[0],
  liters: '', pricePerLtr: '', odometer: '', station: '', fuelType: 'DIESEL',
};

export default function Fuel() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ['fuel', page],
    queryFn: () => fuelApi.getAll({ page, limit: 15 }).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['fuel-stats'],
    queryFn: () => fuelApi.getStats().then((r) => r.data),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: () => vehiclesApi.getAll({ limit: 100 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: fuelApi.create,
    onSuccess: () => {
      toast.success('Fuel log added');
      qc.invalidateQueries(['fuel']);
      qc.invalidateQueries(['fuel-stats']);
      setModalOpen(false);
      setForm(defaultForm);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const columns = [
    { key: 'vehicle',     label: 'Vehicle',   render: (v) => v?.regNumber || '—' },
    { key: 'date',        label: 'Date',      render: (v) => new Date(v).toLocaleDateString('en-IN') },
    { key: 'liters',      label: 'Liters',    render: (v) => `${v}L` },
    { key: 'pricePerLtr', label: 'Price/L',   render: (v) => `₹${v}` },
    { key: 'totalCost',   label: 'Total',     render: (v) => `₹${Number(v).toLocaleString()}` },
    { key: 'odometer',    label: 'Odometer',  render: (v) => `${Number(v).toLocaleString()} km` },
    { key: 'station',     label: 'Station' },
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fuel Logs</h1>
          <p className="page-subtitle">Track fuel consumption and costs</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={16} /> Add Fuel Log
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={FuelIcon}   label="Total Fuel"   value={`${stats?._sum?.liters?.toFixed(0) || 0}L`}  color="blue" />
        <StatCard icon={TrendingUp} label="Total Cost"   value={`₹${Number(stats?._sum?.totalCost || 0).toLocaleString()}`} color="brand" />
        <StatCard icon={FuelIcon}   label="Avg Price/L"  value={`₹${stats?._avg?.pricePerLtr?.toFixed(2) || 0}`} color="green" />
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Recent Fuel Fills</h3>
        <FuelConsumptionChart data={data?.logs?.slice(0, 8) || []} />
      </div>

      <div className="card p-0 overflow-hidden">
        {data?.logs?.length === 0
          ? <EmptyState icon={FuelIcon} title="No fuel logs yet" />
          : <Table columns={columns} data={data?.logs} loading={isLoading} />
        }
      </div>
      <Pagination page={page} pages={data?.pages} onPageChange={setPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Fuel Log">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, liters: +form.liters, pricePerLtr: +form.pricePerLtr, odometer: +form.odometer }); }}
              className="space-y-4">
          <FormField label="Vehicle">
            <select className="select" value={form.vehicleId} required
                    onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}>
              <option value="">Select vehicle</option>
              {vehiclesData?.vehicles?.map((v) => (
                <option key={v.id} value={v.id}>{v.regNumber}</option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date">
              <input className="input" type="date" value={form.date} required
                     onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Liters">
              <input className="input" type="number" step="0.01" value={form.liters} required
                     onChange={(e) => setForm((f) => ({ ...f, liters: e.target.value }))} />
            </FormField>
            <FormField label="Price / Liter (₹)">
              <input className="input" type="number" step="0.01" value={form.pricePerLtr} required
                     onChange={(e) => setForm((f) => ({ ...f, pricePerLtr: e.target.value }))} />
            </FormField>
            <FormField label="Odometer (km)">
              <input className="input" type="number" value={form.odometer} required
                     onChange={(e) => setForm((f) => ({ ...f, odometer: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Station">
            <input className="input" value={form.station}
                   onChange={(e) => setForm((f) => ({ ...f, station: e.target.value }))} />
          </FormField>
          {form.liters && form.pricePerLtr && (
            <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-lg text-sm">
              <span className="text-dark-400">Total: </span>
              <span className="font-bold text-brand-400">₹{(+form.liters * +form.pricePerLtr).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Saving…' : 'Add Log'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
