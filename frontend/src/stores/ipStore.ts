// frontend/src/stores/ipStore.ts

import { defineStore } from 'pinia';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Interface untuk satu aktivitas yang terdeteksi, harus sama dengan di backend
interface IDetectedActivity {
  timestamp: string;
  type: 'SSH_FAILURE' | 'PORT_SCAN' | 'FIREWALL_BLOCK' | 'MALICIOUS_REQUEST' | 'UNKNOWN';
  sourceIP: string;
  details: string;
}

// Interface IPData yang baru, mencerminkan model backend
export interface IPData {
  _id: string; // MongoDB ID
  address: string;
  firstSeen: string;
  lastSeen: string;
  status: 'ACTIVE' | 'BLOCKED' | 'MONITORING';
  geoLocation: {
    country: string;
    city: string;
    coordinates: [number, number];
    isp: string;
    asn: string;
  };
  monitoring?: {
    enabled: boolean;
    lastCheck: string;
    alerts: {
      timestamp: string;
      type: string;
      description: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }[];
  };
  // Field baru yang utama
  detectedActivities: IDetectedActivity[];
  aiAnalysis: {
    riskScore: number;
    summary: string;
    findings: string[];
    recommendations: string[];
    lastAnalysis: string;
  };
}

export const useIPStore = defineStore('ip', {
  state: () => ({
    currentIP: null as IPData | null,
    monitoredIPs: [] as IPData[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    isMonitored(): boolean {
      return this.currentIP?.monitoring?.enabled || false;
    },
    monitoredCount(): number {
      return this.monitoredIPs.length;
    },
    highRiskIPs(): IPData[] {
      return this.monitoredIPs.filter(ip => ip.aiAnalysis.riskScore >= 70);
    }
  },

  actions: {
    async investigateIP(address: string) {
      try {
        this.loading = true;
        this.error = null;
        const response = await axios.post<IPData>(`${API_URL}/ip/investigate`, { address });
        this.currentIP = response.data;
        return response.data;
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Investigation failed';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async startMonitoring(address: string) {
      try {
        this.loading = true;
        this.error = null;
        // interval tidak lagi diperlukan
        const response = await axios.post<IPData>(`${API_URL}/ip/monitor/start`, { address });
        
        if (this.currentIP?.address === address) {
          this.currentIP = response.data;
        }
        
        const index = this.monitoredIPs.findIndex(ip => ip.address === address);
        if (index === -1) {
          this.monitoredIPs.push(response.data);
        } else {
          this.monitoredIPs[index] = response.data;
        }
        
        return response.data;
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to start monitoring';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async stopMonitoring(address: string) {
      try {
        this.loading = true;
        this.error = null;
        const response = await axios.post<IPData>(`${API_URL}/ip/monitor/stop`, { address });
        
        if (this.currentIP?.address === address) {
          this.currentIP = response.data;
        }
        
        const index = this.monitoredIPs.findIndex(ip => ip.address === address);
        if (index !== -1) {
          this.monitoredIPs.splice(index, 1);
        }
        
        return response.data;
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to stop monitoring';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async loadMonitoredIPs() {
      try {
        this.loading = true;
        this.error = null;
        const response = await axios.get<IPData[]>(`${API_URL}/ip/monitored`);
        this.monitoredIPs = response.data;
        return response.data;
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to load monitored IPs';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    }
  }
});