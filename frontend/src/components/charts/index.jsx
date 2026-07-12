import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const BRAND_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#eab308', '#ef4444'];

const tooltipStyle = {
  contentStyle: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '10px',
    color: '#f1f5f9',
    fontSize: 13,
  },
  cursor: { fill: 'rgba(249, 115, 22, 0.05)' },
};

export const ExpenseTrendChart = ({ data = [] }) => (
  <ResponsiveContainer width="100%" height={260}>
    <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
      <defs>
        <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
      <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false}
             tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
      <Tooltip {...tooltipStyle} formatter={(v) => [`₹${v.toLocaleString()}`, '']} />
      <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
      <Area type="monotone" dataKey="total" stroke="#f97316" strokeWidth={2}
            fill="url(#totalGrad)" name="Total" />
      <Area type="monotone" dataKey="fuel" stroke="#3b82f6" strokeWidth={2}
            fill="url(#fuelGrad)" name="Fuel" />
    </AreaChart>
  </ResponsiveContainer>
);

export const VehicleStatusChart = ({ data = [] }) => (
  <ResponsiveContainer width="100%" height={200}>
    <PieChart>
      <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
           paddingAngle={3} dataKey="value">
        {data.map((_, i) => (
          <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
        ))}
      </Pie>
      <Tooltip {...tooltipStyle} />
      <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
    </PieChart>
  </ResponsiveContainer>
);

export const ExpenseCategoryChart = ({ data = [] }) => (
  <ResponsiveContainer width="100%" height={260}>
    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
             tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
      <YAxis type="category" dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }}
             axisLine={false} tickLine={false} width={100} />
      <Tooltip {...tooltipStyle} formatter={(v) => [`₹${v.toLocaleString()}`, 'Amount']} />
      <Bar dataKey="_sum.amount" fill="#f97316" radius={[0, 6, 6, 0]} name="Amount" />
    </BarChart>
  </ResponsiveContainer>
);

export const FuelConsumptionChart = ({ data = [] }) => (
  <ResponsiveContainer width="100%" height={220}>
    <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
      <XAxis dataKey="station" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
             tickFormatter={(v) => `${v}L`} />
      <Tooltip {...tooltipStyle} formatter={(v) => [`${v}L`, 'Fuel']} />
      <Bar dataKey="liters" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Liters" />
    </BarChart>
  </ResponsiveContainer>
);
