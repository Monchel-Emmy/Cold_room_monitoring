import { Router } from 'express';
import { Alert }   from '../models/Alert';
import { Chamber } from '../models/Chamber';
import { ColdRoom }from '../models/ColdRoom';
import { Hospital }from '../models/Hospital';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET all alerts with enriched names
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { hospitalId, acknowledged } = req.query;
    const query: any = {};
    const effectiveHospitalId = req.userHospitalId ?? (hospitalId as string | undefined);
    if (effectiveHospitalId) query.hospitalId = effectiveHospitalId;
    if (hospitalId && req.userHospitalId && req.userHospitalId !== hospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (acknowledged !== undefined) query.acknowledged = acknowledged === 'true';

    const alerts = await Alert.find(query).sort({ createdAt: -1 }).lean();
    const result = await Promise.all(alerts.map(async a => {
      const ch   = await Chamber.findById(a.chamberId).lean();
      const room = await ColdRoom.findById(a.coldRoomId).lean();
      const hosp = await Hospital.findById(a.hospitalId).lean();
      return {
        ...a,
        id:           String(a._id),
        chamberName:  ch?.name || '—',
        coldRoomName: room?.name || '—',
        hospitalName: hosp?.name || '—',
      };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH acknowledge alert
router.patch('/:id/acknowledge', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true },
      { new: true }
    ).lean();
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ ...alert, id: String(alert._id) });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// DELETE alert
router.delete('/:id', async (req, res) => {
  try {
    await Alert.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
