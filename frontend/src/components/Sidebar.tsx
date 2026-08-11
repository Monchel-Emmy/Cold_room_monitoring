import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Snowflake, Bell,
  ChevronLeft, ChevronRight, Syringe, Thermometer,
  Activity, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props { open: boolean; onToggle: () => void; }

export default function Sidebar({ open, onToggle }: Props) {
  const { isAdmin } = useAuth();

  const nav = [
    { to: '/',           label: 'Dashboard',  icon: LayoutDashboard },
    { to: '/monitoring', label: 'Monitoring', icon: Activity },
    { to: '/hospitals',  label: 'Hospitals',  icon: Building2 },
    { to: '/cold-rooms', label: 'Cold Rooms', icon: Snowflake },
    { to: '/vaccines',   label: 'Vaccines',   icon: Syringe },
    { to: '/alerts',     label: 'Alerts',     icon: Bell },
    ...(isAdmin ? [{ to: '/users', label: 'Users', icon: Users }] : []),
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={onToggle} />
      )}
      <aside className={`
        fixed top-0 left-0 h-full z-30 flex flex-col
        bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950
        border-r border-slate-700/50
        transition-all duration-300 ease-in-out
        ${open ? 'w-56' : 'w-14'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-700/50 overflow-hidden">
          <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Thermometer size={15} className="text-white" />
          </div>
          {open && (
            <div className="min-w-0">
              <p className="font-bold text-xs text-white truncate">Cold Room Monitor</p>
              <p className="text-[10px] text-slate-400">Vaccine Storage</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-1.5 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `nav-link overflow-hidden ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
              }>
              <Icon size={17} className="flex-shrink-0" />
              {open && <span className="truncate text-sm">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Toggle */}
        <button onClick={onToggle}
          className="flex items-center justify-center h-9 border-t border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 transition-colors">
          {open ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </aside>
    </>
  );
}
