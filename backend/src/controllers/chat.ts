import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';

// Mock data - in real app, this would be in a database
const messages: any[] = [];
const matches: any[] = [];

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { matchId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // In real app, verify user is part of this match
    const matchMessages = messages.filter(msg => msg.matchId === matchId);
    
    res.json({
      messages: matchMessages.map(msg => ({
        id: msg.id,
        text: msg.text,
        senderId: msg.senderId,
        timestamp: msg.timestamp,
      }))
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { matchId } = req.params;
    const { text } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const newMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      matchId,
      text: text.trim(),
      senderId: userId,
      timestamp: new Date(),
    };

    messages.push(newMessage);

    res.status(201).json({
      message: {
        id: newMessage.id,
        text: newMessage.text,
        senderId: newMessage.senderId,
        timestamp: newMessage.timestamp,
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMatches = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // In real app, this would query the database for user's matches
    const userMatches = matches.filter(match => 
      match.user1Id === userId || match.user2Id === userId
    );

    const matchesWithDetails = userMatches.map(match => {
      const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
      const lastMessage = messages
        .filter(msg => msg.matchId === match.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      return {
        id: match.id,
        matchedUser: {
          id: otherUserId,
          name: `User ${otherUserId.slice(-4)}`,
          age: 25 + Math.floor(Math.random() * 15),
          route: match.route,
          lastSeen: new Date().toISOString(),
        },
        matchedAt: match.matchedAt,
        lastMessage: lastMessage ? {
          text: lastMessage.text,
          timestamp: lastMessage.timestamp,
          isFromMe: lastMessage.senderId === userId,
        } : undefined,
        unreadCount: Math.floor(Math.random() * 5), // Mock unread count
      };
    });

    res.json({ matches: matchesWithDetails });
  } catch (error) {
    console.error('Error getting matches:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const unmatch = async (req: AuthRequest, res: Response) => {
  try {
    const { matchId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // In real app, verify user is part of this match and remove it
    const matchIndex = matches.findIndex(match => 
      match.id === matchId && (match.user1Id === userId || match.user2Id === userId)
    );

    if (matchIndex === -1) {
      return res.status(404).json({ message: 'Match not found' });
    }

    matches.splice(matchIndex, 1);

    res.json({ message: 'Unmatched successfully' });
  } catch (error) {
    console.error('Error unmatching:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper function to create a match (called when wave is accepted)
export const createMatch = (user1Id: string, user2Id: string, route: string) => {
  const newMatch = {
    id: `match-${Date.now()}-${Math.random()}`,
    user1Id,
    user2Id,
    route,
    matchedAt: new Date().toISOString(),
  };
  
  matches.push(newMatch);
  return newMatch;
}; 