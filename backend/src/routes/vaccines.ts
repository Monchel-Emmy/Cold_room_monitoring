import { Router } from 'express';
import { Vaccine } from '../models/Vaccine';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET vaccines, optionally filtered
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { chamberId, coldRoomId, hospitalId, status } = req.query;
    const query: any = {};
    const effectiveHospitalId = req.userHospitalId ?? (hospitalId as string | undefined);
    if (chamberId)  query.chamberId  = chamberId;
    if (coldRoomId) query.coldRoomId = coldRoomId;
    if (effectiveHospitalId) query.hospitalId = effectiveHospitalId;
    if (status)     query.status     = status;
    if (hospitalId && req.userHospitalId && req.userHospitalId !== hospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const vaccines = await Vaccine.find(query).lean();
    const result = vaccines.map(v => ({
      ...v,
      id: String(v._id),
      daysToExpiry: Math.ceil((new Date(v.expiryDate).getTime() - Date.now()) / 86400000),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET single vaccine
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const v = await Vaccine.findById(req.params.id).lean();
    if (!v) return res.status(404).json({ error: 'Vaccine not found' });
    if (req.userHospitalId && String(v.hospitalId) !== req.userHospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json({ ...v, id: String(v._id) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST create vaccine
router.post('/', async (req: AuthRequest, res) => {
  try {
    if (req.userHospitalId && req.body.hospitalId && String(req.body.hospitalId) !== req.userHospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const v = await Vaccine.create(req.body);
    res.status(201).json({ ...v.toObject(), id: v._id });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// PUT update vaccine
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const v = await Vaccine.findById(req.params.id).lean();
    if (!v) return res.status(404).json({ error: 'Vaccine not found' });
    if (req.userHospitalId && String(v.hospitalId) !== req.userHospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const updated = await Vaccine.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    res.json({ ...updated, id: String(updated?._id) });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// DELETE vaccine
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const v = await Vaccine.findById(req.params.id).lean();
    if (!v) return res.status(404).json({ error: 'Vaccine not found' });
    if (req.userHospitalId && String(v.hospitalId) !== req.userHospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await Vaccine.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
