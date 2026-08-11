import { useEffect, useState } from 'react';
import {
  Building2, Snowflake, Thermometer, Droplets,
  Syringe, CheckCircle2, Clock, AlertTriangle, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useLive } from '../components/Layout';
import { Hospital, ColdRoom, Chamber, Vaccine } from '../types';

// ── Vaccine status badge ──────────────────────────────────────────────────────
function VaccineBadge({ v }: { v: Vaccine }) {
  const days = v.daysToExpiry ?? Math.ceil((new Date(v.expiryDate).getTime() - Date.now()) / 86400000);
  const status = days < 0 ? 'expired' : v.status;

  const cfg: Record<string, { bg: string; icon: JSX.Element; label: string }> = {
    active:   { bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: <CheckCircle2 size={9} />, label: 'Active'   },
    at_risk:  { bg: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',   icon: <Clock size={9} />,        label: 'At Risk'  },
    expired:  { bg: 'bg-slate-600/40 text-slate-400 border-slate-600',         icon: <AlertTriangle size={9} />,label: 'Expired'  },
    recalled: { bg: 'bg-red-500/15 text-red-300 border-red-500/30',            icon: <AlertTriangle size={9} />,label: 'Recalled' },
  };
  const s = cfg[status] ?? cfg.active;

  return (
    <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs ${s.bg}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        {s.icon}
        <span className="font-medium truncate">{v.name}</span>
      </div>
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        <span className="opacity-70">{v.quantity} {v.unit}</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${s.bg}`}>
          {s.label}
        </span>
      </div>
    </div>
  );
}

// ── Chamber block inside a cold room ─────────────────────────────────────────
function ChamberBlock({ chamber, liveTemp, liveHum }: {
  chamber: Chamber;
  liveTemp: number | null;
  liveHum:  number | null;
}) {
  const temp = liveTemp ?? chamber.currentTemp ?? null;
  const hum  = liveHum  ?? chamber.currentHumidity ?? null;

  const tempOk = temp !== null ? temp >= chamber.targetTempMin && temp <= chamber.targetTempMax : null;
  const humOk  = hum  !== null ? hum  >= chamber.targetHumidityMin && hum  <= chamber.targetHumidityMax : null;
  const alert  = tempOk === false || humOk === false;

  return (
    <div className={`rounded-xl border p-3 bg-slate-900/40 ${alert ? 'border-red-500/50' : 'border-slate-700/40'}`}>
      {/* Chamber name + sensor */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-200">{chamber.name}</h4>
        <span className="text-[10px] text-slate-500 font-mono">{chamber.sensorId}</span>
      </div>

      {/* Temp + Humidity inline */}
      <div className="flex items-center gap-3 mb-2.5">
        <div className="flex items-center gap-1">
          <Thermometer size={11} className={tempOk === false ? 'text-red-400' : 'text-slate-400'} />
          <span className={`text-sm font-bold ${tempOk === false ? 'text-red-400' : tempOk ? 'text-emerald-400' : 'text-slate-400'}`}>
            {temp !== null ? `${temp.toFixed(1)}°C` : '—'}
          </span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1">
          <Droplets size={11} className={humOk === false ? 'text-yellow-400' : 'text-slate-400'} />
          <span className={`text-sm font-bold ${humOk === false ? 'text-yellow-400' : humOk ? 'text-blue-400' : 'text-slate-400'}`}>
            {hum !== null ? `${hum.toFixed(1)}%` : '—'}
          </span>
        </div>
        {alert && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded-full">
            <AlertTriangle size={9} /> Alert
          </span>
        )}
      </div>

      {/* Vaccines */}
      {(chamber.vaccines?.length ?? 0) > 0 ? (
        <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
          {chamber.vaccines!.map(v => <VaccineBadge key={String(v.id)} v={v} />)}
        </div>
      ) : (
        <p className="text-[11px] text-slate-600 italic">No vaccines assigned</p>
      )}
    </div>
  );
}

// ── Cold Room column ──────────────────────────────────────────────────────────
function ColdRoomColumn({ room, liveMap }: {
  room: ColdRoom;
  liveMap: Map<string, { temp: number; humidity: number }>;
}) {
  const typeLabel: Record<string, string> = {
    walk_in_cooler: 'Walk-in Cooler',
    refrigerator:   'Refrigerator',
    freezer:        'Freezer',
    ultra_cold:     'Ultra-Cold',
  };
  const statusDot: Record<string, string> = {
    operational: 'bg-emerald-400',
    maintenance:  'bg-yellow-400',
    defective:    'bg-red-400',
  };

  return (
    <div className="flex-1 min-w-0 bg-slate-800/50 border border-slate-700/50 rounded-2xl flex flex-col overflow-hidden">
      {/* Room header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-900/40 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-cyan-500/15 rounded-lg flex items-center justify-center border border-cyan-500/20">
          <Snowflake size={14} className="text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{room.name}</h3>
          <p className="text-[11px] text-slate-400">{typeLabel[room.type] ?? room.type}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 font-mono">{room.targetTempMin}–{room.targetTempMax}°C</span>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[room.status] ?? 'bg-slate-500'}`} />
        </div>
      </div>

      {/* Chambers */}
      <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1">
        {(room.chambers?.length ?? 0) === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No chambers</p>
        ) : (
          room.chambers!.map(ch => {
            const live = liveMap.get(String(ch.id));
            return (
              <ChamberBlock
                key={String(ch.id)}
                chamber={ch}
                liveTemp={live?.temp ?? null}
                liveHum={live?.humidity ?? null}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Hospital section ──────────────────────────────────────────────────────────
function HospitalSection({ hospital, rooms, liveMap }: {
  hospital: Hospital;
  rooms: ColdRoom[];
  liveMap: Map<string, { temp: number; humidity: number }>;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Hospital header */}
      <div className="px-5 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center gap-3">
        <div className="w-9 h-9 bg-purple-500/15 rounded-xl flex items-center justify-center border border-purple-500/20">
          <Building2 size={16} className="text-purple-400" />
        </div>
        <div>
          <h2 className="font-bold text-white">{hospital.name}</h2>
          <p className="text-xs text-slate-400">{hospital.district}, {hospital.region}</p>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Snowflake size={11} className="text-cyan-400" /> {rooms.length} rooms</span>
          <span className="flex items-center gap-1"><Syringe size={11} className="text-green-400" />
            {rooms.reduce((s, r) => s + (r.vaccineCount ?? 0), 0)} vaccines
          </span>
        </div>
      </div>

      {/* Cold rooms side by side */}
      <div className="p-4 flex gap-4 overflow-x-auto">
        {rooms.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">No cold rooms assigned.</p>
        ) : (
          rooms.map(r => (
            <ColdRoomColumn key={r.id} room={r} liveMap={liveMap} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Monitoring page ──────────────────────────────────────────────────────
export default function Monitoring() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [roomsByHC,  setRoomsByHC]  = useState<Map<string, ColdRoom[]>>(new Map());
  const [loading,    setLoading]    = useState(true);
  const { readings } = useLive();

  const load = async () => {
    setLoading(true);
    try {
      const [hosps, rooms]: any = await Promise.all([
        api.getHospitals(),
        api.getColdRooms(),
      ]);
      const map = new Map<string, ColdRoom[]>();
      (hosps as Hospital[]).forEach(h => {
        map.set(h.id, (rooms as ColdRoom[]).filter(r => r.hospitalId === h.id));
      });
      setHospitals(hosps);
      setRoomsByHC(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Build live map from WebSocket readings: chamberId → { temp, humidity }
  const liveMap = new Map<string, { temp: number; humidity: number }>();
  readings.forEach((r, chamberId) => {
    liveMap.set(chamberId, { temp: r.temperature, humidity: r.humidity });
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 flex items-center gap-2">
        <Snowflake size={16} className="animate-spin text-cyan-400" /> Loading...
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Snowflake size={20} className="text-cyan-400" /> Monitoring
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Live cold room status — chambers & vaccines
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* One section per hospital */}
      {hospitals.map(h => (
        <HospitalSection
          key={h.id}
          hospital={h}
          rooms={roomsByHC.get(h.id) ?? []}
          liveMap={liveMap}
        />
      ))}

      {hospitals.length === 0 && (
        <div className="text-center py-16 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700/30">
          <Building2 size={32} className="mx-auto mb-2 opacity-30" />
          <p>No hospitals found.</p>
        </div>
      )}
    </div>
  );
}
