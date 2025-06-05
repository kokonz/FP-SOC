import { ExternalAPIService } from './externalAPIService';
import IP, { IIP } from '../models/IP';
import { logger } from '../utils/logger';

export class IPInvestigationService {
  private externalAPIService: ExternalAPIService;

  constructor() {
    this.externalAPIService = new ExternalAPIService();
  }

  async investigateIP(address: string): Promise<IIP> {
    try {
      // Check if IP exists in database
      let ip = await IP.findOne({ address });
      
      // Collect data from external APIs
      const [vtData, abuseData, geoData, shodanData] = await Promise.all([
        this.externalAPIService.getVirusTotalData(address),
        this.externalAPIService.getAbuseIPDBData(address),
        this.externalAPIService.getGeoIPData(address),
        this.externalAPIService.getShodanData(address)
      ]);

      // Prepare data for AI analysis
      const analysisData = {
        virusTotal: vtData,
        abuseIPDB: abuseData,
        geoIP: geoData,
        shodan: shodanData
      };

      // Get AI analysis
      const aiAnalysis = await this.externalAPIService.analyzeWithLLM(analysisData);

      // Parse AI analysis
      const { riskScore, findings, recommendations } = this.parseAIAnalysis(aiAnalysis);

      const ipData = {
        address,
        lastSeen: new Date(),
        reputation: {
          virusTotal: {
            score: vtData?.reputation || 0,
            lastUpdate: new Date(),
            detections: vtData?.detections || []
          },
          abuseIPDB: {
            score: abuseData?.abuseConfidenceScore || 0,
            reports: abuseData?.totalReports || 0
          }
        },
        geoLocation: {
          country: geoData?.country,
          city: geoData?.city,
          coordinates: [geoData?.longitude || 0, geoData?.latitude || 0],
          isp: geoData?.isp,
          asn: geoData?.asn
        },
        services: {
          ports: shodanData?.ports || [],
          protocols: shodanData?.protocols || [],
          banners: shodanData?.banners || []
        },
        aiAnalysis: {
          riskScore,
          findings,
          recommendations,
          lastAnalysis: new Date()
        }
      };

      if (ip) {
        // Update existing IP
        const updatedIP = await IP.findOneAndUpdate(
          { address },
          { $set: ipData },
          { new: true }
        );
        if (!updatedIP) {
          throw new Error('Failed to update IP');
        }
        return updatedIP;
      } else {
        // Create new IP
        return await IP.create({
          ...ipData,
          firstSeen: new Date(),
          status: 'ACTIVE',
          monitoring: {
            enabled: false,
            interval: 3600,
            alerts: []
          }
        });
      }
    } catch (error) {
      logger.error('Error investigating IP:', error);
      throw error;
    }
  }

  async startMonitoring(address: string, interval: number = 3600): Promise<IIP> {
    try {
      const ip = await IP.findOneAndUpdate(
        { address },
        {
          $set: {
            'monitoring.enabled': true,
            'monitoring.interval': interval,
            'monitoring.lastCheck': new Date()
          }
        },
        { new: true }
      );

      if (!ip) {
        throw new Error('IP not found');
      }

      return ip;
    } catch (error) {
      logger.error('Error starting IP monitoring:', error);
      throw error;
    }
  }

  async stopMonitoring(address: string): Promise<IIP> {
    try {
      const ip = await IP.findOneAndUpdate(
        { address },
        {
          $set: {
            'monitoring.enabled': false
          }
        },
        { new: true }
      );

      if (!ip) {
        throw new Error('IP not found');
      }

      return ip;
    } catch (error) {
      logger.error('Error stopping IP monitoring:', error);
      throw error;
    }
  }

  private parseAIAnalysis(analysis: any): { 
    riskScore: number;
    findings: string[];
    recommendations: string[];
  } {
    try {
      return {
        riskScore: analysis.riskScore || 0,
        findings: analysis.findings || [],
        recommendations: analysis.recommendations || []
      };
    } catch (error) {
      logger.error('Error parsing AI analysis:', error);
      return {
        riskScore: 0,
        findings: [],
        recommendations: []
      };
    }
  }
}
