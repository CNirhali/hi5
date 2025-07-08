import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface User {
  id: string;
  socketId: string;
  routeId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  isActive: boolean;
}

class SocketManager {
  private io: SocketIOServer | null = null;
  private users = new Map<string, User>();
  private routeUsers = new Map<string, Set<string>>(); // routeId -> Set of userIds

  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Handle user joining a route
      socket.on('join-route', (data: { routeId: string; userId: string }) => {
        this.handleJoinRoute(socket, data);
      });

      // Handle user leaving a route
      socket.on('leave-route', (data: { routeId: string; userId: string }) => {
        this.handleLeaveRoute(socket, data);
      });

      // Handle location updates
      socket.on('update-location', (data: { userId: string; location: { latitude: number; longitude: number } }) => {
        this.handleLocationUpdate(socket, data);
      });

      // Handle wave sending
      socket.on('send-wave', (data: { fromUserId: string; toUserId: string }) => {
        this.handleSendWave(socket, data);
      });

      // Handle wave responses
      socket.on('respond-wave', (data: { waveId: string; fromUserId: string; toUserId: string; response: 'accept' | 'reject' }) => {
        this.handleWaveResponse(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinRoute(socket: any, data: { routeId: string; userId: string }): void {
    const { routeId, userId } = data;
    
    // Add user to route
    if (!this.routeUsers.has(routeId)) {
      this.routeUsers.set(routeId, new Set());
    }
    this.routeUsers.get(routeId)!.add(userId);

    // Update user info
    this.users.set(userId, {
      id: userId,
      socketId: socket.id,
      routeId,
      isActive: true
    });

    // Join socket room
    socket.join(routeId);

    // Notify other users on the same route
    socket.to(routeId).emit('user:nearby', {
      id: userId,
      name: 'Commuter',
      age: 25,
      route: routeId,
      distance: '50m'
    });

    console.log(`User ${userId} joined route ${routeId}`);
  }

  private handleLeaveRoute(socket: any, data: { routeId: string; userId: string }): void {
    const { routeId, userId } = data;
    
    // Remove user from route
    const routeUserSet = this.routeUsers.get(routeId);
    if (routeUserSet) {
      routeUserSet.delete(userId);
      if (routeUserSet.size === 0) {
        this.routeUsers.delete(routeId);
      }
    }

    // Update user info
    const user = this.users.get(userId);
    if (user) {
      user.routeId = undefined;
      user.isActive = false;
    }

    // Leave socket room
    socket.leave(routeId);

    // Notify other users
    socket.to(routeId).emit('user:left', userId);

    console.log(`User ${userId} left route ${routeId}`);
  }

  private handleLocationUpdate(socket: any, data: { userId: string; location: { latitude: number; longitude: number } }): void {
    const { userId, location } = data;
    
    // Update user location
    const user = this.users.get(userId);
    if (user) {
      user.location = location;
    }

    // Broadcast location update to users on the same route
    if (user?.routeId) {
      socket.to(user.routeId).emit('user:location-update', {
        userId,
        location
      });
    }
  }

  private handleSendWave(socket: any, data: { fromUserId: string; toUserId: string }): void {
    const { fromUserId, toUserId } = data;
    
    // Find target user's socket
    const targetUser = this.users.get(toUserId);
    if (targetUser && targetUser.isActive) {
      // Send wave to target user
      this.io?.to(targetUser.socketId).emit('wave:received', {
        id: `wave-${Date.now()}`,
        fromUserId,
        toUserId,
        timestamp: new Date(),
        status: 'pending'
      });

      console.log(`Wave sent from ${fromUserId} to ${toUserId}`);
    }
  }

  private handleWaveResponse(socket: any, data: { waveId: string; fromUserId: string; toUserId: string; response: 'accept' | 'reject' }): void {
    const { waveId, fromUserId, toUserId, response } = data;
    
    // Find sender's socket
    const senderUser = this.users.get(fromUserId);
    if (senderUser) {
      // Send response to sender
      this.io?.to(senderUser.socketId).emit('wave:responded', {
        id: waveId,
        fromUserId,
        toUserId,
        timestamp: new Date(),
        status: response === 'accept' ? 'accepted' : 'rejected'
      });

      // If accepted, create a match
      if (response === 'accept') {
        const receiverUser = this.users.get(toUserId);
        if (receiverUser) {
          // Notify both users of the match
          this.io?.to(senderUser.socketId).emit('match', {
            userId: toUserId,
            user: {
              id: toUserId,
              name: 'Commuter',
              age: 25,
              route: receiverUser.routeId || 'Unknown',
              distance: '50m'
            }
          });

          this.io?.to(receiverUser.socketId).emit('match', {
            userId: fromUserId,
            user: {
              id: fromUserId,
              name: 'Commuter',
              age: 25,
              route: senderUser.routeId || 'Unknown',
              distance: '50m'
            }
          });
        }
      }

      console.log(`Wave ${waveId} ${response}ed by ${toUserId}`);
    }
  }

  private handleDisconnect(socket: any): void {
    // Find user by socket ID
    let disconnectedUserId: string | undefined;
    for (const [userId, user] of this.users.entries()) {
      if (user.socketId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }

    if (disconnectedUserId) {
      const user = this.users.get(disconnectedUserId);
      if (user?.routeId) {
        // Notify other users on the same route
        socket.to(user.routeId).emit('user:left', disconnectedUserId);
        
        // Remove from route
        const routeUserSet = this.routeUsers.get(user.routeId);
        if (routeUserSet) {
          routeUserSet.delete(disconnectedUserId);
        }
      }

      // Remove user
      this.users.delete(disconnectedUserId);
      console.log(`User ${disconnectedUserId} disconnected`);
    }
  }

  // Utility methods
  getUsersOnRoute(routeId: string): User[] {
    const userIds = this.routeUsers.get(routeId);
    if (!userIds) return [];

    return Array.from(userIds)
      .map(userId => this.users.get(userId))
      .filter((user): user is User => user !== undefined);
  }

  getUserCount(): number {
    return this.users.size;
  }

  getRouteCount(): number {
    return this.routeUsers.size;
  }
}

export default new SocketManager(); 