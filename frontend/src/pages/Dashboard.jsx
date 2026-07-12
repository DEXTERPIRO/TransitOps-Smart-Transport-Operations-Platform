import { useQuery } from '@tanstack/react-query';
import { Truck, Users, MapPin, Wrench, TrendingUp, Activity } from 'lucide-react';
import { dashboardApi } from '../api';
import { StatCard, StatusBadge, LoadingScreen } from '../components/ui';
import { ExpenseTrendChart, VehicleStatusChart } from '../components/charts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: recentTrips = [] } = useQuery({
    queryKey: ['recent-trips'],
    queryFn: () => dashboardApi.getRecentTrips().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: expenseTrend = [] } = useQuery({
    queryKey: ['expense-trend'],
    queryFn: () => dashboardApi.getExpenseTrend().then((r) => r.data),
  });

  const { data: activeTrips = [] } = useQuery({
    queryKey: ['active-trips-map'],
    queryFn: () => dashboardApi.getActiveTrips().then((r) => r.data),
    refetchInterval: 15_000,
  });

  if (isLoading) return <LoadingScreen />;

  const vehicleChartData = stats
    ? [
        { name: 'Active',      value: stats.vehicles.active },
        { name: 'Maintenance', value: stats.vehicles.maintenance },
        { name: 'Inactive',    value: stats.vehicles.total - stats.vehicles.active - stats.vehicles.maintenance },
      ].filter((d) => d.value > 0)
    : [];

  const formatCurrency = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Truck}    label="Total Vehicles"  value={stats?.vehicles.total}     sub={`${stats?.vehicles.active} active`}  color="brand" />
        <StatCard icon={Users}    label="Drivers"         value={stats?.drivers.total}      sub={`${stats?.drivers.active} active`}   color="blue" />
        <StatCard icon={MapPin}   label="Today's Trips"   value={stats?.trips.today}        sub={`${stats?.trips.active} running`}    color="green" />
        <StatCard icon={Wrench}   label="Maint. Pending"  value={stats?.maintenance.pending} sub="needs attention"                    color="yellow" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white">Expense Trend</h3>
              <p className="text-xs text-dark-400">Last 6 months</p>
            </div>
            <TrendingUp size={18} className="text-brand-400" />
          </div>
          <ExpenseTrendChart data={expenseTrend} />
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white">Fleet Status</h3>
              <p className="text-xs text-dark-400">By condition</p>
            </div>
            <Activity size={18} className="text-brand-400" />
          </div>
          <VehicleStatusChart data={vehicleChartData} />
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Total expenses</span>
              <span className="font-medium text-white">{formatCurrency(stats?.financials.totalExpenses || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Fuel cost</span>
              <span className="font-medium text-white">{formatCurrency(stats?.financials.totalFuelCost || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map + Recent trips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live map */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-dark-700">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <h3 className="font-semibold text-white">Live Trip Map</h3>
            <span className="ml-auto text-xs text-dark-400">{activeTrips.length} active</span>
          </div>
          <div style={{ height: 300 }}>
            <MapContainer
              center={[19.076, 72.877]}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap"
              />
              {activeTrips.map((trip) => (
                trip.currentLat && (
                  <Marker key={trip.id} position={[trip.currentLat, trip.currentLng]}>
                    <Popup>
                      <div className="text-xs">
                        <b>{trip.vehicle?.regNumber}</b><br />
                        Driver: {trip.driver?.name}<br />
                        Route: {trip.route?.name || '—'}
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Recent trips */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Recent Trips</h3>
          <div className="space-y-3">
            {recentTrips.slice(0, 6).map((trip) => (
              <div key={trip.id} className="flex items-center gap-3 p-3 rounded-lg bg-dark-900/50 hover:bg-dark-700/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{trip.tripNumber}</p>
                  <p className="text-xs text-dark-400 truncate">
                    {trip.vehicle?.regNumber} · {trip.driver?.name}
                  </p>
                </div>
                <StatusBadge status={trip.status} />
              </div>
            ))}
            {!recentTrips.length && (
              <p className="text-center text-dark-400 text-sm py-8">No trips recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
