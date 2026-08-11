import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users as UsersIcon, Plus, Pencil, Trash2, Shield, Building2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AppUser, Hospital } from '../types';
import Modal from '../components/Modal';
import { Navigate } from 'react-router-dom';
import { TableSkeleton } from '../components/Skeleton';

const EMPTY = { name: '', email: '', password: '', role: 'viewer', hospitalId: '', status: 'active' };

const roleColor: Record<string, string> = {
  admin:      'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  manager:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  technician: 'bg-green-500/15 text-green-400 border-green-500/30',
  viewer:     'bg-slate-600/40 text-slate-400 border-slate-600',
};

export default function Users() {
  const { isAdmin, user: me } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;

  const queryClient = useQueryClient();
  const { data: users = [], isLoading: usersLoading } = useQuery<AppUser[]>({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
    staleTime: 60_000,
  });

  const { data: hospitals = [], isLoading: hospitalsLoading } = useQuery<Hospital[]>({
    queryKey: ['hospitals'],
    queryFn: () => api.getHospitals(),
    staleTime: 60_000,
  });

  const [modal,     setModal]     = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected,  setSelected]  = useState<AppUser | null>(null);
  const [form,      setForm]      = useState<any>(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['hospitals'] }),
    ]);
  };

  const openCreate = () => { setForm(EMPTY); setError(''); setModal('create'); };
  const openEdit   = (u: AppUser) => { setSelected(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, hospitalId: u.hospitalId || '', status: u.status }); setError(''); setModal('edit'); };
  const openDelete = (u: AppUser) => { setSelected(u); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required'); return; }
    if (modal === 'create' && !form.password) { setError('Password is required for new users'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, hospitalId: form.hospitalId || null };
      if (modal === 'edit' && !form.password) delete payload.password;
      if (modal === 'create') await api.createUser(payload);
      else if (modal === 'edit' && selected) await api.updateUser(selected.id, payload);
      await refresh(); closeModal();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!selected) return; setSaving(true);
    try { await api.deleteUser(selected.id); await refresh(); closeModal(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (usersLoading || hospitalsLoading) return <TableSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-white flex items-center gap-2"><UsersIcon size={20} className="text-cyan-400" /> Users</h1><p className="text-slate-400 text-sm mt-0.5">{users.length} accounts</p></div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus size={15} /> Add User
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-900/30">
              {['User', 'Role', 'Hospital', 'Status', 'Last Login', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-700/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${roleColor[u.role] ?? roleColor.viewer}`}>
                    <Shield size={9} /> {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.hospitalName
                    ? <span className="flex items-center gap-1 text-xs text-slate-300"><Building2 size={11} className="text-purple-400" />{u.hospitalName}</span>
                    : <span className="text-xs text-slate-500">All hospitals</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${u.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-slate-600/40 text-slate-400 border-slate-600'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"><Pencil size={12} /></button>
                    {u.id !== me?.id && (
                      <button onClick={() => openDelete(u)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={12} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modal === 'create' || modal === 'edit'} title={modal === 'create' ? 'Add User' : 'Edit User'} onClose={closeModal} size="md">
        <div className="space-y-3">
          {[['Full Name *', 'name', 'text'], ['Email *', 'email', 'email'], ['Password' + (modal === 'edit' ? ' (leave blank to keep)' : ' *'), 'password', 'password']].map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
              <input type={type} value={form[key]} onChange={f(key)} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
              <select value={form.role} onChange={f('role')} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
                {['admin', 'manager', 'technician', 'viewer'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={f('status')} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Hospital <span className="text-slate-500 font-normal">(leave empty for all hospitals)</span></label>
            <select value={form.hospitalId} onChange={f('hospitalId')} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
              <option value="">— All hospitals (admin) —</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={closeModal} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={modal === 'delete'} title="Delete User" onClose={closeModal} size="sm">
        <p className="text-slate-300 text-sm">Delete <strong className="text-white">{selected?.name}</strong>? They will lose all access immediately.</p>
        {error && <p className="mt-2 text-red-400 text-xs">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={closeModal} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={del} disabled={saving} className="flex-1 py-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">{saving ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
