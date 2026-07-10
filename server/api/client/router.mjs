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
import {
  handleJobStart,
  handleJobUpdate,
  handleJobComplete,
  handleJobCancel,
  handleJobActive,
  handleJobHistory,
} from './jobHandlers.mjs';

export const clientApiRouter = Router();

clientApiRouter.post('/auth/login', handleClientLogin);
clientApiRouter.post('/auth/logout', requireClientAuth, handleClientLogout);
clientApiRouter.get('/auth/me', requireClientAuth, handleClientMe);
clientApiRouter.post('/telemetry', requireClientAuth, handleClientTelemetry);
clientApiRouter.post('/sync', requireClientAuth, handleClientSync);
clientApiRouter.get('/updates', handleClientUpdates);

clientApiRouter.post('/jobs/start', requireClientAuth, handleJobStart);
clientApiRouter.post('/jobs/update', requireClientAuth, handleJobUpdate);
clientApiRouter.post('/jobs/complete', requireClientAuth, handleJobComplete);
clientApiRouter.post('/jobs/cancel', requireClientAuth, handleJobCancel);
clientApiRouter.get('/jobs/active', requireClientAuth, handleJobActive);
clientApiRouter.get('/jobs/history', requireClientAuth, handleJobHistory);
