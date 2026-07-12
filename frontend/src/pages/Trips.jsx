import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { tripsAPI, vehiclesAPI, driversAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import toast from 'react-hot-toast';
import {
  Route, Truck, Users, Package, Send, CheckCircle,
  XCircle, Eye, AlertCircle, ArrowRight, Fuel,
  Gauge, Calendar, FileText, ChevronRight
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const COLUMNS = [
  { status: 'DRAFT',      label: 'Draft',      color: 'text-slate-400',  border: 'border-slate-700' },
  { status: 'DISPATCHED', label: 'Dispatched',  color: 'text-blue-400',   border: 'border-blue-500/40' },
  { status: 'COMPLETED',  label: 'Completed',   color: 'text-green-400',  border: 'border-green-500/40' },
  { status: 'CANCELLED',  label: 'Cancelled',   color: 'text-red-400',    border: 'border-red-500/40' },
];

const EMPTY_FORM = {
  source: '', destination: '', vehicleId: '', driverId: '',
  cargoWeight: '', plannedDistance: '', revenue: '',
  scheduledAt: '', notes: ''
};

const EMPTY_COMPLETE = { endOdometer: '', fuelConsumed: '', actualDistance: '' };

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

function validateForm(form, vehicles) {
  const e = {};
  if (!form.source.trim()) e.source = 'Source is required';
  else if (form.source.trim().length < 2) e.source = 'Min 2 characters';
  if (!form.destination.trim()) e.destination = 'Destination is required';
  else if (form.destination.trim().length < 2) e.destination = 'Min 2 characters';
  else if (form.source.trim().toLowerCase() === form.destination.trim().toLowerCase())
    e.destination = 'Destination must differ from source';
  if (!form.vehicleId) e.vehicleId = 'Select a vehicle';
  if (!form.driverId) e.driverId = 'Select a driver';
  if (!form.cargoWeight) e.cargoWeight = 'Cargo weight is required';
  else {
    const vehicle = vehicles.find(v => v.id === form.vehicleId);
    if (vehicle && parseFloat(form.cargoWeight) > vehicle.maxLoadCapacity)
      e.cargoWeight = `Exceeds vehicle capacity (${vehicle.maxLoadCapacity} kg)`;
    else if (parseFloat(form.cargoWeight) <= 0) e.cargoWeight = 'Must be greater than 0';
  }
  if (!form.plannedDistance) e.plannedDistance = 'Planned distance is required';
  else if (parseFloat(form.plannedDistance) <= 0) e.plannedDistance = 'Must be greater than 0';
  return e;
}

// ─── Trip Card ────────────────────────────────────────────────────────────────
function TripCard({ trip, isDark, onDispatch, onComplete, onCancel, onView }) {
  return (
    <div className={`rounded-xl border p-3 text-sm transition-all
      hover:shadow-md hover:-translate-y-0.5
      ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>

      {/* Trip code + route */}
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-orange-400 font-bold text-xs">
          {trip.tripCode}
        </span>
        <StatusBadge status={trip.status} />
      </div>

      <div className="flex items-center gap-1.5 font-medium text-xs mb-2 truncate">
        <span className="truncate">{trip.source}</span>
        <ArrowRight size={12} className="shrink-0 text-slate-500" />
        <span className="truncate">{trip.destination}</span>
      </div>

      <div className={`text-xs space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <div className="flex items-center gap-1.5">
          <Truck size={11} />
          <span className="font-mono">{trip.vehicle?.registrationNo}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={11} />
          <span>{trip.driver?.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Package size={11} />
          <span>{trip.cargoWeight} kg</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-3 pt-2 border-t border-slate-700/50">
        {trip.status === 'DRAFT' && (
          <>
            <button onClick={() => onDispatch(trip)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5
                         text-xs bg-blue-500/15 text-blue-400 rounded-lg
                         hover:bg-blue-500/25 transition font-medium">
              <Send size={11} /> Dispatch
            </button>
            <button onClick={() => onCancel(trip)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5
                         text-xs bg-red-500/15 text-red-400 rounded-lg
                         hover:bg-red-500/25 transition font-medium">
              <XCircle size={11} /> Cancel
            </button>
          </>
        )}
        {trip.status === 'DISPATCHED' && (
          <>
            <button onClick={() => onComplete(trip)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5
                         text-xs bg-green-500/15 text-green-400 rounded-lg
                         hover:bg-green-500/25 transition font-medium">
              <CheckCircle size={11} /> Complete
            </button>
            <button onClick={() => onCancel(trip)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5
                         text-xs bg-red-500/15 text-red-400 rounded-lg
                         hover:bg-red-500/25 transition font-medium">
              <XCircle size={11} /> Cancel
            </button>
          </>
        )}
        {(trip.status === 'COMPLETED' || trip.status === 'CANCELLED') && (
          <button onClick={() => onView(trip)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5
                       text-xs bg-slate-700/50 text-slate-300 rounded-lg
                       hover:bg-slate-700 transition font-medium">
            <Eye size={11} /> View Details
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Trips() {
  const { theme } = useAuthStore();
  const isDark = theme === 'dark';

  // Data state
  const [trips, setTrips] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [dispatchTarget, setDispatchTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeForm, setCompleteForm] = useState(EMPTY_COMPLETE);
  const [completeErrors, setCompleteErrors] = useState({});
  const [viewTrip, setViewTrip] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Derived
  const selectedVehicle = availableVehicles.find(v => v.id === form.vehicleId);
  const cargoNum = parseFloat(form.cargoWeight) || 0;
  const capacityNum = selectedVehicle?.maxLoadCapacity || 0;
  const cargoOverLimit = capacityNum > 0 && cargoNum > capacityNum;

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [tripsData, vehiclesData, driversData] = await Promise.all([
        tripsAPI.getAll(),
        vehiclesAPI.getAvailable(),
        driversAPI.getAvailable(),
      ]);
      setTrips(tripsData);
      setAvailableVehicles(vehiclesData);
      setAvailableDrivers(driversData);
    } catch {
      toast.error('Failed to load trip data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Socket.io ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socket.emit('join-dashboard');
    socket.on('trip-dispatched', fetchAll);
    socket.on('trip-completed', fetchAll);
    socket.on('trip-cancelled', fetchAll);
    socket.on('trip-status-changed', fetchAll);
    return () => socket.disconnect();
  }, [fetchAll]);

  // ─── Form ──────────────────────────────────────────────────────────────────
  const handleFormChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (formErrors[field]) setFormErrors(e => ({ ...e, [field]: '' }));
    if (field === 'vehicleId') setForm(f => ({ ...f, vehicleId: value, cargoWeight: '' }));
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    const errs = validateForm(form, availableVehicles);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSubmitting(true);
    try {
      await tripsAPI.create(form);
      toast.success('Trip created as Draft');
      setForm(EMPTY_FORM);
      setFormErrors({});
      fetchAll();
    } catch (err) {
      toast.error(err.error || 'Failed to create trip');
    } finally { setSubmitting(false); }
  };

  // ─── Dispatch ──────────────────────────────────────────────────────────────
  const handleDispatch = async () => {
    if (!dispatchTarget) return;
    setActionLoading(true);
    try {
      await tripsAPI.dispatch(dispatchTarget.id);
      toast.success(`Trip ${dispatchTarget.tripCode} dispatched!`);
      setDispatchTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.error || 'Dispatch failed');
    } finally { setActionLoading(false); }
  };

  // ─── Complete ──────────────────────────────────────────────────────────────
  const handleComplete = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!completeForm.endOdometer) errs.endOdometer = 'End odometer is required';
    else if (parseFloat(completeForm.endOdometer) < (completeTarget?.startOdometer || 0))
      errs.endOdometer = 'Must be ≥ start odometer';
    if (Object.keys(errs).length) { setCompleteErrors(errs); return; }
    setActionLoading(true);
    try {
      await tripsAPI.complete(completeTarget.id, {
        endOdometer: parseFloat(completeForm.endOdometer),
        fuelConsumed: completeForm.fuelConsumed ? parseFloat(completeForm.fuelConsumed) : null,
        actualDistance: completeForm.actualDistance ? parseFloat(completeForm.actualDistance) : null,
      });
      toast.success(`Trip ${completeTarget.tripCode} completed!`);
      setCompleteTarget(null);
      setCompleteForm(EMPTY_COMPLETE);
      fetchAll();
    } catch (err) {
      toast.error(err.error || 'Complete failed');
    } finally { setActionLoading(false); }
  };

  // ─── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      await tripsAPI.cancel(cancelTarget.id);
      toast.success(`Trip ${cancelTarget.tripCode} cancelled`);
      setCancelTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.error || 'Cancel failed');
    } finally { setActionLoading(false); }
  };

  // ─── Styling helpers ───────────────────────────────────────────────────────
  const inputCls = (err) =>
    `w-full bg-slate-800 border rounded-xl px-3 py-2 text-white
     placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition
     ${err
       ? 'border-red-500 focus:ring-red-500/30'
       : 'border-slate-700 focus:ring-orange-500/30 focus:border-orange-500'}`;

  const selectCls = (err) =>
    `w-full bg-slate-800 border rounded-xl px-3 py-2 text-white text-sm
     focus:outline-none focus:ring-2 transition
     ${err
       ? 'border-red-500 focus:ring-red-500/30'
       : 'border-slate-700 focus:ring-orange-500/30 focus:border-orange-500'}`;

  // ─── Group trips by status ─────────────────────────────────────────────────
  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.status] = trips.filter(t => t.status === col.status);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className={`h-8 w-48 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`h-96 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
          <div className={`lg:col-span-2 h-96 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Trip Dispatcher</h1>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Create and manage fleet trips in real-time
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── LEFT: Create Trip Form ─────────────────────────────────────── */}
        <div className={`rounded-2xl border p-5
          ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            <Route size={16} className="text-orange-400" /> Create Trip
          </h2>

          <form onSubmit={handleCreateTrip} className="space-y-3">
            {/* Source / Destination */}
            <Field label="Source *" error={formErrors.source}>
              <input
                value={form.source}
                onChange={e => handleFormChange('source', e.target.value)}
                placeholder="e.g. Mumbai Warehouse"
                className={inputCls(formErrors.source)}
              />
            </Field>
            <Field label="Destination *" error={formErrors.destination}>
              <input
                value={form.destination}
                onChange={e => handleFormChange('destination', e.target.value)}
                placeholder="e.g. Pune Distribution"
                className={inputCls(formErrors.destination)}
              />
            </Field>

            {/* Vehicle selector */}
            <Field label="Vehicle *" error={formErrors.vehicleId}>
              <select
                value={form.vehicleId}
                onChange={e => handleFormChange('vehicleId', e.target.value)}
                className={selectCls(formErrors.vehicleId)}
              >
                <option value="">Select available vehicle</option>
                {availableVehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} — {v.name} ({v.maxLoadCapacity} kg)
                  </option>
                ))}
              </select>
              {selectedVehicle && (
                <p className="text-xs text-green-400 mt-1 font-mono">
                  ✓ Max capacity: {selectedVehicle.maxLoadCapacity} kg
                </p>
              )}
            </Field>

            {/* Driver selector */}
            <Field label="Driver *" error={formErrors.driverId}>
              <select
                value={form.driverId}
                onChange={e => handleFormChange('driverId', e.target.value)}
                className={selectCls(formErrors.driverId)}
              >
                <option value="">Select available driver</option>
                {availableDrivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.licenseNo} (Score: {d.safetyScore ?? 'N/A'})
                  </option>
                ))}
              </select>
            </Field>

            {/* Cargo Weight with progress bar */}
            <Field label="Cargo Weight (kg) *" error={formErrors.cargoWeight}>
              <input
                type="number" min="0"
                value={form.cargoWeight}
                onChange={e => handleFormChange('cargoWeight', e.target.value)}
                placeholder="0"
                className={inputCls(formErrors.cargoWeight || cargoOverLimit)}
              />
              {selectedVehicle && form.cargoWeight && (
                <div className="mt-1.5">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={cargoOverLimit ? 'text-red-400' : 'text-slate-400'}>
                      {cargoNum} kg
                    </span>
                    <span className="text-slate-500">{capacityNum} kg max</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all
                        ${cargoOverLimit ? 'bg-red-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min((cargoNum / capacityNum) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </Field>

            {/* Distance + Revenue */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Distance (km) *" error={formErrors.plannedDistance}>
                <input
                  type="number" min="0"
                  value={form.plannedDistance}
                  onChange={e => handleFormChange('plannedDistance', e.target.value)}
                  placeholder="0"
                  className={inputCls(formErrors.plannedDistance)}
                />
              </Field>
              <Field label="Revenue (₹)" error={formErrors.revenue}>
                <input
                  type="number" min="0"
                  value={form.revenue}
                  onChange={e => handleFormChange('revenue', e.target.value)}
                  placeholder="0"
                  className={inputCls(formErrors.revenue)}
                />
              </Field>
            </div>

            {/* Scheduled + Notes */}
            <Field label="Scheduled Date/Time" error={formErrors.scheduledAt}>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => handleFormChange('scheduledAt', e.target.value)}
                className={inputCls(formErrors.scheduledAt)}
              />
            </Field>
            <Field label="Notes" error={formErrors.notes}>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => handleFormChange('notes', e.target.value)}
                placeholder="Optional trip notes..."
                className={`${inputCls(formErrors.notes)} resize-none`}
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white
                         py-2.5 rounded-xl text-sm font-semibold transition-all
                         flex items-center justify-center gap-2 disabled:opacity-50
                         shadow-lg shadow-orange-500/20 mt-2"
            >
              {submitting
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Route size={15} />}
              {submitting ? 'Creating...' : 'Create as Draft'}
            </button>
          </form>
        </div>

        {/* ── RIGHT: Kanban Board ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Send size={16} className="text-blue-400" />
            Trips Board
            <span className={`text-xs font-mono ml-1
              ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              ({trips.length} total)
            </span>
          </h2>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {COLUMNS.map(col => (
              <div key={col.status}>
                {/* Column header */}
                <div className={`flex items-center justify-between mb-2 pb-2
                                 border-b ${col.border}`}>
                  <span className={`text-xs font-semibold font-mono
                                    uppercase tracking-wider ${col.color}`}>
                    {col.label}
                  </span>
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded-md
                    ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    {grouped[col.status]?.length || 0}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {grouped[col.status]?.length === 0 ? (
                    <div className={`text-center py-8 text-xs rounded-xl border-dashed border
                      ${isDark ? 'text-slate-600 border-slate-700' : 'text-slate-400 border-slate-200'}`}>
                      No trips
                    </div>
                  ) : (
                    grouped[col.status].map(trip => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        isDark={isDark}
                        onDispatch={setDispatchTarget}
                        onComplete={(t) => {
                          setCompleteTarget(t);
                          setCompleteForm(EMPTY_COMPLETE);
                          setCompleteErrors({});
                        }}
                        onCancel={setCancelTarget}
                        onView={setViewTrip}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DISPATCH CONFIRM ──────────────────────────────────────────────── */}
      <Modal
        isOpen={!!dispatchTarget}
        onClose={() => setDispatchTarget(null)}
        title="Confirm Dispatch"
        size="sm"
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border text-sm
            ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <p className="font-mono text-orange-400 font-bold mb-2">
              {dispatchTarget?.tripCode}
            </p>
            <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
              <span className="font-medium">{dispatchTarget?.source}</span>
              {' → '}
              <span className="font-medium">{dispatchTarget?.destination}</span>
            </p>
            <p className={`mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Vehicle <b className="text-slate-300">{dispatchTarget?.vehicle?.registrationNo}</b> and
              driver <b className="text-slate-300">{dispatchTarget?.driver?.name}</b> will be
              marked <b className="text-blue-400">On Trip</b>.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDispatchTarget(null)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition
                ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleDispatch}
              disabled={actionLoading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5
                         rounded-xl text-sm font-medium transition flex items-center
                         justify-center gap-2 disabled:opacity-50"
            >
              {actionLoading
                ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send size={14} />}
              Dispatch Now
            </button>
          </div>
        </div>
      </Modal>

      {/* ── COMPLETE MODAL ────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!completeTarget}
        onClose={() => setCompleteTarget(null)}
        title={`Complete Trip ${completeTarget?.tripCode}`}
        size="sm"
      >
        <form onSubmit={handleComplete} className="space-y-4">
          <Field label="End Odometer Reading (km) *" error={completeErrors.endOdometer}>
            <div className="relative">
              <Gauge size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number" min="0"
                value={completeForm.endOdometer}
                onChange={e => {
                  setCompleteForm(f => ({ ...f, endOdometer: e.target.value }));
                  if (completeErrors.endOdometer) setCompleteErrors(e2 => ({ ...e2, endOdometer: '' }));
                }}
                placeholder="Current odometer reading"
                className={`pl-9 ${inputCls(completeErrors.endOdometer)}`}
              />
            </div>
          </Field>
          <Field label="Fuel Consumed (L)" error={completeErrors.fuelConsumed}>
            <div className="relative">
              <Fuel size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number" min="0"
                value={completeForm.fuelConsumed}
                onChange={e => setCompleteForm(f => ({ ...f, fuelConsumed: e.target.value }))}
                placeholder="Optional"
                className={`pl-9 ${inputCls(completeErrors.fuelConsumed)}`}
              />
            </div>
          </Field>
          <Field label="Actual Distance (km)" error={completeErrors.actualDistance}>
            <input
              type="number" min="0"
              value={completeForm.actualDistance}
              onChange={e => setCompleteForm(f => ({ ...f, actualDistance: e.target.value }))}
              placeholder="Optional"
              className={inputCls(completeErrors.actualDistance)}
            />
          </Field>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setCompleteTarget(null)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition
                ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Back
            </button>
            <button type="submit" disabled={actionLoading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5
                         rounded-xl text-sm font-medium transition flex items-center
                         justify-center gap-2 disabled:opacity-50">
              {actionLoading
                ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <CheckCircle size={14} />}
              Mark Complete
            </button>
          </div>
        </form>
      </Modal>

      {/* ── CANCEL CONFIRM ────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Trip"
        size="sm"
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border text-sm
            ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <p className="font-mono text-orange-400 font-bold mb-1">
              {cancelTarget?.tripCode}
            </p>
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Are you sure you want to cancel this trip?
            </p>
            {cancelTarget?.status === 'DISPATCHED' && (
              <div className="mt-3 flex items-start gap-2 text-xs text-amber-400
                              bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>
                  Vehicle <b>{cancelTarget?.vehicle?.registrationNo}</b> and
                  driver <b>{cancelTarget?.driver?.name}</b> will be
                  returned to <b>Available</b>.
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCancelTarget(null)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition
                ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Keep Trip
            </button>
            <button onClick={handleCancel} disabled={actionLoading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5
                         rounded-xl text-sm font-medium transition flex items-center
                         justify-center gap-2 disabled:opacity-50">
              {actionLoading
                ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <XCircle size={14} />}
              Cancel Trip
            </button>
          </div>
        </div>
      </Modal>

      {/* ── TRIP DETAIL MODAL ─────────────────────────────────────────────── */}
      <Modal
        isOpen={!!viewTrip}
        onClose={() => setViewTrip(null)}
        title={`Trip Details — ${viewTrip?.tripCode}`}
        size="lg"
      >
        {viewTrip && (
          <div className="space-y-5">
            {/* Status + route */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-lg font-semibold">
                <span>{viewTrip.source}</span>
                <ArrowRight size={18} className="text-orange-400" />
                <span>{viewTrip.destination}</span>
              </div>
              <StatusBadge status={viewTrip.status} size="md" />
            </div>

            {/* Details grid */}
            <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl border text-sm
              ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              {[
                { label: 'Vehicle', value: `${viewTrip.vehicle?.registrationNo} — ${viewTrip.vehicle?.name}` },
                { label: 'Driver', value: viewTrip.driver?.name },
                { label: 'Cargo Weight', value: `${viewTrip.cargoWeight} kg` },
                { label: 'Planned Distance', value: `${viewTrip.plannedDistance} km` },
                { label: 'Actual Distance', value: viewTrip.actualDistance ? `${viewTrip.actualDistance} km` : '—' },
                { label: 'Fuel Consumed', value: viewTrip.fuelConsumed ? `${viewTrip.fuelConsumed} L` : '—' },
                { label: 'Revenue', value: viewTrip.revenue ? `₹${viewTrip.revenue.toLocaleString()}` : '—' },
                { label: 'Scheduled', value: viewTrip.scheduledAt ? new Date(viewTrip.scheduledAt).toLocaleString('en-IN') : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                  <p className="font-medium text-sm">{value}</p>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Timeline
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Created', time: viewTrip.createdAt, color: 'bg-slate-500' },
                  { label: 'Dispatched', time: viewTrip.startedAt, color: 'bg-blue-500' },
                  { label: viewTrip.status === 'CANCELLED' ? 'Cancelled' : 'Completed',
                    time: viewTrip.completedAt, color: viewTrip.status === 'CANCELLED' ? 'bg-red-500' : 'bg-green-500' },
                ].map(({ label, time, color }) => (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${time ? color : 'bg-slate-700'}`} />
                    <span className={time ? (isDark ? 'text-slate-300' : 'text-slate-700') : 'text-slate-600'}>
                      {label}
                    </span>
                    <span className={`ml-auto text-xs font-mono
                      ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {time ? new Date(time).toLocaleString('en-IN') : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial summary */}
            {viewTrip.revenue && (
              <div className={`p-4 rounded-xl border
                ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Financial Summary
                </p>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Revenue</span>
                  <span className="font-mono text-green-400 font-semibold">
                    ₹{viewTrip.revenue.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            {viewTrip.notes && (
              <div className={`p-3 rounded-xl border text-sm
                ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300'
                          : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <FileText size={11} /> Notes
                </p>
                {viewTrip.notes}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
