import { Router } from 'express';
import { requireClientAuth } from './middleware.mjs';
import {
  handleClientLogin,
  handleClientLogout,
  handleClientMe,
  handleClientTelemetry,
  handleClientSync,
  handleClientUpdates,
} from './handlers.mjs';

export const clientApiRouter = Router();

clientApiRouter.post('/auth/login', handleClientLogin);
clientApiRouter.post('/auth/logout', requireClientAuth, handleClientLogout);
clientApiRouter.get('/auth/me', requireClientAuth, handleClientMe);
clientApiRouter.post('/telemetry', requireClientAuth, handleClientTelemetry);
clientApiRouter.post('/sync', requireClientAuth, handleClientSync);
clientApiRouter.get('/updates', handleClientUpdates);
