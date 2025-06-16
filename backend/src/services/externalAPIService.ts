// backend/src/services/externalAPIService.ts
import axios from 'axios';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger';
import { GeoIPResponse } from '../types/api';
import { IDetectedActivity } from '../models/IP';
import { GoogleGenerativeAI } from '@google/generative-ai';

const cache = new NodeCache({ stdTTL: 3600 });

// Pisahkan definisi tipe ke luar class agar bisa di-export jika perlu
export interface AIAnalysisResponse {
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    riskScore: number;
    summary: string;
    findings: string[];
    recommendations: string[];
    lastAnalyzed: string;
}

export class ExternalAPIService {
  private ipGeolocationKey: string;
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    logger.info('[ExternalAPIService] Constructor called.');
    const geminiKey = process.env.GEMINI_API_KEY;
    const geoKey = process.env.IPGEO_API_KEY;
    
    this.ipGeolocationKey = geoKey?.replace(/["']/g, '') || '';
    
    if (!geminiKey || geminiKey.trim() === '' || geminiKey.includes('your_')) {
      logger.error('GEMINI_API_KEY environment variable is missing or invalid');
      throw new Error('GEMINI_API_KEY is not configured');
    }
    
    this.genAI = new GoogleGenerativeAI(geminiKey.replace(/["']/g, ''));
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    if (!this.ipGeolocationKey) {
        logger.warn(`IPGEO_API_KEY is missing. Geolocation data will be unavailable.`);
    }
  }

  async getGeoIPData(ip: string): Promise<GeoIPResponse | null> {
    const cacheKey = `geo_${ip}`;
    const cached = cache.get<GeoIPResponse>(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      const data: GeoIPResponse = response.data;
      if (data.status === 'success') {
        cache.set(cacheKey, data);
        return data;
      }
      logger.warn(`GeoIP lookup failed for IP ${ip}: ${data.message}`);
      return null;
    } catch (error) {
      logger.error(`GeoIP API error for IP ${ip}:`, error);
      return null;
    }
  }

  async analyzeWithLLM(activities: IDetectedActivity[], ipAddress: string): Promise<AIAnalysisResponse> {
    try {
      if (activities.length === 0) {
        return {
          riskLevel: "LOW",
          riskScore: 0,
          summary: "No suspicious activities detected for this IP.",
          findings: ["Monitoring is active, no adverse events logged."],
          recommendations: ["Continue standard monitoring."],
          lastAnalyzed: new Date().toISOString()
        };
      }
      
      const userPrompt = `
      As a world-class cybersecurity analyst AI, your task is to analyze a stream of log activities for the monitored IP address "${ipAddress}". Your goal is to detect sophisticated, coordinated attacks, identify patterns, and provide a clear, actionable risk assessment.

      Here are the recent activities detected by our sensors, sorted by time:
      ${JSON.stringify(activities, null, 2)}

      Based on this data, perform the following analysis. Be concise but thorough.

      1.  **Identify Attack Patterns:** Correlate the events and identify specific, named attack patterns. Look for:
          *   **Brute-Force Attack (SSH):** A high number of 'SSH_FAILURE' events from the same source IP in a short period.
          *   **Port/IP Scanning:** A cluster of 'PORT_SCAN' events from a single source IP targeting multiple ports, or from multiple IPs targeting the same host. This indicates reconnaissance.
          *   **Web Enumeration/Probing:** One or more 'WEB_ENUMERATION' events. This indicates an attacker is mapping the web application structure and looking for sensitive files (e.g., /etc/passwd, .env).
          *   **Potential RCE/Injection Attempt:** Any 'POTENTIAL_RCE' event. This is a critical finding, as the attacker is likely trying to execute commands on the server through the web application.
          *   **DDoS/Anomalous Connection Rate:** A massive flood of 'SUSPICIOUS_CONNECTION_RATE' or 'PORT_SCAN' events from one or multiple source IPs in a very short time (e.g., hundreds or thousands per minute). This indicates a potential Denial of Service attack.

      2.  **Assess Overall Risk:**
          *   **Risk Score (0-100):** Calculate a score based on the severity and volume of attacks. (e.g., a single RCE attempt is more severe than 10 failed SSH logins).
          *   **Risk Level (LOW, MEDIUM, HIGH, CRITICAL):** Classify the overall risk.

      3.  **Provide a Concise Summary:** A one-sentence executive summary of the threat landscape for this IP.

      4.  **List Key Findings:** Detail the identified patterns and the source IPs involved. Be specific.
          *   Example: "SSH brute-force attack detected from 123.45.67.89, with 50 failed attempts."
          *   Example: "Web enumeration detected from 98.76.54.32, attempting to access '/etc/passwd'."
          *   Example: "Potential DDoS activity from a swarm of 200+ IPs, causing over 5,000 connection attempts in one minute."

      5.  **Give Actionable Recommendations:** Suggest concrete mitigation steps.
          *   Example: "Immediately block source IP 123.45.67.89 at the firewall."
          *   Example: "Review and sanitize all user inputs on the web application to prevent RCE."
          *   Example: "Implement rate-limiting at the edge (Cloudflare, Load Balancer) to mitigate DDoS."

      Format your response as a valid JSON object with the following structure:
      {
        "riskLevel": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
        "riskScore": number,
        "summary": string,
        "findings": string[],
        "recommendations": string[]
      }`;

      const result = await this.model.generateContent(userPrompt);
      const response = await result.response;
      const content = response.text();

      const cleanJson = content.replace(/```json\n|\n```|```/g, '').trim();
      
      try {
        const parsedResponse = JSON.parse(cleanJson);
        return { ...parsedResponse, lastAnalyzed: new Date().toISOString() };
      } catch (parseError) {
        logger.error('Failed to parse LLM response:', parseError);
        logger.debug('Raw LLM response:', content);
        throw new Error('Failed to parse AI response');
      }

    } catch (error) {
      logger.error('LLM Analysis error:', error);
      return {
        riskLevel: "MEDIUM",
        riskScore: 50,
        summary: "AI analysis failed, manual review required.",
        findings: ["The system was unable to complete an automated analysis due to an error.", `Total activities logged: ${activities.length}`],
        recommendations: ["Check system logs for errors related to the LLM service.", "Manually inspect the logged activities for this IP."],
        lastAnalyzed: new Date().toISOString()
      };
    }
  }
}