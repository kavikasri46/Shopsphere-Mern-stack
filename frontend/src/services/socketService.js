import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    const resolveSocketUrl = () => {
      if (import.meta.env.VITE_SOCKET_URL?.trim()) {
        return import.meta.env.VITE_SOCKET_URL.trim().replace(/\/+$/, '');
      }
      if (import.meta.env.VITE_API_URL?.trim()) {
        return import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '').replace(/\/api$/, '');
      }
      if (import.meta.env.DEV) {
        return 'http://localhost:5000';
      }
      return typeof window !== 'undefined' ? window.location.origin : '';
    };

    const socketURL = resolveSocketUrl();

    this.socket = io(socketURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 3,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('✓ Connected to Socket.IO server');
    });

    this.socket.on('disconnect', () => {
      console.log('✗ Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export default new SocketService();
