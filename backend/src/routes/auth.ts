import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { Hospital } from '../models/Hospital';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password').lean();
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  if (user.status === 'inactive') return res.status(403).json({ error: 'Account inactive' });

  // comparePassword needs instance method — use findOne without lean
  const userDoc = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!userDoc) return res.status(401).json({ error: 'Invalid email or password' });
  const match = await userDoc.comparePassword(password);
  if (!match) return res.status(401).json({ error: 'Invalid email or password' });

  await User.findByIdAndUpdate(userDoc._id, { lastLogin: new Date() });

  const hospital = userDoc.hospitalId
    ? await Hospital.findById(userDoc.hospitalId).lean()
    : null;

  const token = generateToken(String(userDoc._id));
  return res.json({
    token,
    user: {
      id:           String(userDoc._id),
      name:         userDoc.name,
      email:        userDoc.email,
      role:         userDoc.role,
      hospitalId:   userDoc.hospitalId ? String(userDoc.hospitalId) : null,
      hospitalName: hospital?.name || null,
      status:       userDoc.status,
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const hospital = user.hospitalId
    ? await Hospital.findById(user.hospitalId).lean()
    : null;
  return res.json({
    id:           String(user._id),
    name:         user.name,
    email:        user.email,
    role:         user.role,
    hospitalId:   user.hospitalId ? String(user.hospitalId) : null,
    hospitalName: hospital?.name || null,
    status:       user.status,
  });
});

// POST /api/auth/logout (stateless JWT — just a signal)
router.post('/logout', authenticate, (_req, res) => {
  res.json({ success: true });
});

export default router;
