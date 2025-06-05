import { ExternalAPIService } from '../services/externalAPIService';

describe('Scanning Detection Tests', () => {
  let service: ExternalAPIService;

  beforeEach(() => {
    service = new ExternalAPIService();
  });

  describe('SSH Brute Force Detection', () => {
    it('should detect high-risk SSH brute force attempts', async () => {
      const testData = {
        scanningActivities: {
          sshAttempts: 100,
          scannerIPs: ['192.168.1.10', '192.168.1.11']
        }
      };

      const result = await service['getFallbackAnalysis'](testData);
      
      expect(result.riskScore).toBeGreaterThanOrEqual(30);
      expect(result.threatTypes).toContain('SSH Brute Force Attempts');
      expect(result.findings).toContain('Detected 100 SSH login attempts');
      expect(result.findings).toContain('SSH attack source IPs: 192.168.1.10, 192.168.1.11');
    });

    it('should handle low-volume SSH attempts', async () => {
      const testData = {
        scanningActivities: {
          sshAttempts: 3
        }
      };

      const result = await service['getFallbackAnalysis'](testData);
      
      expect(result.riskScore).toBe(6); // 3 attempts * 2 points
      expect(result.threatTypes).toContain('SSH Brute Force Attempts');
    });
  });

  describe('NMAP Scanning Detection', () => {
    it('should detect NMAP scanning activity', async () => {
      const testData = {
        scanningActivities: {
          nmapScans: 5,
          scannerIPs: ['192.168.1.20']
        }
      };

      const result = await service['getFallbackAnalysis'](testData);
      
      expect(result.riskScore).toBeGreaterThanOrEqual(25);
      expect(result.threatTypes).toContain('Port Scanning (NMAP)');
      expect(result.findings).toContain('Detected 5 NMAP scanning activities');
    });
  });

  describe('Port Scanning Detection', () => {
    it('should detect multiple port scanning attempts', async () => {
      const testData = {
        scanningActivities: {
          portScans: 10
        }
      };

      const result = await service['getFallbackAnalysis'](testData);
      
      expect(result.riskScore).toBeLessThanOrEqual(20); // Capped at 20 points
      expect(result.threatTypes).toContain('Generic Port Scanning');
      expect(result.findings).toContain('Detected 10 port scanning attempts');
    });

    it('should combine multiple scanning types', async () => {
      const testData = {
        scanningActivities: {
          sshAttempts: 20,
          nmapScans: 3,
          portScans: 15,
          scannerIPs: ['192.168.1.100', '192.168.1.101']
        }
      };

      const result = await service['getFallbackAnalysis'](testData);
      
      // Check if risk score combines all threats
      expect(result.threatTypes).toContain('SSH Brute Force Attempts');
      expect(result.threatTypes).toContain('Port Scanning (NMAP)');
      expect(result.threatTypes).toContain('Generic Port Scanning');
      
      // Verify recommendations
      expect(result.recommendations).toContain('Implement SSH key-based authentication only');
      expect(result.recommendations).toContain('Implement strict firewall rules');
      expect(result.recommendations).toContain('Review and restrict open ports');
    });
  });
});
