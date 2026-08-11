import { Router } from 'express';
import { Chamber }  from '../models/Chamber';
import { Vaccine }  from '../models/Vaccine';
import { SensorReading } from '../models/SensorReading';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET chambers, optionally filtered by coldRoomId or hospitalId
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { coldRoomId, hospitalId } = req.query;
    const query: any = {};
    const effectiveHospitalId = req.userHospitalId ?? (hospitalId as string | undefined);
    if (coldRoomId) query.coldRoomId = coldRoomId;
    if (effectiveHospitalId) query.hospitalId = effectiveHospitalId;
    if (hospitalId && req.userHospitalId && req.userHospitalId !== hospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chambers = await Chamber.find(query).lean();
    const result = await Promise.all(chambers.map(async ch => {
      const reading = await SensorReading
        .findOne({ chamberId: ch._id })
        .sort({ timestamp: -1 }).lean();
      const vaccines = await Vaccine.find({ chamberId: ch._id }).lean();
      const tempOk = reading ? reading.temperature >= ch.targetTempMin && reading.temperature <= ch.targetTempMax : null;
      const humOk  = reading ? reading.humidity >= ch.targetHumidityMin && reading.humidity <= ch.targetHumidityMax : null;
      return {
        ...ch,
        id:              String(ch._id),
        currentTemp:     reading?.temperature ?? null,
        currentHumidity: reading?.humidity ?? null,
        lastUpdated:     reading ? (reading.timestamp instanceof Date ? reading.timestamp.toISOString() : reading.timestamp) : null,
        tempStatus:      reading ? (tempOk ? 'ok' : 'alert') : 'unknown',
        humStatus:       reading ? (humOk  ? 'ok' : 'alert') : 'unknown',
        vaccineCount:    vaccines.length,
        vaccines: vaccines.map(v => ({
          ...v,
          id: String(v._id),
          daysToExpiry: Math.ceil((new Date(v.expiryDate).getTime() - Date.now()) / 86400000),
        })),
      };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET single chamber
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const ch = await Chamber.findById(req.params.id).lean();
    if (!ch) return res.status(404).json({ error: 'Chamber not found' });
    if (req.userHospitalId && String(ch.hospitalId) !== req.userHospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const reading = await SensorReading.findOne({ chamberId: ch._id }).sort({ timestamp: -1 }).lean();
    const vaccines = await Vaccine.find({ chamberId: ch._id }).lean();
    res.json({
      ...ch,
      id: String(ch._id),
      currentTemp:     reading?.temperature ?? null,
      currentHumidity: reading?.humidity ?? null,
      vaccines: vaccines.map(v => ({ ...v, id: String(v._id) })),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST create chamber
router.post('/', async (req: AuthRequest, res) => {
  try {
    if (req.userHospitalId && req.body.hospitalId && String(req.body.hospitalId) !== req.userHospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const ch = await Chamber.create(req.body);
    res.status(201).json({ ...ch.toObject(), id: ch._id });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// PUT update chamber
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const ch = await Chamber.findById(req.params.id).lean();
    if (!ch) return res.status(404).json({ error: 'Chamber not found' });
    if (req.userHospitalId && String(ch.hospitalId) !== req.userHospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const updated = await Chamber.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    res.json({ ...updated, id: String(updated?._id) });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// DELETE chamber
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const ch = await Chamber.findById(req.params.id).lean();
    if (!ch) return res.status(404).json({ error: 'Chamber not found' });
    if (req.userHospitalId && String(ch.hospitalId) !== req.userHospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await Chamber.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// GET sensor history for a chamber
router.get('/:id/readings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 48;
    const readings = await SensorReading
      .find({ chamberId: req.params.id })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    res.json(readings.reverse());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
