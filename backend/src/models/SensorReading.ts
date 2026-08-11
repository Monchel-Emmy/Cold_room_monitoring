import { Schema, model, Document, Types } from 'mongoose';

export interface ISensorReading extends Document {
  chamberId: Types.ObjectId;
  coldRoomId: Types.ObjectId;
  hospitalId: Types.ObjectId;
  temperature: number;
  humidity: number;
  timestamp: Date;
}

const schema = new Schema<ISensorReading>({
  chamberId:  { type: Schema.Types.ObjectId, ref: 'Chamber', required: true },
  coldRoomId: { type: Schema.Types.ObjectId, ref: 'ColdRoom', required: true },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
  temperature:{ type: Number, required: true },
  humidity:   { type: Number, required: true },
  timestamp:  { type: Date, default: Date.now },
});

// Index for fast latest-reading lookups
schema.index({ chamberId: 1, timestamp: -1 });

export const SensorReading = model<ISensorReading>('SensorReading', schema);
