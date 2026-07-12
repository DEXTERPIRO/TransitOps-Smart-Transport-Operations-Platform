import { useAuthStore } from '../../store/authStore';

export default function KPICard({
  label, value, icon: Icon, color = 'orange',
  sub, trend
}) {
  const { theme } = useAuthStore();
  const isDark = theme === 'dark';

  const screwBg = isDark
    ? 'radial-gradient(circle at 10px 10px, rgba(0,0,0,0.5) 1.5px, transparent 2px), radial-gradient(circle at calc(100% - 10px) 10px, rgba(0,0,0,0.5) 1.5px, transparent 2px), radial-gradient(circle at 10px 10px, rgba(255,255,255,0.03) 2px, transparent 2.5px)'
    : 'radial-gradient(circle at 10px 10px, rgba(0,0,0,0.15) 1.5px, transparent 2px), radial-gradient(circle at calc(100% - 10px) 10px, rgba(0,0,0,0.15) 1.5px, transparent 2px)';

  const colors = {
    orange: 'text-orange-500 dark:text-orange-400',
    blue:   'text-blue-500 dark:text-blue-400',
    green:  'text-green-500 dark:text-green-400',
    red:    'text-red-500 dark:text-red-400',
    amber:  'text-amber-500 dark:text-amber-400',
    purple: 'text-purple-500 dark:text-purple-400',
  };

  return (
    <div 
      style={{ backgroundImage: screwBg }}
      className="relative rounded-2xl p-5 pt-7 transition-all duration-300
                 bg-[var(--background)] shadow-[var(--shadow-card)]
                 hover:-translate-y-1 hover:shadow-[var(--shadow-floating)] border border-transparent">
      
      {/* Vent line decoration at top of card */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex gap-1">
        <div className="h-1 w-3 rounded-full bg-[var(--muted)] shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_1px_1px_1px_rgba(0,0,0,0.5)]" />
        <div className="h-1 w-3 rounded-full bg-[var(--muted)] shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_1px_1px_1px_rgba(0,0,0,0.5)]" />
        <div className="h-1 w-3 rounded-full bg-[var(--muted)] shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_1px_1px_1px_rgba(0,0,0,0.5)]" />
      </div>

      <div className="flex items-start justify-between mb-3">
        {/* Recessed Icon Well */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center 
                         bg-[var(--background)] shadow-[var(--shadow-recessed)] ${colors[color]}`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md
                            bg-[var(--background)] shadow-[var(--shadow-recessed)]
            ${trend >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="font-mono text-3xl font-extrabold mt-1 text-[var(--text-primary)]">{value}</div>
      <div className="text-xs uppercase font-mono tracking-wider font-bold mt-1 text-[var(--text-muted)]">
        {label}
      </div>
      {sub && (
        <div className="text-[10px] font-mono tracking-wide mt-1 text-[var(--text-muted)] opacity-70">
          {sub}
        </div>
      )}
    </div>
  );
}
