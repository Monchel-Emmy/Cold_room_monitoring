import { Schema, model, Document, Types } from 'mongoose';

export interface IChamber extends Document {
  name: string;
  coldRoomId: Types.ObjectId;
  hospitalId: Types.ObjectId;
  sensorId: string;       // identifier for the physical sensor
  capacity: number;       // max doses this chamber can hold (0 = unlimited)
  targetTempMin: number;
  targetTempMax: number;
  targetHumidityMin: number;
  targetHumidityMax: number;
  status: 'operational' | 'maintenance' | 'defective';
  notes: string;
  createdAt: Date;
}

const schema = new Schema<IChamber>({
  name:              { type: String, required: true },
  coldRoomId:        { type: Schema.Types.ObjectId, ref: 'ColdRoom', required: true },
  hospitalId:        { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
  sensorId:          { type: String, default: '' },
  capacity:          { type: Number, default: 0 },
  targetTempMin:     { type: Number, default: 2 },
  targetTempMax:     { type: Number, default: 8 },
  targetHumidityMin: { type: Number, default: 40 },
  targetHumidityMax: { type: Number, default: 70 },
  status:            { type: String, enum: ['operational','maintenance','defective'], default: 'operational' },
  notes:             { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Chamber = model<IChamber>('Chamber', schema);

