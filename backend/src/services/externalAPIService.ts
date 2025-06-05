import axios from 'axios';
import NodeCache from 'node-cache';
import { Groq } from 'groq-sdk';
import { logger } from '../utils/logger';

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
  
  async getVirusTotalData(ip: string) {
    try {
      // Check if API key is available and valid
      if (!this.virusTotalKey || this.virusTotalKey === '') {
        logger.error('Cannot fetch VirusTotal data: API key is not configured');
        return null;
      }

      const cacheKey = `vt_${ip}`;
      const cached = cache.get(cacheKey);
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

  async getAbuseIPDBData(ip: string) {
    try {
      const cacheKey = `abuse_${ip}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
        params: { ipAddress: ip },
        headers: { 'Key': this.abuseIPDBKey }
      });

      const data = response.data.data;
      cache.set(cacheKey, data);
      return data;
    } catch (error) {
      logger.error(`AbuseIPDB API error for IP ${ip}:`, error);
      return null;
    }
  }

  async getGeoIPData(ip: string) {
    try {
      const cacheKey = `geo_${ip}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      logger.error(`GeoIP API error for IP ${ip}:`, error);
      return null;
    }
  }
  async getShodanData(ip: string) {
    try {
      const cacheKey = `shodan_${ip}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`https://api.shodan.io/shodan/host/${ip}?key=${this.shodanKey}`);
      cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      logger.error(`Shodan API error for IP ${ip}:`, error);
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
  async analyzeWithLLM(data: any) {
    try {
      const prompt = `Analyze this IP investigation data and provide:
      1. Risk assessment (LOW/MEDIUM/HIGH/CRITICAL)
      2. Key findings summary
      3. Recommended actions
      
      Data: ${JSON.stringify(data)}`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "mixtral-8x7b-32768",
      });

      return completion.choices[0]?.message?.content;
    } catch (error) {
      logger.error('LLM Analysis error:', error);
      return null;
    }
  }
}
