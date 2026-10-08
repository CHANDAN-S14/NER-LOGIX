import { Router } from 'express';
import { riskAnalysis, routeAnalysis } from '../controllers/aiController.js';

const router = Router();

router.post('/risk-analysis', riskAnalysis);
router.post('/route-analysis', routeAnalysis);

export default router;
