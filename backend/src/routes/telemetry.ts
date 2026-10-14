import { Router, Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { Chamber }       from '../models/Chamber';
import { ColdRoom }      from '../models/ColdRoom';
import { SensorReading } from '../models/SensorReading';
import { PowerReading }  from '../models/PowerReading';
import { PowerSnapshot } from '../services/power';

// Accept the device's own clock only when it is within this window of server time
const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function readingTime(raw: unknown): Date {
  const t = raw ? new Date(raw as string) : null;
  if (t && !isNaN(t.getTime()) && Math.abs(t.getTime() - Date.now()) <= MAX_CLOCK_SKEW_MS) return t;
  return new Date();
}

// Devices authenticate with the shared DEVICE_API_KEY (header "x-api-key").
// If no key is configured the endpoint stays open (local development).
function requireDeviceKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.DEVICE_API_KEY;
  if (!expected || expected === 'paste-your-long-random-key-here') return next();
  if (req.header('x-api-key') !== expected) {
    return res.status(401).json({ error: 'Invalid or missing device API key (x-api-key header)' });
  }
  next();
}

export function createTelemetryRouter(io: Server) {
  const router = Router();
  router.use(requireDeviceKey);

  // POST /api/telemetry
  router.post('/', async (req, res) => {
    try {
      const body = req.body ?? {};
      if (typeof body.room === 'string' && body.room.trim()) {
        return await handleRoomDevice(body, res, io);
      }
      return await handleLegacy(body, res, io);
    } catch (error) {
      console.error('Telemetry ingestion error:', error);
      return res.status(500).json({ error: 'Failed to store telemetry data' });
    }
  });

  return router;
}

// ── Cold room device format ───────────────────────────────────────────────────
// {"room":"RH09HZ","time":"...","temp1":4.2,"temp2":4.5,"humidity":61.3,
//  "voltage":229.8,"current":1.35,"power":298.4,"energy_kwh":12.481,"alarm":false}
// temp1 → chamber with sensorId "<room>-T1", temp2 → "<room>-T2", and so on.
async function handleRoomDevice(body: any, res: Response, io: Server) {
  const deviceId = String(body.room).trim();
  const room = await ColdRoom.findOne({ deviceId }).lean();
  if (!room) {
    return res.status(404).json({ error: `No cold room is linked to device room "${deviceId}"` });
  }

  const timestamp = readingTime(body.time);
  const humidity  = num(body.humidity);

  const chambers = await Chamber.find({ coldRoomId: room._id }).lean();
  const tempKeys = Object.keys(body).filter(k => /^temp\d+$/.test(k));

  const readings: any[] = [];
  const unmatched: string[] = [];
  for (const key of tempKeys) {
    const temperature = num(body[key]);
    if (temperature === null) continue;
    const sensorId = `${deviceId}-T${key.slice(4)}`;
    const chamber = chambers.find(c => c.sensorId === sensorId);
    if (!chamber) { unmatched.push(`${key} (expected a chamber with sensor ID "${sensorId}")`); continue; }

    const reading = await SensorReading.create({
      chamberId:  chamber._id,
      coldRoomId: room._id,
      hospitalId: room.hospitalId,
      temperature,
      humidity:   humidity ?? 0,
      timestamp,
    });
    readings.push({
      chamberId:   String(chamber._id),
      coldRoomId:  String(room._id),
      sensorId,
      temperature: reading.temperature,
      humidity:    reading.humidity,
      timestamp:   reading.timestamp.toISOString(),
    });
  }

  let power: PowerSnapshot | null = null;
  const hasPower = ['voltage', 'current', 'power', 'energy_kwh'].some(k => body[k] !== undefined);
  if (hasPower || body.alarm !== undefined) {
    const p = await PowerReading.create({
      coldRoomId: room._id,
      hospitalId: room.hospitalId,
      voltage:    num(body.voltage) ?? 0,
      current:    num(body.current) ?? 0,
      power:      num(body.power) ?? 0,
      energyKwh:  num(body.energy_kwh) ?? 0,
      alarm:      body.alarm === true || body.alarm === 'true' || body.alarm === 1,
      timestamp,
    });
    power = {
      coldRoomId: String(room._id),
      hospitalId: String(room.hospitalId),
      coldRoomName: room.name,
      voltage: p.voltage,
      current: p.current,
      power: p.power,
      energyKwh: p.energyKwh,
      alarm: p.alarm,
      timestamp: p.timestamp.toISOString(),
      isDevice: true,
    };
  }

  if (readings.length) io.emit('sensor_reading', readings);
  if (power) io.emit('power_reading', [power]);

  return res.json({
    ok: true,
    coldRoom: room.name,
    saved: readings.length,
    readings,
    power,
    ...(unmatched.length ? { warnings: unmatched.map(u => `Ignored ${u}`) } : {}),
  });
}

// ── Legacy formats: {readings:[{sensorId,...}]}, {fridges:[...]}, or a single {sensorId,...} ──
async function handleLegacy(body: any, res: Response, io: Server) {
  const rawReadings = Array.isArray(body.readings)
    ? body.readings
    : Array.isArray(body.fridges)
      ? body.fridges.map((item: any, index: number) => ({
          sensorId: item.sensorId || item.ip || `ESP-${index + 1}`,
          temperature: item.temperature,
          humidity: item.humidity ?? body.room?.ambientHum ?? 0,
          airQuality: body.room?.airQuality ?? 0,
        }))
      : [body];

  if (!rawReadings.length) {
    return res.status(400).json({ error: 'No sensor readings provided' });
  }

  const saved = await Promise.all(rawReadings.map(async (raw: any) => {
    const sensorId = String(raw.sensorId ?? raw.id ?? raw.deviceId ?? '').trim();
    if (!sensorId) return null;

    const chamber = await Chamber.findOne({ sensorId }).lean();
    if (!chamber) return null;

    const reading = await SensorReading.create({
      chamberId: chamber._id,
      coldRoomId: chamber.coldRoomId,
      hospitalId: chamber.hospitalId,
      temperature: Number(raw.temperature ?? 0),
      humidity: Number(raw.humidity ?? 0),
      timestamp: new Date(),
    });

    return {
      chamberId: String(chamber._id),
      coldRoomId: String(chamber.coldRoomId),
      sensorId,
      temperature: reading.temperature,
      humidity: reading.humidity,
      timestamp: reading.timestamp.toISOString(),
    };
  }));

  const validReadings = saved.filter(Boolean);
  if (validReadings.length) {
    io.emit('sensor_reading', validReadings);
  }

  return res.json({
    ok: true,
    saved: validReadings.length,
    readings: validReadings,
  });
}
