// backend/src/services/ipInvestigationService.ts

import { ExternalAPIService } from './externalAPIService';
import IP, { IIP, IDetectedActivity } from '../models/IP';
import { logger } from '../utils/logger';

interface LogPayload {
  monitoredIP: string;
  sourceIP: string;
  logLine: string;
  type?: IDetectedActivity['type'];
}

export class IPInvestigationService {
  private externalAPIService: ExternalAPIService;
  private investigationDebounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.externalAPIService = new ExternalAPIService();
  }

  // ===== FUNGSI INVESTIGATEIP YANG DIPERBARUI & LEBIH TANGGUH =====
  async investigateIP(address: string): Promise<IIP> {
    try {
      logger.info(`[DEBOUNCED] Starting investigation for IP: ${address}`);
      
      // === KUNCI PERBAIKAN: Gunakan findOneAndUpdate dengan upsert ===
      // Ini akan menemukan dokumen ATAU membuat yang baru jika tidak ada.
      // Ini secara efektif menghilangkan race condition.
      let ip = await IP.findOneAndUpdate(
        { address: address },
        // $setOnInsert: hanya akan mengisi data ini saat dokumen pertama kali dibuat
        { $setOnInsert: { address: address, status: 'MONITORING', monitoring: { enabled: true } } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Jika dokumen baru saja dibuat, beberapa field mungkin kosong. Kita isi di sini.
      if (!ip.geoLocation || !ip.geoLocation.country) {
          const geoData = await this.externalAPIService.getGeoIPData(address);
          ip.geoLocation = {
              country: geoData?.country || 'Unknown',
              city: geoData?.city || 'Unknown',
              coordinates: [geoData?.lon || 0, geoData?.lat || 0],
              isp: geoData?.isp || 'Unknown',
              asn: geoData?.as?.split(' ')[0] || 'Unknown'
          };
      }

      // Sekarang kita bisa dengan aman mengambil aktivitas
      const activities = ip.detectedActivities;
      const aiAnalysis = await this.externalAPIService.analyzeWithLLM(activities, address);
      
      ip.aiAnalysis = {
        riskScore: aiAnalysis.riskScore,
        summary: aiAnalysis.summary,
        findings: aiAnalysis.findings,
        recommendations: aiAnalysis.recommendations,
        lastAnalysis: new Date()
      };
      
      if (aiAnalysis.riskScore >= 80) { ip.status = 'BLOCKED'; }
      else { ip.status = 'MONITORING'; }

      // Simpan semua pembaruan (termasuk geolokasi jika baru)
      await ip.save();
      
      logger.info(`[DEBOUNCED] Investigation complete for IP: ${address}. Risk Score: ${ip.aiAnalysis.riskScore}`);
      return ip;
    } catch (error) {
      logger.error(`[DEBOUNCED] Error investigating IP ${address}:`, error);
      throw error;
    }
  }
  
  // Fungsi processLogEntry tetap sama, logikanya sudah benar
  async processLogEntry(payload: LogPayload): Promise<void> {
    const { monitoredIP, sourceIP, logLine, type } = payload;

    if (!type) {
      logger.warn(`Skipping log for ${monitoredIP} because 'type' is missing in payload.`);
      return;
    }

    const ip = await IP.findOneAndUpdate(
        { address: monitoredIP },
        { $setOnInsert: { address: monitoredIP, monitoring: { enabled: true } } },
        { upsert: true, new: true }
    );
    
    if (!ip.monitoring?.enabled) {
      logger.debug(`Skipping log for unmonitored IP: ${monitoredIP}`);
      return;
    }

    const newActivity: IDetectedActivity = {
      timestamp: new Date(),
      type: type,
      sourceIP: sourceIP,
      details: logLine
    };

    await IP.updateOne(
        { address: monitoredIP },
        { 
            $push: { detectedActivities: { $each: [newActivity], $slice: -200 } },
            $set: { lastSeen: new Date() }
        }
    );
    
    logger.info(`Logged activity for ${monitoredIP} from ${sourceIP} [Type: ${type}]`);

    if (this.investigationDebounceTimers.has(monitoredIP)) {
      clearTimeout(this.investigationDebounceTimers.get(monitoredIP)!);
    }

    const newTimer = setTimeout(async () => {
      try {
        await this.investigateIP(monitoredIP);
      } catch (err) { /* error sudah di-log */ } 
      finally {
        this.investigationDebounceTimers.delete(monitoredIP);
      }
    }, 15000);

    this.investigationDebounceTimers.set(monitoredIP, newTimer);
  }

  // startMonitoring dan stopMonitoring tetap sama
  async startMonitoring(address: string): Promise<IIP> {
    // Kita bisa sederhanakan ini untuk hanya memanggil investigateIP,
    // karena investigateIP sekarang bisa membuat dokumen baru.
    return this.investigateIP(address);
  }

  async stopMonitoring(address: string): Promise<IIP> {
    const ip = await IP.findOneAndUpdate(
      { address },
      { $set: { 'monitoring.enabled': false } },
      { new: true }
    );
    if (!ip) throw new Error('IP not found to stop monitoring');
    return ip;
  }
}