const BASE = '/api';

function getToken() {
  return localStorage.getItem('crm_token');
}

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + url, {
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
  login:  (email: string, password: string) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me:     () => req('/auth/me'),
  logout: () => req('/auth/logout', { method: 'POST' }),

  // Dashboard
  getDashboard: () => req('/dashboard'),

  // Hospitals
  getHospitals:    ()                        => req('/hospitals'),
  getHospital:     (id: string)              => req(`/hospitals/${id}`),
  createHospital:  (data: any)              => req('/hospitals', { method: 'POST', body: JSON.stringify(data) }),
  updateHospital:  (id: string, data: any)  => req(`/hospitals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHospital:  (id: string)             => req(`/hospitals/${id}`, { method: 'DELETE' }),

  // Cold Rooms
  getColdRooms:   (hospitalId?: string)     => req(`/cold-rooms${hospitalId ? `?hospitalId=${hospitalId}` : ''}`),
  getColdRoom:    (id: string)              => req(`/cold-rooms/${id}`),
  createColdRoom: (data: any)              => req('/cold-rooms', { method: 'POST', body: JSON.stringify(data) }),
  updateColdRoom: (id: string, data: any)  => req(`/cold-rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteColdRoom: (id: string)             => req(`/cold-rooms/${id}`, { method: 'DELETE' }),

  // Chambers
  getChambers: (coldRoomId?: string, hospitalId?: string) => {
    const p = new URLSearchParams();
    if (coldRoomId) p.set('coldRoomId', coldRoomId);
    if (hospitalId) p.set('hospitalId', hospitalId);
    return req(`/chambers${p.toString() ? '?' + p : ''}`);
  },
  getChamber:          (id: string)             => req(`/chambers/${id}`),
  getChamberReadings:  (id: string, limit = 48) => req(`/chambers/${id}/readings?limit=${limit}`),
  createChamber:  (data: any)             => req('/chambers', { method: 'POST', body: JSON.stringify(data) }),
  updateChamber:  (id: string, data: any) => req(`/chambers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChamber:  (id: string)            => req(`/chambers/${id}`, { method: 'DELETE' }),

  // Vaccines
  getVaccines: (f?: { chamberId?: string; coldRoomId?: string; hospitalId?: string; status?: string }) => {
    const p = new URLSearchParams();
    if (f?.chamberId)  p.set('chamberId',  f.chamberId);
    if (f?.coldRoomId) p.set('coldRoomId', f.coldRoomId);
    if (f?.hospitalId) p.set('hospitalId', f.hospitalId);
    if (f?.status)     p.set('status',     f.status);
    return req(`/vaccines${p.toString() ? '?' + p : ''}`);
  },
  createVaccine:  (data: any)             => req('/vaccines', { method: 'POST', body: JSON.stringify(data) }),
  updateVaccine:  (id: string, data: any) => req(`/vaccines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVaccine:  (id: string)            => req(`/vaccines/${id}`, { method: 'DELETE' }),

  // Alerts
  getAlerts: (hospitalId?: string, acknowledged?: boolean) => {
    const p = new URLSearchParams();
    if (hospitalId)              p.set('hospitalId',    hospitalId);
    if (acknowledged !== undefined) p.set('acknowledged', String(acknowledged));
    return req(`/alerts${p.toString() ? '?' + p : ''}`);
  },
  acknowledgeAlert: (id: string) => req(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
  deleteAlert:      (id: string) => req(`/alerts/${id}`, { method: 'DELETE' }),

  // Users (admin only)
  getUsers:    ()                        => req('/users'),
  createUser:  (data: any)              => req('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser:  (id: string, data: any)  => req(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser:  (id: string)             => req(`/users/${id}`, { method: 'DELETE' }),
};
