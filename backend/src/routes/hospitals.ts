import { Router } from 'express';
import { Hospital } from '../models/Hospital';
import { ColdRoom } from '../models/ColdRoom';
import { Chamber }  from '../models/Chamber';
import { Vaccine }  from '../models/Vaccine';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET — only return hospitals the user has access to
router.get('/', async (req: AuthRequest, res) => {
  try {
    // null = admin/no restriction → see all; string = scoped to one hospital
    const query = req.userHospitalId
      ? { _id: req.userHospitalId }
      : {};

    const hospitals = await Hospital.find(query).lean();
    const result = await Promise.all(hospitals.map(async h => ({
      ...h,
      id:              String(h._id),
      coldRoomsCount: await ColdRoom.countDocuments({ hospitalId: h._id }),
      chambersCount:  await Chamber.countDocuments({ hospitalId: h._id }),
      vaccinesCount:  await Vaccine.countDocuments({ hospitalId: h._id }),
    })));
    res.json(result);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    // Scoped users can only view their own hospital
    if (req.userHospitalId && req.userHospitalId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const h = await Hospital.findById(req.params.id).lean();
    if (!h) return res.status(404).json({ error: 'Hospital not found' });
    res.json({ ...h, id: String(h._id) });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    if (req.userHospitalId) return res.status(403).json({ error: 'Access denied' });
    const h = await Hospital.create(req.body);
    res.status(201).json({ ...h.toObject(), id: h._id });
  } catch (err) { res.status(400).json({ error: String(err) }); }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    if (req.userHospitalId && req.userHospitalId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const h = await Hospital.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!h) return res.status(404).json({ error: 'Hospital not found' });
    res.json({ ...h, id: String(h._id) });
  } catch (err) { res.status(400).json({ error: String(err) }); }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    if (req.userHospitalId) return res.status(403).json({ error: 'Access denied' });
    await Hospital.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: String(err) }); }
});

export default router;
