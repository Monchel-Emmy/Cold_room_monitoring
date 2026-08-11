import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, MapPin, Phone, Snowflake, Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Hospital } from '../types';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';

const EMPTY = { name: '', type: 'hospital', region: '', district: '', address: '', contactName: '', contactPhone: '', status: 'active' };

export default function Hospitals() {
  const { isAdmin, isAtLeastManager } = useAuth();
  const queryClient = useQueryClient();
  const { data: hospitals = [], isLoading } = useQuery<Hospital[]>({
    queryKey: ['hospitals'],
    queryFn: () => api.getHospitals(),
    staleTime: 60_000,
  });
  const [modal,     setModal]     = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected,  setSelected]  = useState<Hospital | null>(null);
  const [form,      setForm]      = useState<any>(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['hospitals'] });
  };

  const openCreate = () => { setForm(EMPTY); setError(''); setModal('create'); };
  const openEdit   = (h: Hospital) => { setSelected(h); setForm({ name: h.name, type: h.type, region: h.region, district: h.district, address: h.address, contactName: h.contactName, contactPhone: h.contactPhone, status: h.status }); setError(''); setModal('edit'); };
  const openDelete = (h: Hospital) => { setSelected(h); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      if (modal === 'create') await api.createHospital(form);
      else if (modal === 'edit' && selected) await api.updateHospital(selected.id, form);
      await refresh(); closeModal();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!selected) return;
    setSaving(true);
    try { await api.deleteHospital(selected.id); await refresh(); closeModal(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const field = (label: string, key: string, type = 'text', opts?: string[]) => (
    <div key={key}>
      <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
      {opts ? (
        <select value={form[key]} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
          className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
          className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
      )}
    </div>
  );

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-white">Hospitals</h1><p className="text-slate-400 text-sm mt-0.5">{hospitals.length} health centers</p></div>
        {isAtLeastManager && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus size={15} /> Add Hospital
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hospitals.map(h => (
          <div key={h.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center border border-purple-500/20 flex-shrink-0">
                <Building2 size={18} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white">{h.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{h.type.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAtLeastManager && (
                      <button onClick={() => openEdit(h)} className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"><Pencil size={13} /></button>
                    )}
                    {isAdmin && (
                      <button onClick={() => openDelete(h)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-400">
                  <p className="flex items-center gap-1.5"><MapPin size={10} /> {h.district}, {h.region}</p>
                  <p className="flex items-center gap-1.5"><Phone size={10} /> {h.contactName} · {h.contactPhone}</p>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-cyan-400"><Snowflake size={10} /> {h.coldRoomsCount ?? 0} rooms</span>
                  <span className={`px-2 py-0.5 rounded-full border capitalize text-[10px] font-semibold ${h.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-slate-600/40 text-slate-400 border-slate-600'}`}>{h.status}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      <Modal open={modal === 'create' || modal === 'edit'} title={modal === 'create' ? 'Add Hospital' : 'Edit Hospital'} onClose={closeModal} size="lg">
        <div className="grid grid-cols-2 gap-4">
          {field('Name *', 'name')}
          {field('Type', 'type', 'text', ['hospital', 'health_center', 'dispensary', 'clinic'])}
          {field('Region', 'region')}
          {field('District', 'district')}
          {field('Address', 'address')}
          {field('Contact Name', 'contactName')}
          {field('Contact Phone', 'contactPhone')}
          {field('Status', 'status', 'text', ['active', 'inactive'])}
        </div>
        {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={closeModal} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={modal === 'delete'} title="Delete Hospital" onClose={closeModal} size="sm">
        <p className="text-slate-300 text-sm">Delete <strong className="text-white">{selected?.name}</strong>? This cannot be undone.</p>
        {error && <p className="mt-2 text-red-400 text-xs">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={closeModal} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={del} disabled={saving} className="flex-1 py-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">{saving ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
