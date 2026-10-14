import { PowerReading } from '../models/PowerReading';

export interface PowerSnapshot {
  coldRoomId: string;
  hospitalId: string;
  coldRoomName?: string;
  voltage: number;
  current: number;
  power: number;
  energyKwh: number;
  alarm: boolean;
  timestamp: string;
  isDevice: boolean;   // true = real IoT device, false = simulated
}

// A real device is considered offline when it has not reported for this long
export const DEVICE_OFFLINE_MS = 2 * 60 * 1000;

// Latest simulated power values per cold room (not persisted — demo data only)
const simulated = new Map<string, PowerSnapshot>();

function round(n: number, dp: number) {
  return parseFloat(n.toFixed(dp));
}

// Advance the simulated power meter of a (non-device) cold room by one tick
export function simulatePowerStep(room: { _id: any; hospitalId: any; name: string }, tickMs: number): PowerSnapshot {
  const id   = String(room._id);
  const prev = simulated.get(id);

  const voltage = round(230 + (Math.random() - 0.5) * 6, 1);                      // ~227–233 V
  const baseI   = prev ? prev.current : 1 + Math.random();                         // 1–2 A
  const current = round(Math.min(2.5, Math.max(0.8, baseI + (Math.random() - 0.5) * 0.1)), 2);
  const power   = round(voltage * current * 0.95, 1);                              // pf ≈ 0.95
  const energyKwh = round((prev?.energyKwh ?? 5 + Math.random() * 20) + (power * tickMs) / 3_600_000_000, 3);

  const snap: PowerSnapshot = {
    coldRoomId: id,
    hospitalId: String(room.hospitalId),
    coldRoomName: room.name,
    voltage, current, power, energyKwh,
    alarm: false,
    timestamp: new Date().toISOString(),
    isDevice: false,
  };
  simulated.set(id, snap);
  return snap;
}

// Latest power values for a cold room: DB for real devices, memory for simulated rooms
export async function getRoomPower(room: { _id: any; hospitalId: any; name: string; deviceId?: string }): Promise<PowerSnapshot | null> {
  if (!room.deviceId) {
    const snap = simulated.get(String(room._id));
    return snap ? { ...snap, coldRoomName: room.name } : null;
  }

  const r = await PowerReading.findOne({ coldRoomId: room._id }).sort({ timestamp: -1 }).lean();
  if (!r) return null;
  return {
    coldRoomId: String(room._id),
    hospitalId: String(room.hospitalId),
    coldRoomName: room.name,
    voltage: r.voltage,
    current: r.current,
    power: r.power,
    energyKwh: r.energyKwh,
    alarm: r.alarm,
    timestamp: r.timestamp.toISOString(),
    isDevice: true,
  };
}
