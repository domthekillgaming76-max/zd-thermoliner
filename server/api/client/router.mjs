import { Router } from 'express';
import { requireClientAuth, requireClientRole } from './middleware.mjs';
import {
  handleClientLogin,
  handleClientLogout,
  handleClientMe,
  handleClientTelemetry,
  handleClientSync,
  handleClientUpdates,
  handleClientHealth,
} from './handlers.mjs';
import { handleTachographTicket, handleTachographStatus } from './tachographHandlers.mjs';
import { handleDispatchPending, handleDispatchClaim, handleDispatchComplete } from './dispatchHandlers.mjs';
import {
  handleJobStart,
  handleJobUpdate,
  handleJobComplete,
  handleJobCancel,
  handleJobActive,
  handleJobHistory,
} from './jobHandlers.mjs';

export const clientApiRouter = Router();

const CHAUFFEUR_ACCESS = ['chauffeur', 'admin'];

clientApiRouter.post('/auth/login', handleClientLogin);
clientApiRouter.post('/auth/logout', requireClientAuth, handleClientLogout);
clientApiRouter.get('/auth/me', requireClientAuth, handleClientMe);
clientApiRouter.post('/telemetry', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleClientTelemetry);
clientApiRouter.post('/sync', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleClientSync);
clientApiRouter.get('/updates', handleClientUpdates);
clientApiRouter.get('/health', handleClientHealth);
clientApiRouter.post('/tachograph/ticket', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleTachographTicket);
clientApiRouter.get('/tachograph/status', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleTachographStatus);

clientApiRouter.post('/jobs/start', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleJobStart);
clientApiRouter.post('/jobs/update', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleJobUpdate);
clientApiRouter.post('/jobs/complete', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleJobComplete);
clientApiRouter.post('/jobs/cancel', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleJobCancel);
clientApiRouter.get('/jobs/active', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleJobActive);
clientApiRouter.get('/jobs/history', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleJobHistory);
clientApiRouter.get('/dispatch/pending', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleDispatchPending);
clientApiRouter.post('/dispatch/:id/claim', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleDispatchClaim);
clientApiRouter.post('/dispatch/:id/complete', requireClientAuth, requireClientRole(CHAUFFEUR_ACCESS), handleDispatchComplete);
