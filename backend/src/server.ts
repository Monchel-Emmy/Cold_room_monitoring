import express    from 'express';
import cors       from 'cors';
import helmet     from 'helmet';
import dotenv     from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { connectDB }   from './db';
import { seedIfEmpty } from './data/seed';

import authRoutes      from './routes/auth';
import userRoutes      from './routes/users';
import hospitalRoutes  from './routes/hospitals';
import coldRoomRoutes  from './routes/coldRooms';
import chamberRoutes   from './routes/chambers';
import vaccineRoutes   from './routes/vaccines';
import dashboardRoutes from './routes/dashboard';
import alertRoutes     from './routes/alerts';
import aiRoutes        from './routes/ai';

import { authenticate } from './middleware/auth';
import { Chamber }       from './models/Chamber';
import { SensorReading } from './models/SensorReading';

dotenv.config();

connectDB().then(() => seedIfEmpty()).catch(console.error);

const app    = express();
const server = createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 5001;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ── Public routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  service: 'Cold Room Monitoring API',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
}));

app.post('/api/telemetry', async (req, res) => {
  try {
    const body = req.body ?? {};
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
  } catch (error) {
    console.error('Telemetry ingestion error:', error);
    return res.status(500).json({ error: 'Failed to store telemetry data' });
  }
});

// ── Protected routes (require valid JWT) ──────────────────────────────────────
app.use('/api/users',      authenticate, userRoutes);
app.use('/api/hospitals',  authenticate, hospitalRoutes);
app.use('/api/cold-rooms', authenticate, coldRoomRoutes);
app.use('/api/chambers',   authenticate, chamberRoutes);
app.use('/api/vaccines',   authenticate, vaccineRoutes);
app.use('/api/dashboard',  authenticate, dashboardRoutes);
app.use('/api/alerts',     authenticate, alertRoutes);
app.use('/api/ai',         authenticate, aiRoutes);

// ── WebSocket: push initial readings on connect ───────────────────────────────
io.on('connection', async socket => {
  console.log(`[WS] Client connected: ${socket.id}`);
  try {
    const chambers = await Chamber.find().lean();
    const initialReadings = await Promise.all(chambers.map(async ch => {
      const r = await SensorReading
        .findOne({ chamberId: ch._id })
        .sort({ timestamp: -1 })
        .lean();
      if (!r) return null;
      return {
        chamberId:   String(ch._id),
        coldRoomId:  String(ch.coldRoomId),
        temperature: r.temperature,
        humidity:    r.humidity,
        timestamp:   r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
      };
    }));
    socket.emit('initial_readings', initialReadings.filter(Boolean));
  } catch { socket.emit('initial_readings', []); }

  socket.on('disconnect', () => console.log(`[WS] Client disconnected: ${socket.id}`));
});

// ── Simulate live sensor drift every 8 seconds ────────────────────────────────
// Kibagabaga cold rooms use fixed temperatures:
//   Cold Room RH09HZ (room 1) → all chambers ~10.0°C
//   Cold Room B      (room 2) → all chambers ~7.1°C
const FIXED_ROOM_TEMPS: Record<string, number> = {
  'Cold Room RH09HZ': 10.0,
  'Cold Room B':       7.1,
};

setInterval(async () => {
  try {
    const { ColdRoom: ColdRoomModel } = await import('./models/ColdRoom');
    const { Hospital } = await import('./models/Hospital');
    const kibagabaga = await Hospital.findOne({ name: /kibagabaga/i }).lean();

    // Build a map: coldRoomId → fixedTemp (for Kibagabaga rooms only)
    const roomTempMap = new Map<string, number>();
    if (kibagabaga) {
      const kRooms = await ColdRoomModel.find({ hospitalId: kibagabaga._id }).lean();
      for (const r of kRooms) {
        const fixed = FIXED_ROOM_TEMPS[r.name];
        if (fixed !== undefined) roomTempMap.set(String(r._id), fixed);
      }
    }

    const chambers = await Chamber.find().lean();
    const updates = await Promise.all(chambers.map(async ch => {
      const last = await SensorReading
        .findOne({ chamberId: ch._id })
        .sort({ timestamp: -1 })
        .lean();

      const fixedTemp = roomTempMap.get(String(ch.coldRoomId));

      let newTemp: number;
      if (fixedTemp !== undefined) {
        // Kibagabaga fixed room: tiny ±0.05°C noise so it looks live
        newTemp = parseFloat((fixedTemp + (Math.random() - 0.5) * 0.1).toFixed(1));
      } else {
        const baseTemp = last?.temperature ?? ((ch.targetTempMin + ch.targetTempMax) / 2);
        newTemp = parseFloat((baseTemp + (Math.random() - 0.5) * 0.4).toFixed(1));
      }

      const baseHum = last?.humidity ?? ((ch.targetHumidityMin + ch.targetHumidityMax) / 2);
      const newHum  = parseFloat((baseHum + (Math.random() - 0.5) * 1.5).toFixed(1));

      await SensorReading.create({
        chamberId:   ch._id,
        coldRoomId:  ch.coldRoomId,
        hospitalId:  ch.hospitalId,
        temperature: newTemp,
        humidity:    newHum,
        timestamp:   new Date(),
      });

      return {
        chamberId:   String(ch._id),
        coldRoomId:  String(ch.coldRoomId),
        temperature: newTemp,
        humidity:    newHum,
        timestamp:   new Date().toISOString(),
      };
    }));
    io.emit('sensor_reading', updates);
  } catch (err) {
    console.error('[Simulate] Error:', err);
  }
}, 8000);

server.listen(PORT, () => {
  console.log(`🚀 Cold Room Monitoring API → http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready`);
});

export { app, io };
