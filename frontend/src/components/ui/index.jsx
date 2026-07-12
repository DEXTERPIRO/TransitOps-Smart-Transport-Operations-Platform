// Shared UI building blocks

export const Spinner = ({ size = 'md' }) => {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizeMap[size]} border-2 border-dark-600 border-t-brand-500 rounded-full animate-spin`} />
  );
};

export const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
    <Spinner size="lg" />
    <p className="text-dark-400 text-sm">Loading…</p>
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center p-8">
    {Icon && (
      <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mb-2">
        <Icon size={28} className="text-dark-500" />
      </div>
    )}
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    {description && <p className="text-dark-400 text-sm max-w-xs">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl w-full ${sizeMap[size]} animate-slide-up`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white p-1 rounded-lg hover:bg-dark-800 transition-colors">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export const StatusBadge = ({ status }) => {
  const map = {
    ACTIVE:       'badge-green',
    IN_PROGRESS:  'badge-blue',
    COMPLETED:    'badge-green',
    SCHEDULED:    'badge-orange',
    CANCELLED:    'badge-red',
    DELAYED:      'badge-yellow',
    MAINTENANCE:  'badge-yellow',
    INACTIVE:     'badge-gray',
    RETIRED:      'badge-gray',
    PENDING:      'badge-yellow',
    ON_LEAVE:     'badge-yellow',
    SUSPENDED:    'badge-red',
    EMERGENCY:    'badge-red',
    SCHEDULED_SVC:'badge-blue',
  };
  return <span className={map[status] || 'badge-gray'}>{status?.replace('_', ' ')}</span>;
};

export const StatCard = ({ icon: Icon, label, value, sub, color = 'brand', trend }) => {
  const colorMap = {
    brand:  'bg-brand-500/15 text-brand-400',
    green:  'bg-green-500/15 text-green-400',
    blue:   'bg-blue-500/15 text-blue-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
    red:    'bg-red-500/15 text-red-400',
    purple: 'bg-purple-500/15 text-purple-400',
  };
  return (
    <div className="stat-card">
      <div className={`stat-icon ${colorMap[color]}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-dark-400 text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-dark-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`text-sm font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
};

export const Table = ({ columns, data, loading, emptyMessage = 'No data found' }) => {
  if (loading) return <LoadingScreen />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-dark-900/50">
            {columns.map((col) => (
              <th key={col.key} className="table-header">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!data?.length ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-dark-400 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id || i} className="table-row">
                {columns.map((col) => (
                  <td key={col.key} className="table-cell">
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

export const Pagination = ({ page, pages, onPageChange }) => {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
      >
        ← Prev
      </button>
      <span className="text-dark-400 text-sm">Page {page} of {pages}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
};

export const FormField = ({ label, children, error }) => (
  <div>
    <label className="block text-sm font-medium text-dark-300 mb-1.5">{label}</label>
    {children}
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);
