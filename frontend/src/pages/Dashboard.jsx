import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { dashboardAPI } from '../api';
import {
  Truck, Users, Route, Wrench, AlertTriangle,
  TrendingUp, Activity, CheckCircle
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { PageHeader, SectionHeader, StatCard, StatusBadge } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  AVAILABLE: '#22c55e', ON_TRIP: '#3b82f6',
  IN_SHOP: '#f59e0b', RETIRED: '#64748b'
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '', status: '', region: ''
  });
  const { theme } = useAuthStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchData = useCallback(async () => {
    try {
      const [res, alertsRes] = await Promise.all([
        dashboardAPI.getKPIs(filters),
        dashboardAPI.getMaintenanceAlerts()
      ]);
      setData(res);
      setAlerts(alertsRes);
    } catch (e) {
      toast.error('Failed to load dashboard data');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time Socket.io updates
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socket.emit('join-dashboard');

    socket.on('vehicle-added', () => {
      fetchData();
      toast('New vehicle added to fleet', { icon: <Truck size={16} className="text-accent" /> });
    });
    socket.on('trip-dispatched', (trip) => {
      fetchData();
      toast(`Trip ${trip.tripCode} dispatched!`, { icon: <Route size={16} className="text-accent" /> });
    });
    socket.on('trip-completed', (trip) => {
      fetchData();
      toast.success(`Trip ${trip.tripCode} completed!`);
    });
    socket.on('trip-cancelled', () => fetchData());
    socket.on('maintenance-created', ({ vehicleName }) => {
      fetchData();
      toast(`${vehicleName} sent to maintenance`, { icon: <Wrench size={16} className="text-warning" /> });
    });
    socket.on('maintenance-closed', () => fetchData());

    return () => socket.disconnect();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-recessed animate-pulse shadow-[var(--shadow-recessed)]" />
          ))}
        </div>
      </div>
    );
  }

  const { kpis, recentTrips, vehicleStatusBreakdown } = data || {};

  const pieData = vehicleStatusBreakdown?.map(v => ({
    name: v.status, value: v.count,
    color: STATUS_COLORS[v.status] || '#64748b'
  })) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('operationsDashboard')}
        subtitle={t('realtimeFleetOverview')}
        action={
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'type', options: ['VAN', 'TRUCK', 'BUS', 'BIKE', 'CAR'], label: t('allTypes') },
              { key: 'region', options: ['North', 'South', 'East', 'West'], label: t('allRegions') },
            ].map(f => (
              <select
                key={f.key}
                value={filters[f.key]}
                onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
                className="select w-auto py-1.5 px-3 border border-[var(--border-color)]"
              >
                <option value="">{f.label}</option>
                {f.options.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ))}
          </div>
        }
      />

      {/* Expiring license alert */}
      {kpis?.expiringLicenses > 0 && (
        <div className="flex items-center gap-3 bg-warning/10 border border-warning/30 text-warning rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={16} />
          <span>
            <strong>{kpis.expiringLicenses} driver(s)</strong> {t('suspendedExpiredHidden')}
          </span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('activeVehicles')} value={kpis?.activeVehicles || 0}
          icon={Truck} color="orange" sub={t('excludingRetired')} />
        <StatCard label={t('availableNow')} value={kpis?.availableVehicles || 0}
          icon={CheckCircle} color="green" />
        <StatCard label={t('activeTrips')} value={kpis?.activeTrips || 0}
          icon={Route} color="blue" sub={t('currentlyDispatched')} />
        <StatCard label={t('pendingTrips')} value={kpis?.pendingTrips || 0}
          icon={Activity} color="amber" sub={t('draftStatus')} />
        <StatCard label={t('inMaintenance')} value={kpis?.inShopVehicles || 0}
          icon={Wrench} color="red" />
        <StatCard label={t('driversOnDuty')} value={kpis?.driversOnDuty || 0}
          icon={Users} color="purple" />
        <StatCard label={t('fleetUtilization')}
          value={`${kpis?.fleetUtilization || 0}%`}
          icon={TrendingUp} color="orange"
          sub={`${kpis?.onTripVehicles || 0} ${t('to')} ${kpis?.totalVehicles || 0} ${t('vehicles')}`} />
        <StatCard label={t('retired')} value={kpis?.retiredVehicles || 0}
          icon={Truck} color="purple" />
      </div>

      {/* Predictive maintenance alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <SectionHeader icon={AlertTriangle} title={t('predictiveMaintenanceAlerts')} className="mb-2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map(alert => (
              <div key={alert.vehicleId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border-l-4 border-l-warning border-y border-r border-[var(--border-color)] bg-panel hover:bg-panel/85 hover:-translate-y-0.5 transition-all duration-200 text-text-main shadow-[var(--shadow-card)] hover:shadow-[0_0_15px_rgba(245,158,11,0.08)]">
                <div className="flex items-start gap-3">
                  <Wrench size={18} className="text-warning shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-text-main">
                      {alert.vehicleName} ({alert.registrationNo})
                    </h4>
                    <p className="text-xs mt-1 text-text-sub">
                      {t('traveledSinceService').replace('km since last service', `${alert.kmSinceService.toLocaleString()} km ${t('traveledSinceService')}`)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/maintenance', { state: { vehicleId: alert.vehicleId } })}
                  className="btn-primary px-3 py-1.5 text-xs whitespace-nowrap self-end sm:self-auto"
                >
                  {t('scheduleMaintenance')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Fleet Status Pie Chart */}
        <div className="rounded-2xl bg-panel shadow-[var(--shadow-card)] p-5 border border-[var(--border-color)]">
          <SectionHeader icon={Activity} title={t('fleetStatusDistribution')} />
          {pieData.length > 0 ? (
            <>
              <div className="relative flex justify-center items-center h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value"
                      nameKey="name" cx="50%" cy="50%"
                      outerRadius={80} innerRadius={55}
                      paddingAngle={3}
                      isAnimationActive
                      animationBegin={0}
                      animationDuration={800}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--foreground)',
                        border: `1px solid var(--border-color)`,
                        borderRadius: '10px', fontSize: '12px', color: 'var(--text-primary)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black font-mono text-[var(--text-primary)]">
                    {pieData.reduce((acc, curr) => acc + curr.value, 0)}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest font-extrabold text-[var(--text-muted)]">
                    {t('vehicles')}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {pieData.map(d => (
                  <div key={d.name}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--muted)]/10 border border-[var(--border-color)] text-xs font-semibold shadow-[var(--shadow-recessed)]">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: d.color, boxShadow: `0 0 6px ${d.color}` }} />
                    <span className="text-[var(--text-muted)] font-mono">
                      {d.name} ({d.value})
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-text-sub text-sm font-mono uppercase tracking-wider">
              {t('noData')}
            </div>
          )}
        </div>

        {/* Recent Trips */}
        <div className="rounded-2xl bg-panel shadow-[var(--shadow-card)] p-5 border border-[var(--border-color)]">
          <SectionHeader icon={Route} title={t('recentTrips')} />
          {recentTrips?.length > 0 ? (
            <div className="space-y-3">
              {recentTrips.map(trip => {
                const isCompleted = trip.status === 'COMPLETED';
                const isOnTrip = trip.status === 'ON_TRIP';
                const statusBorder = isCompleted
                  ? 'border-l-success'
                  : isOnTrip
                  ? 'border-l-blue-500'
                  : 'border-l-warning';

                return (
                  <div key={trip.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl text-sm bg-[var(--muted)]/20 hover:bg-[var(--muted)]/30 hover:-translate-y-0.5 border-l-4 ${statusBorder} border-y border-r border-[var(--border-color)] transition-all duration-200 shadow-[var(--shadow-recessed)]`}>
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-xs text-accent">
                        {trip.tripCode}
                      </div>
                      <div className="font-medium truncate mt-0.5 text-text-main">
                        {trip.source} → {trip.destination}
                      </div>
                      <div className="text-xs mt-0.5 text-text-sub">
                        {trip.vehicle.registrationNo} · {trip.driver.name}
                      </div>
                    </div>
                    <StatusBadge status={trip.status} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-text-sub gap-2 font-mono uppercase tracking-wider">
              <Route size={32} className="opacity-30" />
              <span className="text-sm">{t('noTrips')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
