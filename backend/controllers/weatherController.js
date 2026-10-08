import * as weatherService from '../services/weatherService.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';

/**
 * GET /api/weather?lat=&lng=  (also accepts lon)
 */
export const getWeather = asyncHandler(async (req, res) => {
  const lat = req.query.lat ?? req.query.latitude;
  const lng = req.query.lng ?? req.query.lon ?? req.query.longitude;

  if (lat == null || lng == null) {
    throw new AppError('Query params lat and lng (or lon) are required', 400);
  }

  const data = await weatherService.getWeather(lat, lng);
  res.json(data);
});

export default { getWeather };
