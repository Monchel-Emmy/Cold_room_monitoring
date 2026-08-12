import { Router } from 'express';
import { Vaccine } from '../models/Vaccine';
import { Chamber } from '../models/Chamber';
import { ColdRoom } from '../models/ColdRoom';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// ── Helper: recalculate and persist usedCapacity on a cold room ────────────────
async function syncColdRoomCapacity(coldRoomId: any) {
  const agg = await Vaccine.aggregate([
    { $match: { coldRoomId } },
    { $group: { _id: null, totalQty: { $sum: '$quantity' } } },
  ]);
  const totalQty = agg[0]?.totalQty ?? 0;
  await ColdRoom.findByIdAndUpdate(coldRoomId, { usedCapacity: totalQty });
}

// ── Helper: check if adding `qty` doses to a chamber would overflow ─────────────
async function checkChamberCapacity(chamberId: any, qty: number, excludeVaccineId?: string) {
  const chamber = await Chamber.findById(chamberId).lean();
  if (!chamber || chamber.capacity <= 0) return; // 0 = unlimited

  const match: any = { chamberId };
  if (excludeVaccineId) match._id = { $ne: excludeVaccineId };

  const agg = await Vaccine.aggregate([
    { $match: match },
    { $group: { _id: null, totalQty: { $sum: '$quantity' } } },
  ]);
  const currentStored = agg[0]?.totalQty ?? 0;

  if (currentStored + qty > chamber.capacity) {
    const remaining = Math.max(chamber.capacity - currentStored, 0);
    throw new Error(
      `Chamber "${chamber.name}" is full. Capacity: ${chamber.capacity} doses, stored: ${currentStored}, available: ${remaining} doses.`
    );
  }
}

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

    // Enforce chamber capacity
    await checkChamberCapacity(req.body.chamberId, Number(req.body.quantity ?? 0));

    const v = await Vaccine.create(req.body);

    // Keep cold room usedCapacity in sync
    await syncColdRoomCapacity(v.coldRoomId);

    res.status(201).json({ ...v.toObject(), id: v._id });
  } catch (err: any) {
    const status = err.message?.includes('is full') ? 400 : 400;
    res.status(status).json({ error: String(err.message ?? err) });
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

    // Enforce chamber capacity (exclude current vaccine from current-stored count)
    const targetChamber = req.body.chamberId ?? String(v.chamberId);
    const newQty = req.body.quantity !== undefined ? Number(req.body.quantity) : v.quantity;
    await checkChamberCapacity(targetChamber, newQty, req.params.id);

    const updated = await Vaccine.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();

    // Sync both the old cold room (if chamber changed) and the new one
    await syncColdRoomCapacity(v.coldRoomId);
    if (updated && String(updated.coldRoomId) !== String(v.coldRoomId)) {
      await syncColdRoomCapacity(updated.coldRoomId);
    }

    res.json({ ...updated, id: String(updated?._id) });
  } catch (err: any) {
    res.status(400).json({ error: String(err.message ?? err) });
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

    // Keep cold room usedCapacity in sync
    await syncColdRoomCapacity(v.coldRoomId);

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
