import Vehicle from '../models/Vehicle.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';
import { assertValidCoords } from '../utils/validation.js';

function getIo(req) {
  return req.app.get('io');
}

/**
 * GET /api/vehicles
 */
export const listVehicles = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.find().sort({ vehicleId: 1 });
  const data = vehicles.map((v) => v.toPublicJSON());
  res.json({
    vehicles: data,
    count: data.length,
    sources: { vehicles: 'demo' },
    note: 'Demo fleet — Hackathon simulation. Not live telemetry.',
  });
});

/**
 * GET /api/vehicles/:vehicleId
 */
export const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({
    vehicleId: String(req.params.vehicleId).toUpperCase(),
  });
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  res.json(vehicle.toPublicJSON());
});

/**
 * PATCH /api/vehicles/:vehicleId/location
 * Body: latitude, longitude, heading, status
 */
export const updateVehicleLocation = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({
    vehicleId: String(req.params.vehicleId).toUpperCase(),
  });
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  const lat = req.body.latitude ?? req.body.lat;
  const lng = req.body.longitude ?? req.body.lng ?? req.body.lon;

  if (lat != null || lng != null) {
    const coords = assertValidCoords(
      lat ?? vehicle.latitude,
      lng ?? vehicle.longitude,
      'Vehicle location'
    );
    vehicle.latitude = coords.lat;
    vehicle.longitude = coords.lng;
  }

  if (req.body.heading != null) {
    const heading = Number(req.body.heading);
    if (!Number.isFinite(heading) || heading < 0 || heading > 360) {
      throw new AppError('heading must be between 0 and 360', 400);
    }
    vehicle.heading = heading;
  }

  if (req.body.status != null) {
    vehicle.status = String(req.body.status).trim();
  }

  vehicle.lastUpdated = new Date();
  await vehicle.save();

  const payload = vehicle.toPublicJSON();
  const io = getIo(req);
  if (io) {
    io.emit('vehicle:location', payload);
    io.emit('live:update', { type: 'vehicle:location', data: payload });
  }

  res.json(payload);
});

export default { listVehicles, getVehicle, updateVehicleLocation };
