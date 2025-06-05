import axios from 'axios';
import NodeCache from 'node-cache';
import { Groq } from 'groq-sdk';
import { logger } from '../utils/logger';

const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// Initialize Groq with API key from environment
const groq = new Groq({ 
  apiKey: process.env.LLM_API_KEY || '' 
});

export class ExternalAPIService {
  private virusTotalKey: string;
  private abuseIPDBKey: string;
  private shodanKey: string;

  constructor() {
    this.virusTotalKey = process.env.VIRUSTOTAL_API_KEY || '';
    this.abuseIPDBKey = process.env.ABUSEIPDB_API_KEY || '';
    this.shodanKey = process.env.SHODAN_API_KEY || '';

    // Validate required API keys
    if (!process.env.LLM_API_KEY) {
      logger.error('LLM_API_KEY environment variable is missing');
    }
    if (!this.virusTotalKey) {
      logger.error('VIRUSTOTAL_API_KEY environment variable is missing');
    }
    if (!this.abuseIPDBKey) {
      logger.error('ABUSEIPDB_API_KEY environment variable is missing');
    }
    if (!this.shodanKey) {
      logger.error('SHODAN_API_KEY environment variable is missing');
    }
  }

  async getVirusTotalData(ip: string) {
    try {
      const cacheKey = `vt_${ip}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
        headers: { 'x-apikey': this.virusTotalKey }
      });

      const data = response.data.data.attributes;
      cache.set(cacheKey, data);
      return data;
    } catch (error) {
      logger.error(`VirusTotal API error for IP ${ip}:`, error);
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

  async analyzeWithLLM(data: any) {
    try {
      const prompt = `Analyze this IP investigation data and provide:
      1. Risk assessment (LOW/MEDIUM/HIGH/CRITICAL)
      2. Key findings summary
      3. Recommended actions
      
      Data: ${JSON.stringify(data)}`;

      const completion = await groq.chat.completions.create({
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
