// backend/src/controllers/logController.ts

import { Request, Response, NextFunction } from 'express';
import { IPInvestigationService } from '../services/ipInvestigationService';
import { logger } from '../utils/logger';

const ipService = new IPInvestigationService();

export const ingestLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // ================== TAMBAHKAN BARIS INI UNTUK DEBUGGING ==================
    console.log("--- RAW PAYLOAD RECEIVED ---");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("----------------------------");
    // =======================================================================

    const logEntries = Array.isArray(req.body) ? req.body : [req.body];

    if (logEntries.length === 0 || Object.keys(logEntries[0]).length === 0) {
      // Tambahkan pengecekan untuk body kosong
      logger.error('Received an empty or malformed log payload.', { body: req.body });
      res.status(400).json({ error: 'Malformed or empty log payload' });
      return;
    }

    logEntries.forEach(entry => {
      // Kita tidak lagi memvalidasi di sini karena service sudah melakukannya
      ipService.processLogEntry(entry).catch(err => {
        logger.error(`Error processing log entry for ${entry.monitoredIP}`, err);
      });
    });

    res.status(202).json({ message: 'Log entries accepted for processing.' });

  } catch (error) {
    logger.error('Log ingestion error:', error);
    next(error);
  }
};