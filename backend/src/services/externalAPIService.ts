// backend/src/services/externalAPIService.ts

import axios from 'axios';
import NodeCache from 'node-cache';
// import { Groq } from 'groq-sdk';
import { logger } from '../utils/logger';
import { GeoIPResponse } from '../types/api';
import { IDetectedActivity } from '../models/IP';
import { GoogleGenerativeAI } from '@google/generative-ai';

const cache = new NodeCache({ stdTTL: 3600 });

export class ExternalAPIService {
  private ipGeolocationKey: string;
  private genAI: GoogleGenerativeAI;
  private model: any;
  // private groq: Groq;

  constructor() {
    logger.info('[ExternalAPIService] Constructor called.');
    // const llmKey = process.env.LLM_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const geoKey = process.env.IPGEO_API_KEY;
    

    this.ipGeolocationKey = geoKey?.replace(/["']/g, '') || '';
    
    // if (!llmKey || llmKey.trim() === '' || llmKey.includes('your_')) {
    //   logger.error('LLM_API_KEY environment variable is missing or invalid');
    //   throw new Error('LLM_API_KEY is not configured');
    // }
    
    // this.groq = new Groq({ apiKey: llmKey.replace(/["']/g, '') });

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

  // Hanya fungsi GeoIP yang dipertahankan
  async getGeoIPData(ip: string): Promise<GeoIPResponse | null> {
    // Menggunakan ip-api.com yang tidak butuh kunci untuk kesederhanaan
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

  // LLM Analysis diubah total untuk menganalisis aktivitas
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
      As a senior cybersecurity analyst, analyze the following stream of log activities directed at the monitored IP address "${ipAddress}". The goal is to detect coordinated attacks, identify patterns, and assess the overall risk.

      Here are the recent activities, sorted by time:
      ${JSON.stringify(activities, null, 2)}

      Based on this data, perform the following tasks:
      1.  **Identify Attack Patterns:** Look for signs of:
          *   **Brute-Force Attacks:** A high number of 'SSH_FAILURE' events from the same source IP in a short time.
          *   **Port Scanning:** A series of 'FIREWALL_BLOCK' or 'PORT_SCAN' events from a single source IP hitting multiple different ports.
          *   **Coordinated Attacks:** Multiple source IPs performing similar suspicious activities.
      2.  **Assess Overall Risk:** Determine a risk level (LOW, MEDIUM, HIGH, CRITICAL) and a risk score (0-100).
      3.  **Provide a Concise Summary:** A one-sentence summary of the threat landscape for this IP.
      4.  **List Key Findings:** Detail the identified patterns (e.g., "SSH brute-force attack detected from 123.45.67.89, with 50 failed attempts in 5 minutes.").
      5.  **Give Actionable Recommendations:** Suggest concrete steps to mitigate the identified threats (e.g., "Block source IP 123.45.67.89 at the firewall," "Review SSH hardening policies.").

      Format your response as a valid JSON object with the following structure:
      {
        "riskLevel": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
        "riskScore": number,
        "summary": string,
        "findings": string[],
        "recommendations": string[]
      }`;

      // const completion = await this.groq.chat.completions.create({
      //   messages: [{ role: "user", content: userPrompt }],
      //   model: "llama3-8b-8192", // Model yang lebih cepat dan cocok untuk tugas ini
      //   temperature: 0.3,
      //   max_tokens: 1500,
      //   top_p: 1,
      //   response_format: { type: "json_object" },
      // });

      // const content = completion.choices[0]?.message?.content;
      // if (!content) {
      //   throw new Error('Empty response from LLM');
      // }

      const result = await this.model.generateContent(userPrompt);
      const response = await result.response;
      const content = response.text();

      // const parsedResponse = JSON.parse(content);
      // return { ...parsedResponse, lastAnalyzed: new Date().toISOString() };

      // Clean the response - remove markdown formatting if present
      const cleanJson = content.replace(/```json\n|\n```|```/g, '').trim();
      
      try {
        const parsedResponse = JSON.parse(cleanJson);
        return { ...parsedResponse, lastAnalyzed: new Date().toISOString() };
      } catch (parseError) {
        logger.error('Failed to parse LLM response:', parseError);
        logger.debug('Raw LLM response:', content);
        throw parseError;
      }

    } catch (error) {
      logger.error('LLM Analysis error:', error);
      // Fallback response in case of AI error
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

// Tambahkan definisi tipe baru di sini atau di `types/analysis.ts`
export interface AIAnalysisResponse {
    riskLevel: RiskLevel;
    riskScore: number;
    summary: string;
    findings: string[];
    recommendations: string[];
    lastAnalyzed: string;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";