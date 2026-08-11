import { Router } from 'express';
import { ColdRoom }  from '../models/ColdRoom';
import { Chamber }   from '../models/Chamber';
import { Vaccine }   from '../models/Vaccine';
import { Hospital }  from '../models/Hospital';
import { SensorReading } from '../models/SensorReading';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET all cold rooms — scoped to user's hospital if set
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { hospitalId } = req.query;
    // userHospitalId takes priority over query param for scoped users
    const effectiveHC = req.userHospitalId ?? (hospitalId as string | undefined);
    const query = effectiveHC ? { hospitalId: effectiveHC } : {};
    const rooms = await ColdRoom.find(query).lean();

    const result = await Promise.all(rooms.map(async room => {
      const hospital = await Hospital.findById(room.hospitalId).lean();
      const chambers = await Chamber.find({ coldRoomId: room._id }).lean();

      const chambersWithReadings = await Promise.all(chambers.map(async ch => {
        const reading = await SensorReading
          .findOne({ chamberId: ch._id })
          .sort({ timestamp: -1 })
          .lean();
        const vaccines = await Vaccine.find({ chamberId: ch._id }).lean();
        const tempOk = reading
          ? reading.temperature >= ch.targetTempMin && reading.temperature <= ch.targetTempMax
          : null;
        const humOk = reading
          ? reading.humidity >= ch.targetHumidityMin && reading.humidity <= ch.targetHumidityMax
          : null;
        return {
          ...ch,
          id: String(ch._id),
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

      const vaccineCount = await Vaccine.countDocuments({ coldRoomId: room._id });
      const vaccineQtyAgg = await Vaccine.aggregate([
        { $match: { coldRoomId: room._id } },
        { $group: { _id: null, totalQty: { $sum: '$quantity' } } },
      ]);
      const usedCapacity = room.usedCapacity || (vaccineQtyAgg[0]?.totalQty ?? 0);
      const capacity = Number(room.capacity ?? 0);
      const remainingCapacity = Math.max(capacity - usedCapacity, 0);
      const occupancyPercent = capacity > 0 ? Math.min((usedCapacity / capacity) * 100, 100) : 0;
      const capacityStatus = capacity <= 0 ? 'available' : occupancyPercent >= 100 ? 'full' : occupancyPercent >= 75 ? 'almost_full' : 'available';

      const atRiskCount  = await Vaccine.countDocuments({ coldRoomId: room._id, status: 'at_risk' });
      const expiredCount = await Vaccine.countDocuments({ coldRoomId: room._id, status: 'expired' });

      return {
        ...room,
        id:           String(room._id),
        hospitalName: hospital?.name || '',
        chambers:     chambersWithReadings,
        vaccineCount,
        atRiskCount,
        expiredCount,
        usedCapacity,
        remainingCapacity,
        occupancyPercent,
        capacityStatus,
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET single cold room with full detail
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const room = await ColdRoom.findById(req.params.id).lean();
    if (!room) return res.status(404).json({ error: 'Cold room not found' });
    if (req.userHospitalId && String(room.hospitalId) !== req.userHospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const hospital = await Hospital.findById(room.hospitalId).lean();
    const chambers = await Chamber.find({ coldRoomId: room._id }).lean();

    const chambersWithData = await Promise.all(chambers.map(async ch => {
      const reading = await SensorReading
        .findOne({ chamberId: ch._id })
        .sort({ timestamp: -1 })
        .lean();
      const vaccines = await Vaccine.find({ chamberId: ch._id }).lean();
      const tempOk = reading
        ? reading.temperature >= ch.targetTempMin && reading.temperature <= ch.targetTempMax
        : null;
      const humOk = reading
        ? reading.humidity >= ch.targetHumidityMin && reading.humidity <= ch.targetHumidityMax
        : null;

      return {
        ...ch,
        id:              String(ch._id),
        currentTemp:     reading?.temperature ?? null,
        currentHumidity: reading?.humidity ?? null,
        lastUpdated:     reading ? (reading.timestamp instanceof Date ? reading.timestamp.toISOString() : reading.timestamp) : null,
        tempStatus:      reading ? (tempOk ? 'ok' : 'alert') : 'unknown',
        humStatus:       reading ? (humOk  ? 'ok' : 'alert') : 'unknown',
        vaccines: vaccines.map(v => ({
          ...v,
          id: String(v._id),
          daysToExpiry: Math.ceil((new Date(v.expiryDate).getTime() - Date.now()) / 86400000),
        })),
      };
    }));

    const vaccineQtyAgg = await Vaccine.aggregate([
      { $match: { coldRoomId: room._id } },
      { $group: { _id: null, totalQty: { $sum: '$quantity' } } },
    ]);
    const usedCapacity = room.usedCapacity || (vaccineQtyAgg[0]?.totalQty ?? 0);
    const capacity = Number(room.capacity ?? 0);
    const remainingCapacity = Math.max(capacity - usedCapacity, 0);
    const occupancyPercent = capacity > 0 ? Math.min((usedCapacity / capacity) * 100, 100) : 0;
    const capacityStatus = capacity <= 0 ? 'available' : occupancyPercent >= 100 ? 'full' : occupancyPercent >= 75 ? 'almost_full' : 'available';

    res.json({
      ...room,
      id:           String(room._id),
      hospitalName: hospital?.name || '',
      chambers:     chambersWithData,
      usedCapacity,
      remainingCapacity,
      occupancyPercent,
      capacityStatus,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST create cold room
router.post('/', async (req: AuthRequest, res) => {
  try {
    if (req.userHospitalId && req.body.hospitalId && String(req.body.hospitalId) !== req.userHospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const room = await ColdRoom.create(req.body);
    res.status(201).json({ ...room.toObject(), id: room._id });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// PUT update cold room
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const room = await ColdRoom.findById(req.params.id).lean();
    if (!room) return res.status(404).json({ error: 'Cold room not found' });
    if (req.userHospitalId && String(room.hospitalId) !== req.userHospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const updated = await ColdRoom.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    res.json({ ...updated, id: String(updated?._id) });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// DELETE cold room
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const room = await ColdRoom.findById(req.params.id).lean();
    if (!room) return res.status(404).json({ error: 'Cold room not found' });
    if (req.userHospitalId && String(room.hospitalId) !== req.userHospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await ColdRoom.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
