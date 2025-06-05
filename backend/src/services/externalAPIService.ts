import axios from 'axios';
import NodeCache from 'node-cache';
import { Groq } from 'groq-sdk';
import { logger } from '../utils/logger';
import { ShodanResponse, VirusTotalResponse, AbuseIPDBResponse, GeoIPResponse } from '../types/api';
import { AIAnalysisResponse, RiskLevel } from '../types/analysis';

const cache = new NodeCache({ stdTTL: 3600 });

export class ExternalAPIService {
  private virusTotalKey: string;
  private abuseIPDBKey: string;
  private shodanKey: string;
  private ipGeolocationKey: string;
  private groq: Groq;
    
  constructor() {
    // Log entry and raw environment variables as seen by this constructor
    logger.info('[ExternalAPIService] Constructor called.');
    logger.info(`[ExternalAPIService] Raw process.env.VIRUSTOTAL_API_KEY: "${process.env.VIRUSTOTAL_API_KEY}"`);
    logger.info(`[ExternalAPIService] Raw process.env.ABUSEIPDB_API_KEY: "${process.env.ABUSEIPDB_API_KEY}"`);
    logger.info(`[ExternalAPIService] Raw process.env.SHODAN_API_KEY: "${process.env.SHODAN_API_KEY}"`);
    logger.info(`[ExternalAPIService] Raw process.env.LLM_API_KEY: "${process.env.LLM_API_KEY ? 'Exists' : 'UNDEFINED'}"`); // Avoid logging full LLM key
    logger.info(`[ExternalAPIService] Raw process.env.IPGEO_API_KEY: "${process.env.IPGEO_API_KEY}"`);

    const vtKey = process.env.VIRUSTOTAL_API_KEY;
    const abuseKey = process.env.ABUSEIPDB_API_KEY;
    const shodanKey = process.env.SHODAN_API_KEY;
    const geoKey = process.env.IPGEO_API_KEY;
    const llmKey = process.env.LLM_API_KEY;

    this.virusTotalKey = vtKey?.replace(/["']/g, '') || '';
    this.abuseIPDBKey = abuseKey?.replace(/["']/g, '') || '';
    this.shodanKey = shodanKey?.replace(/["']/g, '') || '';
    this.ipGeolocationKey = geoKey?.replace(/["']/g, '') || '';

    this.groq = new Groq({
      apiKey: llmKey?.replace(/["']/g, '') || ''
    });

    // Validate required API keys
    if (!llmKey || llmKey.trim() === '' || llmKey.includes('your_')) { // Added includes('your_') for consistency
      logger.error('LLM_API_KEY environment variable is missing or invalid');
    }
    
    // The problematic check for VirusTotal
    if (!vtKey || vtKey.includes('your_') || vtKey.trim() === '') {
      logger.error(`VIRUSTOTAL_API_KEY environment variable is missing or invalid. Current raw value: "${vtKey}"`);
    }
    // Check for AbuseIPDB (using raw key for logging consistency)
    if (!abuseKey || abuseKey.includes('your_') || abuseKey.trim() === '') {
      logger.error(`ABUSEIPDB_API_KEY environment variable is missing or invalid. Current raw value: "${abuseKey}"`);
    }
    // Check for Shodan (using raw key for logging consistency)
    if (!shodanKey || shodanKey.includes('your_') || shodanKey.trim() === '') {
      logger.error(`SHODAN_API_KEY environment variable is missing or invalid. Current raw value: "${shodanKey}"`);
    }
    // Check for IP Geolocation (optional, but good to log if missing)
    if (!geoKey || geoKey.trim() === '') {
        logger.warn(`IPGEO_API_KEY environment variable is missing or invalid. Current raw value: "${geoKey}"`);
    }
  }
    async getVirusTotalData(ip: string): Promise<VirusTotalResponse | null> {
    try {
      const cacheKey = `vt_${ip}`;
      const cached = cache.get<VirusTotalResponse>(cacheKey);
      if (cached) {
        logger.info(`Retrieved VirusTotal data for IP ${ip} from cache`);
        return cached;
      }      logger.info(`Fetching VirusTotal data for IP ${ip} with key: ${this.virusTotalKey.substring(0, 5)}...`);
      const response = await axios.get(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
        headers: { 
          'x-apikey': this.virusTotalKey,
          'accept': 'application/json'
        }
      });

      const data = response.data.data.attributes;
      cache.set(cacheKey, data);
      logger.info(`Successfully fetched and cached VirusTotal data for IP ${ip}`);
      return data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          logger.error('VirusTotal API authentication failed. Please check your API key.');
        } else if (error.response?.status === 403) {
          logger.error('VirusTotal API access forbidden. Please check your API key permissions.');
        } else {
          logger.error(`VirusTotal API error for IP ${ip}: ${error.response?.status} - ${error.message}`);
        }
      } else {
        logger.error(`Unexpected error while fetching VirusTotal data for IP ${ip}:`, error);
      }
      return null;
    }
  }
  async getAbuseIPDBData(ip: string): Promise<AbuseIPDBResponse | null> {
    try {
      const cacheKey = `abuse_${ip}`;
      const cached = cache.get<AbuseIPDBResponse>(cacheKey);
      if (cached) return cached;

      const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
        params: { ipAddress: ip },
        headers: { 'Key': this.abuseIPDBKey }
      });

      const data: AbuseIPDBResponse = response.data.data;
      cache.set(cacheKey, data);
      return data;
    } catch (error) {
      logger.error(`AbuseIPDB API error for IP ${ip}:`, error);
      return null;
    }
  }
  async getGeoIPData(ip: string): Promise<GeoIPResponse | null> {
    try {
      const cacheKey = `geo_${ip}`;
      const cached = cache.get<GeoIPResponse>(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      const data: GeoIPResponse = response.data;
      cache.set(cacheKey, data);
      return data;
    } catch (error) {
      logger.error(`GeoIP API error for IP ${ip}:`, error);
      return null;
    }
  }  async getShodanData(ip: string): Promise<ShodanResponse | null> {
    try {
      const cacheKey = `shodan_${ip}`;
      const cached = cache.get<ShodanResponse>(cacheKey);
      if (cached) {
        logger.info(`Retrieved Shodan data for IP ${ip} from cache`);
        return cached;
      }

      if (!this.shodanKey || this.shodanKey.trim() === '') {
        logger.error('Shodan API key is not configured');
        return null;
      }

      const cleanKey = this.shodanKey.trim();
      const response = await axios.get(`https://api.shodan.io/shodan/host/${ip}`, {
        headers: {
          'User-Agent': 'IPInvestigatorTool/1.0',
          'Accept': 'application/json'
        },
        params: {
          key: cleanKey,
          minify: false
        }
      });

      if (!response.data || typeof response.data !== 'object') {
        logger.error(`Invalid response from Shodan API for IP ${ip}`);
        return null;
      }

      const data: ShodanResponse = {
        ip_str: ip,
        ...response.data
      };

      cache.set(cacheKey, data);
      return data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          logger.error(`Shodan API authentication failed for key: ${this.shodanKey.substring(0, 5)}...`);
          logger.error('Please check if your Shodan API key is valid and has sufficient credits.');
        } else if (error.response?.status === 404) {
          logger.info(`No Shodan data found for IP ${ip}`);
        } else {
          logger.error(`Shodan API error for IP ${ip}: ${error.response?.status} - ${error.message}`);
        }
      } else {
        logger.error(`Unexpected error while fetching Shodan data for IP ${ip}:`, error);
      }
      return null;
    }
  }

  async getIPGeolocationData(ip: string) {
    try {
      const cacheKey = `ipgeo_${ip}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;      
      const response = await axios.get(`https://api.ipgeolocation.io/ipgeo`, {
        params: {
          apiKey: this.ipGeolocationKey,
          ip: ip
        }
      });

      const data = response.data;
      cache.set(cacheKey, data);
      return {
        ip: data.ip,
        location: {
          continent_code: data.continent_code,
          continent_name: data.continent_name,
          country_code2: data.country_code2,
          country_code3: data.country_code3,
          country_name: data.country_name,
          country_name_official: data.country_name_official,
          country_capital: data.country_capital,
          state_prov: data.state_prov,
          state_code: data.state_code,
          district: data.district,
          city: data.city,
          zipcode: data.zipcode,
          latitude: data.latitude,
          longitude: data.longitude,
          is_eu: data.is_eu,
          country_flag: data.country_flag,
          geoname_id: data.geoname_id,
          country_emoji: data.country_emoji
        },
        country_metadata: {
          calling_code: data.calling_code,
          tld: data.tld,
          languages: data.languages
        },
        currency: {
          code: data.currency?.code,
          name: data.currency?.name,
          symbol: data.currency?.symbol
        }
      };
    } catch (error) {
      logger.error(`IP Geolocation API error for IP ${ip}:`, error);
      return null;
    }
  }
  async analyzeWithLLM(data: any): Promise<AIAnalysisResponse> {
    try {
      const userPrompt = `Analyze this IP address data as a cybersecurity expert and assess its risk level:
      ${JSON.stringify(data, null, 2)}
      
      Provide a detailed analysis with:
      1. The overall risk level (LOW/MEDIUM/HIGH/CRITICAL)
      2. A risk score from 0-100
      3. Key findings about potential threats or security concerns
      4. Specific recommendations for risk mitigation

      Format your response as valid JSON with the following structure:
      {
        "riskLevel": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
        "riskScore": number,
        "findings": string[],
        "recommendations": string[]
      }`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: userPrompt }],
        model: "deepseek-r1-distill-llama-70b",
        temperature: 0.5,
        max_tokens: 2000,
        top_p: 0.95,
        response_format: { type: "json_object" },
        reasoning_format: "hidden"
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        logger.warn('Empty response from LLM, using fallback analysis');
        return this.getFallbackAnalysis(data);
      }

      try {
        const parsedResponse = JSON.parse(content);
        if (!this.isValidAnalysisResponse(parsedResponse)) {
          logger.warn('Invalid LLM response format:', parsedResponse);
          return this.getFallbackAnalysis(data);
        }
        return parsedResponse;
      } catch (parseError) {
        logger.error('Failed to parse LLM response:', parseError);
        return this.getFallbackAnalysis(data);
      }
    } catch (error) {
      logger.error('LLM Analysis error:', error);
      return this.getFallbackAnalysis(data);
    }
  }  private getFallbackAnalysis(data: any): AIAnalysisResponse {
    let riskScore = 0;
    let findings: string[] = [];
    let recommendations: string[] = [];
    let threatTypes: string[] = [];

    // Analyze Network Scanning Activities
    if (data.scanningActivities) {
      const { sshAttempts = 0, nmapScans = 0, portScans = 0, scannerIPs = [] } = data.scanningActivities;
      
      // SSH Brute Force Detection
      if (sshAttempts > 0) {
        riskScore += Math.min(sshAttempts * 2, 30); // Cap at 30 points
        threatTypes.push('SSH Brute Force Attempts');
        findings.push(`Detected ${sshAttempts} SSH login attempts`);
        if (scannerIPs.length > 0) {
          findings.push(`SSH attack source IPs: ${scannerIPs.join(', ')}`);
        }
        recommendations.push('Implement SSH key-based authentication only');
        recommendations.push('Consider implementing fail2ban for SSH protection');
        recommendations.push('Enable SSH access logging and monitoring');
      }
      
      // NMAP Scanning Detection
      if (nmapScans > 0) {
        riskScore += 25; // Significant risk for active scanning
        threatTypes.push('Port Scanning (NMAP)');
        findings.push(`Detected ${nmapScans} NMAP scanning activities`);
        recommendations.push('Implement strict firewall rules');
        recommendations.push('Enable IDS/IPS monitoring');
      }
      
      // Port Scanning Detection
      if (portScans > 0) {
        riskScore += Math.min(portScans * 3, 20); // Cap at 20 points
        threatTypes.push('Generic Port Scanning');
        findings.push(`Detected ${portScans} port scanning attempts`);
        recommendations.push('Review and restrict open ports');
        recommendations.push('Implement port knocking for sensitive services');
      }

      if (nmapScans > 0) {
        riskScore += Math.min(nmapScans * 5, 25); // Cap at 25 points
        threatTypes.push('Port Scanning Activity');
        findings.push(`Detected ${nmapScans} Nmap scan attempts`);
        if (scannerIPs.length > 0) {
          findings.push(`Scan origins: ${scannerIPs.join(', ')}`);
        }
        recommendations.push('Implement port scan detection and blocking');
        recommendations.push('Consider implementing IDS/IPS solutions');
      }

      if (portScans > 0) {
        threatTypes.push('Reconnaissance Activity');
        findings.push(`Detected ${portScans} general port scan attempts`);
      }
    }

    // Analyze VirusTotal data
    if (data.virusTotal) {
      // Check reputation
      const vtScore = data.virusTotal.reputation;
      if (vtScore !== undefined) {
        if (vtScore < 0) {
          riskScore += Math.abs(vtScore);
          threatTypes.push('Malicious Activity');
          findings.push(`Negative reputation score (${vtScore}) from VirusTotal`);
        }
      }

      // Check malicious votes
      if (data.virusTotal.total_votes) {
        const maliciousRatio = data.virusTotal.total_votes.malicious / 
          (data.virusTotal.total_votes.harmless + data.virusTotal.total_votes.malicious);
        if (maliciousRatio > 0.3) {
          riskScore += maliciousRatio * 50;
          threatTypes.push('Community Reported Threats');
          findings.push(`High malicious vote ratio: ${(maliciousRatio * 100).toFixed(1)}%`);
        }
      }

      // Check analysis stats
      if (data.virusTotal.last_analysis_stats) {
        const stats = data.virusTotal.last_analysis_stats;
        const detectionRatio = (stats.malicious + stats.suspicious) / 
          (stats.harmless + stats.undetected + stats.malicious + stats.suspicious);
        if (detectionRatio > 0.1) {
          riskScore += detectionRatio * 40;
          threatTypes.push('Security Vendor Detections');
          findings.push(`Detected as malicious by ${stats.malicious} security vendors`);
        }
      }
    }

    // Analyze AbuseIPDB data
    if (data.abuseIPDB) {
      const abuseScore = data.abuseIPDB.abuseConfidenceScore;
      if (abuseScore !== undefined) {
        riskScore += (abuseScore * 0.4);
        if (abuseScore > 25) {
          threatTypes.push('Reported Abuse');
          findings.push(`AbuseIPDB confidence score: ${abuseScore}%`);
        }
      }

      // Check recent reports
      if (data.abuseIPDB.totalReports && data.abuseIPDB.totalReports > 0) {
        findings.push(`Total abuse reports: ${data.abuseIPDB.totalReports}`);
        recommendations.push('Review recent abuse reports and implement necessary blocks');
      }
    }

    // Check Shodan data
    if (data.shodan?.ports?.length) {
      const commonDangerousPorts = [21, 22, 23, 3389, 445, 135, 137, 138, 139];
      const dangerousPorts = data.shodan.ports.filter((p: number) => commonDangerousPorts.includes(p));
      if (dangerousPorts.length > 0) {
        riskScore += (dangerousPorts.length * 5);
        findings.push(`Exposed sensitive ports: ${dangerousPorts.join(', ')}`);
        recommendations.push('Review and secure exposed network services');
      }
    }    // Add default recommendations based on threat types
    if (threatTypes.includes('Malicious Activity')) {
      recommendations.push('Implement immediate IP blocking at the firewall level');
      recommendations.push('Monitor for similar patterns from related IP ranges');
    }
    if (threatTypes.includes('Community Reported Threats')) {
      recommendations.push('Review community reports for specific threat behaviors');
      recommendations.push('Consider implementing rate limiting for this IP');
    }
    if (threatTypes.includes('Security Vendor Detections')) {
      recommendations.push('Update security rules and signatures');
      recommendations.push('Enable enhanced logging for connections from this IP');
    }
    if (threatTypes.includes('Reported Abuse')) {
      recommendations.push('Implement progressive security measures based on abuse patterns');
      recommendations.push('Consider implementing CAPTCHA or additional verification for this IP');
    }

    // Determine risk level based on final score
    let riskLevel: RiskLevel = "LOW";
    if (riskScore >= 75) riskLevel = "CRITICAL";
    else if (riskScore >= 50) riskLevel = "HIGH";
    else if (riskScore >= 25) riskLevel = "MEDIUM";

    if (findings.length === 0) {
      findings = ['No immediate threats detected'];
      recommendations = ['Maintain standard security monitoring'];
      threatTypes = ['None Detected'];
    }

    return {
      riskLevel,
      riskScore: Math.min(Math.round(riskScore), 100),
      findings,
      recommendations,
      threatTypes,
      lastAnalyzed: new Date().toISOString()
    };
  }

  private isValidAnalysisResponse(response: any): response is AIAnalysisResponse {
    const validRiskLevels: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    return (
      response &&
      typeof response === 'object' &&
      validRiskLevels.includes(response.riskLevel) &&
      typeof response.riskScore === 'number' &&
      response.riskScore >= 0 &&
      response.riskScore <= 100 &&
      Array.isArray(response.findings) &&
      Array.isArray(response.recommendations) &&
      response.findings.every((f: any) => typeof f === 'string') &&
      response.recommendations.every((r: any) => typeof r === 'string')
    );
  }
}
