import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { tripsAPI, vehiclesAPI, driversAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';
import { useTranslation } from '../hooks/useTranslation';
import { PageHeader, SectionHeader, StatusBadge, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Route, Truck, Users, Package, Send, CheckCircle,
  XCircle, Eye, AlertCircle, ArrowRight, Fuel,
  Gauge, Calendar, FileText, ChevronRight, Lock
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const COLUMNS = [
  {
    status: 'DRAFT',
    labelKey: 'draft',
    color: 'text-text-sub',
    dotColor: 'bg-text-sub/50',
    badgeClass: 'bg-recessed text-text-sub',
    border: 'border-slate-300/40 dark:border-slate-700/40'
  },
  {
    status: 'DISPATCHED',
    labelKey: 'dispatched',
    color: 'text-blue-500 dark:text-blue-400',
    dotColor: 'bg-blue-500 dark:bg-blue-400 shadow-[0_0_6px_#3b82f6]',
    badgeClass: 'bg-blue-500/10 text-blue-500 dark:text-blue-400',
    border: 'border-blue-500/30'
  },
  {
    status: 'COMPLETED',
    labelKey: 'completed',
    color: 'text-green-500 dark:text-green-400',
    dotColor: 'bg-green-500 dark:bg-green-400 shadow-[0_0_6px_#22c55e]',
    badgeClass: 'bg-green-500/10 text-green-500 dark:text-green-400',
    border: 'border-green-500/30'
  },
  {
    status: 'CANCELLED',
    labelKey: 'cancelled',
    color: 'text-red-500 dark:text-red-400',
    dotColor: 'bg-red-500 dark:bg-red-400 shadow-[0_0_6px_#ef4444]',
    badgeClass: 'bg-red-500/10 text-red-500 dark:text-red-400',
    border: 'border-red-500/30'
  },
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
function TripCard({ trip, onDispatch, onComplete, onCancel, onView }) {
  const { isReadOnly } = usePermission('trips');
  const { t } = useTranslation();
  const { theme } = useAuthStore();
  const [hovered, setHovered] = useState(false);
  const isDark = theme === 'dark';

  const statusTextColors = {
    DRAFT: 'text-text-sub',
    DISPATCHED: 'text-blue-500 dark:text-blue-400',
    COMPLETED: 'text-green-500 dark:text-green-400',
    CANCELLED: 'text-red-500 dark:text-red-400',
  };

  return (
    <div
      className="card text-sm transition-all duration-300 hover:translate-y-[-2px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        boxShadow: hovered
          ? (isDark ? '6px 6px 18px rgba(0, 0, 0, 0.65)' : '6px 6px 18px rgba(163, 177, 198, 0.7)')
          : (isDark ? '4px 4px 12px rgba(0, 0, 0, 0.4)' : '4px 4px 12px rgba(163, 177, 198, 0.45)')
      }}
    >

      {/* Trip code + route */}
      <div className="flex items-start justify-between mb-2">
        <span className={`font-mono font-bold text-xs ${statusTextColors[trip.status]}`}>
          {trip.tripCode}
        </span>
        <StatusBadge status={trip.status} />
      </div>

      <div className="flex items-center gap-1.5 font-medium text-xs mb-2 truncate text-text-main font-mono">
        <span className="truncate">{trip.source}</span>
        <ArrowRight size={12} className="shrink-0 text-text-sub" />
        <span className="truncate">{trip.destination}</span>
      </div>

      <div className="text-xs space-y-1 text-text-sub font-mono">
        <div className="flex items-center gap-1.5">
          <Truck size={11} className="text-text-sub" />
          <span>{trip.vehicle?.registrationNo}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={11} className="text-text-sub" />
          <span>{trip.driver?.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Package size={11} className="text-text-sub" />
          <span>{trip.cargoWeight} kg</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-b-shadow/20">
        {isReadOnly ? (
          <button onClick={() => onView(trip)}
            className="flex-1 py-1.5 rounded-lg text-[10px] uppercase font-mono font-bold tracking-wider text-text-main bg-recessed/30 hover:bg-recessed/50 active:scale-95 border border-[var(--border-color)]/50 hover:border-[var(--border-color)] flex items-center justify-center gap-1 transition-all duration-150 shadow-[var(--shadow-recessed)] hover:shadow-none">
            <Eye size={11} /> {t('viewDetails')}
          </button>
        ) : (
          <>
            {trip.status === 'DRAFT' && (
              <>
                <button onClick={() => onDispatch(trip)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] uppercase font-mono font-bold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 border border-blue-500/20 hover:border-blue-500/40 flex items-center justify-center gap-1 transition-all duration-150">
                  <Send size={11} /> {t('dispatch')}
                </button>
                <button onClick={() => onCancel(trip)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] uppercase font-mono font-bold tracking-wider text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 active:scale-95 border border-red-500/20 hover:border-red-500/40 flex items-center justify-center gap-1 transition-all duration-150">
                  <XCircle size={11} /> {t('cancel')}
                </button>
              </>
            )}
            {trip.status === 'DISPATCHED' && (
              <>
                <button onClick={() => onComplete(trip)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] uppercase font-mono font-bold tracking-wider text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20 active:scale-95 border border-green-500/20 hover:border-green-500/40 flex items-center justify-center gap-1 transition-all duration-150">
                  <CheckCircle size={11} /> {t('complete')}
                </button>
                <button onClick={() => onCancel(trip)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] uppercase font-mono font-bold tracking-wider text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 active:scale-95 border border-red-500/20 hover:border-red-500/40 flex items-center justify-center gap-1 transition-all duration-150">
                  <XCircle size={11} /> {t('cancel')}
                </button>
              </>
            )}
            {(trip.status === 'COMPLETED' || trip.status === 'CANCELLED') && (
              <button onClick={() => onView(trip)}
                className="flex-1 py-1.5 rounded-lg text-[10px] uppercase font-mono font-bold tracking-wider text-text-main bg-recessed/30 hover:bg-recessed/50 active:scale-95 border border-[var(--border-color)]/50 hover:border-[var(--border-color)] flex items-center justify-center gap-1 transition-all duration-150 shadow-[var(--shadow-recessed)] hover:shadow-none">
                <Eye size={11} /> {t('viewDetails')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const estimateRouteDistance = async (lat1, lon1, lat2, lon2) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      const distanceKm = Math.round(data.routes[0].distance / 1000);
      return distanceKm;
    }
  } catch (err) {
    console.error("OSM Routing API error, falling back to Haversine:", err);
  }

  // Haversine formula fallback
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directDistance = R * c;

  return Math.round(directDistance * 1.25);
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Trips() {
  const { theme } = useAuthStore();
  const isDark = theme === 'dark';
  const { canCreate, canEdit, canDelete, isReadOnly } = usePermission('trips');
  const { t } = useTranslation();

  const TripsReadOnlyWidgets = () => {
    const dispatched = trips.filter(t => t.status === 'DISPATCHED').length;
    
    return (
      <div className="space-y-4">
        {/* Read Only Access Alert */}
        <div style={{
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '12px',
          padding: '12px',
          fontSize: '13px',
          color: '#60a5fa',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <Lock size={15} className="text-blue-400 shrink-0" />
          <span>
            <strong>Read-Only Access:</strong> Contact your Fleet Manager to request full dispatch permissions.
          </span>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 gap-3">
          {/* Widget 1: Available Fleet */}
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--foreground)] shadow-[var(--shadow-recessed)]">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-sub font-mono uppercase font-bold tracking-wider">Available Fleet</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 font-bold">READY</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-text-main font-mono">
              {availableVehicles.length} <span className="text-xs font-normal text-text-sub">vehicles</span>
            </div>
          </div>

          {/* Widget 2: On-Duty Drivers */}
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--foreground)] shadow-[var(--shadow-recessed)]">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-sub font-mono uppercase font-bold tracking-wider">On-Duty Drivers</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold">ACTIVE</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-text-main font-mono">
              {availableDrivers.length} <span className="text-xs font-normal text-text-sub">drivers</span>
            </div>
          </div>

          {/* Widget 3: Dispatched Trips */}
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--foreground)] shadow-[var(--shadow-recessed)]">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-sub font-mono uppercase font-bold tracking-wider">Dispatched Trips</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold">ON ROAD</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-text-main font-mono">
              {dispatched} <span className="text-xs font-normal text-text-sub font-mono">ongoing</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Data state
  const [trips, setTrips] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // OSM Nominatim Suggestions state
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [destLoading, setDestLoading] = useState(false);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);

  // Click outside to close suggestions
  useEffect(() => {
    const handleOutsideClick = () => {
      setTimeout(() => {
        setShowSourceSuggestions(false);
        setShowDestSuggestions(false);
      }, 200);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Auto-estimate distance when both source & destination coords are selected
  useEffect(() => {
    if (!sourceCoords || !destCoords) return;
    const calculate = async () => {
      const distance = await estimateRouteDistance(
        sourceCoords.lat,
        sourceCoords.lon,
        destCoords.lat,
        destCoords.lon
      );
      if (distance > 0) {
        handleFormChange('plannedDistance', distance.toString());
        toast.success(`Estimated route distance: ${distance} km`);
      }
    };
    calculate();
  }, [sourceCoords, destCoords]);

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

  // Debounced search for Source suggestions (OpenStreetMap Nominatim)
  useEffect(() => {
    if (!form.source || form.source.trim().length < 3 || !showSourceSuggestions) {
      setSourceSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSourceLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.source)}&limit=5`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSourceSuggestions(data);
        }
      } catch (err) {
        console.error("OSM Nominatim error:", err);
      } finally {
        setSourceLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.source, showSourceSuggestions]);

  // Debounced search for Destination suggestions (OpenStreetMap Nominatim)
  useEffect(() => {
    if (!form.destination || form.destination.trim().length < 3 || !showDestSuggestions) {
      setDestSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setDestLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.destination)}&limit=5`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setDestSuggestions(data);
        }
      } catch (err) {
        console.error("OSM Nominatim error:", err);
      } finally {
        setDestLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.destination, showDestSuggestions]);

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
    `input ${err ? 'ring-2 ring-danger' : ''}`;

  const selectCls = (err) =>
    `select ${err ? 'ring-2 ring-danger' : ''}`;

  // ─── Group trips by status ─────────────────────────────────────────────────
  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.status] = trips.filter(t => t.status === col.status);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-xl bg-recessed animate-pulse shadow-[var(--shadow-recessed)]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 rounded-2xl bg-recessed animate-pulse" />
          <div className="lg:col-span-2 h-96 rounded-2xl bg-recessed animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tripDispatcher')}
        subtitle={t('createManageTrips')}
        icon={Route}
      />

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── LEFT: Create Trip Form ─────────────────────────────────────── */}
        <div className="rounded-2xl bg-panel shadow-[var(--shadow-card)] p-5 border border-[var(--border-color)]">
          <SectionHeader icon={Route} title={t('createTrip')} />

          {canCreate ? (
            <form onSubmit={handleCreateTrip} className="space-y-3">
            {/* Source / Destination */}
            {/* Source / Destination */}
            <div className="relative">
              <Field label={`${t('source')} *`} error={formErrors.source}>
                <input
                  value={form.source}
                  onChange={e => {
                    handleFormChange('source', e.target.value);
                    setShowSourceSuggestions(true);
                    setSourceCoords(null);
                  }}
                  onFocus={() => setShowSourceSuggestions(true)}
                  placeholder="e.g. Mumbai Warehouse"
                  className={inputCls(formErrors.source)}
                />
              </Field>
              {showSourceSuggestions && (sourceSuggestions.length > 0 || sourceLoading) && (
                <div className="absolute z-30 w-full bg-[var(--foreground)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-floating)] max-h-48 overflow-y-auto mt-1">
                  {sourceLoading && (
                    <div className="p-3 text-xs text-text-sub font-mono">Searching locations...</div>
                  )}
                  {!sourceLoading && sourceSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        handleFormChange('source', item.display_name);
                        setSourceCoords({ lat: parseFloat(item.lat), lon: parseFloat(item.lon) });
                        setShowSourceSuggestions(false);
                      }}
                      className="p-2.5 text-xs text-text-main hover:bg-[var(--accent)]/10 cursor-pointer truncate border-b last:border-0 border-black/10 dark:border-white/5 font-mono"
                    >
                      {item.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <Field label={`${t('destination')} *`} error={formErrors.destination}>
                <input
                  value={form.destination}
                  onChange={e => {
                    handleFormChange('destination', e.target.value);
                    setShowDestSuggestions(true);
                    setDestCoords(null);
                  }}
                  onFocus={() => setShowDestSuggestions(true)}
                  placeholder="e.g. Pune Distribution"
                  className={inputCls(formErrors.destination)}
                />
              </Field>
              {showDestSuggestions && (destSuggestions.length > 0 || destLoading) && (
                <div className="absolute z-30 w-full bg-[var(--foreground)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-floating)] max-h-48 overflow-y-auto mt-1">
                  {destLoading && (
                    <div className="p-3 text-xs text-text-sub font-mono">Searching locations...</div>
                  )}
                  {!destLoading && destSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        handleFormChange('destination', item.display_name);
                        setDestCoords({ lat: parseFloat(item.lat), lon: parseFloat(item.lon) });
                        setShowDestSuggestions(false);
                      }}
                      className="p-2.5 text-xs text-text-main hover:bg-[var(--accent)]/10 cursor-pointer truncate border-b last:border-0 border-black/10 dark:border-white/5 font-mono"
                    >
                      {item.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle selector */}
            <Field label={`${t('vehicle')} *`} error={formErrors.vehicleId}>
              <select
                value={form.vehicleId}
                onChange={e => handleFormChange('vehicleId', e.target.value)}
                className={selectCls(formErrors.vehicleId)}
              >
                <option value="">{t('selectAvailableVehicle')}</option>
                {availableVehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} — {v.name} ({v.maxLoadCapacity} kg)
                  </option>
                ))}
              </select>
              {selectedVehicle && (
                <p className="text-xs text-success mt-1 font-mono">
                  ✓ Max capacity: {selectedVehicle.maxLoadCapacity} kg
                </p>
              )}
            </Field>

            {/* Driver selector */}
            <Field label={`${t('driver')} *`} error={formErrors.driverId}>
              <select
                value={form.driverId}
                onChange={e => handleFormChange('driverId', e.target.value)}
                className={selectCls(formErrors.driverId)}
              >
                <option value="">{t('selectAvailableDriver')}</option>
                {availableDrivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.licenseNo} (Score: {d.safetyScore ?? 'N/A'})
                  </option>
                ))}
              </select>
            </Field>

            {/* Cargo Weight with progress bar */}
            <Field label={`${t('cargoWeight')} *`} error={formErrors.cargoWeight}>
              <input
                type="number" min="0"
                value={form.cargoWeight}
                onChange={e => handleFormChange('cargoWeight', e.target.value)}
                placeholder="0"
                className={inputCls(formErrors.cargoWeight || cargoOverLimit)}
              />
              {selectedVehicle && form.cargoWeight && (
                <div className="mt-1.5">
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className={cargoOverLimit ? 'text-danger' : 'text-text-sub'}>
                      {cargoNum} kg
                    </span>
                    <span className="text-text-sub">{capacityNum} kg max</span>
                  </div>
                  <div className="h-1.5 bg-recessed rounded-full overflow-hidden shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)]">
                    <div
                      className={`h-full rounded-full transition-all
                        ${cargoOverLimit ? 'bg-danger' : 'bg-accent'}`}
                      style={{ width: `${Math.min((cargoNum / capacityNum) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </Field>

            {/* Distance + Revenue */}
            <div className="grid grid-cols-2 gap-3">
              <Field label={`${t('distance')} *`} error={formErrors.plannedDistance}>
                <input
                  type="number" min="0"
                  value={form.plannedDistance}
                  onChange={e => handleFormChange('plannedDistance', e.target.value)}
                  placeholder="0"
                  className={inputCls(formErrors.plannedDistance)}
                />
              </Field>
              <Field label={`${t('revenue')}`} error={formErrors.revenue}>
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
            <Field label={t('scheduledDateTime')} error={formErrors.scheduledAt}>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => handleFormChange('scheduledAt', e.target.value)}
                className={inputCls(formErrors.scheduledAt)}
              />
            </Field>
            <Field label={t('notes')} error={formErrors.notes}>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => handleFormChange('notes', e.target.value)}
                placeholder={t('optionalTripNotes')}
                className={`${inputCls(formErrors.notes)} resize-none`}
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full mt-2"
            >
              {submitting
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Route size={15} />}
              {submitting ? 'Creating...' : 'Create as Draft'}
            </button>
          </form>
          ) : (
            <TripsReadOnlyWidgets />
          )}
        </div>

        {/* ── RIGHT: Kanban Board ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader icon={Send} title={t('tripsBoard')} badge={trips.length} />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUMNS.map(col => (
              <div
                key={col.status}
                className="bg-panel/20 dark:bg-muted/10 p-4 rounded-2xl border border-[var(--border-color)]/30 flex flex-col min-h-[480px] shadow-[var(--shadow-recessed)]"
              >
                {/* Column header */}
                <div className={`flex items-center justify-between mb-4 pb-2.5 border-b ${col.border}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <span className={`text-xs font-bold font-mono uppercase tracking-wider ${col.color}`}>
                      {t(col.labelKey)}
                    </span>
                  </div>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${col.badgeClass}`}>
                    {grouped[col.status]?.length || 0}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-2.5">
                  {grouped[col.status]?.length === 0 ? (
                    <div className="text-center py-12 text-xs rounded-xl border-dashed border border-b-shadow/30 text-text-sub font-mono uppercase tracking-wider bg-panel/10 dark:bg-panel/5">
                      {t('noTrips')}
                    </div>
                  ) : (
                    grouped[col.status].map(trip => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
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
        title={t('confirm')}
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[var(--background)] shadow-[var(--shadow-recessed)] border border-b-shadow/20 text-sm">
            <p className="font-mono text-accent font-bold mb-2">
              {dispatchTarget?.tripCode}
            </p>
            <p className="text-text-main">
              <span className="font-medium">{dispatchTarget?.source}</span>
              {' → '}
              <span className="font-medium">{dispatchTarget?.destination}</span>
            </p>
            <p className="mt-2 text-xs text-text-sub">
              Vehicle <b className="text-text-main">{dispatchTarget?.vehicle?.registrationNo}</b> and
              driver <b className="text-text-main">{dispatchTarget?.driver?.name}</b> will be
              marked <b className="text-blue-500 dark:text-blue-400">{t('onTrip')}</b>.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDispatchTarget(null)}
              className="btn-secondary flex-1"
            >
              {t('cancel2')}
            </button>
            <button
              onClick={handleDispatch}
              disabled={actionLoading}
              className="btn-primary bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 flex-1"
            >
              {actionLoading
                ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send size={14} />}
              {t('dispatch')}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── COMPLETE MODAL ────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!completeTarget}
        onClose={() => setCompleteTarget(null)}
        title={`${t('complete')} ${completeTarget?.tripCode}`}
        size="sm"
      >
        <form onSubmit={handleComplete} className="space-y-4">
          <Field label={`${t('endOdometer')} *`} error={completeErrors.endOdometer}>
            <div className="relative">
              <Gauge size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" />
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
          <Field label={t('fuelConsumedL')} error={completeErrors.fuelConsumed}>
            <div className="relative">
              <Fuel size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" />
              <input
                type="number" min="0"
                value={completeForm.fuelConsumed}
                onChange={e => setCompleteForm(f => ({ ...f, fuelConsumed: e.target.value }))}
                placeholder="Optional"
                className={`pl-9 ${inputCls(completeErrors.fuelConsumed)}`}
              />
            </div>
          </Field>
          <Field label={t('actualDistance')} error={completeErrors.actualDistance}>
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
              className="btn-secondary flex-1">
              {t('cancel2')}
            </button>
            <button type="submit" disabled={actionLoading}
              className="btn-primary bg-success flex-1">
              {actionLoading
                ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <CheckCircle size={14} />}
              {t('complete')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── CANCEL CONFIRM ────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={t('cancel')}
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-b-shadow/30 bg-chassis shadow-[var(--shadow-recessed)] text-sm">
            <p className="font-mono text-accent font-bold mb-1">
              {cancelTarget?.tripCode}
            </p>
            <p className="text-text-main">
              Are you sure you want to cancel this trip?
            </p>
            {cancelTarget?.status === 'DISPATCHED' && (
              <div className="mt-3 flex items-start gap-2 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg p-2.5 font-mono uppercase tracking-wider">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>
                  Vehicle <b>{cancelTarget?.vehicle?.registrationNo}</b> and
                  driver <b>{cancelTarget?.driver?.name}</b> will be
                  returned to <b>{t('available')}</b>.
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCancelTarget(null)}
              className="btn-secondary flex-1">
              {t('cancel2')}
            </button>
            <button onClick={handleCancel} disabled={actionLoading}
              className="btn-danger flex-1">
              {actionLoading
                ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <XCircle size={14} />}
              {t('cancel')}
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
              <div className="flex items-center gap-3 text-lg font-semibold font-mono text-text-main">
                <span>{viewTrip.source}</span>
                <ArrowRight size={18} className="text-accent" />
                <span>{viewTrip.destination}</span>
              </div>
              <StatusBadge status={viewTrip.status} size="md" />
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-b-shadow/30 bg-chassis shadow-[var(--shadow-recessed)] text-sm font-mono">
              {[
                { label: t('vehicle'), value: `${viewTrip.vehicle?.registrationNo} — ${viewTrip.vehicle?.name}` },
                { label: t('driver'), value: viewTrip.driver?.name },
                { label: t('cargoWeight'), value: `${viewTrip.cargoWeight} kg` },
                { label: t('plannedDistance'), value: `${viewTrip.plannedDistance} km` },
                { label: t('actualDistance'), value: viewTrip.actualDistance ? `${viewTrip.actualDistance} km` : '—' },
                { label: t('fuelConsumedL'), value: viewTrip.fuelConsumed ? `${viewTrip.fuelConsumed} L` : '—' },
                { label: t('revenue'), value: viewTrip.revenue ? `₹${viewTrip.revenue.toLocaleString()}` : '—' },
                { label: t('scheduledDateTime'), value: viewTrip.scheduledAt ? new Date(viewTrip.scheduledAt).toLocaleString('en-IN') : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold text-text-sub uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="font-bold text-sm text-text-main">{value}</p>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div>
              <p className="text-[10px] font-bold text-text-sub font-mono uppercase tracking-wider mb-3">
                Timeline
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Created', time: viewTrip.createdAt, color: 'bg-text-sub' },
                  { label: 'Dispatched', time: viewTrip.startedAt, color: 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' },
                  { label: viewTrip.status === 'CANCELLED' ? 'Cancelled' : 'Completed',
                    time: viewTrip.completedAt, color: viewTrip.status === 'CANCELLED' ? 'bg-danger shadow-[var(--shadow-glow-danger)]' : 'bg-success shadow-[var(--shadow-glow-success)]' },
                ].map(({ label, time, color }) => (
                  <div key={label} className="flex items-center gap-3 text-sm font-mono">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${time ? color : 'bg-recessed'}`} />
                    <span className={time ? 'text-text-main' : 'text-text-sub'}>
                      {label}
                    </span>
                    <span className="ml-auto text-xs text-text-sub">
                      {time ? new Date(time).toLocaleString('en-IN') : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial summary */}
            {viewTrip.revenue && (
              <div className="p-4 rounded-xl border border-b-shadow/30 bg-chassis shadow-[var(--shadow-recessed)]">
                <p className="text-[10px] font-bold text-text-sub font-mono uppercase tracking-wider mb-2">
                  Financial Summary
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-text-sub font-mono text-xs uppercase tracking-wider">Revenue</span>
                  <span className="font-bold font-mono text-success">
                    ₹{viewTrip.revenue.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            {viewTrip.notes && (
              <div className="p-3 rounded-xl border border-b-shadow/30 bg-chassis shadow-[var(--shadow-recessed)] text-sm text-text-main font-mono">
                <p className="text-[10px] font-bold text-text-sub uppercase tracking-wider mb-1 flex items-center gap-1">
                  <FileText size={11} /> {t('notes')}
                </p>
                {t(viewTrip.notes)}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
