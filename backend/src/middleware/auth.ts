import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'crm-jwt-secret-change-in-prod';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
  userHospitalId?: string | null;
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId).lean();
    if (!user || user.status === 'inactive') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = String(user._id);
    req.userRole = user.role;
    req.userHospitalId = user.hospitalId ? String(user.hospitalId) : null;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Role hierarchy: admin > manager > technician > viewer
const ROLE_LEVEL: Record<UserRole, number> = {
  admin: 4, manager: 3, technician: 2, viewer: 1,
};

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
  };
}

export function requireMinRole(minRole: UserRole) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || ROLE_LEVEL[req.userRole] < ROLE_LEVEL[minRole]) {
      return res.status(403).json({ error: `Access denied. Minimum role required: ${minRole}` });
    }
    next();
  };
}
