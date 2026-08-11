import { Schema, model, Document, Types } from 'mongoose';

export interface IAlert extends Document {
  chamberId: Types.ObjectId;
  coldRoomId: Types.ObjectId;
  hospitalId: Types.ObjectId;
  type: 'temp_high' | 'temp_low' | 'humidity_high' | 'humidity_low' | 'sensor_offline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
}

const schema = new Schema<IAlert>({
  chamberId:    { type: Schema.Types.ObjectId, ref: 'Chamber', required: true },
  coldRoomId:   { type: Schema.Types.ObjectId, ref: 'ColdRoom', required: true },
  hospitalId:   { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
  type:         { type: String, enum: ['temp_high','temp_low','humidity_high','humidity_low','sensor_offline'], required: true },
  severity:     { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  message:      { type: String, required: true },
  value:        { type: Number, required: true },
  threshold:    { type: Number, required: true },
  acknowledged: { type: Boolean, default: false },
  resolvedAt:   { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Alert = model<IAlert>('Alert', schema);
