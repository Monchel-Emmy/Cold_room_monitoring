import { Router } from 'express';
import { Hospital } from '../models/Hospital';
import { ColdRoom } from '../models/ColdRoom';
import { Chamber }  from '../models/Chamber';
import { Vaccine }  from '../models/Vaccine';
import { Alert }    from '../models/Alert';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res) => {
  try {
    // Scoped users only see their hospital's data
    const hcFilter = req.userHospitalId ? { hospitalId: req.userHospitalId } : {};

    const [
      totalHospitals, totalColdRooms, totalChambers,
      totalVaccines, activeVaccines, atRiskVaccines, expiredVaccines,
      totalAlerts, unacknowledgedAlerts,
    ] = await Promise.all([
      Hospital.countDocuments(req.userHospitalId ? { _id: req.userHospitalId } : {}),
      ColdRoom.countDocuments(hcFilter),
      Chamber.countDocuments(hcFilter),
      Vaccine.countDocuments(hcFilter),
      Vaccine.countDocuments({ ...hcFilter, status: 'active' }),
      Vaccine.countDocuments({ ...hcFilter, status: 'at_risk' }),
      Vaccine.countDocuments({ ...hcFilter, status: 'expired' }),
      Alert.countDocuments(hcFilter),
      Alert.countDocuments({ ...hcFilter, acknowledged: false }),
    ]);

    const recentAlerts = await Alert.find({ ...hcFilter, acknowledged: false })
      .sort({ createdAt: -1 }).limit(5).lean();

    res.json({
      totalHospitals, totalColdRooms, totalChambers,
      totalVaccines, activeVaccines, atRiskVaccines, expiredVaccines,
      totalAlerts, unacknowledgedAlerts,
      recentAlerts: recentAlerts.map(a => ({ ...a, id: String(a._id) })),
    });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

export default router;
