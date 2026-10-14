import { io, Socket } from 'socket.io-client';
import { LiveReading, PowerReading } from '../types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const target = import.meta.env.VITE_API_URL || '/';
    socket = io(target, { transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export type LiveReadingHandler = (readings: LiveReading[]) => void;

export function subscribeToReadings(handler: LiveReadingHandler) {
  const s = getSocket();
  s.on('sensor_reading', handler);
  s.on('initial_readings', handler);
  return () => {
    s.off('sensor_reading', handler);
    s.off('initial_readings', handler);
  };
}

export type PowerReadingHandler = (readings: PowerReading[]) => void;

export function subscribeToPower(handler: PowerReadingHandler) {
  const s = getSocket();
  s.on('power_reading', handler);
  return () => { s.off('power_reading', handler); };
}
