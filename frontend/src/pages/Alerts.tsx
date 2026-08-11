import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../types';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';

export default function Alerts() {
  const { isAtLeastManager } = useAuth();
  const queryClient = useQueryClient();
  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: () => api.getAlerts(),
    staleTime: 20_000,
  });
  const [delModal, setDelModal] = useState<Alert | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['alerts'] });
  };

  const acknowledge = async (id: string) => {
    await api.acknowledgeAlert(id).catch(console.error);
    await refresh();
  };

  const acknowledgeAll = async () => {
    const active = alerts.filter(a => !a.acknowledged);
    await Promise.all(active.map(a => api.acknowledgeAlert(a.id)));
    await refresh();
  };

  const del = async () => {
    if (!delModal) return; setSaving(true);
    try { await api.deleteAlert(delModal.id); await refresh(); setDelModal(null); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const severityColor: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    high:     'bg-orange-500/15 text-orange-400 border-orange-500/30',
    medium:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    low:      'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };

  const active = alerts.filter(a => !a.acknowledged);
  const acked  = alerts.filter(a => a.acknowledged);

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Bell size={20} className="text-red-400" /> Alerts</h1>
          <p className="text-slate-400 text-sm mt-0.5">{active.length} active · {acked.length} acknowledged</p>
        </div>
        {active.length > 0 && isAtLeastManager && (
          <button onClick={acknowledgeAll} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold rounded-xl hover:bg-emerald-500/20 transition-colors">
            <CheckCircle2 size={15} /> Acknowledge All
          </button>
        )}
      </div>

      {/* Active */}
      {active.length > 0 && (
        <div className="bg-slate-800/50 border border-red-500/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/50 bg-red-500/5">
            <h2 className="text-sm font-semibold text-red-400">Active Alerts ({active.length})</h2>
          </div>
          <div className="divide-y divide-slate-700/30">
            {active.map(a => (
              <div key={a.id} className="px-5 py-4 flex items-start gap-4">
                <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{a.message}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${severityColor[a.severity] ?? ''}`}>{a.severity}</span>
                    {a.chamberName && <span className="text-xs text-slate-500">{a.hospitalName} · {a.coldRoomName} · {a.chamberName}</span>}
                    <span className="text-xs text-slate-600">{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isAtLeastManager && (
                    <button onClick={() => acknowledge(a.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                      <CheckCircle2 size={11} /> Ack
                    </button>
                  )}
                  {isAtLeastManager && (
                    <button onClick={() => { setError(''); setDelModal(a); }}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acknowledged */}
      {acked.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/30">
            <h2 className="text-sm font-semibold text-slate-500">Acknowledged ({acked.length})</h2>
          </div>
          <div className="divide-y divide-slate-700/20">
            {acked.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-400 line-through">{a.message}</p>
                  {a.chamberName && <p className="text-xs text-slate-600 mt-0.5">{a.hospitalName} · {a.coldRoomName} · {a.chamberName}</p>}
                </div>
                {isAtLeastManager && (
                  <button onClick={() => { setError(''); setDelModal(a); }}
                    className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="text-center py-16 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700/30">
          <Bell size={32} className="mx-auto mb-2 opacity-30" />
          <p>No alerts found.</p>
        </div>
      )}

      {/* Delete Modal */}
      <Modal open={!!delModal} title="Delete Alert" onClose={() => setDelModal(null)} size="sm">
        <p className="text-slate-300 text-sm">Permanently delete this alert?</p>
        <p className="text-xs text-slate-500 mt-1">{delModal?.message}</p>
        {error && <p className="mt-2 text-red-400 text-xs">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={() => setDelModal(null)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={del} disabled={saving} className="flex-1 py-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">{saving ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
