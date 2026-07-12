const CONFIGS = {
  AVAILABLE:   { bg: 'rgba(34, 197, 94, 0.1)',  text: 'text-green-600 dark:text-green-400',  dot: 'bg-green-500 dark:bg-green-400 shadow-[0_0_8px_#22c55e]',  label: 'Available' },
  ON_TRIP:     { bg: 'rgba(59, 130, 246, 0.1)',   text: 'text-blue-600 dark:text-blue-400',   dot: 'bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_#3b82f6]',   label: 'On Trip' },
  IN_SHOP:     { bg: 'rgba(245, 158, 11, 0.1)',  text: 'text-amber-600 dark:text-amber-400',  dot: 'bg-amber-500 dark:bg-amber-400 shadow-[0_0_8px_#f59e0b]',  label: 'In Shop' },
  RETIRED:     { bg: 'rgba(100, 116, 139, 0.1)',  text: 'text-slate-600 dark:text-slate-400',  dot: 'bg-slate-500 dark:bg-slate-400',  label: 'Retired' },
  OFF_DUTY:    { bg: 'rgba(100, 116, 139, 0.1)',  text: 'text-slate-600 dark:text-slate-400',  dot: 'bg-slate-500 dark:bg-slate-400',  label: 'Off Duty' },
  SUSPENDED:   { bg: 'rgba(239, 68, 68, 0.1)',    text: 'text-red-600 dark:text-red-400',    dot: 'bg-red-500 dark:bg-red-400 shadow-[0_0_8px_#ef4444]',    label: 'Suspended' },
  DRAFT:       { bg: 'rgba(100, 116, 139, 0.1)',  text: 'text-slate-600 dark:text-slate-400',  dot: 'bg-slate-500 dark:bg-slate-400',  label: 'Draft' },
  DISPATCHED:  { bg: 'rgba(59, 130, 246, 0.1)',   text: 'text-blue-600 dark:text-blue-400',   dot: 'bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_#3b82f6] animate-pulse', label: 'Dispatched' },
  COMPLETED:   { bg: 'rgba(34, 197, 94, 0.1)',  text: 'text-green-600 dark:text-green-400',  dot: 'bg-green-500 dark:bg-green-400 shadow-[0_0_8px_#22c55e]',  label: 'Completed' },
  CANCELLED:   { bg: 'rgba(239, 68, 68, 0.1)',    text: 'text-red-600 dark:text-red-400',    dot: 'bg-red-500 dark:bg-red-400 shadow-[0_0_8px_#ef4444]',    label: 'Cancelled' },
  ACTIVE:      { bg: 'rgba(245, 158, 11, 0.1)',  text: 'text-amber-600 dark:text-amber-400',  dot: 'bg-amber-500 dark:bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse', label: 'Active' },
  CLOSED:      { bg: 'rgba(34, 197, 94, 0.1)',  text: 'text-green-600 dark:text-green-400',  dot: 'bg-green-500 dark:bg-green-400 shadow-[0_0_8px_#22c55e]',  label: 'Closed' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = CONFIGS[status] || CONFIGS.AVAILABLE;
  return (
    <span 
      style={{ backgroundColor: cfg.bg }}
      className={`inline-flex items-center gap-1.5 px-3 py-1
                      rounded-full font-bold font-mono border border-black/10 dark:border-white/5
                      ${cfg.text}
                      ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label.toUpperCase()}
    </span>
  );
}
