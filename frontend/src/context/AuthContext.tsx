import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '../types';
import { api } from '../services/api';

interface AuthCtx {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isAtLeastManager: boolean;
  isAtLeastTechnician: boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [token,   setToken]   = useState<string | null>(() => localStorage.getItem('crm_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('crm_token');
    if (!stored) { setLoading(false); return; }
    (api.me() as Promise<any>)
      .then(u => { setUser(u); setToken(stored); })
      .catch(() => { localStorage.removeItem('crm_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data: any = await api.login(email, password);
    localStorage.setItem('crm_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    setToken(null);
    setUser(null);
  };

  const roleLevel = { admin: 4, manager: 3, technician: 2, viewer: 1 };
  const level = user ? (roleLevel[user.role] ?? 1) : 0;

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, logout,
      isAdmin:              level >= 4,
      isAtLeastManager:     level >= 3,
      isAtLeastTechnician:  level >= 2,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
