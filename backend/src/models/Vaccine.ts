import { Schema, model, Document, Types } from 'mongoose';

export interface IVaccine extends Document {
  name: string;
  type: string;
  manufacturer: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  chamberId: Types.ObjectId;
  coldRoomId: Types.ObjectId;
  hospitalId: Types.ObjectId;
  expiryDate: Date;
  storageRequirements: {
    tempMin: number;
    tempMax: number;
    humidityMin: number;
    humidityMax: number;
  };
  status: 'active' | 'at_risk' | 'expired' | 'recalled';
  createdAt: Date;
}

const schema = new Schema<IVaccine>({
  name:           { type: String, required: true },
  type:           { type: String, default: '' },
  manufacturer:   { type: String, default: '' },
  batchNumber:    { type: String, default: '' },
  quantity:       { type: Number, default: 0 },
  unit:           { type: String, default: 'doses' },
  chamberId:      { type: Schema.Types.ObjectId, ref: 'Chamber', required: true },
  coldRoomId:     { type: Schema.Types.ObjectId, ref: 'ColdRoom', required: true },
  hospitalId:     { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
  expiryDate:     { type: Date, required: true },
  storageRequirements: {
    tempMin:     { type: Number, default: 2 },
    tempMax:     { type: Number, default: 8 },
    humidityMin: { type: Number, default: 40 },
    humidityMax: { type: Number, default: 70 },
  },
  status: { type: String, enum: ['active','at_risk','expired','recalled'], default: 'active' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Vaccine = model<IVaccine>('Vaccine', schema);
