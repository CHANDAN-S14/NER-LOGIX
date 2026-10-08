import { Router } from 'express';
import { planRoute, analyzeRoute } from '../controllers/routeController.js';

const router = Router();

router.post('/plan', planRoute);
router.post('/analyze', analyzeRoute);

export default router;
