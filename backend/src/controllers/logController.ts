// backend/src/controllers/logController.ts

import { Request, Response, NextFunction } from 'express';
import { IPInvestigationService } from '../services/ipInvestigationService';
import { logger } from '../utils/logger';

const ipService = new IPInvestigationService();

/**
 * Menerima satu atau beberapa entri log untuk diproses.
 * Body request bisa berupa satu objek atau array objek.
 * Contoh Body: { "monitoredIP": "YOUR_IP", "sourceIP": "ATTACKER_IP", "logLine": "sshd[1234]: Failed password for invalid user root from 123.45.67.89 port 22" }
 * atau array: [ { ... }, { ... } ]
 */
export const ingestLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logEntries = Array.isArray(req.body) ? req.body : [req.body];

    if (logEntries.length === 0) {
      res.status(400).json({ error: 'Log entry/entries are required' });
      return;
    }

    // Proses setiap log secara asinkron tanpa menunggu selesai
    logEntries.forEach(entry => {
      const { monitoredIP, sourceIP, logLine } = entry;
      if (monitoredIP && sourceIP && logLine) {
        ipService.processLogEntry({ monitoredIP, sourceIP, logLine }).catch(err => {
          logger.error(`Error processing log entry for ${monitoredIP}`, err);
        });
      } else {
        logger.warn('Skipping malformed log entry:', entry);
      }
    });

    // Kirim respons 202 Accepted, menandakan permintaan diterima untuk diproses
    res.status(202).json({ message: 'Log entries accepted for processing.' });

  } catch (error) {
    logger.error('Log ingestion error:', error);
    next(error);
  }
};