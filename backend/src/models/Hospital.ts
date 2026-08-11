import { Schema, model, Document } from 'mongoose';

export interface IHospital extends Document {
  name: string;
  type: 'hospital' | 'health_center' | 'dispensary' | 'clinic';
  region: string;
  district: string;
  address: string;
  contactName: string;
  contactPhone: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

const schema = new Schema<IHospital>({
  name:         { type: String, required: true },
  type:         { type: String, enum: ['hospital','health_center','dispensary','clinic'], default: 'hospital' },
  region:       { type: String, default: '' },
  district:     { type: String, default: '' },
  address:      { type: String, default: '' },
  contactName:  { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  status:       { type: String, enum: ['active','inactive'], default: 'active' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Hospital = model<IHospital>('Hospital', schema);
