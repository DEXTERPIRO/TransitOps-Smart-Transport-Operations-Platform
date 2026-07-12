import { useState, useEffect, useCallback } from 'react';
import { fuelAPI, expensesAPI, vehiclesAPI, maintenanceAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';
import { useTranslation } from '../hooks/useTranslation';
import { PageHeader, SectionHeader, EmptyState, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import { Fuel, Receipt, BarChart3, Plus, AlertCircle, Eye } from 'lucide-react';

const EXPENSE_TYPES = ['TOLL', 'PARKING', 'REPAIR', 'OTHER'];

const EMPTY_FUEL = {
  vehicleId: '', liters: '', costPerL: '', odometer: '',
  date: new Date().toISOString().split('T')[0], station: ''
};
const EMPTY_EXPENSE = {
  vehicleId: '', type: '', amount: '', description: '',
  date: new Date().toISOString().split('T')[0]
};

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider font-mono text-text-sub mb-1.5">{label}</label>
      {children}
      {error && (
        <p className="text-danger text-xs font-mono mt-1 flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}


export default function FuelExpenses() {
  const { theme } = useAuthStore();
  const isDark = theme === 'dark';
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('fuel');
  const { t } = useTranslation();

  const [vehicles, setVehicles]   = useState([]);
  const [fuelLogs, setFuelLogs]   = useState([]);
  const [expenses, setExpenses]   = useState([]);
  const [maintenance, setMaint]   = useState([]);
  const [loading, setLoading]     = useState(true);

  // Modals
  const [fuelModal, setFuelModal]       = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [fuelForm, setFuelForm]         = useState(EMPTY_FUEL);
  const [expenseForm, setExpenseForm]   = useState(EMPTY_EXPENSE);
  const [fuelErrors, setFuelErrors]     = useState({});
  const [expErrors, setExpErrors]       = useState({});
  const [saving, setSaving]             = useState(false);

  // Live total calculation
  const fuelTotal = parseFloat(fuelForm.liters || 0) * parseFloat(fuelForm.costPerL || 0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [v, f, e, m] = await Promise.all([
        vehiclesAPI.getAll(),
        fuelAPI.getAll(),
        expensesAPI.getAll(),
        maintenanceAPI.getAll(),
      ]);
      setVehicles(v);
      setFuelLogs(f);
      setExpenses(e);
      setMaint(m);
    } catch {
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Fuel submit ────────────────────────────────────────────────────────
  const validateFuel = () => {
    const e = {};
    if (!fuelForm.vehicleId) e.vehicleId = 'Select a vehicle';
    if (!fuelForm.liters) e.liters = 'Liters required';
    else if (parseFloat(fuelForm.liters) <= 0) e.liters = 'Must be > 0';
    if (!fuelForm.costPerL) e.costPerL = 'Cost per liter required';
    else if (parseFloat(fuelForm.costPerL) <= 0) e.costPerL = 'Must be > 0';
    if (!fuelForm.odometer) e.odometer = 'Odometer required';
    return e;
  };

  const handleFuelSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validateFuel();
    if (Object.keys(errs).length) { setFuelErrors(errs); return; }
    setSaving(true);
    try {
      await fuelAPI.create(fuelForm);
      toast.success('Fuel log added');
      setFuelModal(false);
      setFuelForm(EMPTY_FUEL);
      setFuelErrors({});
      fetchAll();
    } catch (err) {
      toast.error(err.error || 'Failed to log fuel');
    } finally { setSaving(false); }
  };

  // ─── Expense submit ──────────────────────────────────────────────────────
  const validateExpense = () => {
    const e = {};
    if (!expenseForm.type) e.type = 'Select expense type';
    if (!expenseForm.amount) e.amount = 'Amount required';
    else if (parseFloat(expenseForm.amount) <= 0) e.amount = 'Must be > 0';
    return e;
  };

  const handleExpenseSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validateExpense();
    if (Object.keys(errs).length) { setExpErrors(errs); return; }
    setSaving(true);
    try {
      await expensesAPI.create(expenseForm);
      toast.success('Expense added');
      setExpenseModal(false);
      setExpenseForm(EMPTY_EXPENSE);
      setExpErrors({});
      fetchAll();
    } catch (err) {
      toast.error(err.error || 'Failed to add expense');
    } finally { setSaving(false); }
  };

  // ─── Cost summary per vehicle ─────────────────────────────────────────────
  const costSummary = vehicles
    .filter(v => v.isActive !== false)
    .map(v => {
      const fuelCost = fuelLogs
        .filter(f => f.vehicleId === v.id)
        .reduce((s, f) => s + (f.totalCost || 0), 0);
      const maintCost = maintenance
        .filter(m => m.vehicleId === v.id)
        .reduce((s, m) => s + (m.cost || 0), 0);
      const otherCost = expenses
        .filter(e => e.vehicleId === v.id)
        .reduce((s, e) => s + (e.amount || 0), 0);
      return {
        id: v.id,
        regNo: v.registrationNo,
        name: v.name,
        fuelCost, maintCost, otherCost,
        total: fuelCost + maintCost + otherCost,
      };
    })
    .filter(v => v.total > 0)
    .sort((a, b) => b.total - a.total);

  const maxCost = costSummary[0]?.total || 0;
  const grandTotal = costSummary.reduce((s, v) => s + v.total, 0);

  const inputCls = (err) =>
    `input ${err ? 'ring-2 ring-danger' : ''}`;

  const selectCls = (err) =>
    `select ${err ? 'ring-2 ring-danger' : ''}`;

  const tableCls = 'rounded-2xl bg-panel shadow-[var(--shadow-card)] p-1 border border-[var(--border-color)]';

  const thCls = 'table-header font-mono text-xs font-bold uppercase tracking-wider text-text-sub border-b border-b-shadow/50';

  const tdCls = 'table-cell text-xs text-text-main border-b border-b-shadow/20';

  const trHover = 'table-row';

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('fuelAndExpenses')}
        subtitle={t('trackFuelConsumption')}
        icon={Fuel}
      />

      {isReadOnly && (
        <div style={{
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '12px',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#60a5fa'
        }}>
          <Eye size={15} className="text-blue-400 shrink-0" />
          <span>
            {t('youHaveReadOnly')}
          </span>
        </div>
      )}

      {/* ── SECTION 1: Fuel Logs ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          icon={Fuel}
          title={t('fuelLogs')}
          badge={fuelLogs.length}
          action={
            canCreate && (
              <button
                onClick={() => { setFuelForm(EMPTY_FUEL); setFuelErrors({}); setFuelModal(true); }}
                className="btn-primary py-1.5 px-3 text-xs"
              >
                <Plus size={13} /> {t('logFuel')}
              </button>
            )
          }
        />

        {loading ? (
          <div className="animate-pulse h-32 rounded-2xl bg-recessed shadow-[var(--shadow-recessed)]" />
        ) : fuelLogs.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-panel shadow-[var(--shadow-card)] grid-pattern border border-[var(--border-color)] text-text-sub text-sm font-mono uppercase tracking-wider">
            {t('noFuelLogs')}
          </div>
        ) : (
          <div className={`${tableCls} overflow-x-auto`}>
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr>
                  {[t('vehicleColumn'), t('date'), t('liters'), t('costPerL'), t('total'), t('odometer'), t('station')]
                    .map(h => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {fuelLogs.map(f => (
                  <tr key={f.id} className={trHover}>
                    <td className={tdCls}>
                      <div className="font-mono text-accent text-xs font-bold">
                        {f.vehicle?.registrationNo}
                      </div>
                      <div className="text-xs text-text-sub">{f.vehicle?.name}</div>
                    </td>
                    <td className={`${tdCls} font-mono text-xs`}>
                      {new Date(f.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className={`${tdCls} font-mono text-xs`}>{f.liters} L</td>
                    <td className={`${tdCls} font-mono text-xs`}>₹{f.costPerL}</td>
                    <td className={`${tdCls} font-mono text-xs text-success font-bold`}>
                      ₹{f.totalCost?.toLocaleString()}
                    </td>
                    <td className={`${tdCls} font-mono text-xs`}>
                      {f.odometer?.toLocaleString()} km
                    </td>
                    <td className={tdCls}>{f.station || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 2: Other Expenses ────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          icon={Receipt}
          title={t('otherExpenses')}
          badge={expenses.length}
          action={
            canCreate && (
              <button
                onClick={() => { setExpenseForm(EMPTY_EXPENSE); setExpErrors({}); setExpenseModal(true); }}
                className="btn-primary py-1.5 px-3 text-xs"
              >
                <Plus size={13} /> {t('addExpense')}
              </button>
            )
          }
        />

        {loading ? (
          <div className="animate-pulse h-32 rounded-2xl bg-recessed shadow-[var(--shadow-recessed)]" />
        ) : expenses.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-panel shadow-[var(--shadow-card)] grid-pattern border border-[var(--border-color)] text-text-sub text-sm font-mono uppercase tracking-wider">
            {t('noExpenses')}
          </div>
        ) : (
          <div className={`${tableCls} overflow-x-auto`}>
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr>
                  {[t('vehicleColumn'), t('date'), t('typeColumn'), t('descriptionColumn'), t('amount')]
                    .map(h => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {expenses.map(exp => (
                  <tr key={exp.id} className={trHover}>
                    <td className={`${tdCls} font-mono text-xs text-accent font-bold`}>
                      {exp.vehicle?.registrationNo || '—'}
                    </td>
                    <td className={`${tdCls} font-mono text-xs`}>
                      {new Date(exp.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className={tdCls}>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-recessed text-text-sub border border-b-shadow/20">
                        {exp.type}
                      </span>
                    </td>
                    <td className={`${tdCls} text-xs`}>{exp.description || '—'}</td>
                    <td className={`${tdCls} font-mono text-xs font-bold text-danger`}>
                      ₹{exp.amount?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 3: Cost Summary ──────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader icon={BarChart3} title={t('operationalCostSummary')} />

        {costSummary.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-panel shadow-[var(--shadow-card)] grid-pattern border border-[var(--border-color)] text-text-sub text-sm font-mono uppercase tracking-wider">
            {t('noData')}
          </div>
        ) : (
          <div className={`${tableCls} overflow-x-auto`}>
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr>
                  {[t('vehicleColumn'), t('fuelCost'), t('maintenanceCost'), t('otherExpensesCol'), t('total')]
                    .map(h => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-b-shadow/20">
                {costSummary.map(v => {
                  const isMax = v.total === maxCost && maxCost > 0;
                  return (
                    <tr key={v.id}
                      className={`${trHover} ${isMax ? 'bg-danger/5' : ''}`}>
                      <td className={tdCls}>
                        <div className={`font-mono text-xs font-bold
                          ${isMax ? 'text-danger' : 'text-accent'}`}>
                          {v.regNo}
                        </div>
                        <div className="text-xs text-text-sub">{v.name}</div>
                        {isMax && (
                          <span className="text-xs text-danger font-mono font-bold uppercase tracking-wider">
                            ▲ {t('highestCost')}
                          </span>
                        )}
                      </td>
                      <td className={`${tdCls} font-mono text-xs text-warning font-bold`}>
                        ₹{v.fuelCost.toLocaleString()}
                      </td>
                      <td className={`${tdCls} font-mono text-xs text-purple-400 font-bold`}>
                        ₹{v.maintCost.toLocaleString()}
                      </td>
                      <td className={`${tdCls} font-mono text-xs text-blue-500 dark:text-blue-400 font-bold`}>
                        ₹{v.otherCost.toLocaleString()}
                      </td>
                      <td className={`${tdCls} font-mono text-xs font-bold
                        ${isMax ? 'text-danger' : 'text-success'}`}>
                        ₹{v.total.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold border-t-2 border-b-shadow bg-recessed/30">
                  <td className={`${tdCls} font-bold text-text-main font-mono uppercase tracking-wider`}>TOTAL</td>
                  <td className={`${tdCls} font-mono text-xs text-warning font-bold`}>
                    ₹{costSummary.reduce((s, v) => s + v.fuelCost, 0).toLocaleString()}
                  </td>
                  <td className={`${tdCls} font-mono text-xs text-purple-400 font-bold`}>
                    ₹{costSummary.reduce((s, v) => s + v.maintCost, 0).toLocaleString()}
                  </td>
                  <td className={`${tdCls} font-mono text-xs text-blue-500 dark:text-blue-400 font-bold`}>
                    ₹{costSummary.reduce((s, v) => s + v.otherCost, 0).toLocaleString()}
                  </td>
                  <td className={`${tdCls} font-mono text-sm font-bold text-text-main`}>
                    ₹{grandTotal.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Fuel Modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={fuelModal} onClose={() => setFuelModal(false)}
             title={t('logFuel')} size="md">
        <form onSubmit={handleFuelSubmit} className="space-y-4">
          <Field label={`${t('vehicleColumn')} *`} error={fuelErrors.vehicleId}>
            <select value={fuelForm.vehicleId}
              onChange={e => {
                setFuelForm(f => ({ ...f, vehicleId: e.target.value }));
                if (fuelErrors.vehicleId) setFuelErrors(er => ({ ...er, vehicleId: '' }));
              }}
              className={selectCls(fuelErrors.vehicleId)}>
              <option value="">{t('selectVehicle')}</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo} — {v.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t('liters')} *`} error={fuelErrors.liters}>
              <input type="number" min="0" step="0.01"
                value={fuelForm.liters}
                onChange={e => {
                  setFuelForm(f => ({ ...f, liters: e.target.value }));
                  if (fuelErrors.liters) setFuelErrors(er => ({ ...er, liters: '' }));
                }}
                placeholder="0.00" className={inputCls(fuelErrors.liters)} />
            </Field>
            <Field label={`${t('costPerLiter')} *`} error={fuelErrors.costPerL}>
              <input type="number" min="0" step="0.01"
                value={fuelForm.costPerL}
                onChange={e => {
                  setFuelForm(f => ({ ...f, costPerL: e.target.value }));
                  if (fuelErrors.costPerL) setFuelErrors(er => ({ ...er, costPerL: '' }));
                }}
                placeholder="0.00" className={inputCls(fuelErrors.costPerL)} />
            </Field>
          </div>

          {/* Live total */}
          {fuelForm.liters && fuelForm.costPerL && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-b-shadow/30 bg-chassis shadow-[var(--shadow-recessed)] text-sm font-mono">
              <span className="text-text-sub uppercase tracking-wider text-[10px] font-bold">{t('total')}</span>
              <span className="text-success font-bold">
                ₹{fuelTotal.toFixed(2)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t('odometer')} *`} error={fuelErrors.odometer}>
              <input type="number" min="0"
                value={fuelForm.odometer}
                onChange={e => {
                  setFuelForm(f => ({ ...f, odometer: e.target.value }));
                  if (fuelErrors.odometer) setFuelErrors(er => ({ ...er, odometer: '' }));
                }}
                placeholder="0" className={inputCls(fuelErrors.odometer)} />
            </Field>
            <Field label={t('date')} error={fuelErrors.date}>
              <input type="date" value={fuelForm.date}
                onChange={e => setFuelForm(f => ({ ...f, date: e.target.value }))}
                className={inputCls(fuelErrors.date)} />
            </Field>
          </div>

          <Field label="Station" error={fuelErrors.station}>
            <input value={fuelForm.station}
              onChange={e => setFuelForm(f => ({ ...f, station: e.target.value }))}
              placeholder="e.g. HP Petrol Pump, NH-8"
              className={inputCls(fuelErrors.station)} />
          </Field>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setFuelModal(false)}
              className="btn-secondary flex-1">
              {t('cancel2')}
            </button>
            <button type="submit" disabled={saving}
              className="btn-primary bg-accent flex-1">
              {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {t('save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Expense Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={expenseModal} onClose={() => setExpenseModal(false)}
             title={t('addExpense')} size="sm">
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <Field label={t('vehicleColumn')} error={expErrors.vehicleId}>
            <select value={expenseForm.vehicleId}
              onChange={e => setExpenseForm(f => ({ ...f, vehicleId: e.target.value }))}
              className={selectCls(expErrors.vehicleId)}>
              <option value="">{t('noData')}</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo} — {v.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t('typeColumn')} *`} error={expErrors.type}>
              <select value={expenseForm.type}
                onChange={e => {
                  setExpenseForm(f => ({ ...f, type: e.target.value }));
                  if (expErrors.type) setExpErrors(er => ({ ...er, type: '' }));
                }}
                className={selectCls(expErrors.type)}>
                <option value="">{t('selectType')}</option>
                {EXPENSE_TYPES.map(tOption => <option key={tOption} value={tOption}>{tOption}</option>)}
              </select>
            </Field>
            <Field label={`${t('amount')} *`} error={expErrors.amount}>
              <input type="number" min="0"
                value={expenseForm.amount}
                onChange={e => {
                  setExpenseForm(f => ({ ...f, amount: e.target.value }));
                  if (expErrors.amount) setExpErrors(er => ({ ...er, amount: '' }));
                }}
                placeholder="0" className={inputCls(expErrors.amount)} />
            </Field>
          </div>

          <Field label={t('descriptionColumn')} error={expErrors.description}>
            <input value={expenseForm.description}
              onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
              className={inputCls(expErrors.description)} />
          </Field>

          <Field label={t('date')} error={expErrors.date}>
            <input type="date" value={expenseForm.date}
              onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
              className={inputCls(expErrors.date)} />
          </Field>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setExpenseModal(false)}
              className="btn-secondary flex-1">
              {t('cancel2')}
            </button>
            <button type="submit" disabled={saving}
              className="btn-primary bg-accent flex-1">
              {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {t('save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
