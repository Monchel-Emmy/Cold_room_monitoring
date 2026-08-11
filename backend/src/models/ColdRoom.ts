import { Schema, model, Document, Types } from 'mongoose';

export interface IColdRoom extends Document {
  name: string;
  hospitalId: Types.ObjectId;
  modelName: string;
  serialNumber: string;
  type: 'walk_in_cooler' | 'refrigerator' | 'freezer' | 'ultra_cold';
  capacity: number;
  usedCapacity: number;
  capacityUnit: 'liters' | 'boxes' | 'doses';
  targetTempMin: number;
  targetTempMax: number;
  targetHumidityMin: number;
  targetHumidityMax: number;
  status: 'operational' | 'maintenance' | 'defective';
  installedAt: Date;
  createdAt: Date;
}

const schema = new Schema<IColdRoom>({
  name:              { type: String, required: true },
  hospitalId:        { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
  modelName:         { type: String, default: '' },
  serialNumber:      { type: String, default: '' },
  type:              { type: String, enum: ['walk_in_cooler','refrigerator','freezer','ultra_cold'], default: 'walk_in_cooler' },
  capacity:          { type: Number, default: 0 },
  usedCapacity:      { type: Number, default: 0 },
  capacityUnit:      { type: String, enum: ['liters','boxes','doses'], default: 'doses' },
  targetTempMin:     { type: Number, default: 2 },
  targetTempMax:     { type: Number, default: 8 },
  targetHumidityMin: { type: Number, default: 40 },
  targetHumidityMax: { type: Number, default: 70 },
  status:            { type: String, enum: ['operational','maintenance','defective'], default: 'operational' },
  installedAt:       { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const ColdRoom = model<IColdRoom>('ColdRoom', schema);
