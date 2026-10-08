import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';

import { connectDB, isDbConnected } from './config/db.js';
import { checkAiHealth } from './services/aiService.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

import incidentRoutes from './routes/incidentRoutes.js';
import roadRoutes from './routes/roadRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import routeRoutes from './routes/routeRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import sachetRoutes from './routes/sachetRoutes.js';
import liveRoutes from './routes/liveRoutes.js';

const PORT = Number(process.env.PORT) || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * GET /api/status — real DB + AI connectivity checks
 */
app.get('/api/status', async (req, res) => {
  const dbOk = isDbConnected();
  let aiOk = false;
  try {
    aiOk = await checkAiHealth();
  } catch {
    aiOk = false;
  }

  res.json({
    status: 'online',
    service: 'NER-LOGIX API',
    database: dbOk ? 'connected' : 'disconnected',
    aiService: aiOk ? 'available' : 'unavailable',
    // Frontend compatibility (AppDataContext probes these)
    ai: aiOk ? 'online' : 'offline',
    services: {
      database: dbOk ? 'online' : 'offline',
      ai: aiOk ? 'online' : 'offline',
    },
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/incidents', incidentRoutes);
app.use('/api/roads', roadRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sachet', sachetRoutes);
app.use('/api/live', liveRoutes);
// Frontend api.js uses /api/status/live
app.use('/api/status/live', liveRoutes);

app.get('/', (req, res) => {
  res.json({
    service: 'NER-LOGIX API',
    docs: 'See backend/README.md',
    status: '/api/status',
  });
});

app.use(notFound);
app.use(errorHandler);

io.on('connection', (socket) => {
  console.log(`[socket] connected ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[socket] disconnected ${socket.id}`);
  });
});

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-in-production') {
    console.warn('[warn] JWT_SECRET is weak or default — set a strong secret for production');
  }

  try {
    await connectDB();
  } catch (err) {
    console.error('[fatal] MongoDB connection failed:', err.message);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`NER-LOGIX API listening on http://localhost:${PORT}`);
    console.log(`CORS origin: ${CORS_ORIGIN}`);
    console.log(`AI service: ${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}`);
  });
}

start();

export { app, server, io };