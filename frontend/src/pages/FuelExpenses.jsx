import { useState, useEffect, useCallback } from 'react';
import { fuelAPI, expensesAPI, vehiclesAPI, maintenanceAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { Fuel, Receipt, BarChart3, Plus, AlertCircle } from 'lucide-react';

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
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      {children}
      {error && (
        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color, count, onAdd, addLabel }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={18} className={color} />
        <h2 className="font-semibold text-base">{title}</h2>
        <span className="text-xs font-mono text-slate-500">({count})</span>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600
                   text-white px-3 py-2 rounded-xl text-xs font-medium
                   transition shadow-md shadow-orange-500/20"
      >
        <Plus size={13} /> {addLabel}
      </button>
    </div>
  );
}

export default function FuelExpenses() {
  const { theme } = useAuthStore();
  const isDark = theme === 'dark';

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
        maintenanceAPI.getAll({ status: 'CLOSED' }),
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
    `w-full bg-slate-800 border rounded-xl px-3 py-2.5 text-white
     placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition
     ${err
       ? 'border-red-500 focus:ring-red-500/30'
       : 'border-slate-700 focus:ring-orange-500/30 focus:border-orange-500'}`;

  const selectCls = (err) =>
    `w-full bg-slate-800 border rounded-xl px-3 py-2.5 text-white text-sm
     focus:outline-none focus:ring-2 transition
     ${err
       ? 'border-red-500 focus:ring-red-500/30'
       : 'border-slate-700 focus:ring-orange-500/30 focus:border-orange-500'}`;

  const tableCls = `rounded-2xl border overflow-hidden
    ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`;

  const thCls = `px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold
    ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`;

  const tdCls = `px-4 py-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`;

  const trHover = `transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Fuel & Expenses</h1>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Track fuel consumption and operational costs
        </p>
      </div>

      {/* ── SECTION 1: Fuel Logs ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          icon={Fuel} title="Fuel Logs" color="text-amber-400"
          count={fuelLogs.length}
          onAdd={() => { setFuelForm(EMPTY_FUEL); setFuelErrors({}); setFuelModal(true); }}
          addLabel="Log Fuel"
        />

        {loading ? (
          <div className="animate-pulse h-32 rounded-2xl bg-slate-800" />
        ) : fuelLogs.length === 0 ? (
          <div className={`text-center py-10 rounded-2xl border text-slate-500 text-sm
            ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            No fuel logs yet
          </div>
        ) : (
          <div className={`${tableCls} overflow-x-auto`}>
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr>
                  {['Vehicle','Date','Liters','Cost/L','Total','Odometer','Station']
                    .map(h => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {fuelLogs.map(f => (
                  <tr key={f.id} className={trHover}>
                    <td className={tdCls}>
                      <div className="font-mono text-orange-400 text-xs font-bold">
                        {f.vehicle?.registrationNo}
                      </div>
                      <div className="text-xs text-slate-500">{f.vehicle?.name}</div>
                    </td>
                    <td className={`${tdCls} font-mono text-xs`}>
                      {new Date(f.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className={`${tdCls} font-mono text-xs`}>{f.liters} L</td>
                    <td className={`${tdCls} font-mono text-xs`}>₹{f.costPerL}</td>
                    <td className={`${tdCls} font-mono text-xs text-green-400 font-bold`}>
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
          icon={Receipt} title="Other Expenses" color="text-purple-400"
          count={expenses.length}
          onAdd={() => { setExpenseForm(EMPTY_EXPENSE); setExpErrors({}); setExpenseModal(true); }}
          addLabel="Add Expense"
        />

        {loading ? (
          <div className="animate-pulse h-32 rounded-2xl bg-slate-800" />
        ) : expenses.length === 0 ? (
          <div className={`text-center py-10 rounded-2xl border text-slate-500 text-sm
            ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            No expenses recorded
          </div>
        ) : (
          <div className={`${tableCls} overflow-x-auto`}>
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr>
                  {['Vehicle','Date','Type','Description','Amount']
                    .map(h => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {expenses.map(exp => (
                  <tr key={exp.id} className={trHover}>
                    <td className={`${tdCls} font-mono text-xs text-orange-400`}>
                      {exp.vehicle?.registrationNo || '—'}
                    </td>
                    <td className={`${tdCls} font-mono text-xs`}>
                      {new Date(exp.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className={tdCls}>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-lg
                        ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        {exp.type}
                      </span>
                    </td>
                    <td className={`${tdCls} text-xs`}>{exp.description || '—'}</td>
                    <td className={`${tdCls} font-mono text-xs font-bold text-red-400`}>
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
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-blue-400" />
          <h2 className="font-semibold text-base">Operational Cost Summary</h2>
        </div>

        {costSummary.length === 0 ? (
          <div className={`text-center py-10 rounded-2xl border text-slate-500 text-sm
            ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            No cost data available
          </div>
        ) : (
          <div className={`${tableCls} overflow-x-auto`}>
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr>
                  {['Vehicle','Fuel Cost','Maintenance','Other Expenses','Total']
                    .map(h => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {costSummary.map(v => {
                  const isMax = v.total === maxCost && maxCost > 0;
                  return (
                    <tr key={v.id}
                      className={`${trHover} ${isMax ? 'bg-red-500/5' : ''}`}>
                      <td className={tdCls}>
                        <div className={`font-mono text-xs font-bold
                          ${isMax ? 'text-red-400' : 'text-orange-400'}`}>
                          {v.regNo}
                        </div>
                        <div className="text-xs text-slate-500">{v.name}</div>
                        {isMax && (
                          <span className="text-xs text-red-400 font-mono">
                            ▲ Highest
                          </span>
                        )}
                      </td>
                      <td className={`${tdCls} font-mono text-xs text-amber-400`}>
                        ₹{v.fuelCost.toLocaleString()}
                      </td>
                      <td className={`${tdCls} font-mono text-xs text-purple-400`}>
                        ₹{v.maintCost.toLocaleString()}
                      </td>
                      <td className={`${tdCls} font-mono text-xs text-blue-400`}>
                        ₹{v.otherCost.toLocaleString()}
                      </td>
                      <td className={`${tdCls} font-mono text-xs font-bold
                        ${isMax ? 'text-red-400' : 'text-green-400'}`}>
                        ₹{v.total.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={`font-bold border-t-2 ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                  <td className={`${tdCls} font-bold`}>TOTAL</td>
                  <td className={`${tdCls} font-mono text-xs text-amber-400`}>
                    ₹{costSummary.reduce((s, v) => s + v.fuelCost, 0).toLocaleString()}
                  </td>
                  <td className={`${tdCls} font-mono text-xs text-purple-400`}>
                    ₹{costSummary.reduce((s, v) => s + v.maintCost, 0).toLocaleString()}
                  </td>
                  <td className={`${tdCls} font-mono text-xs text-blue-400`}>
                    ₹{costSummary.reduce((s, v) => s + v.otherCost, 0).toLocaleString()}
                  </td>
                  <td className={`${tdCls} font-mono text-sm font-bold text-white`}>
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
             title="Log Fuel Entry" size="md">
        <form onSubmit={handleFuelSubmit} className="space-y-4">
          <Field label="Vehicle *" error={fuelErrors.vehicleId}>
            <select value={fuelForm.vehicleId}
              onChange={e => {
                setFuelForm(f => ({ ...f, vehicleId: e.target.value }));
                if (fuelErrors.vehicleId) setFuelErrors(er => ({ ...er, vehicleId: '' }));
              }}
              className={selectCls(fuelErrors.vehicleId)}>
              <option value="">Select vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo} — {v.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Liters *" error={fuelErrors.liters}>
              <input type="number" min="0" step="0.01"
                value={fuelForm.liters}
                onChange={e => {
                  setFuelForm(f => ({ ...f, liters: e.target.value }));
                  if (fuelErrors.liters) setFuelErrors(er => ({ ...er, liters: '' }));
                }}
                placeholder="0.00" className={inputCls(fuelErrors.liters)} />
            </Field>
            <Field label="Cost per Liter (₹) *" error={fuelErrors.costPerL}>
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
            <div className={`flex items-center justify-between px-4 py-2.5
                             rounded-xl border text-sm font-mono
              ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-400">Total Cost</span>
              <span className="text-green-400 font-bold">
                ₹{fuelTotal.toFixed(2)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Odometer (km) *" error={fuelErrors.odometer}>
              <input type="number" min="0"
                value={fuelForm.odometer}
                onChange={e => {
                  setFuelForm(f => ({ ...f, odometer: e.target.value }));
                  if (fuelErrors.odometer) setFuelErrors(er => ({ ...er, odometer: '' }));
                }}
                placeholder="0" className={inputCls(fuelErrors.odometer)} />
            </Field>
            <Field label="Date" error={fuelErrors.date}>
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
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition
                ${isDark
                  ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white
                         py-2.5 rounded-xl text-sm font-medium transition
                         flex items-center justify-center gap-2 disabled:opacity-50">
              {saving && <div className="w-3.5 h-3.5 border-2 border-white/30
                                         border-t-white rounded-full animate-spin" />}
              Save Fuel Log
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Expense Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={expenseModal} onClose={() => setExpenseModal(false)}
             title="Add Expense" size="sm">
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <Field label="Vehicle (optional)" error={expErrors.vehicleId}>
            <select value={expenseForm.vehicleId}
              onChange={e => setExpenseForm(f => ({ ...f, vehicleId: e.target.value }))}
              className={selectCls(expErrors.vehicleId)}>
              <option value="">No vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo} — {v.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type *" error={expErrors.type}>
              <select value={expenseForm.type}
                onChange={e => {
                  setExpenseForm(f => ({ ...f, type: e.target.value }));
                  if (expErrors.type) setExpErrors(er => ({ ...er, type: '' }));
                }}
                className={selectCls(expErrors.type)}>
                <option value="">Select type</option>
                {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Amount (₹) *" error={expErrors.amount}>
              <input type="number" min="0"
                value={expenseForm.amount}
                onChange={e => {
                  setExpenseForm(f => ({ ...f, amount: e.target.value }));
                  if (expErrors.amount) setExpErrors(er => ({ ...er, amount: '' }));
                }}
                placeholder="0" className={inputCls(expErrors.amount)} />
            </Field>
          </div>

          <Field label="Description" error={expErrors.description}>
            <input value={expenseForm.description}
              onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
              className={inputCls(expErrors.description)} />
          </Field>

          <Field label="Date" error={expErrors.date}>
            <input type="date" value={expenseForm.date}
              onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
              className={inputCls(expErrors.date)} />
          </Field>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setExpenseModal(false)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition
                ${isDark
                  ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white
                         py-2.5 rounded-xl text-sm font-medium transition
                         flex items-center justify-center gap-2 disabled:opacity-50">
              {saving && <div className="w-3.5 h-3.5 border-2 border-white/30
                                         border-t-white rounded-full animate-spin" />}
              Add Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
