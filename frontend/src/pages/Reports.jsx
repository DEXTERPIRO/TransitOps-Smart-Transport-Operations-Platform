import { useState, useEffect, useCallback, useRef } from 'react';
import { reportsAPI, vehiclesAPI } from '../api';
import { PageHeader, StatCard, EmptyState } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, Legend,
  RadialBarChart, RadialBar
} from 'recharts';
import {
  BarChart3, Download, FileText, ChevronDown,
  ChevronUp, TrendingUp, Fuel, Activity, IndianRupee,
  AlertCircle
} from 'lucide-react';

const SORT_KEYS = ['trips','distance','fuelUsed','fuelEfficiency','revenue','opCost','roi'];


const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--foreground)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '10px 14px',
      boxShadow: 'var(--shadow-floating)',
      fontFamily: 'Inter, sans-serif',
      minWidth: '140px'
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
          <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600 }}>
            {p.name === 'revenue' || p.name === 'Revenue' ? `₹${Number(p.value).toLocaleString()}` : `${Number(p.value).toFixed(1)}${p.name === 'ROI' ? '%' : ''}`}
          </span>
        </div>
      ))}
    </div>
  );
};

const ROITooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div style={{
      background: 'var(--foreground)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '10px 14px',
      boxShadow: 'var(--shadow-floating)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
      <p style={{ color: Number(v) >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '13px', fontWeight: 700 }}>
        {Number(v) >= 0 ? '+' : ''}{Number(v).toFixed(1)}% ROI
      </p>
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
  const dropdownRef               = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setCsvOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      ? <ChevronUp size={12} className="text-accent" />
      : <ChevronDown size={12} className="text-accent" />;
  };

  const inputCls = 'input';

  const thCls = (k) =>
    `table-header font-mono text-xs font-bold uppercase tracking-wider text-text-sub border-b border-[var(--border-color)] cursor-pointer select-none transition hover:text-text-main`;

  const tdCls = `table-cell text-xs text-text-main border-b border-[var(--border-color)]`;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-recessed animate-pulse shadow-[var(--shadow-recessed)]" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-recessed animate-pulse" />
      </div>
    );
  }

  const { summary, monthlyRevenue } = analytics || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Reports"
        subtitle="Fleet performance, cost analysis, and data export"
        icon={BarChart3}
        action={
          <div className="flex gap-2">
            {/* CSV dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setCsvOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--background)] text-text-main text-sm font-medium transition hover:bg-[var(--muted)] shadow-[var(--shadow-recessed)]"
              >
                <Download size={15} />
                Export CSV
                <ChevronDown size={13} className={`transition-transform ${csvOpen ? 'rotate-180' : ''}`} />
              </button>
              {csvOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-[var(--border-color)] bg-[var(--foreground)] shadow-[var(--shadow-floating)] overflow-hidden font-mono">
                  {['trips', 'vehicles', 'fuel', 'expenses'].map(type => (
                    <button
                      key={type}
                      onClick={() => handleCSV(type)}
                      disabled={!!exporting}
                      className="w-full text-left px-4 py-2.5 text-xs capitalize transition disabled:opacity-50 hover:bg-[var(--muted)]/50 text-text-main"
                    >
                      {exporting === type
                        ? <span className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            Exporting...
                          </span>
                        : `${type} Report`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PDF */}
            <button
              onClick={handlePDF}
              disabled={!!exporting}
              className="btn-primary bg-accent text-white px-4 py-2.5 text-sm font-medium"
            >
              {exporting === 'pdf'
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <FileText size={15} />}
              Export PDF
            </button>
          </div>
        }
      />

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-panel shadow-[var(--shadow-card)] border border-[var(--border-color)] font-mono">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-text-sub font-bold uppercase tracking-wider">From</label>
          <input type="date" value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            className={inputCls} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-text-sub font-bold uppercase tracking-wider">To</label>
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
          className="btn-primary py-2 px-4 text-sm"
        >
          Apply
        </button>
        {(filters.from || filters.to || filters.vehicleId) && (
          <button
            onClick={() => setFilters({ from: '', to: '', vehicleId: '' })}
            className="btn-secondary py-2 px-3 text-xs"
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
          icon={Fuel} color="orange"
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
          icon={IndianRupee} color="purple"
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

        {/* Monthly Revenue Area Chart */}
        <div className="rounded-2xl bg-panel shadow-[var(--shadow-card)] p-5 border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="text-accent" />
              <h3 className="font-bold text-sm font-mono uppercase tracking-wider text-text-main">Monthly Revenue</h3>
            </div>
            {monthlyRevenue?.length > 0 && (
              <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-lg border border-accent/20">
                ₹{monthlyRevenue.reduce((s, m) => s + (m.revenue || 0), 0).toLocaleString()} total
              </span>
            )}
          </div>
          {monthlyRevenue?.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={isDark ? 0.45 : 0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4"
                  stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                  width={44}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--foreground)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-text-sub">
              <BarChart3 size={28} className="opacity-20" />
              <span className="text-xs font-mono uppercase tracking-wider">No revenue data in selected range</span>
            </div>
          )}
        </div>

        {/* Top 5 ROI Horizontal Bar — gradient colored bars */}
        <div className="rounded-2xl bg-panel shadow-[var(--shadow-card)] p-5 border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-accent" />
              <h3 className="font-bold text-sm font-mono uppercase tracking-wider text-text-main">Top 5 Vehicles by ROI</h3>
            </div>
          </div>
          {top5ROI.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={top5ROI} layout="vertical" barCategoryGap="20%" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="roiGradPos" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="roiGradNeg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--danger)" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4"
                  stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `${v.toFixed(0)}%`}
                />
                <YAxis
                  type="category" dataKey="registrationNo" width={68}
                  tick={{ fill: 'var(--accent)', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 700 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<ROITooltip />} />
                <Bar dataKey="roi" name="ROI" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {top5ROI.map((entry, i) => (
                    <Cell key={i} fill={entry.roi >= 0 ? 'url(#roiGradPos)' : 'url(#roiGradNeg)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-text-sub">
              <TrendingUp size={28} className="opacity-20" />
              <span className="text-xs font-mono uppercase tracking-wider">No vehicle stats available</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Cost Breakdown Row ───────────────────────────────────────────── */}
      {vehicleStats.length > 0 && (() => {
        const fuelTotal  = vehicleStats.reduce((s, v) => s + (v.fuelCost  || 0), 0);
        const maintTotal = vehicleStats.reduce((s, v) => s + (v.maintenanceCost || 0), 0);
        const otherTotal = vehicleStats.reduce((s, v) => s + (v.otherExpenses   || 0), 0);
        const grandOpCost = fuelTotal + maintTotal + otherTotal;
        const pieData = [
          { name: 'Fuel',        value: fuelTotal,  color: '#f59e0b' },
          { name: 'Maintenance', value: maintTotal, color: '#f87171' },
          { name: 'Other',       value: otherTotal, color: '#a78bfa' },
        ].filter(d => d.value > 0);
        if (!pieData.length) return null;
        const RADIAN = Math.PI / 180;
        const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
          if (percent < 0.07) return null;
          const r = innerRadius + (outerRadius - innerRadius) * 0.55;
          const x = cx + r * Math.cos(-midAngle * RADIAN);
          const y = cy + r * Math.sin(-midAngle * RADIAN);
          return (
            <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
              style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
              {`${(percent * 100).toFixed(0)}%`}
            </text>
          );
        };
        return (
          <div className="rounded-2xl bg-panel shadow-[var(--shadow-card)] p-5 border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <IndianRupee size={15} className="text-accent" />
                <h3 className="font-bold text-sm font-mono uppercase tracking-wider text-text-main">Operational Cost Breakdown</h3>
              </div>
              <span className="text-xs font-mono font-bold text-text-sub">
                Total: <span className="text-danger">₹{grandOpCost.toLocaleString()}</span>
              </span>
            </div>
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderLabel}
                    isAnimationActive
                    animationBegin={0}
                    animationDuration={900}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`₹${Number(v).toLocaleString()}`, '']}
                    contentStyle={{
                      background: 'var(--foreground)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 w-full">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-3 p-3 rounded-xl bg-recessed/40 border border-[var(--border-color)]">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color, boxShadow: `0 0 8px ${d.color}` }} />
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-sub">{d.name}</div>
                      <div className="text-sm font-bold font-mono text-text-main">₹{d.value.toLocaleString()}</div>
                    </div>
                    <div className="ml-auto text-xs font-mono font-bold" style={{ color: d.color }}>
                      {grandOpCost > 0 ? `${((d.value / grandOpCost) * 100).toFixed(0)}%` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {vehicleStats.length > 0 ? (
        <div className="rounded-2xl bg-panel shadow-[var(--shadow-card)] p-1 border border-[var(--border-color)] overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-b-shadow/30 font-mono">
            <h3 className="font-semibold text-text-main">Vehicle Performance Stats</h3>
            <span className="text-[10px] text-text-sub uppercase tracking-wider font-bold">
              Click headers to sort
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-recessed/30">
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
              <tbody className="divide-y divide-b-shadow/20">
                {vehicleStats.map(v => {
                  const roiPositive = (v.roi ?? 0) >= 0;
                  return (
                    <tr key={v.vehicleId || v.id} className="table-row">
                      <td className={tdCls}>
                        <div className="font-mono text-accent text-xs font-bold">
                          {v.registrationNo}
                        </div>
                        <div className="text-xs text-text-sub">{v.name}</div>
                      </td>
                      <td className={`${tdCls} font-mono text-xs`}>{v.trips ?? 0}</td>
                      <td className={`${tdCls} font-mono text-xs`}>
                        {v.distance?.toLocaleString() ?? 0} km
                      </td>
                      <td className={`${tdCls} font-mono text-xs`}>
                        {v.fuelUsed !== undefined && v.fuelUsed !== null
                          ? `${Number(v.fuelUsed).toFixed(1)} L`
                          : '—'}
                      </td>
                      <td className={`${tdCls} font-mono text-xs`}>
                        {v.fuelEfficiency !== undefined && v.fuelEfficiency !== null
                          ? `${Number(v.fuelEfficiency).toFixed(1)} km/L`
                          : '—'}
                      </td>
                      <td className={`${tdCls} font-mono text-xs text-success font-bold`}>
                        ₹{(v.revenue || 0).toLocaleString()}
                      </td>
                      <td className={`${tdCls} font-mono text-xs text-danger font-bold`}>
                        ₹{(v.opCost || 0).toLocaleString()}
                      </td>
                      <td className={`${tdCls} font-mono text-xs font-bold
                        ${roiPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {roiPositive ? '+' : ''}{Number(v.roi ?? 0).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No Performance Data"
          description="There are no completed trips in the selected range to compile vehicle performance analytics."
        />
      )}
    </div>
  );
}
