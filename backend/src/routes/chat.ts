import express from 'express';
import { getMessages, sendMessage, getMatches, unmatch } from '../controllers/chat';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all chat routes
router.use(authenticateToken);

// Chat routes
router.get('/:matchId/messages', getMessages);
router.post('/:matchId/messages', sendMessage);

// Match routes
router.get('/matches', getMatches);
router.delete('/matches/:matchId', unmatch);

export default router; 