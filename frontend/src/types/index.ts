// ── Auth ──────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'manager' | 'technician' | 'viewer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hospitalId: string | null;
  hospitalName: string | null;
  status: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hospitalId: string | null;
  hospitalName: string | null;
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt?: string;
}

// ── Hospital ──────────────────────────────────────────────────────────────────
export interface Hospital {
  id: string;
  name: string;
  type: 'hospital' | 'health_center' | 'dispensary' | 'clinic';
  region: string;
  district: string;
  address: string;
  contactName: string;
  contactPhone: string;
  status: 'active' | 'inactive';
  createdAt: string;
  coldRoomsCount?: number;
  chambersCount?: number;
  vaccinesCount?: number;
}

// ── Cold Room ─────────────────────────────────────────────────────────────────
export interface ColdRoom {
  id: string;
  name: string;
  hospitalId: string;
  hospitalName?: string;
  modelName: string;
  serialNumber: string;
  type: 'walk_in_cooler' | 'refrigerator' | 'freezer' | 'ultra_cold';
  capacity: number;
  usedCapacity: number;
  capacityUnit: 'liters' | 'boxes' | 'doses';
  targetTempMin: number;
  targetTempMax: number;
  targetHumidityMin: number;
  targetHumidityMax: number;
  status: 'operational' | 'maintenance' | 'defective';
  installedAt: string;
  createdAt: string;
  chambers?: Chamber[];
  vaccineCount?: number;
  atRiskCount?: number;
  expiredCount?: number;
  remainingCapacity?: number;
  occupancyPercent?: number;
  capacityStatus?: 'available' | 'almost_full' | 'full';
}

// ── Chamber ───────────────────────────────────────────────────────────────────
export interface Chamber {
  id: string;
  name: string;
  coldRoomId: string;
  hospitalId: string;
  sensorId: string;
  capacity: number;           // max doses (0 = unlimited)
  targetTempMin: number;
  targetTempMax: number;
  targetHumidityMin: number;
  targetHumidityMax: number;
  status: 'operational' | 'maintenance' | 'defective';
  notes: string;
  createdAt: string;
  currentTemp?: number | null;
  currentHumidity?: number | null;
  lastUpdated?: string | null;
  tempStatus?: 'ok' | 'alert' | 'unknown';
  humStatus?:  'ok' | 'alert' | 'unknown';
  vaccineCount?: number;
  dosesStored?: number;
  vaccines?: Vaccine[];
}

// ── Vaccine ───────────────────────────────────────────────────────────────────
export interface Vaccine {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  chamberId: string;
  coldRoomId: string;
  hospitalId: string;
  expiryDate: string;
  storageRequirements: {
    tempMin: number;
    tempMax: number;
    humidityMin: number;
    humidityMax: number;
  };
  status: 'active' | 'at_risk' | 'expired' | 'recalled';
  createdAt: string;
  daysToExpiry?: number;
}

// ── Alert ─────────────────────────────────────────────────────────────────────
export interface Alert {
  id: string;
  chamberId: string;
  coldRoomId: string;
  hospitalId: string;
  type: 'temp_high' | 'temp_low' | 'humidity_high' | 'humidity_low' | 'sensor_offline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
  resolvedAt: string | null;
  createdAt: string;
  chamberName?: string;
  coldRoomName?: string;
  hospitalName?: string;
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────
export interface DashboardStats {
  totalHospitals: number;
  totalColdRooms: number;
  totalChambers: number;
  totalVaccines: number;
  activeVaccines: number;
  atRiskVaccines: number;
  expiredVaccines: number;
  totalAlerts: number;
  unacknowledgedAlerts: number;
  recentAlerts: Alert[];
}

// ── Live reading (from WebSocket) ─────────────────────────────────────────────
export interface LiveReading {
  chamberId: string;
  coldRoomId: string;
  temperature: number;
  humidity: number;
  timestamp: string;
}
