import { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan';
  sub?: string;
}

const colors = {
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  red:    'bg-red-500/10 text-red-400 border-red-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  cyan:   'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

export default function StatCard({ label, value, icon: Icon, color = 'blue', sub }: Props) {
  const c = colors[color];
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${c}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}
