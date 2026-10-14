import { Schema, model, Document, Types } from 'mongoose';

export interface IPowerReading extends Document {
  coldRoomId: Types.ObjectId;
  hospitalId: Types.ObjectId;
  voltage: number;    // V
  current: number;    // A
  power: number;      // W
  energyKwh: number;  // cumulative kWh from the device meter
  alarm: boolean;
  timestamp: Date;
}

const schema = new Schema<IPowerReading>({
  coldRoomId: { type: Schema.Types.ObjectId, ref: 'ColdRoom', required: true },
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
  voltage:    { type: Number, default: 0 },
  current:    { type: Number, default: 0 },
  power:      { type: Number, default: 0 },
  energyKwh:  { type: Number, default: 0 },
  alarm:      { type: Boolean, default: false },
  timestamp:  { type: Date, default: Date.now },
});

// Index for fast latest-reading lookups
schema.index({ coldRoomId: 1, timestamp: -1 });

export const PowerReading = model<IPowerReading>('PowerReading', schema);
