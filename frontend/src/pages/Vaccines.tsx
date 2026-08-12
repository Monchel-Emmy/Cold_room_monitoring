import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Syringe, Thermometer, Droplets, CheckCircle2, AlertTriangle, Clock, Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Vaccine, Chamber, Hospital } from '../types';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';

const EMPTY = { name: '', type: '', manufacturer: '', batchNumber: '', quantity: 0, unit: 'doses', chamberId: '', coldRoomId: '', hospitalId: '', expiryDate: '', status: 'active', storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 45, humidityMax: 75 } };

export default function Vaccines() {
  const { isAtLeastTechnician, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: vaccines = [], isLoading: vaccinesLoading } = useQuery<Vaccine[]>({
    queryKey: ['vaccines'],
    queryFn: () => api.getVaccines(),
    staleTime: 45_000,
  });

  const { data: chambers = [], isLoading: chambersLoading } = useQuery<Chamber[]>({
    queryKey: ['chambers'],
    queryFn: () => api.getChambers(),
    staleTime: 45_000,
  });

  const { data: hospitals = [], isLoading: hospitalsLoading } = useQuery<Hospital[]>({
    queryKey: ['hospitals'],
    queryFn: () => api.getHospitals(),
    staleTime: 60_000,
  });

  const [filter,     setFilter]     = useState('');
  const [modal,      setModal]      = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected,   setSelected]   = useState<Vaccine | null>(null);
  const [form,       setForm]       = useState<any>(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['vaccines'] }),
      queryClient.invalidateQueries({ queryKey: ['chambers'] }),
      queryClient.invalidateQueries({ queryKey: ['hospitals'] }),
      queryClient.invalidateQueries({ queryKey: ['cold-rooms'] }),
    ]);
  };

  // When chamberId changes, auto-fill coldRoomId and hospitalId
  const onChamberChange = (chamberId: string) => {
    const ch = chambers.find(c => c.id === chamberId);
    setForm((f: any) => ({ ...f, chamberId, coldRoomId: ch?.coldRoomId || '', hospitalId: ch?.hospitalId || '' }));
  };

  const openCreate = () => { setForm({ ...EMPTY, chamberId: chambers[0]?.id || '' }); onChamberChange(chambers[0]?.id || ''); setError(''); setModal('create'); };
  const openEdit = (v: Vaccine) => {
    setSelected(v);
    setForm({ name: v.name, type: v.type, manufacturer: v.manufacturer, batchNumber: v.batchNumber, quantity: v.quantity, unit: v.unit, chamberId: v.chamberId, coldRoomId: v.coldRoomId, hospitalId: v.hospitalId, expiryDate: v.expiryDate.slice(0, 10), status: v.status, storageRequirements: { ...v.storageRequirements } });
    setError(''); setModal('edit');
  };
  const openDelete = (v: Vaccine) => { setSelected(v); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const f  = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));
  const fn = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: Number(e.target.value) }));
  const sr = (k: string) => (e: any) => setForm((p: any) => ({ ...p, storageRequirements: { ...p.storageRequirements, [k]: Number(e.target.value) } }));

  const save = async () => {
    if (!form.name.trim() || !form.chamberId || !form.expiryDate) { setError('Name, chamber and expiry date are required'); return; }
    setSaving(true); setError('');
    try {
      if (modal === 'create') await api.createVaccine(form);
      else if (modal === 'edit' && selected) await api.updateVaccine(selected.id, form);
      await refresh(); closeModal();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!selected) return; setSaving(true);
    try { await api.deleteVaccine(selected.id); await refresh(); closeModal(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const filtered = filter ? vaccines.filter(v => v.status === filter) : vaccines;

  // ── Live chamber capacity info for the modal ───────────────────────────────
  const selectedChamber = chambers.find(c => c.id === form.chamberId);
  const chamberCapacity = selectedChamber?.capacity ?? 0;
  // sum vaccines already in that chamber (exclude current vaccine if editing)
  const chamberStored = vaccines
    .filter(v => v.chamberId === form.chamberId && (modal !== 'edit' || !selected || v.id !== selected.id))
    .reduce((s, v) => s + (v.quantity ?? 0), 0);
  const chamberRemaining = chamberCapacity > 0 ? Math.max(chamberCapacity - chamberStored, 0) : null;
  const chamberFull = chamberCapacity > 0 && chamberStored >= chamberCapacity;
  const wouldOverflow = chamberCapacity > 0 && (chamberStored + Number(form.quantity ?? 0)) > chamberCapacity;
  const chamberOccupancyPct = chamberCapacity > 0 ? Math.min((chamberStored / chamberCapacity) * 100, 100) : 0;

  const statusBadge: Record<string, string> = {
    active:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    at_risk:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    expired:  'bg-slate-600/40 text-slate-400 border-slate-600',
    recalled: 'bg-red-500/15 text-red-400 border-red-500/30',
  };

  if (vaccinesLoading || chambersLoading || hospitalsLoading) return <TableSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold text-white">Vaccines</h1><p className="text-slate-400 text-sm mt-0.5">{vaccines.length} total</p></div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="at_risk">At Risk</option>
            <option value="expired">Expired</option>
            <option value="recalled">Recalled</option>
          </select>
          {isAtLeastTechnician && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold rounded-xl transition-colors">
              <Plus size={15} /> Add Vaccine
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-900/30">
                {['Vaccine', 'Chamber', 'Tag Number / Manufacturer', 'Qty', 'Storage', 'Status', 'Expires', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filtered.map(v => {
                const d = v.daysToExpiry ?? Math.ceil((new Date(v.expiryDate).getTime() - Date.now()) / 86400000);
                const status = d < 0 ? 'expired' : v.status;
                return (
                  <tr key={v.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{v.name}<p className="text-xs text-slate-400">{v.type}</p></td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{chambers.find(c => c.id === v.chamberId)?.name ?? v.chamberId.slice(-6)}</td>
                    <td className="px-4 py-3"><p className="text-slate-300">{v.batchNumber}</p><p className="text-xs text-slate-500">{v.manufacturer}</p></td>
                    <td className="px-4 py-3 font-medium text-slate-300">{v.quantity} {v.unit}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      <div className="flex items-center gap-1"><Thermometer size={10} /> {v.storageRequirements.tempMin}–{v.storageRequirements.tempMax}°C</div>
                      <div className="flex items-center gap-1 mt-0.5"><Droplets size={10} /> {v.storageRequirements.humidityMin}–{v.storageRequirements.humidityMax}%</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusBadge[status] ?? statusBadge.active}`}>
                        {status === 'active' ? <CheckCircle2 size={9} /> : status === 'at_risk' ? <Clock size={9} /> : <AlertTriangle size={9} />}
                        {status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-xs font-medium ${d < 0 ? 'text-slate-500' : d <= 30 ? 'text-yellow-400' : 'text-emerald-400'}`}>{d < 0 ? 'Expired' : `${d}d`}</p>
                      <p className="text-xs text-slate-500">{new Date(v.expiryDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {isAtLeastTechnician && <button onClick={() => openEdit(v)} className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"><Pencil size={12} /></button>}
                        {isAdmin && <button onClick={() => openDelete(v)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={12} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-slate-500"><Syringe size={28} className="mx-auto mb-2 opacity-30" /><p>No vaccines found.</p></div>}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modal === 'create' || modal === 'edit'} title={modal === 'create' ? 'Add Vaccine' : 'Edit Vaccine'} onClose={closeModal} size="lg">
        <div className="grid grid-cols-2 gap-3">
          {[['Name *', 'name'], ['Type', 'type'], ['Manufacturer', 'manufacturer'], ['Batch Number', 'batchNumber']].map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
              <input value={form[key]} onChange={f(key)} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Chamber *</label>
            <select value={form.chamberId} onChange={e => { onChamberChange(e.target.value); }} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
              {chambers.map(c => <option key={c.id} value={c.id}>{c.name} ({hospitals.find(h => h.id === c.hospitalId)?.name ?? ''})</option>)}
            </select>
            {/* Chamber capacity info */}
            {selectedChamber && chamberCapacity > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Chamber capacity: {chamberCapacity} doses</span>
                  <span className={chamberFull ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                    {chamberFull ? '🔴 FULL' : `${chamberRemaining} remaining`}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      chamberFull ? 'bg-red-500' : chamberOccupancyPct >= 75 ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${chamberOccupancyPct}%` }}
                  />
                </div>
              </div>
            )}
            {selectedChamber && chamberCapacity === 0 && (
              <p className="mt-1 text-[10px] text-slate-600">No capacity limit set for this chamber.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
            <select value={form.status} onChange={f('status')} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
              {['active', 'at_risk', 'expired', 'recalled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Quantity</label>
            <input type="number" value={form.quantity} onChange={fn('quantity')} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Unit</label>
            <input value={form.unit} onChange={f('unit')} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1">Expiry Date *</label>
            <input type="date" value={form.expiryDate} onChange={f('expiryDate')} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
          </div>
          <div className="col-span-2">
            <p className="text-xs font-semibold text-slate-400 mb-2">Storage Requirements</p>
            <div className="grid grid-cols-4 gap-2">
              {[['Min Temp', 'tempMin'], ['Max Temp', 'tempMax'], ['Min Hum%', 'humidityMin'], ['Max Hum%', 'humidityMax']].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
                  <input type="number" value={(form.storageRequirements as any)[key]} onChange={sr(key)} className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
        {wouldOverflow && !error && (
          <p className="mt-3 text-yellow-400 text-xs flex items-center gap-1">
            ⚠ This quantity exceeds the chamber&apos;s remaining capacity ({chamberRemaining} doses available).
          </p>
        )}
        <div className="flex gap-3 mt-5">
          <button onClick={closeModal} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={modal === 'delete'} title="Delete Vaccine" onClose={closeModal} size="sm">
        <p className="text-slate-300 text-sm">Delete <strong className="text-white">{selected?.name}</strong>?</p>
        {error && <p className="mt-2 text-red-400 text-xs">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={closeModal} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={del} disabled={saving} className="flex-1 py-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">{saving ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
