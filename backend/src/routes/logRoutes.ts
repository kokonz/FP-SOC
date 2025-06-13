// backend/src/routes/logRoutes.ts

import express from 'express';
import * as logController from '../controllers/logController';

const router = express.Router();

// Rute untuk menerima (ingest) log
router.post('/ingest', logController.ingestLog);

export const logRoutes = router;