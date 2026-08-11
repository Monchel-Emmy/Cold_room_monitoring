import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Snowflake, Thermometer, FlaskConical, Save } from 'lucide-react';
import { api } from '../services/api';
import { useLive } from '../components/Layout';
import ChamberCard from '../components/ChamberCard';
import Modal from '../components/Modal';
import { ColdRoom, Chamber } from '../types';

export default function ColdRoomDetail() {
  const { id } = useParams<{ id: string }>();
  const [room, setRoom]       = useState<ColdRoom | null>(null);
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChamber, setEditingChamber] = useState<Chamber | null>(null);
  const [thresholdForm, setThresholdForm] = useState({
    targetTempMin: 0,
    targetTempMax: 0,
    targetHumidityMin: 0,
    targetHumidityMax: 0,
  });
  const [saving, setSaving] = useState(false);
  const { readings } = useLive();

  const loadRoom = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getColdRoom(id),
      api.getChambers(id),
    ]).then(([r, ch]: any) => {
      setRoom(r);
      setChambers(ch);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadRoom(); }, [id]);

  const openThresholdEditor = (chamber: Chamber) => {
    setEditingChamber(chamber);
    setThresholdForm({
      targetTempMin: chamber.targetTempMin,
      targetTempMax: chamber.targetTempMax,
      targetHumidityMin: chamber.targetHumidityMin,
      targetHumidityMax: chamber.targetHumidityMax,
    });
  };

  const saveThresholds = async () => {
    if (!editingChamber) return;
    setSaving(true);
    try {
      await api.updateChamber(editingChamber.id, thresholdForm);
      setEditingChamber(null);
      loadRoom();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
  if (!room) return <div className="text-slate-400 p-6">Cold room not found.</div>;

  const typeLabel: Record<string, string> = {
    walk_in_cooler: 'Walk-in Cooler',
    refrigerator:   'Refrigerator',
    freezer:        'Freezer',
    ultra_cold:     'Ultra-Cold',
  };

  const statusColor: Record<string, string> = {
    operational: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    maintenance:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    defective:    'bg-red-500/15 text-red-400 border-red-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link to="/cold-rooms" className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 text-sm mb-4 w-fit">
          <ArrowLeft size={14} /> Back to Cold Rooms
        </Link>
        <div className="bg-gradient-to-r from-slate-800 to-cyan-900/30 rounded-2xl p-6 border border-slate-700/50">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
                <Snowflake size={22} className="text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{room.name}</h1>
                <p className="text-slate-400 text-sm">{room.hospitalName} · {typeLabel[room.type] ?? room.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${statusColor[room.status] ?? ''}`}>
                {room.status}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-700/40 px-3 py-1 rounded-full border border-slate-600/30">
                <Thermometer size={12} />
                {room.targetTempMin}–{room.targetTempMax}°C
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-500 text-xs">Model</p>
              <p className="text-slate-200 font-medium mt-0.5">{room.modelName || '—'}</p>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-500 text-xs">Serial Number</p>
              <p className="text-slate-200 font-medium mt-0.5 font-mono text-xs">{room.serialNumber || '—'}</p>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-500 text-xs">Chambers</p>
              <p className="text-slate-200 font-medium mt-0.5">{chambers.length}</p>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-500 text-xs">Total Vaccines</p>
              <p className="text-slate-200 font-medium mt-0.5">
                {chambers.reduce((s, c) => s + (c.vaccineCount ?? 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chambers */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <FlaskConical size={14} className="text-cyan-400" /> Chambers — Live Status
        </h2>
        {chambers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700/30">
            No chambers assigned to this cold room.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {chambers.map(ch => (
              <ChamberCard
                key={String(ch.id)}
                chamber={ch}
                liveReading={readings.get(String(ch.id)) ?? null}
                onEditThresholds={openThresholdEditor}
              />
            ))}
          </div>
        )}
      </div>

      <Modal open={Boolean(editingChamber)} title={`Edit thresholds: ${editingChamber?.name ?? ''}`} onClose={() => setEditingChamber(null)} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Temp min (°C)</label>
              <input type="number" value={thresholdForm.targetTempMin} onChange={(e) => setThresholdForm({ ...thresholdForm, targetTempMin: Number(e.target.value) })} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Temp max (°C)</label>
              <input type="number" value={thresholdForm.targetTempMax} onChange={(e) => setThresholdForm({ ...thresholdForm, targetTempMax: Number(e.target.value) })} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Humidity min (%)</label>
              <input type="number" value={thresholdForm.targetHumidityMin} onChange={(e) => setThresholdForm({ ...thresholdForm, targetHumidityMin: Number(e.target.value) })} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Humidity max (%)</label>
              <input type="number" value={thresholdForm.targetHumidityMax} onChange={(e) => setThresholdForm({ ...thresholdForm, targetHumidityMax: Number(e.target.value) })} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setEditingChamber(null)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={saveThresholds} disabled={saving} className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
            <Save size={15} /> {saving ? 'Saving...' : 'Save thresholds'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
