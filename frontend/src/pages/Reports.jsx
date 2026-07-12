import { useQuery } from '@tanstack/react-query';
import { Download, BarChart3, FileText, TrendingUp } from 'lucide-react';
import { reportsApi } from '../api';
import { LoadingScreen, StatusBadge } from '../components/ui';
import { ExpenseCategoryChart } from '../components/charts';
import toast from 'react-hot-toast';

export default function Reports() {
  const { data: fleetData, isLoading } = useQuery({
    queryKey: ['report-fleet'],
    queryFn: () => reportsApi.fleetSummary().then((r) => r.data),
  });

  const { data: expenseData = [] } = useQuery({
    queryKey: ['report-expense'],
    queryFn: () => reportsApi.expenseSummary().then((r) => r.data),
  });

  const { data: tripData = [] } = useQuery({
    queryKey: ['report-trips'],
    queryFn: () => reportsApi.tripAnalysis().then((r) => r.data),
  });

  const downloadPDF = async () => {
    try {
      toast.loading('Generating PDF…', { id: 'pdf' });
      const resp = await reportsApi.downloadPDF();
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'fleet-summary.pdf'; a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!', { id: 'pdf' });
    } catch {
      toast.error('PDF failed', { id: 'pdf' });
    }
  };

  if (isLoading) return <LoadingScreen />;

  const totalCost = fleetData?.totalExpenses?.amount + fleetData?.totalFuel?.totalCost || 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Fleet analytics and summaries</p>
        </div>
        <button onClick={downloadPDF} className="btn-secondary" id="download-pdf-btn">
          <Download size={16} /> Export PDF
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <BarChart3 size={28} className="text-brand-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{fleetData?.vehicles?.length || 0}</p>
          <p className="text-sm text-dark-400">Total Vehicles</p>
        </div>
        <div className="card text-center">
          <TrendingUp size={28} className="text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{fleetData?.trips || 0}</p>
          <p className="text-sm text-dark-400">Total Trips</p>
        </div>
        <div className="card text-center">
          <FileText size={28} className="text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">
            ₹{Number(totalCost).toLocaleString()}
          </p>
          <p className="text-sm text-dark-400">Total Operating Cost</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Expense Breakdown</h3>
          <ExpenseCategoryChart data={expenseData} />
        </div>

        <div className="card">
          <h3 className="font-semibold text-white mb-4">Trip Status Distribution</h3>
          <div className="space-y-3 mt-6">
            {tripData.map((t) => (
              <div key={t.status} className="flex items-center justify-between p-3 bg-dark-900/50 rounded-lg">
                <StatusBadge status={t.status} />
                <span className="font-bold text-white">{t._count}</span>
              </div>
            ))}
            {!tripData.length && <p className="text-dark-400 text-sm text-center py-8">No trip data</p>}
          </div>
        </div>
      </div>

      {/* Fleet table */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Fleet Inventory</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-900/50">
                {['Reg. No.', 'Make', 'Model', 'Type', 'Status', 'Total Trips'].map((h) => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fleetData?.vehicles?.map((v) => (
                <tr key={v.id} className="table-row">
                  <td className="table-cell font-mono text-brand-400">{v.regNumber}</td>
                  <td className="table-cell">{v.make}</td>
                  <td className="table-cell">{v.model}</td>
                  <td className="table-cell">{v.type}</td>
                  <td className="table-cell"><StatusBadge status={v.status} /></td>
                  <td className="table-cell">{v._count?.trips || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
