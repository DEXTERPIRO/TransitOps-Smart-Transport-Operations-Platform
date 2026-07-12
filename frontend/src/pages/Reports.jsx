import { useState, useEffect, useCallback } from 'react';
import { reportsAPI, vehiclesAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell
} from 'recharts';
import {
  BarChart3, Download, FileText, ChevronDown,
  ChevronUp, TrendingUp, Fuel, Activity, DollarSign,
  AlertCircle
} from 'lucide-react';

const SORT_KEYS = ['trips','distance','fuelUsed','fuelEfficiency','revenue','opCost','roi'];

function StatCard({ label, value, icon: Icon, color, sub }) {
  const colors = {
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    green:  'text-green-400 bg-green-500/10 border-green-500/20',
    blue:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };
  return (
    <div className="rounded-2xl border bg-slate-900 border-slate-800 p-5
                    hover:-translate-y-0.5 hover:shadow-lg transition-all">
      <div className={`w-10 h-10 rounded-xl border flex items-center
                       justify-center mb-3 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="font-mono text-2xl font-bold">{value}</div>
      <div className="text-sm text-slate-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`px-3 py-2 rounded-xl border text-xs
      ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ₹{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function Reports() {
  const { theme } = useAuthStore();
  const isDark = theme === 'dark';

  const [analytics, setAnalytics] = useState(null);
  const [vehicles, setVehicles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [exporting, setExporting] = useState('');
  const [csvOpen, setCsvOpen]     = useState(false);

  const [filters, setFilters] = useState({
    from: '', to: '', vehicleId: ''
  });

  const [sortKey, setSortKey]   = useState('revenue');
  const [sortAsc, setSortAsc]   = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsData, vehiclesData] = await Promise.all([
        reportsAPI.getAnalytics(filters),
        vehiclesAPI.getAll(),
      ]);
      setAnalytics(analyticsData);
      setVehicles(vehiclesData);
    } catch {
      toast.error('Failed to load analytics');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // ─── Exports ─────────────────────────────────────────────────────────────
  const handleCSV = async (type) => {
    setExporting(type);
    setCsvOpen(false);
    try {
      const blob = await reportsAPI.exportCSV(type, filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type} CSV exported`);
    } catch {
      toast.error('Export failed');
    } finally { setExporting(''); }
  };

  const handlePDF = async () => {
    setExporting('pdf');
    try {
      const blob = await reportsAPI.exportPDF(filters);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
      toast.success('PDF report opened');
    } catch {
      toast.error('PDF export failed');
    } finally { setExporting(''); }
  };

  // ─── Sort vehicle stats ───────────────────────────────────────────────────
  const vehicleStats = [...(analytics?.vehicleStats || [])].sort((a, b) => {
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    return sortAsc ? va - vb : vb - va;
  });

  const top5ROI = [...vehicleStats]
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <ChevronDown size={12} className="opacity-30" />;
    return sortAsc
      ? <ChevronUp size={12} className="text-orange-400" />
      : <ChevronDown size={12} className="text-orange-400" />;
  };

  const inputCls =
    `bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white
     text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30
     focus:border-orange-500 transition`;

  const thCls = (k) =>
    `px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold cursor-pointer
     select-none transition
     ${isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
               : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`;

  const tdCls = `px-4 py-3 text-sm`;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-800" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-slate-800" />
      </div>
    );
  }

  const { summary, monthlyRevenue } = analytics || {};

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Reports</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Fleet performance, cost analysis, and data export
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          {/* CSV dropdown */}
          <div className="relative">
            <button
              onClick={() => setCsvOpen(o => !o)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border
                          text-sm font-medium transition
                ${isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Download size={15} />
              Export CSV
              <ChevronDown size={13} className={`transition-transform ${csvOpen ? 'rotate-180' : ''}`} />
            </button>
            {csvOpen && (
              <div className={`absolute right-0 top-full mt-1 z-20 w-40 rounded-xl
                               border shadow-xl overflow-hidden
                ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                {['trips', 'vehicles', 'fuel', 'expenses'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleCSV(type)}
                    disabled={!!exporting}
                    className={`w-full text-left px-4 py-2.5 text-sm capitalize
                                transition disabled:opacity-50
                      ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    {exporting === type
                      ? <span className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-current/30 border-t-current
                                           rounded-full animate-spin" />
                          Exporting...
                        </span>
                      : `${type.charAt(0).toUpperCase() + type.slice(1)} Report`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PDF */}
          <button
            onClick={handlePDF}
            disabled={!!exporting}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600
                       text-white px-4 py-2.5 rounded-xl text-sm font-medium
                       transition shadow-md shadow-orange-500/20 disabled:opacity-50"
          >
            {exporting === 'pdf'
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white
                                rounded-full animate-spin" />
              : <FileText size={15} />}
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className={`flex flex-wrap gap-3 p-4 rounded-2xl border
        ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">From</label>
          <input type="date" value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            className={inputCls} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">To</label>
          <input type="date" value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            className={inputCls} />
        </div>
        <select
          value={filters.vehicleId}
          onChange={e => setFilters(f => ({ ...f, vehicleId: e.target.value }))}
          className={inputCls}
        >
          <option value="">All Vehicles</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>
              {v.registrationNo} — {v.name}
            </option>
          ))}
        </select>
        <button
          onClick={fetchAnalytics}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2
                     rounded-xl text-sm font-medium transition"
        >
          Apply
        </button>
        {(filters.from || filters.to || filters.vehicleId) && (
          <button
            onClick={() => setFilters({ from: '', to: '', vehicleId: '' })}
            className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2
                       rounded-xl border border-slate-700 hover:border-slate-600 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── KPI Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Avg Fuel Efficiency"
          value={`${summary?.avgFuelEfficiency?.toFixed(1) || '—'} km/L`}
          icon={Fuel} color="amber"
          sub="Across active fleet"
        />
        <StatCard
          label="Fleet Utilization"
          value={`${summary?.fleetUtilization?.toFixed(0) || '—'}%`}
          icon={Activity} color="blue"
          sub="Trips completed"
        />
        <StatCard
          label="Operational Cost"
          value={`₹${(summary?.totalOpCost || 0).toLocaleString()}`}
          icon={DollarSign} color="orange"
          sub="Fuel + Maintenance"
        />
        <StatCard
          label="Avg Vehicle ROI"
          value={`${summary?.avgROI?.toFixed(1) || '—'}%`}
          icon={TrendingUp} color="green"
          sub="Revenue / Op Cost"
        />
      </div>

      {/* ── Charts Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Revenue Bar Chart */}
        <div className={`rounded-2xl border p-5
          ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-orange-400" />
            Monthly Revenue
          </h3>
          {monthlyRevenue?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3"
                  stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="revenue" name="Revenue" fill="#f97316"
                     radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center
                            text-slate-500 text-sm">
              No revenue data in selected range
            </div>
          )}
        </div>

        {/* Top 5 ROI Horizontal Bar */}
        <div className={`rounded-2xl border p-5
          ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-green-400" />
            Top 5 Vehicles by ROI
          </h3>
          {top5ROI.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top5ROI} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3"
                  stroke={isDark ? '#1e293b' : '#f1f5f9'} horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `${v.toFixed(0)}%`} />
                <YAxis type="category" dataKey="registrationNo" width={90}
                  tick={{ fill: '#f97316', fontSize: 11, fontFamily: 'monospace' }}
                  axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: isDark ? '#1e293b' : '#fff',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '8px', fontSize: '12px'
                  }}
                  formatter={(v) => [`${v.toFixed(1)}%`, 'ROI']}
                />
                <Bar dataKey="roi" radius={[0, 6, 6, 0]} name="ROI">
                  {top5ROI.map((entry, i) => (
                    <Cell key={i}
                      fill={entry.roi >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center
                            text-slate-500 text-sm">
              No vehicle stats available
            </div>
          )}
        </div>
      </div>

      {/* ── Vehicle Stats Table ──────────────────────────────────────────── */}
      {vehicleStats.length > 0 && (
        <div className={`rounded-2xl border overflow-hidden
          ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="px-5 py-4 flex items-center justify-between border-b border-slate-800">
            <h3 className="font-semibold">Vehicle Performance Stats</h3>
            <span className="text-xs text-slate-500 font-mono">
              Click headers to sort
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr>
                  <th className={thCls(null)}>Vehicle</th>
                  {[
                    { key: 'trips',          label: 'Trips' },
                    { key: 'distance',       label: 'Distance' },
                    { key: 'fuelUsed',       label: 'Fuel Used' },
                    { key: 'fuelEfficiency', label: 'Fuel Eff.' },
                    { key: 'revenue',        label: 'Revenue' },
                    { key: 'opCost',         label: 'Op Cost' },
                    { key: 'roi',            label: 'ROI %' },
                  ].map(({ key, label }) => (
                    <th key={key} className={thCls(key)}
                        onClick={() => handleSort(key)}>
                      <span className="flex items-center gap-1">
                        {label} <SortIcon k={key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {vehicleStats.map(v => {
                  const roiPositive = (v.roi ?? 0) >= 0;
                  return (
                    <tr key={v.vehicleId || v.id}
                      className={`transition-colors
                        ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                      <td className={tdCls}>
                        <div className="font-mono text-orange-400 text-xs font-bold">
                          {v.registrationNo}
                        </div>
                        <div className="text-xs text-slate-500">{v.name}</div>
                      </td>
                      <td className={`${tdCls} font-mono text-xs`}>{v.trips ?? 0}</td>
                      <td className={`${tdCls} font-mono text-xs`}>
                        {v.distance?.toLocaleString() ?? 0} km
                      </td>
                      <td className={`${tdCls} font-mono text-xs`}>
                        {v.fuelUsed?.toFixed(1) ?? '—'} L
                      </td>
                      <td className={`${tdCls} font-mono text-xs`}>
                        {v.fuelEfficiency?.toFixed(1) ?? '—'} km/L
                      </td>
                      <td className={`${tdCls} font-mono text-xs text-green-400`}>
                        ₹{(v.revenue || 0).toLocaleString()}
                      </td>
                      <td className={`${tdCls} font-mono text-xs text-red-400`}>
                        ₹{(v.opCost || 0).toLocaleString()}
                      </td>
                      <td className={`${tdCls} font-mono text-xs font-bold
                        ${roiPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {roiPositive ? '+' : ''}{(v.roi ?? 0).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
