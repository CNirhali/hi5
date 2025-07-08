import { Request, Response } from 'express';

// Mock data storage (in real app, this would be in a database)
const activeUsers = new Map<string, any>();

export const startCommuteMode = (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  // Mock: Add user to active commuters
  activeUsers.set(userId, {
    userId,
    isActive: true,
    lastSeen: new Date(),
    route: '6 Train', // Mock route
    location: { lat: 40.7589, lng: -73.9851 } // Mock location
  });

  return res.status(200).json({ 
    message: 'Commute mode activated',
    user: activeUsers.get(userId)
  });
};

export const stopCommuteMode = (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  // Mock: Remove user from active commuters
  activeUsers.delete(userId);

  return res.status(200).json({ 
    message: 'Commute mode deactivated'
  });
};

export const getNearbyUsers = (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  // Mock: Return nearby users (excluding the requesting user)
  const nearbyUsers = Array.from(activeUsers.values())
    .filter(user => user.userId !== userId)
    .map(user => ({
      id: user.userId,
      name: 'Commuter', // Mock name
      age: 25, // Mock age
      route: user.route,
      distance: '50m' // Mock distance
    }));

  return res.status(200).json({ 
    users: nearbyUsers,
    count: nearbyUsers.length
  });
};

export const sendWave = (req: Request, res: Response) => {
  const { fromUserId, toUserId } = req.body;
  if (!fromUserId || !toUserId) {
    return res.status(400).json({ error: 'Both user IDs required' });
  }

  // Mock: Send wave
  return res.status(200).json({ 
    message: 'Wave sent successfully',
    wave: {
      id: 'wave-123',
      fromUserId,
      toUserId,
      timestamp: new Date(),
      status: 'pending'
    }
  });
}; 