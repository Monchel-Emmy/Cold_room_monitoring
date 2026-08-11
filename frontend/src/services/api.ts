import type {
  Alert,
  AppUser,
  AuthUser,
  Chamber,
  ColdRoom,
  DashboardStats,
  Hospital,
  LiveReading,
  Vaccine,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

function getToken() {
  return localStorage.getItem('crm_token');
}

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(API_BASE + url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  login:  (email: string, password: string): Promise<{ token: string; user: AuthUser }> =>
    req<{ token: string; user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me:     (): Promise<AuthUser> => req<AuthUser>('/auth/me'),
  logout: (): Promise<{ success: boolean }> => req<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  // Dashboard
  getDashboard: (): Promise<DashboardStats> => req<DashboardStats>('/dashboard'),

  // Hospitals
  getHospitals:    (): Promise<Hospital[]>                        => req<Hospital[]>('/hospitals'),
  getHospital:     (id: string): Promise<Hospital>              => req<Hospital>(`/hospitals/${id}`),
  createHospital:  (data: Partial<Hospital>): Promise<Hospital> => req<Hospital>('/hospitals', { method: 'POST', body: JSON.stringify(data) }),
  updateHospital:  (id: string, data: Partial<Hospital>): Promise<Hospital> => req<Hospital>(`/hospitals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHospital:  (id: string): Promise<{ success: boolean }> => req<{ success: boolean }>(`/hospitals/${id}`, { method: 'DELETE' }),

  // Cold Rooms
  getColdRooms:   (hospitalId?: string): Promise<ColdRoom[]>     => req<ColdRoom[]>(`/cold-rooms${hospitalId ? `?hospitalId=${hospitalId}` : ''}`),
  getColdRoom:    (id: string): Promise<ColdRoom>              => req<ColdRoom>(`/cold-rooms/${id}`),
  createColdRoom: (data: Partial<ColdRoom>): Promise<ColdRoom> => req<ColdRoom>('/cold-rooms', { method: 'POST', body: JSON.stringify(data) }),
  updateColdRoom: (id: string, data: Partial<ColdRoom>): Promise<ColdRoom> => req<ColdRoom>(`/cold-rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteColdRoom: (id: string): Promise<{ success: boolean }> => req<{ success: boolean }>(`/cold-rooms/${id}`, { method: 'DELETE' }),

  // Chambers
  getChambers: (coldRoomId?: string, hospitalId?: string): Promise<Chamber[]> => {
    const p = new URLSearchParams();
    if (coldRoomId) p.set('coldRoomId', coldRoomId);
    if (hospitalId) p.set('hospitalId', hospitalId);
    return req<Chamber[]>(`/chambers${p.toString() ? '?' + p : ''}`);
  },
  getChamber:          (id: string): Promise<Chamber>             => req<Chamber>(`/chambers/${id}`),
  getChamberReadings:  (id: string, limit = 48): Promise<LiveReading[]> => req<LiveReading[]>(`/chambers/${id}/readings?limit=${limit}`),
  createChamber:  (data: Partial<Chamber>): Promise<Chamber> => req<Chamber>('/chambers', { method: 'POST', body: JSON.stringify(data) }),
  updateChamber:  (id: string, data: Partial<Chamber>): Promise<Chamber> => req<Chamber>(`/chambers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChamber:  (id: string): Promise<{ success: boolean }> => req<{ success: boolean }>(`/chambers/${id}`, { method: 'DELETE' }),

  // Vaccines
  getVaccines: (f?: { chamberId?: string; coldRoomId?: string; hospitalId?: string; status?: string }): Promise<Vaccine[]> => {
    const p = new URLSearchParams();
    if (f?.chamberId)  p.set('chamberId',  f.chamberId);
    if (f?.coldRoomId) p.set('coldRoomId', f.coldRoomId);
    if (f?.hospitalId) p.set('hospitalId', f.hospitalId);
    if (f?.status)     p.set('status',     f.status);
    return req<Vaccine[]>(`/vaccines${p.toString() ? '?' + p : ''}`);
  },
  createVaccine:  (data: Partial<Vaccine>): Promise<Vaccine> => req<Vaccine>('/vaccines', { method: 'POST', body: JSON.stringify(data) }),
  updateVaccine:  (id: string, data: Partial<Vaccine>): Promise<Vaccine> => req<Vaccine>(`/vaccines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVaccine:  (id: string): Promise<{ success: boolean }> => req<{ success: boolean }>(`/vaccines/${id}`, { method: 'DELETE' }),

  // Alerts
  getAlerts: (hospitalId?: string, acknowledged?: boolean): Promise<Alert[]> => {
    const p = new URLSearchParams();
    if (hospitalId)              p.set('hospitalId',    hospitalId);
    if (acknowledged !== undefined) p.set('acknowledged', String(acknowledged));
    return req<Alert[]>(`/alerts${p.toString() ? '?' + p : ''}`);
  },
  acknowledgeAlert: (id: string): Promise<Alert> => req<Alert>(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
  deleteAlert:      (id: string): Promise<{ success: boolean }> => req<{ success: boolean }>(`/alerts/${id}`, { method: 'DELETE' }),

  // Users (admin only)
  getUsers:    (): Promise<AppUser[]>                        => req<AppUser[]>('/users'),
  createUser:  (data: Partial<AppUser> & { password?: string }): Promise<AppUser> => req<AppUser>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser:  (id: string, data: Partial<AppUser> & { password?: string }): Promise<AppUser> => req<AppUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser:  (id: string): Promise<{ success: boolean }> => req<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),
};
