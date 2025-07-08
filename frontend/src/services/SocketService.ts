import io, { Socket } from 'socket.io-client';

export interface WaveData {
  id: string;
  fromUserId: string;
  toUserId: string;
  timestamp: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface NearbyUser {
  id: string;
  name: string;
  age: number;
  route: string;
  distance: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.socket = io('http://localhost:4000', {
          auth: {
            token,
          },
          transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          console.log('Socket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        });

        this.socket.on('disconnect', () => {
          console.log('Socket disconnected');
          this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          this.isConnected = false;
          resolve(false);
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log('Socket reconnected after', attemptNumber, 'attempts');
          this.isConnected = true;
        });

        this.socket.on('reconnect_error', () => {
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
          }
        });

      } catch (error) {
        console.error('Error creating socket connection:', error);
        resolve(false);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinRoute(routeId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-route', { routeId });
    }
  }

  leaveRoute(routeId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-route', { routeId });
    }
  }

  updateLocation(location: { latitude: number; longitude: number }): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('update-location', location);
    }
  }

  sendWave(toUserId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('send-wave', { toUserId });
    }
  }

  respondToWave(waveId: string, response: 'accept' | 'reject'): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('respond-wave', { waveId, response });
    }
  }

  // Event listeners
  onUserNearby(callback: (user: NearbyUser) => void): void {
    if (this.socket) {
      this.socket.on('user:nearby', callback);
    }
  }

  onUserLeft(callback: (userId: string) => void): void {
    if (this.socket) {
      this.socket.on('user:left', callback);
    }
  }

  onWaveReceived(callback: (wave: WaveData) => void): void {
    if (this.socket) {
      this.socket.on('wave:received', callback);
    }
  }

  onWaveResponded(callback: (wave: WaveData) => void): void {
    if (this.socket) {
      this.socket.on('wave:responded', callback);
    }
  }

  onMatch(callback: (matchData: { userId: string; user: NearbyUser }) => void): void {
    if (this.socket) {
      this.socket.on('match', callback);
    }
  }

  // Remove event listeners
  offUserNearby(): void {
    if (this.socket) {
      this.socket.off('user:nearby');
    }
  }

  offUserLeft(): void {
    if (this.socket) {
      this.socket.off('user:left');
    }
  }

  offWaveReceived(): void {
    if (this.socket) {
      this.socket.off('wave:received');
    }
  }

  offWaveResponded(): void {
    if (this.socket) {
      this.socket.off('wave:responded');
    }
  }

  offMatch(): void {
    if (this.socket) {
      this.socket.off('match');
    }
  }

  // Utility methods
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

export default new SocketService(); 