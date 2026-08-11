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
  const [chamberModal, setChamberModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedChamber, setSelectedChamber] = useState<Chamber | null>(null);
  const [chamberForm, setChamberForm] = useState<any>({
    name: '',
    sensorId: '',
    hospitalId: '',
    coldRoomId: id || '',
    status: 'operational',
    targetTempMin: 2,
    targetTempMax: 8,
    targetHumidityMin: 45,
    targetHumidityMax: 75,
    notes: '',
  });
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

  const openCreateChamber = () => {
    setChamberModal('create');
    setSelectedChamber(null);
    setChamberForm({
      name: '',
      sensorId: '',
      hospitalId: room?.hospitalId || '',
      coldRoomId: id || '',
      status: 'operational',
      targetTempMin: 2,
      targetTempMax: 8,
      targetHumidityMin: 45,
      targetHumidityMax: 75,
      notes: '',
    });
  };

  const openEditChamber = (chamber: Chamber) => {
    setChamberModal('edit');
    setSelectedChamber(chamber);
    setChamberForm({
      name: chamber.name,
      sensorId: chamber.sensorId,
      hospitalId: chamber.hospitalId,
      coldRoomId: chamber.coldRoomId,
      status: chamber.status,
      targetTempMin: chamber.targetTempMin,
      targetTempMax: chamber.targetTempMax,
      targetHumidityMin: chamber.targetHumidityMin,
      targetHumidityMax: chamber.targetHumidityMax,
      notes: chamber.notes || '',
    });
  };

  const openDeleteChamber = (chamber: Chamber) => {
    setSelectedChamber(chamber);
    setChamberModal('delete');
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

  const saveChamber = async () => {
    if (!chamberForm.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...chamberForm,
        coldRoomId: id,
        hospitalId: room?.hospitalId || chamberForm.hospitalId,
      };
      if (chamberModal === 'create') {
        await api.createChamber(payload);
      } else if (chamberModal === 'edit' && selectedChamber) {
        await api.updateChamber(selectedChamber.id, payload);
      }
      setChamberModal(null);
      setSelectedChamber(null);
      loadRoom();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteChamber = async () => {
    if (!selectedChamber) return;
    setSaving(true);
    try {
      await api.deleteChamber(selectedChamber.id);
      setChamberModal(null);
      setSelectedChamber(null);
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

  const roomCapacity = Number(room.capacity ?? 0);
  const roomUsed = Number(room.usedCapacity ?? 0);
  const roomRemaining = Math.max(roomCapacity - roomUsed, 0);
  const roomOccupancy = roomCapacity > 0 ? Math.min((roomUsed / roomCapacity) * 100, 100) : 0;

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
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-500 text-xs">Model</p>
              <p className="text-slate-200 font-medium mt-0.5">{room.modelName || '—'}</p>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-500 text-xs">Serial Number</p>
              <p className="text-slate-200 font-medium mt-0.5 font-mono text-xs">{room.serialNumber || '—'}</p>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-500 text-xs">Capacity</p>
              <p className="text-slate-200 font-medium mt-0.5">{roomCapacity || 0} {room.capacityUnit || 'doses'}</p>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-500 text-xs">Remaining</p>
              <p className="text-slate-200 font-medium mt-0.5">{roomRemaining} {room.capacityUnit || 'doses'}</p>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-500 text-xs">Occupancy</p>
              <p className="text-slate-200 font-medium mt-0.5">{roomOccupancy.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chambers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
            <FlaskConical size={14} className="text-cyan-400" /> Chambers — Live Status
          </h2>
          <button onClick={openCreateChamber} className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold rounded-lg transition-colors">
            + Add Chamber
          </button>
        </div>
        {chambers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700/30">
            No chambers assigned to this cold room.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {chambers.map(ch => (
              <div key={String(ch.id)} className="relative">
                <button
                  type="button"
                  onClick={() => openEditChamber(ch)}
                  className="absolute right-3 top-3 z-10 p-1.5 rounded-lg border border-slate-600 bg-slate-900/70 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
                  title="Edit chamber"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => openDeleteChamber(ch)}
                  className="absolute right-12 top-3 z-10 p-1.5 rounded-lg border border-slate-600 bg-slate-900/70 text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors"
                  title="Delete chamber"
                >
                  🗑
                </button>
                <ChamberCard
                  chamber={ch}
                  liveReading={readings.get(String(ch.id)) ?? null}
                  onEditThresholds={openThresholdEditor}
                />
              </div>
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

      <Modal open={chamberModal === 'create' || chamberModal === 'edit'} title={chamberModal === 'create' ? 'Add Chamber' : 'Edit Chamber'} onClose={() => setChamberModal(null)} size="md">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Chamber Name *</label>
            <input value={chamberForm.name} onChange={(e) => setChamberForm({ ...chamberForm, name: e.target.value })} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Sensor ID</label>
            <input value={chamberForm.sensorId} onChange={(e) => setChamberForm({ ...chamberForm, sensorId: e.target.value })} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Temp min (°C)</label>
              <input type="number" value={chamberForm.targetTempMin} onChange={(e) => setChamberForm({ ...chamberForm, targetTempMin: Number(e.target.value) })} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Temp max (°C)</label>
              <input type="number" value={chamberForm.targetTempMax} onChange={(e) => setChamberForm({ ...chamberForm, targetTempMax: Number(e.target.value) })} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Humidity min (%)</label>
              <input type="number" value={chamberForm.targetHumidityMin} onChange={(e) => setChamberForm({ ...chamberForm, targetHumidityMin: Number(e.target.value) })} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Humidity max (%)</label>
              <input type="number" value={chamberForm.targetHumidityMax} onChange={(e) => setChamberForm({ ...chamberForm, targetHumidityMax: Number(e.target.value) })} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
            <select value={chamberForm.status} onChange={(e) => setChamberForm({ ...chamberForm, status: e.target.value })} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
              {['operational', 'maintenance', 'defective'].map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Notes</label>
            <textarea value={chamberForm.notes} onChange={(e) => setChamberForm({ ...chamberForm, notes: e.target.value })} rows={3} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setChamberModal(null)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={saveChamber} disabled={saving} className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>

      <Modal open={chamberModal === 'delete'} title="Delete Chamber" onClose={() => setChamberModal(null)} size="sm">
        <p className="text-slate-300 text-sm">Delete <strong className="text-white">{selectedChamber?.name}</strong>? This will remove the chamber and its recorded data.</p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setChamberModal(null)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={deleteChamber} disabled={saving} className="flex-1 py-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">{saving ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
