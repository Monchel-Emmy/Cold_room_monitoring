import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Snowflake, FlaskConical, Syringe, Bell, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then((d: any) => setStats(d)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400">Loading dashboard...</div>
    </div>
  );

  if (!stats) return null;

  const severityColor: Record<string, string> = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
    high:     'text-orange-400 bg-orange-500/10 border-orange-500/30',
    medium:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low:      'text-blue-400 bg-blue-500/10 border-blue-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-cyan-900/40 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
            <Snowflake size={24} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Cold Room Monitoring</h1>
            <p className="text-slate-400 text-sm mt-0.5">Vaccine storage compliance · Live temperature & humidity</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Hospitals"    value={stats.totalHospitals} icon={Building2}   color="purple" />
        <StatCard label="Cold Rooms"   value={stats.totalColdRooms} icon={Snowflake}   color="cyan" />
        <StatCard label="Chambers"     value={stats.totalChambers}  icon={FlaskConical} color="blue" />
        <StatCard label="Active Alerts" value={stats.unacknowledgedAlerts} icon={Bell} color={stats.unacknowledgedAlerts > 0 ? 'red' : 'green'} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Vaccines"   value={stats.totalVaccines}  icon={Syringe}       color="blue" />
        <StatCard label="Active"           value={stats.activeVaccines} icon={CheckCircle2}  color="green" />
        <StatCard label="At Risk"          value={stats.atRiskVaccines} icon={Clock}         color={stats.atRiskVaccines > 0 ? 'yellow' : 'green'} />
        <StatCard label="Expired"          value={stats.expiredVaccines} icon={AlertTriangle} color={stats.expiredVaccines > 0 ? 'red' : 'green'} />
      </div>

      {/* Recent alerts */}
      {stats.recentAlerts.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2"><Bell size={16} className="text-red-400" /> Recent Alerts</h2>
            <Link to="/alerts" className="text-xs text-cyan-400 hover:text-cyan-300">View all →</Link>
          </div>
          <div className="divide-y divide-slate-700/30">
            {stats.recentAlerts.map(a => (
              <div key={String(a.id)} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${severityColor[a.severity] ?? severityColor.low}`}>
                    {a.severity}
                  </span>
                  <p className="text-sm text-slate-300">{a.message}</p>
                </div>
                <p className="text-xs text-slate-500 flex-shrink-0">{new Date(a.createdAt).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { to: '/cold-rooms', label: 'View Cold Rooms', icon: Snowflake, color: 'text-cyan-400' },
          { to: '/vaccines',   label: 'Vaccine Inventory', icon: Syringe, color: 'text-green-400' },
          { to: '/alerts',     label: 'Manage Alerts', icon: Bell, color: 'text-red-400' },
        ].map(l => (
          <Link key={l.to} to={l.to}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3 hover:border-slate-600 transition-colors group">
            <l.icon size={20} className={l.color} />
            <span className="text-sm font-medium text-slate-300 group-hover:text-white">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
