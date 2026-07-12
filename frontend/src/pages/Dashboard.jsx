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
import KPICard from '../components/ui/KPICard';
import StatusBadge from '../components/ui/StatusBadge';
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
    type: '', status: '', region: ''
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
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`h-28 rounded-2xl
              ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
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
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center
                      justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Operations Dashboard</h1>
          <p className={`text-sm mt-0.5
            ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Real-time fleet overview and KPIs
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'type', options: ['VAN','TRUCK','BUS','BIKE','CAR'], label: 'Type: All' },
            { key: 'region', options: ['North','South','East','West'], label: 'Region: All' },
          ].map(f => (
            <select
              key={f.key}
              value={filters[f.key]}
              onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
              className={`text-xs px-3 py-2 rounded-xl border font-mono
                          focus:outline-none focus:ring-2 focus:ring-orange-500/30
                ${isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-700'}`}
            >
              <option value="">{f.label}</option>
              {f.options.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* Expiring license alert */}
      {kpis?.expiringLicenses > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/10 border
                        border-amber-500/30 text-amber-400 rounded-xl
                        px-4 py-3 text-sm">
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
        <KPICard label="Active Vehicles" value={kpis?.activeVehicles || 0}
          icon={Truck} color="orange" sub="Excluding retired" />
        <KPICard label="Available Now" value={kpis?.availableVehicles || 0}
          icon={CheckCircle} color="green" />
        <KPICard label="Active Trips" value={kpis?.activeTrips || 0}
          icon={Route} color="blue" sub="Currently dispatched" />
        <KPICard label="Pending Trips" value={kpis?.pendingTrips || 0}
          icon={Activity} color="amber" sub="Draft status" />
        <KPICard label="In Maintenance" value={kpis?.inShopVehicles || 0}
          icon={Wrench} color="red" />
        <KPICard label="Drivers On Duty" value={kpis?.driversOnDuty || 0}
          icon={Users} color="purple" />
        <KPICard label="Fleet Utilization"
          value={`${kpis?.fleetUtilization || 0}%`}
          icon={TrendingUp} color="orange"
          sub={`${kpis?.onTripVehicles || 0} of ${kpis?.totalVehicles || 0} vehicles`} />
        <KPICard label="Retired" value={kpis?.retiredVehicles || 0}
          icon={Truck} color="purple" />
      </div>

      {/* Predictive maintenance alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Predictive Maintenance Alerts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map(alert => (
              <div key={alert.vehicleId}
                   className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border text-sm
                     ${isDark
                       ? 'border-amber-500/20 bg-amber-500/5 text-slate-300'
                       : 'border-amber-200 bg-amber-50/50 text-slate-700'}`}>
                <div className="flex items-start gap-3">
                  <Wrench size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {alert.vehicleName} ({alert.registrationNo})
                    </h4>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Traveled <strong>{alert.kmSinceService.toLocaleString()} km</strong> since last service.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/maintenance', { state: { vehicleId: alert.vehicleId } })}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs transition whitespace-nowrap self-end sm:self-auto"
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
        <div className={`rounded-2xl border p-5
          ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="font-semibold mb-4">Fleet Status Distribution</h3>
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
                      background: isDark ? '#1e293b' : '#fff',
                      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                      borderRadius: '8px', fontSize: '12px'
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
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                      {d.name} ({d.value})
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center
                            text-slate-500 text-sm">
              No vehicle data
            </div>
          )}
        </div>

        {/* Recent Trips */}
        <div className={`rounded-2xl border p-5
          ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="font-semibold mb-4">Recent Trips</h3>
          {recentTrips?.length > 0 ? (
            <div className="space-y-3">
              {recentTrips.map(trip => (
                <div key={trip.id}
                  className={`flex items-center justify-between p-3
                               rounded-xl text-sm
                    ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-xs
                                    text-orange-400">
                      {trip.tripCode}
                    </div>
                    <div className="font-medium truncate mt-0.5">
                      {trip.source} → {trip.destination}
                    </div>
                    <div className={`text-xs mt-0.5
                      ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {trip.vehicle.registrationNo} · {trip.driver.name}
                    </div>
                  </div>
                  <StatusBadge status={trip.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center
                            text-slate-500 gap-2">
              <Route size={32} className="opacity-30" />
              <span className="text-sm">No trips yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
