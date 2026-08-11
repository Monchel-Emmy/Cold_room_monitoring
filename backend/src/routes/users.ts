import { Router, Response } from 'express';
import { User } from '../models/User';
import { Hospital } from '../models/Hospital';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/users — admin only
router.get('/', requireRole('admin'), async (_req, res) => {
  const users = await User.find().lean();
  const result = await Promise.all(users.map(async u => {
    const hosp = u.hospitalId ? await Hospital.findById(u.hospitalId).lean() : null;
    return {
      id:           String(u._id),
      name:         u.name,
      email:        u.email,
      role:         u.role,
      hospitalId:   u.hospitalId ? String(u.hospitalId) : null,
      hospitalName: hosp?.name || null,
      status:       u.status,
      lastLogin:    u.lastLogin,
      createdAt:    u.createdAt,
    };
  }));
  res.json(result);
});

// POST /api/users — admin only
router.post('/', requireRole('admin'), async (req, res) => {
  const { name, email, password, role, hospitalId, status } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'Email already exists' });

  const user = await User.create({
    name, email: email.toLowerCase(),
    password,
    role:       role || 'viewer',
    hospitalId: hospitalId || null,
    status:     status || 'active',
  });

  const hosp = user.hospitalId ? await Hospital.findById(user.hospitalId).lean() : null;
  res.status(201).json({
    id:           String(user._id),
    name:         user.name,
    email:        user.email,
    role:         user.role,
    hospitalId:   user.hospitalId ? String(user.hospitalId) : null,
    hospitalName: hosp?.name || null,
    status:       user.status,
  });
});

// PUT /api/users/:id — admin only
router.put('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { name, email, password, role, hospitalId, status } = req.body;

  // Prevent admin from deactivating themselves
  if (req.params.id === req.userId && status === 'inactive') {
    return res.status(400).json({ error: 'Cannot deactivate your own account' });
  }

  const update: any = {};
  if (name)               update.name       = name;
  if (email)              update.email      = email.toLowerCase();
  if (role)               update.role       = role;
  if (status)             update.status     = status;
  if (hospitalId !== undefined) update.hospitalId = hospitalId || null;

  // Handle password change separately (triggers pre-save hash)
  if (password) {
    const userDoc = await User.findById(req.params.id);
    if (!userDoc) return res.status(404).json({ error: 'User not found' });
    userDoc.set({ ...update, password });
    await userDoc.save();
    const hosp = userDoc.hospitalId ? await Hospital.findById(userDoc.hospitalId).lean() : null;
    return res.json({
      id: String(userDoc._id), name: userDoc.name, email: userDoc.email,
      role: userDoc.role, hospitalId: userDoc.hospitalId ? String(userDoc.hospitalId) : null,
      hospitalName: hosp?.name || null, status: userDoc.status,
    });
  }

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const hosp = user.hospitalId ? await Hospital.findById(user.hospitalId).lean() : null;
  res.json({
    id: String(user._id), name: user.name, email: user.email,
    role: user.role, hospitalId: user.hospitalId ? String(user.hospitalId) : null,
    hospitalName: hosp?.name || null, status: user.status,
  });
});

// DELETE /api/users/:id — admin only, cannot delete self
router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
