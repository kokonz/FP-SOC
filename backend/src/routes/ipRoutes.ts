import express from 'express';
import * as ipController from '../controllers/ipController';

const router = express.Router();

// Routes for IP investigation
router.post('/investigate', ipController.investigateIP);
router.post('/monitor/start', ipController.startMonitoring);
router.post('/monitor/stop', ipController.stopMonitoring);
router.get('/monitored', ipController.getMonitoredIPs);

export const ipRoutes = router;
