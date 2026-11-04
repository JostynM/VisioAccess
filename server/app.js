import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { readPage } from './reader.js';
import { ApiError } from './errors.js';

export function createApp({ reader = readPage } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use((req, res, next) => {
    res.set('X-Request-Id', randomUUID());
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'visioaccess' }));
  app.use('/api/web-reader', rateLimit({ windowMs: 60000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMIT', message: 'Demasiadas consultas. Espera un minuto.' } }) }));
  app.use(express.json({ limit: '4kb' }));
  let activeRequests = 0;
  app.post('/api/web-reader', async (req, res, next) => {
    try {
      if (!req.is('application/json')) throw new ApiError(415, 'INVALID_CONTENT_TYPE', 'Envía la solicitud como JSON.');
      if (activeRequests >= 4) throw new ApiError(503, 'SERVICE_BUSY', 'El servicio está ocupado. Intenta nuevamente en unos segundos.');
      activeRequests++;
      try { res.json(await reader(req.body?.url)); } finally { activeRequests--; }
    } catch (error) { next(error); }
  });
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } }));
  app.use((error, _req, res, _next) => {
    const known = error instanceof ApiError;
    const status = known ? error.status : error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
    if (status === 500) console.error(JSON.stringify({ requestId: res.get('X-Request-Id'), code: 'INTERNAL_ERROR' }));
    res.status(status).json({ error: { code: known ? error.code : status === 500 ? 'INTERNAL_ERROR' : 'INVALID_BODY',
      message: known ? error.message : status === 500 ? 'No se pudo procesar la solicitud.' : 'El cuerpo JSON no es válido o es demasiado grande.' } });
  });
  return app;
}
export default createApp();
