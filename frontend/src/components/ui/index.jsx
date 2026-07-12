// Shared UI building blocks
import { Bot } from 'lucide-react';

export { default as Modal } from './Modal';
export { default as StatusBadge } from './StatusBadge';

// ─── Spinner ────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md' }) => {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizeMap[size]} border-2 border-recessed border-t-accent rounded-full animate-spin`} />
  );
};

// ─── LoadingScreen ───────────────────────────────────────────────────────────
export const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
    <Spinner size="lg" />
    <p className="text-[var(--text-muted)] text-xs uppercase font-mono font-bold tracking-wider">Loading…</p>
  </div>
);

// ─── PageHeader ──────────────────────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, action, icon: Icon }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="w-9 h-9 rounded-xl bg-[var(--background)] border border-[var(--border-color)] shadow-[var(--shadow-recessed)] flex items-center justify-center text-[var(--accent)] shrink-0">
          <Icon size={18} />
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold font-mono text-[var(--text-primary)]">{title}</h1>
        {subtitle && (
          <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-muted)] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
  </div>
);

// ─── SectionHeader ───────────────────────────────────────────────────────────
export const SectionHeader = ({ icon: Icon, title, badge, action, className = '' }) => (
  <div className={`flex items-center justify-between mb-4 ${className}`}>
    <h3 className="font-bold text-sm font-mono uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
      {Icon && <Icon size={15} className="text-[var(--accent)]" />}
      {title}
      {badge !== undefined && (
        <span className="text-xs font-mono text-[var(--text-muted)] normal-case tracking-normal">
          ({badge})
        </span>
      )}
    </h3>
    {action && <div>{action}</div>}
  </div>
);

// ─── EmptyState ──────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center min-h-[280px] gap-3 text-center p-8 grid-pattern bg-[var(--background)] border border-[var(--border-color)] rounded-2xl relative overflow-hidden shadow-[var(--shadow-recessed)]">
    <div className="w-16 h-16 rounded-full bg-[var(--foreground)] shadow-[var(--shadow-recessed)] flex items-center justify-center mb-2 border border-[var(--border-color)]">
      {Icon
        ? <Icon size={28} className="text-[var(--text-muted)]" />
        : <Bot size={28} className="text-[var(--text-muted)]" />
      }
    </div>
    <h3 className="text-base font-bold font-mono uppercase tracking-wider text-[var(--text-primary)]">
      {title || 'No Data'}
    </h3>
    {description && (
      <p className="text-[var(--text-muted)] text-xs font-mono max-w-xs">{description}</p>
    )}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

// ─── StatCard ────────────────────────────────────────────────────────────────
export const StatCard = ({ icon: Icon, label, value, sub, color = 'orange', trend }) => {
  const colors = {
    orange: 'text-orange-500 dark:text-orange-400',
    blue:   'text-blue-500 dark:text-blue-400',
    green:  'text-green-500 dark:text-green-400',
    red:    'text-red-500 dark:text-red-400',
    amber:  'text-amber-500 dark:text-amber-400',
    purple: 'text-purple-500 dark:text-purple-400',
  };

  return (
    <div className="relative rounded-2xl p-5 pt-7 transition-all duration-300 bg-[var(--background)] shadow-[var(--shadow-card)] hover:-translate-y-1 hover:shadow-[var(--shadow-floating)] border border-[var(--border-color)]">
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex gap-1">
        <div className="h-1 w-3 rounded-full bg-[var(--muted)] shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_1px_1px_1px_rgba(0,0,0,0.5)]" />
        <div className="h-1 w-3 rounded-full bg-[var(--muted)] shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_1px_1px_1px_rgba(0,0,0,0.5)]" />
        <div className="h-1 w-3 rounded-full bg-[var(--muted)] shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_1px_1px_1px_rgba(0,0,0,0.5)]" />
      </div>

      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--background)] shadow-[var(--shadow-recessed)] border border-[var(--border-color)] ${colors[color] || colors.orange}`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--background)] shadow-[var(--shadow-recessed)] ${trend >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="font-mono text-3xl font-extrabold mt-1 text-[var(--text-primary)]">{value}</div>
      <div className="text-xs uppercase font-mono tracking-wider font-bold mt-1 text-[var(--text-muted)]">
        {label}
      </div>
      {sub && (
        <div className="text-[10px] font-mono tracking-wide mt-1 text-[var(--text-muted)]">
          {sub}
        </div>
      )}
    </div>
  );
};

// ─── Table ───────────────────────────────────────────────────────────────────
export const Table = ({ columns, data, loading, emptyMessage = 'No data found' }) => {
  if (loading) return <LoadingScreen />;
  return (
    <div className="overflow-x-auto rounded-2xl bg-[var(--foreground)] shadow-[var(--shadow-card)] border border-[var(--border-color)]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[var(--muted)]/40">
            {columns.map((col) => (
              <th key={col.key} className="table-header font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-color)]">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!data?.length ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-[var(--text-muted)] text-sm font-mono uppercase tracking-wider">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-[var(--muted)]/30 transition-colors duration-150">
                {columns.map((col) => (
                  <td key={col.key} className="table-cell font-mono text-sm text-[var(--text-primary)] border-b border-[var(--border-color)]">
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// ─── Pagination ──────────────────────────────────────────────────────────────
export const Pagination = ({ page, pages, onPageChange }) => {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="btn-secondary py-1.5 px-3 text-xs uppercase font-mono font-bold tracking-wider disabled:opacity-40 disabled:pointer-events-none"
      >
        ← Prev
      </button>
      <span className="text-[var(--text-muted)] font-mono text-xs uppercase font-bold tracking-wider bg-[var(--background)] shadow-[var(--shadow-recessed)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
        Page {page} of {pages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        className="btn-secondary py-1.5 px-3 text-xs uppercase font-mono font-bold tracking-wider disabled:opacity-40 disabled:pointer-events-none"
      >
        Next →
      </button>
    </div>
  );
};

// ─── FormField ───────────────────────────────────────────────────────────────
export const FormField = ({ label, children, error }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold uppercase tracking-wider font-mono text-[var(--text-muted)]">
      {label}
    </label>
    {children}
    {error && (
      <p className="text-red-500 text-xs font-mono mt-1 flex items-center gap-1">
        ⚠ {error}
      </p>
    )}
  </div>
);
