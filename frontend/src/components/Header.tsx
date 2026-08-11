import { Menu, Wifi, WifiOff, Bell, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  onMenuClick: () => void;
  connected: boolean;
  alertCount?: number;
}

const roleColor: Record<string, string> = {
  admin:      'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  manager:    'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  technician: 'text-green-400 bg-green-500/10 border-green-500/20',
  viewer:     'text-slate-400 bg-slate-700/40 border-slate-600',
};

export default function Header({ onMenuClick, connected, alertCount = 0 }: Props) {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
      <button onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
        <Menu size={18} />
      </button>

      <div className="flex-1" />

      {/* Live indicator */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border
        ${connected
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
        }`}>
        {connected
          ? <><Wifi size={12} /><span>Live</span><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /></>
          : <><WifiOff size={12} /><span>Offline</span></>
        }
      </div>

      {/* Alert badge */}
      {alertCount > 0 && (
        <div className="relative p-1.5">
          <Bell size={18} className="text-red-400" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        </div>
      )}

      {/* User info */}
      {user && (
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${roleColor[user.role] ?? roleColor.viewer}`}>
              {user.role}
            </span>
          </div>
          <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-slate-300">
            <User size={15} />
          </div>
          <button onClick={logout} title="Sign out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
