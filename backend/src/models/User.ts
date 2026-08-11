import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'manager' | 'technician' | 'viewer';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  hospitalId?: Types.ObjectId | null; // null = access to all (admin)
  status: 'active' | 'inactive';
  lastLogin?: Date;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const schema = new Schema<IUser>({
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String, required: true, select: false },
  role:       { type: String, enum: ['admin','manager','technician','viewer'], default: 'viewer' },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', default: null },
  status:     { type: String, enum: ['active','inactive'], default: 'active' },
  lastLogin:  { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

schema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser>('User', schema);
