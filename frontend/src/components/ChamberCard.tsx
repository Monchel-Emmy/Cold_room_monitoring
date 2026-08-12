import { Thermometer, Droplets, Syringe, AlertTriangle, CheckCircle2, Clock, Pencil, FlaskConical, Trash2, Settings } from 'lucide-react';
import { Chamber, LiveReading, Vaccine } from '../types';

interface Props {
  chamber: Chamber;
  liveReading?: LiveReading | null;
  onEditThresholds?: (chamber: Chamber) => void;
  onEdit?: (chamber: Chamber) => void;
  onDelete?: (chamber: Chamber) => void;
}

function TempGauge({ value, min, max }: { value: number | null; min: number; max: number }) {
  if (value === null) return <p className="text-3xl font-bold text-slate-500">—</p>;
  const ok = value >= min && value <= max;
  const warn = !ok && Math.abs(value - (value > max ? max : min)) < 2;
  const color = ok ? 'text-emerald-400' : warn ? 'text-yellow-400' : 'text-red-400';
  return <p className={`text-3xl font-bold ${color}`}>{value.toFixed(1)}°C</p>;
}

function HumGauge({ value, min, max }: { value: number | null; min: number; max: number }) {
  if (value === null) return <p className="text-3xl font-bold text-slate-500">—</p>;
  const ok = value >= min && value <= max;
  const color = ok ? 'text-blue-400' : 'text-yellow-400';
  return <p className={`text-3xl font-bold ${color}`}>{value.toFixed(1)}%</p>;
}

function VaccineBadge({ vaccine }: { vaccine: Vaccine }) {
  const d = vaccine.daysToExpiry ?? Math.ceil((new Date(vaccine.expiryDate).getTime() - Date.now()) / 86400000);
  const status = d < 0 ? 'expired' : vaccine.status;
  const badge: Record<string, string> = {
    active:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    at_risk:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    expired:  'bg-slate-600/50 text-slate-400 border-slate-600',
    recalled: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  const icons: Record<string, JSX.Element> = {
    active:   <CheckCircle2 size={10} />,
    at_risk:  <Clock size={10} />,
    expired:  <AlertTriangle size={10} />,
    recalled: <AlertTriangle size={10} />,
  };
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${badge[status] ?? badge.active}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        {icons[status]}
        <span className="font-medium truncate">{vaccine.name}</span>
      </div>
      <div className="text-right ml-2 flex-shrink-0">
        <p className="font-semibold">{vaccine.quantity} {vaccine.unit}</p>
        <p className="opacity-70">{d < 0 ? 'Expired' : `${d}d`}</p>
      </div>
    </div>
  );
}

export default function ChamberCard({ chamber, liveReading, onEditThresholds, onEdit, onDelete }: Props) {
  const temp = liveReading?.temperature ?? chamber.currentTemp ?? null;
  const hum  = liveReading?.humidity    ?? chamber.currentHumidity ?? null;
  const ts   = liveReading?.timestamp   ?? chamber.lastUpdated ?? null;

  const tempAlert = temp !== null && (temp < chamber.targetTempMin || temp > chamber.targetTempMax);
  const humAlert  = hum  !== null && (hum  < chamber.targetHumidityMin || hum > chamber.targetHumidityMax);
  const hasAlert  = tempAlert || humAlert;

  // ── Dose capacity calculations ──────────────────────────────────────────────
  const capacity  = chamber.capacity ?? 0;
  const stored    = chamber.dosesStored ?? (chamber.vaccines ?? []).reduce((s, v) => s + (v.quantity ?? 0), 0);
  const remaining = capacity > 0 ? Math.max(capacity - stored, 0) : null;
  const occupancy = capacity > 0 ? Math.min((stored / capacity) * 100, 100) : 0;
  const isFull    = capacity > 0 && stored >= capacity;
  const barColor  = isFull ? 'bg-red-500' : occupancy >= 75 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className={`bg-slate-800/60 rounded-2xl border p-5 flex flex-col gap-4 transition-all
      ${hasAlert ? 'border-red-500/50 shadow-lg shadow-red-500/10' : 'border-slate-700/40'}`}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">{chamber.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Sensor: {chamber.sensorId}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(chamber)}
              className="h-6 w-6 flex items-center justify-center rounded-md border border-slate-600 bg-slate-900/60 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
              title="Edit chamber"
            >
              <Pencil size={11} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(chamber)}
              className="h-6 w-6 flex items-center justify-center rounded-md border border-slate-600 bg-slate-900/60 text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors"
              title="Delete chamber"
            >
              <Trash2 size={11} />
            </button>
          )}
          {onEditThresholds && (
            <button
              type="button"
              onClick={() => onEditThresholds(chamber)}
              className="h-6 w-6 flex items-center justify-center rounded-md border border-slate-600 bg-slate-900/60 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
              title="Edit chamber thresholds"
            >
              <Settings size={11} />
            </button>
          )}
          {hasAlert && (
            <span className="flex items-center gap-1 text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full leading-none">
              <AlertTriangle size={9} /> Alert
            </span>
          )}
          <span className={`w-2 h-2 rounded-full ${
            chamber.status === 'operational' ? 'bg-emerald-400' :
            chamber.status === 'maintenance'  ? 'bg-yellow-400' : 'bg-red-400'
          }`} />
        </div>
      </div>

      {/* Sensor Gauges */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2">
            <Thermometer size={12} /> Temperature
          </div>
          <TempGauge value={temp} min={chamber.targetTempMin} max={chamber.targetTempMax} />
          <p className="text-xs text-slate-500 mt-1">
            Target: {chamber.targetTempMin}–{chamber.targetTempMax}°C
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2">
            <Droplets size={12} /> Humidity
          </div>
          <HumGauge value={hum} min={chamber.targetHumidityMin} max={chamber.targetHumidityMax} />
          <p className="text-xs text-slate-500 mt-1">
            Target: {chamber.targetHumidityMin}–{chamber.targetHumidityMax}%
          </p>
        </div>
      </div>

      {/* Timestamp */}
      {ts && (
        <p className="text-xs text-slate-500 text-right -mt-2">
          Updated {new Date(ts).toLocaleTimeString()}
        </p>
      )}

      {/* ── Dose Storage Strip ──────────────────────────────────────────────── */}
      <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30 space-y-2">
        {/* Title row */}
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
          <FlaskConical size={12} className="text-cyan-400" />
          <span>Dose Storage</span>
          {isFull && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full">
              <AlertTriangle size={9} /> FULL
            </span>
          )}
        </div>

        {/* Three stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-slate-500">Capacity</p>
            <p className="text-sm font-bold text-white mt-0.5">
              {capacity > 0 ? capacity : <span className="text-slate-500 text-xs">∞</span>}
            </p>
            {capacity > 0 && <p className="text-[10px] text-slate-600">doses</p>}
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Stored</p>
            <p className="text-sm font-bold text-cyan-300 mt-0.5">{stored}</p>
            <p className="text-[10px] text-slate-600">doses</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Remaining</p>
            <p className={`text-sm font-bold mt-0.5 ${
              remaining === null ? 'text-slate-400' : remaining === 0 ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {remaining !== null ? remaining : '—'}
            </p>
            {remaining !== null && <p className="text-[10px] text-slate-600">doses</p>}
          </div>
        </div>

        {/* Progress bar (only when capacity is set) */}
        {capacity > 0 && (
          <div className="space-y-1">
            <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${occupancy}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 text-right">{occupancy.toFixed(0)}% occupied</p>
          </div>
        )}
      </div>

      {/* Vaccines list */}
      {(chamber.vaccines?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-2">
            <Syringe size={12} /> Vaccines ({chamber.vaccineCount})
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {chamber.vaccines!.map(v => (
              <VaccineBadge key={String(v.id)} vaccine={v} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
