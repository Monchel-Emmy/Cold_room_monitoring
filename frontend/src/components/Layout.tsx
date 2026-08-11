import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { getSocket, subscribeToReadings } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { LiveReading } from '../types';

interface LiveCtx { readings: Map<string, LiveReading>; connected: boolean; }
const LiveContext = createContext<LiveCtx>({ readings: new Map(), connected: false });
export const useLive = () => useContext(LiveContext);

export default function Layout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [connected,   setConnected]   = useState(false);
  const [readings,    setReadings]    = useState<Map<string, LiveReading>>(new Map());

  const handleReadings = useCallback((data: LiveReading | LiveReading[]) => {
    const arr = Array.isArray(data) ? data : [data];
    setReadings(prev => {
      const next = new Map(prev);
      arr.forEach(r => next.set(r.chamberId, r));
      return next;
    });
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    setConnected(socket.connected);
    const unsub = subscribeToReadings(handleReadings);
    return () => { unsub(); };
  }, [handleReadings]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  return (
    <LiveContext.Provider value={{ readings, connected }}>
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(o => !o)} connected={connected} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </LiveContext.Provider>
  );
}
