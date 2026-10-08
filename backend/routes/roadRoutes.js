import { Router } from 'express';
import {
  listRoads,
  listBlockedRoads,
  updateRoadStatus,
} from '../controllers/roadController.js';

const router = Router();

router.get('/', listRoads);
router.get('/blocked', listBlockedRoads);
router.patch('/:id/status', updateRoadStatus);

export default router;