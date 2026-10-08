import Road, { ROAD_STATUSES, ROAD_RISK_LEVELS } from '../models/Road.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';
import { assertEnum } from '../utils/validation.js';

function getIo(req) {
  return req.app.get('io');
}

/**
 * GET /api/roads
 */
export const listRoads = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.riskLevel) filter.riskLevel = req.query.riskLevel;

  const roads = await Road.find(filter).sort({ lastUpdated: -1 });
  const data = roads.map((r) => r.toPublicJSON());
  res.json({ roads: data, count: data.length });
});

/**
 * GET /api/roads/blocked
 */
export const listBlockedRoads = asyncHandler(async (req, res) => {
  const roads = await Road.find({ status: 'blocked' }).sort({ lastUpdated: -1 });
  const data = roads.map((r) => r.toPublicJSON());
  res.json({ roads: data, blockages: data, count: data.length });
});

/**
 * PATCH /api/roads/:id/status — ADMIN or OPERATOR
 * Confirmed road blockage is separate from SACHET potential hazards.
 */
export const updateRoadStatus = asyncHandler(async (req, res) => {
  const road = await Road.findById(req.params.id);
  if (!road) throw new AppError('Road not found', 404);

  const prevStatus = road.status;

  if (req.body.status != null) {
    road.status = assertEnum(
      String(req.body.status).toLowerCase(),
      ROAD_STATUSES,
      'status'
    );
  }

  if (req.body.riskLevel != null) {
    road.riskLevel = assertEnum(
      String(req.body.riskLevel).toLowerCase(),
      ROAD_RISK_LEVELS,
      'riskLevel'
    );
  }

  if (req.body.blockageReason !== undefined) {
    road.blockageReason = req.body.blockageReason;
  }

  if (req.body.roadName) {
    road.roadName = String(req.body.roadName).trim();
  }

  road.lastUpdated = new Date();
  await road.save();

  const payload = road.toPublicJSON();
  const io = getIo(req);

  if (io) {
    io.emit('road:updated', payload);
    if (road.status === 'blocked' && prevStatus !== 'blocked') {
      io.emit('road:blocked', payload);
    }
    io.emit('live:update', { type: 'road:updated', data: payload });
  }

  res.json(payload);
});

export default { listRoads, listBlockedRoads, updateRoadStatus };
