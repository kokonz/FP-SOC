// backend/src/services/ipInvestigationService.ts

import { ExternalAPIService } from './externalAPIService';
import IP, { IIP, IDetectedActivity } from '../models/IP';
import { logger } from '../utils/logger';

// Definisikan tipe untuk payload log
interface LogPayload {
  monitoredIP: string;
  sourceIP: string;
  logLine: string;
}

export class IPInvestigationService {
  private externalAPIService: ExternalAPIService;
  private investigationQueue: Map<string, boolean> = new Map();

  constructor() {
    this.externalAPIService = new ExternalAPIService();
  }

  // Fungsi ini sekarang menjadi pemicu analisis AI, bukan pengumpul data utama
  async investigateIP(address: string): Promise<IIP> {
    try {
      logger.info(`Starting investigation for IP: ${address}`);
      
      let ip = await IP.findOne({ address });
      if (!ip) {
        // Jika IP belum ada, buat entri dasar
        const geoData = await this.externalAPIService.getGeoIPData(address);
        ip = await IP.create({
          address,
          status: 'MONITORING',
          monitoring: { enabled: true },
          geoLocation: {
            country: geoData?.country || 'Unknown',
            city: geoData?.city || 'Unknown',
            coordinates: [geoData?.lon || 0, geoData?.lat || 0],
            isp: geoData?.isp || 'Unknown',
            asn: geoData?.as?.split(' ')[0] || 'Unknown'
          },
        });
      }

      // Ambil aktivitas yang terdeteksi dari database
      const activities = ip.get('detectedActivities', Array);

      // Dapatkan analisis dari AI berdasarkan aktivitas yang ada
      const aiAnalysis = await this.externalAPIService.analyzeWithLLM(activities, address);
      
      // Update data IP dengan hasil analisis AI
      ip.aiAnalysis = {
        riskScore: aiAnalysis.riskScore,
        summary: aiAnalysis.summary,
        findings: aiAnalysis.findings,
        recommendations: aiAnalysis.recommendations,
        lastAnalysis: new Date()
      };
      
      // Tentukan status berdasarkan risk score
      if (aiAnalysis.riskScore >= 75) {
        ip.status = 'BLOCKED'; // Contoh, bisa memicu tindakan lain
      } else {
        ip.status = 'MONITORING';
      }

      await ip.save();
      logger.info(`Investigation complete for IP: ${address}. Risk Score: ${ip.aiAnalysis.riskScore}`);
      return ip;

    } catch (error) {
      logger.error(`Error investigating IP ${address}:`, error);
      throw error;
    }
  }
  
  // FUNGSI BARU: Untuk memproses log yang masuk dari endpoint
  async processLogEntry(payload: LogPayload): Promise<void> {
    const { monitoredIP, sourceIP, logLine } = payload;

    const ip = await IP.findOne({ address: monitoredIP, 'monitoring.enabled': true });
    
    // Hanya proses jika IP sedang dimonitor
    if (!ip) {
      logger.debug(`Skipping log for unmonitored or non-existent IP: ${monitoredIP}`);
      return;
    }

    // Klasifikasi sederhana berdasarkan isi log
    let activityType: IDetectedActivity['type'] = 'UNKNOWN';
    const lowerLog = logLine.toLowerCase();

    if (lowerLog.includes('failed password') || lowerLog.includes('invalid user')) {
      activityType = 'SSH_FAILURE';
    } else if (lowerLog.includes('block') && (lowerLog.includes('in=') && lowerLog.includes('out='))) {
      // Asumsi log firewall seperti UFW/iptables
      activityType = 'FIREWALL_BLOCK';
    } else if (lowerLog.includes('nmap scan')) {
      activityType = 'PORT_SCAN';
    }

    const newActivity: IDetectedActivity = {
      timestamp: new Date(),
      type: activityType,
      sourceIP: sourceIP,
      details: logLine
    };
    
    // Tambahkan aktivitas baru ke dalam array
    ip.detectedActivities.push(newActivity);
    
    // Batasi jumlah log yang disimpan agar DB tidak membengkak (misal, 200 log terakhir)
    if (ip.detectedActivities.length > 200) {
      ip.detectedActivities.shift();
    }
    
    await ip.save();
    logger.info(`Logged new activity for ${monitoredIP} from ${sourceIP}`);

    // Memicu investigasi ulang (analisis AI) agar tidak terlalu sering
    // Cek jika tidak ada investigasi yang sedang berjalan untuk IP ini
    if (!this.investigationQueue.get(monitoredIP)) {
        this.investigationQueue.set(monitoredIP, true);
        logger.info(`Queueing investigation for ${monitoredIP}`);
        // Menjalankan investigasi setelah jeda singkat untuk mengumpulkan lebih banyak log
        setTimeout(async () => {
            try {
                await this.investigateIP(monitoredIP);
            } catch (err) {
                logger.error(`Scheduled investigation for ${monitoredIP} failed.`, err);
            } finally {
                this.investigationQueue.delete(monitoredIP);
            }
        }, 10000); // Tunggu 10 detik sebelum menganalisis
    }
  }


  async startMonitoring(address: string): Promise<IIP> {
    let ip = await IP.findOne({ address });
    if (ip) {
      ip.monitoring.enabled = true;
      ip.monitoring.lastCheck = new Date();
      await ip.save();
    } else {
      // Jika IP baru, buat dokumennya dan langsung investigasi awal
      const geoData = await this.externalAPIService.getGeoIPData(address);
      ip = await IP.create({
        address,
        status: 'MONITORING',
        monitoring: { enabled: true, lastCheck: new Date() },
        geoLocation: {
          country: geoData?.country || 'Unknown',
          city: geoData?.city || 'Unknown',
          coordinates: [geoData?.lon || 0, geoData?.lat || 0],
          isp: geoData?.isp || 'Unknown',
          asn: geoData?.as?.split(' ')[0] || 'Unknown'
        },
      });
    }
    return ip;
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