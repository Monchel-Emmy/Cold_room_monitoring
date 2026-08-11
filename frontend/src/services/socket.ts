import { io, Socket } from 'socket.io-client';
import { LiveReading } from '../types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', { transports: ['websocket', 'polling'] });
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
