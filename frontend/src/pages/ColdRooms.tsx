import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Snowflake, Thermometer, ChevronRight, Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ColdRoom, Hospital } from '../types';
import Modal from '../components/Modal';

const EMPTY = { name: '', hospitalId: '', type: 'walk_in_cooler', modelName: '', serialNumber: '', targetTempMin: 2, targetTempMax: 8, targetHumidityMin: 45, targetHumidityMax: 75, status: 'operational' };

export default function ColdRooms() {
  const { isAtLeastManager, isAdmin } = useAuth();
  const [rooms,      setRooms]      = useState<ColdRoom[]>([]);
  const [hospitals,  setHospitals]  = useState<Hospital[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected,   setSelected]   = useState<ColdRoom | null>(null);
  const [form,       setForm]       = useState<any>(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const load = async () => {
    await Promise.all([
      api.getColdRooms().then((d: any) => setRooms(d)),
      api.getHospitals().then((d: any) => setHospitals(d)),
    ]).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ ...EMPTY, hospitalId: hospitals[0]?.id || '' }); setError(''); setModal('create'); };
  const openEdit   = (r: ColdRoom) => { setSelected(r); setForm({ name: r.name, hospitalId: r.hospitalId, type: r.type, modelName: r.modelName, serialNumber: r.serialNumber, targetTempMin: r.targetTempMin, targetTempMax: r.targetTempMax, targetHumidityMin: r.targetHumidityMin, targetHumidityMax: r.targetHumidityMax, status: r.status }); setError(''); setModal('edit'); };
  const openDelete = (r: ColdRoom) => { setSelected(r); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const f = (k: string) => (e: any) => setForm((prev: any) => ({ ...prev, [k]: e.target.value }));
  const fn = (k: string) => (e: any) => setForm((prev: any) => ({ ...prev, [k]: Number(e.target.value) }));

  const save = async () => {
    if (!form.name.trim() || !form.hospitalId) { setError('Name and hospital are required'); return; }
    setSaving(true); setError('');
    try {
      if (modal === 'create') await api.createColdRoom(form);
      else if (modal === 'edit' && selected) await api.updateColdRoom(selected.id, form);
      await load(); closeModal();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!selected) return;
    setSaving(true);
    try { await api.deleteColdRoom(selected.id); await load(); closeModal(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const typeLabel: Record<string, string> = { walk_in_cooler: 'Walk-in Cooler', refrigerator: 'Refrigerator', freezer: 'Freezer', ultra_cold: 'Ultra-Cold' };
  const statusColor: Record<string, string> = { operational: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', maintenance: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', defective: 'bg-red-500/15 text-red-400 border-red-500/30' };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-white">Cold Rooms</h1><p className="text-slate-400 text-sm mt-0.5">{rooms.length} units</p></div>
        {isAtLeastManager && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus size={15} /> Add Room
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rooms.map(r => (
          <div key={r.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-cyan-500/15 rounded-xl flex items-center justify-center border border-cyan-500/20">
                  <Snowflake size={16} className="text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{r.name}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Building2 size={9} /> {r.hospitalName}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isAtLeastManager && <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"><Pencil size={12} /></button>}
                {isAdmin && <button onClick={() => openDelete(r)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={12} /></button>}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{typeLabel[r.type] ?? r.type}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusColor[r.status] ?? ''}`}>{r.status}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-700/30">
                <Thermometer size={11} className="text-cyan-400" /> {r.targetTempMin}–{r.targetTempMax}°C · {r.targetHumidityMin}–{r.targetHumidityMax}% RH
              </div>
            </div>
            <Link to={`/cold-rooms/${r.id}`} className="flex items-center justify-center gap-1 mt-3 py-1.5 text-xs text-slate-400 hover:text-cyan-400 border border-slate-700/50 hover:border-cyan-500/30 rounded-xl transition-colors">
              View Detail <ChevronRight size={12} />
            </Link>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modal === 'create' || modal === 'edit'} title={modal === 'create' ? 'Add Cold Room' : 'Edit Cold Room'} onClose={closeModal} size="lg">
        <div className="grid grid-cols-2 gap-3">
          {[['Name *', 'name'], ['Model', 'modelName'], ['Serial Number', 'serialNumber']].map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
              <input value={form[key]} onChange={f(key)} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Hospital *</label>
            <select value={form.hospitalId} onChange={f('hospitalId')} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Type</label>
            <select value={form.type} onChange={f('type')} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
              {['walk_in_cooler', 'refrigerator', 'freezer', 'ultra_cold'].map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
            <select value={form.status} onChange={f('status')} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
              {['operational', 'maintenance', 'defective'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {[['Min Temp (°C)', 'targetTempMin'], ['Max Temp (°C)', 'targetTempMax'], ['Min Humidity (%)', 'targetHumidityMin'], ['Max Humidity (%)', 'targetHumidityMax']].map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
              <input type="number" value={form[key]} onChange={fn(key)} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
          ))}
        </div>
        {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={closeModal} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={modal === 'delete'} title="Delete Cold Room" onClose={closeModal} size="sm">
        <p className="text-slate-300 text-sm">Delete <strong className="text-white">{selected?.name}</strong>? All chambers and vaccines inside will also be removed.</p>
        {error && <p className="mt-2 text-red-400 text-xs">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={closeModal} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={del} disabled={saving} className="flex-1 py-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">{saving ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
