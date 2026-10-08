import { Router } from 'express';
import Incident from '../models/Incident.js';
import Road from '../models/Road.js';
import Vehicle from '../models/Vehicle.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import * as sachetService from '../services/sachetService.js';
import * as weatherService from '../services/weatherService.js';
import { extractCoords } from '../utils/validation.js';

const router = Router();

/**
 * GET /api/live  (also mounted at /api/status/live for frontend compatibility)
 * Returns currently available system data — no invented live values.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [incidents, roads, vehicles] = await Promise.all([
      Incident.find().sort({ createdAt: -1 }).limit(100).lean(),
      Road.find().sort({ lastUpdated: -1 }).lean(),
      Vehicle.find().sort({ vehicleId: 1 }),
    ]);

    let alerts = [];
    try {
      const sachetRes = await sachetService.getAlerts();
      alerts = Array.isArray(sachetRes) ? sachetRes : (sachetRes?.alerts || []);
    } catch {
      alerts = [];
    }

    let weather = null;
    const coords = extractCoords({
      lat: req.query.lat,
      lng: req.query.lng ?? req.query.lon,
    });
    if (coords) {
      try {
        weather = await weatherService.getWeather(coords.lat, coords.lng);
      } catch {
        weather = null;
      }
    }

    res.json({
      incidents: incidents.map((i) => ({
        ...i,
        id: i._id.toString(),
        lat: i.latitude,
        lng: i.longitude,
        lon: i.longitude,
      })),
      roads: roads.map((r) => ({
        ...r,
        id: r._id.toString(),
        name: r.roadName,
      })),
      vehicles: vehicles.map((v) => v.toPublicJSON()),
      alerts,
      weather,
      risk: null,
      sources: {
        vehicles: 'demo',
        weather: weather ? 'live' : null,
        alerts: alerts.length ? 'live' : 'unavailable',
        roads: roads.some((r) => r.source?.includes?.('Demo') || r.mode?.includes?.('Hackathon'))
          ? 'demo'
          : 'database',
        incidents: 'database',
      },
      note: 'Vehicles are demo fleet (Hackathon simulation). Weather and SACHET alerts are live when available. Risk is null until AI analysis is requested.',
    });
  })
);

export default router;
