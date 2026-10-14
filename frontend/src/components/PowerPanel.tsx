import { Zap, AlertTriangle } from 'lucide-react';
import { PowerReading } from '../types';

// A real device is shown as offline when it has not reported for this long
const DEVICE_OFFLINE_MS = 2 * 60 * 1000;

// Power meter readings (voltage, current, power, energy) for one cold room
export default function PowerPanel({ p, showRoomName = false }: { p: PowerReading; showRoomName?: boolean }) {
  const offline = p.isDevice && Date.now() - new Date(p.timestamp).getTime() > DEVICE_OFFLINE_MS;
  const badge = !p.isDevice
    ? 'bg-slate-600/40 text-slate-400 border-slate-600'
    : offline
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

  return (
    <div className={`rounded-xl border px-3 py-2 ${p.alarm ? 'border-red-500/40 bg-red-500/10' : 'border-slate-700/50 bg-slate-900/40'}`}>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="flex items-center gap-1.5 text-slate-300 font-semibold truncate">
          <Zap size={11} className="text-yellow-400 flex-shrink-0" />
          {showRoomName ? (p.coldRoomName ?? 'Cold room') : 'Power'}
        </span>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          {p.alarm && <span className="flex items-center gap-1 text-red-400 font-bold"><AlertTriangle size={10} /> ALARM</span>}
          <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${badge}`}>
            {!p.isDevice ? 'SIMULATED' : offline ? 'OFFLINE' : 'LIVE'}
          </span>
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-2 text-center">
        {[
          ['Voltage', p.voltage.toFixed(1),   'V'],
          ['Current', p.current.toFixed(2),   'A'],
          ['Power',   p.power.toFixed(1),     'W'],
          ['Energy',  p.energyKwh.toFixed(3), 'kWh'],
        ].map(([label, value, unit]) => (
          <div key={label}>
            <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-xs font-bold text-white">{value}<span className="text-[9px] text-slate-400 font-normal ml-0.5">{unit}</span></p>
          </div>
        ))}
      </div>
      {p.isDevice && (
        <p className="mt-1 text-[9px] text-slate-500">Last update {new Date(p.timestamp).toLocaleString()}</p>
      )}
    </div>
  );
}
