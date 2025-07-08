import { Router } from 'express';
import { 
  startCommuteMode, 
  stopCommuteMode, 
  getNearbyUsers, 
  sendWave 
} from '../controllers/commute';

const router = Router();

router.post('/start', startCommuteMode);
router.post('/stop', stopCommuteMode);
router.get('/nearby', getNearbyUsers);
router.post('/wave', sendWave);

export default router; 