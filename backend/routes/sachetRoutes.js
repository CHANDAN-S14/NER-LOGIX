import { Router } from 'express';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import * as sachetService from '../services/sachetService.js';

const router = Router();

/**
 * GET /api/sachet/alerts
 * Potential hazard alerts from SACHET/NDMA — NOT confirmed road blockages.
 */
router.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const data = await sachetService.getAlerts();
    if (data && Array.isArray(data.alerts)) {
      res.json({
        provider: data.provider || 'SACHET / NDMA',
        configured: data.configured !== false,
        alerts: data.alerts,
        count: data.alerts.length,
        type: 'potential_hazard',
        note: 'SACHET alerts are disaster/hazard advisories. They do not automatically confirm road blockages.',
        source: 'SACHET / NDMA',
      });
    } else {
      const alerts = Array.isArray(data) ? data : [];
      res.json({
        provider: 'SACHET / NDMA',
        configured: true,
        alerts,
        count: alerts.length,
        type: 'potential_hazard',
        note: 'SACHET alerts are disaster/hazard advisories. They do not automatically confirm road blockages.',
        source: 'SACHET / NDMA',
      });
    }
  })
);

export default router;
