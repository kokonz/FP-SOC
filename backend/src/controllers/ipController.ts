import { Request, Response, NextFunction } from 'express';
import { IPInvestigationService } from '../services/ipInvestigationService';
import IP from '../models/IP';
import { logger } from '../utils/logger';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const ipService = new IPInvestigationService();

export const investigateIP: AsyncRequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { address } = req.body;
    
    if (!address) {
      res.status(400).json({ error: 'IP address is required' });
      return;
    }

    const result = await ipService.investigateIP(address);
    res.json(result);
  } catch (error) {
    logger.error('Investigation error:', error);
    next(error);
  }
};

export const startMonitoring: AsyncRequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { address, interval } = req.body;
    
    if (!address) {
      res.status(400).json({ error: 'IP address is required' });
      return;
    }

    const result = await ipService.startMonitoring(address, interval);
    res.json(result);
  } catch (error) {
    logger.error('Monitoring start error:', error);
    next(error);
  }
};

export const stopMonitoring: AsyncRequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { address } = req.body;
    
    if (!address) {
      res.status(400).json({ error: 'IP address is required' });
      return;
    }

    const result = await ipService.stopMonitoring(address);
    res.json(result);
  } catch (error) {
    logger.error('Monitoring stop error:', error);
    next(error);
  }
};

export const getMonitoredIPs: AsyncRequestHandler = async (_req, res, next): Promise<void> => {
  try {
    const ips = await IP.find({ 'monitoring.enabled': true });
    res.json(ips);
  } catch (error) {
    logger.error('Get monitored IPs error:', error);
    next(error);
  }
};
