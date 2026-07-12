const CONFIGS = {
  AVAILABLE:   { bg: 'bg-green-500/15',  text: 'text-green-400',  dot: 'bg-green-400',  label: 'Available' },
  ON_TRIP:     { bg: 'bg-blue-500/15',   text: 'text-blue-400',   dot: 'bg-blue-400',   label: 'On Trip' },
  IN_SHOP:     { bg: 'bg-amber-500/15',  text: 'text-amber-400',  dot: 'bg-amber-400',  label: 'In Shop' },
  RETIRED:     { bg: 'bg-slate-500/15',  text: 'text-slate-400',  dot: 'bg-slate-400',  label: 'Retired' },
  OFF_DUTY:    { bg: 'bg-slate-500/15',  text: 'text-slate-400',  dot: 'bg-slate-400',  label: 'Off Duty' },
  SUSPENDED:   { bg: 'bg-red-500/15',    text: 'text-red-400',    dot: 'bg-red-400',    label: 'Suspended' },
  DRAFT:       { bg: 'bg-slate-500/15',  text: 'text-slate-400',  dot: 'bg-slate-400',  label: 'Draft' },
  DISPATCHED:  { bg: 'bg-blue-500/15',   text: 'text-blue-400',   dot: 'bg-blue-400 animate-pulse', label: 'Dispatched' },
  COMPLETED:   { bg: 'bg-green-500/15',  text: 'text-green-400',  dot: 'bg-green-400',  label: 'Completed' },
  CANCELLED:   { bg: 'bg-red-500/15',    text: 'text-red-400',    dot: 'bg-red-400',    label: 'Cancelled' },
  ACTIVE:      { bg: 'bg-amber-500/15',  text: 'text-amber-400',  dot: 'bg-amber-400 animate-pulse', label: 'Active' },
  CLOSED:      { bg: 'bg-green-500/15',  text: 'text-green-400',  dot: 'bg-green-400',  label: 'Closed' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = CONFIGS[status] || CONFIGS.AVAILABLE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                      rounded-full font-medium font-mono
                      ${cfg.bg} ${cfg.text}
                      ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
