import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cold-room-monitoring';
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB connected: ${MONGO_URI.replace(/:([^:@]+)@/, ':****@')}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    console.warn('⚠️  Server will still start — check your MONGODB_URI in .env');
  }
}

export const isConnected = () => mongoose.connection.readyState === 1;
export default mongoose;
