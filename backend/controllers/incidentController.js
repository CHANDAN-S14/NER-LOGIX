import Incident, {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
} from '../models/Incident.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';
import {
  assertValidCoords,
  assertEnum,
} from '../utils/validation.js';

function getIo(req) {
  return req.app.get('io');
}

/**
 * GET /api/incidents — newest first
 */
export const listIncidents = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;

  const incidents = await Incident.find(filter)
    .sort({ createdAt: -1 })
    .populate('reportedBy', 'name email role')
    .lean();

  const data = incidents.map((i) => ({
    ...i,
    id: i._id.toString(),
    lat: i.latitude,
    lng: i.longitude,
    lon: i.longitude,
  }));

  res.json({ incidents: data, count: data.length });
});

/**
 * GET /api/incidents/:id
 */
export const getIncident = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id).populate(
    'reportedBy',
    'name email role'
  );
  if (!incident) throw new AppError('Incident not found', 404);
  res.json(incident.toPublicJSON());
});

/**
 * POST /api/incidents — no auth required; reportedBy is optional
 */
export const createIncident = asyncHandler(async (req, res) => {
  const { type, description, image, severity, status } = req.body;
  const lat = req.body.latitude ?? req.body.lat;
  const lng = req.body.longitude ?? req.body.lng ?? req.body.lon;

  if (!type || !description) {
    throw new AppError('type and description are required', 400);
  }

  const coords = assertValidCoords(lat, lng, 'Incident location');

  const sev = severity
    ? assertEnum(String(severity).toLowerCase(), INCIDENT_SEVERITIES, 'severity')
    : 'moderate';
  const st = status
    ? assertEnum(String(status).toLowerCase(), INCIDENT_STATUSES, 'status')
    : 'open';

  // Use authenticated user if available, otherwise leave reportedBy undefined
  const reportedBy = req.user?._id;

const incident = await Incident.create({
  type: String(type).trim(),
  description: String(description).trim(),
  latitude: coords.lat,
  longitude: coords.lng,
  image: image || null,

  // Authentication is not required for incident reporting.
  // Keep reportedBy null when there is no logged-in user.
  reportedBy: req.user?._id || null,

  severity: sev,
  status: st,
});

if (incident.reportedBy) {
  await incident.populate(
    'reportedBy',
    'name email role'
  );
}

  if (reportedBy) {
    await incident.populate('reportedBy', 'name email role');
  }
  const payload = incident.toPublicJSON();

  const io = getIo(req);
  if (io) {
    io.emit('incident:new', payload);
    io.emit('live:update', { type: 'incident:new', data: payload });
  }

  res.status(201).json(payload);
});

/**
 * PATCH /api/incidents/:id
 */
export const updateIncident = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) throw new AppError('Incident not found', 404);

  const { type, description, image } = req.body;

  if (type != null) incident.type = String(type).trim();
  if (description != null) incident.description = String(description).trim();
  if (image !== undefined) incident.image = image;

  if (req.body.severity != null) {
    incident.severity = assertEnum(
      String(req.body.severity).toLowerCase(),
      INCIDENT_SEVERITIES,
      'severity'
    );
  }
  if (req.body.status != null) {
    incident.status = assertEnum(
      String(req.body.status).toLowerCase(),
      INCIDENT_STATUSES,
      'status'
    );
  }

  const lat = req.body.latitude ?? req.body.lat;
  const lng = req.body.longitude ?? req.body.lng ?? req.body.lon;
  if (lat != null || lng != null) {
    const coords = assertValidCoords(
      lat ?? incident.latitude,
      lng ?? incident.longitude,
      'Incident location'
    );
    incident.latitude = coords.lat;
    incident.longitude = coords.lng;
  }

  await incident.save();
  if (incident.reportedBy) {
    await incident.populate('reportedBy', 'name email role');
  }
  const payload = incident.toPublicJSON();

  const io = getIo(req);
  if (io) {
    io.emit('incident:updated', payload);
    io.emit('live:update', { type: 'incident:updated', data: payload });
  }

  res.json(payload);
});

/**
 * DELETE /api/incidents/:id
 */
export const deleteIncident = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) throw new AppError('Incident not found', 404);

  const payload = incident.toPublicJSON();
  await incident.deleteOne();

  const io = getIo(req);
  if (io) {
    // Spec: emit incident:updated on delete
    io.emit('incident:updated', { ...payload, deleted: true });
    io.emit('live:update', { type: 'incident:deleted', data: payload });
  }

  res.json({ message: 'Incident deleted', id: payload.id });
});

export default {
  listIncidents,
  getIncident,
  createIncident,
  updateIncident,
  deleteIncident,
};