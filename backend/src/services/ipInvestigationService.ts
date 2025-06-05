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

      // Prepare data for AI analysis with proper fallback values
      const analysisData = {
        virusTotal: vtData || { reputation: 0 },
        abuseIPDB: abuseData || { 
          ipAddress: address,
          isPublic: true,
          ipVersion: 4,
          isWhitelisted: false,
          abuseConfidenceScore: 0
        },
        geoIP: geoData || {
          status: "success",
          country: "Unknown",
          countryCode: "XX",
          region: "Unknown",
          regionName: "Unknown",
          city: "Unknown",
          zip: "Unknown",
          lat: 0,
          lon: 0,
          timezone: "Unknown",
          isp: "Unknown",
          org: "Unknown",
          as: "Unknown",
          query: address
        },
        shodan: shodanData || { ip_str: address }
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
          country: geoData?.country || 'Unknown',
          city: geoData?.city || 'Unknown',
          coordinates: [
            geoData?.longitude ?? geoData?.lon ?? 0,
            geoData?.latitude ?? geoData?.lat ?? 0
          ],
          isp: geoData?.isp || 'Unknown',
          asn: geoData?.asn || geoData?.as?.split(' ')[0] || 'Unknown'
        },
        services: {
          ports: shodanData?.ports || [],
          protocols: shodanData?.data?.map(d => d.protocol || '').filter(Boolean) || [],
          banners: shodanData?.data?.map(d => d.data || '').filter(Boolean) || []
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
      // Handle the case where analysis is already structured
      if (analysis && typeof analysis === 'object' && 'riskScore' in analysis) {
        return {
          riskScore: Number(analysis.riskScore) || 0,
          findings: Array.isArray(analysis.findings) ? analysis.findings : [],
          recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : []
        };
      }

      // If analysis is null or invalid
      if (!analysis) {
        logger.warn('AI analysis returned null or invalid response');
        return {
          riskScore: 0,
          findings: ['Unable to perform AI analysis'],
          recommendations: ['Please try again later']
        };
      }

      // Return the default values if the analysis cannot be parsed
      return {
        riskScore: 0,
        findings: ['Error parsing AI analysis results'],
        recommendations: ['System is still operational but AI analysis is limited']
      };
    } catch (error) {
      logger.error('Error parsing AI analysis:', error);
      return {
        riskScore: 0,
        findings: ['Error in AI analysis processing'],
        recommendations: ['Manual investigation recommended']
      };
    }
  }
}
