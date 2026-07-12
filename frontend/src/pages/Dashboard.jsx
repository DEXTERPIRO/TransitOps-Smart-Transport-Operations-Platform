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
    type: '', region: ''
  });
  const { theme } = useAuthStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

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
      toast('New vehicle added to fleet', { icon: '🚛' });
    });
    socket.on('trip-dispatched', (trip) => {
      fetchData();
      toast(`Trip ${trip.tripCode} dispatched!`, { icon: '🚀' });
    });
    socket.on('trip-completed', (trip) => {
      fetchData();
      toast.success(`Trip ${trip.tripCode} completed!`);
    });
    socket.on('trip-cancelled', () => fetchData());
    socket.on('maintenance-created', ({ vehicleName }) => {
      fetchData();
      toast(`${vehicleName} sent to maintenance`, { icon: '🔧' });
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
        title="Operations Dashboard"
        subtitle="Real-time fleet overview and KPIs"
        action={
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'type', options: ['VAN','TRUCK','BUS','BIKE','CAR'], label: 'Type: All' },
              { key: 'region', options: ['North','South','East','West'], label: 'Region: All' },
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
            <strong>{kpis.expiringLicenses} driver(s)</strong> have
            licenses expiring within 30 days.
            Check the Drivers page.
          </span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Vehicles" value={kpis?.activeVehicles || 0}
          icon={Truck} color="orange" sub="Excluding retired" />
        <StatCard label="Available Now" value={kpis?.availableVehicles || 0}
          icon={CheckCircle} color="green" />
        <StatCard label="Active Trips" value={kpis?.activeTrips || 0}
          icon={Route} color="blue" sub="Currently dispatched" />
        <StatCard label="Pending Trips" value={kpis?.pendingTrips || 0}
          icon={Activity} color="amber" sub="Draft status" />
        <StatCard label="In Maintenance" value={kpis?.inShopVehicles || 0}
          icon={Wrench} color="red" />
        <StatCard label="Drivers On Duty" value={kpis?.driversOnDuty || 0}
          icon={Users} color="purple" />
        <StatCard label="Fleet Utilization"
          value={`${kpis?.fleetUtilization || 0}%`}
          icon={TrendingUp} color="orange"
          sub={`${kpis?.onTripVehicles || 0} of ${kpis?.totalVehicles || 0} vehicles`} />
        <StatCard label="Retired" value={kpis?.retiredVehicles || 0}
          icon={Truck} color="purple" />
      </div>

      {/* Predictive maintenance alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <SectionHeader icon={AlertTriangle} title="Predictive Maintenance Alerts" className="mb-2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map(alert => (
              <div key={alert.vehicleId}
                   className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-warning/20 bg-warning/5 text-text-main shadow-[var(--shadow-card)]">
                <div className="flex items-start gap-3">
                  <Wrench size={18} className="text-warning shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-text-main">
                      {alert.vehicleName} ({alert.registrationNo})
                    </h4>
                    <p className="text-xs mt-1 text-text-sub">
                      Traveled <strong>{alert.kmSinceService.toLocaleString()} km</strong> since last service.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/maintenance', { state: { vehicleId: alert.vehicleId } })}
                  className="btn-primary px-3 py-1.5 text-xs whitespace-nowrap self-end sm:self-auto"
                >
                  Schedule Maintenance
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
          <SectionHeader icon={Activity} title="Fleet Status Distribution" />
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value"
                       nameKey="name" cx="50%" cy="50%"
                       outerRadius={80} innerRadius={40}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--background)',
                      border: `1px solid var(--border-shadow)`,
                      borderRadius: '8px', fontSize: '12px', color: 'var(--text-main)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {pieData.map(d => (
                  <div key={d.name}
                    className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full"
                         style={{ background: d.color }} />
                    <span className="text-text-sub font-mono">
                      {d.name} ({d.value})
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-text-sub text-sm font-mono uppercase tracking-wider">
              No vehicle data
            </div>
          )}
        </div>

        {/* Recent Trips */}
        <div className="rounded-2xl bg-panel shadow-[var(--shadow-card)] p-5 border border-[var(--border-color)]">
          <SectionHeader icon={Route} title="Recent Trips" />
          {recentTrips?.length > 0 ? (
            <div className="space-y-3">
              {recentTrips.map(trip => (
                <div key={trip.id}
                  className="flex items-center justify-between p-3 rounded-xl text-sm bg-chassis shadow-[var(--shadow-recessed)]">
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
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-text-sub gap-2 font-mono uppercase tracking-wider">
              <Route size={32} className="opacity-30" />
              <span className="text-sm">No trips yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
