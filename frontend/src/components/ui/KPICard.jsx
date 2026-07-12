import { useAuthStore } from '../../store/authStore';

export default function KPICard({
  label, value, icon: Icon, color = 'orange',
  sub, trend
}) {
  const { theme } = useAuthStore();
  const isDark = theme === 'dark';

  const colors = {
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    blue:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
    green:  'text-green-400 bg-green-500/10 border-green-500/20',
    red:    'text-red-400 bg-red-500/10 border-red-500/20',
    amber:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className={`rounded-2xl border p-5 transition-all
                     hover:-translate-y-0.5 hover:shadow-lg
      ${isDark
        ? 'bg-slate-900 border-slate-800'
        : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center
                         justify-center ${colors[color]}`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-mono font-medium
            ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="font-mono text-3xl font-bold mt-1">{value}</div>
      <div className={`text-sm mt-1
        ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
      </div>
      {sub && (
        <div className={`text-xs mt-1
          ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {sub}
        </div>
      )}
    </div>
  );
}
