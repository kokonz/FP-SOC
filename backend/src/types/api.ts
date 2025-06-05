// Response types for external APIs
export interface ShodanResponse {
  ip_str: string;
  ports?: number[];
  hostnames?: string[];
  os?: string;
  tags?: string[];
  vulns?: string[];
  data?: Array<{
    port: number;
    transport?: string;
    product?: string;
    version?: string;
    title?: string;
    data?: string;
    ssl?: object;
    protocol?: string;
    http?: {
      server?: string;
      title?: string;
      robots?: string;
      sitemap?: string;
      host?: string;
      securitytxt?: string;
    };
  }>;
  isp?: string;
  asn?: string;
  last_update?: string;
  country_code?: string;
  city?: string;
}

export interface VirusTotalResponse {
  as_owner?: string;
  asn?: number;
  country?: string;
  network?: string;
  reputation?: number;
  detections?: string[];
  total_votes?: {
    harmless: number;
    malicious: number;
  };
  last_analysis_stats?: {
    harmless: number;
    malicious: number;
    suspicious: number;
    timeout: number;
    undetected: number;
  };
  last_analysis_results?: Record<string, {
    category: string;
    result: string;
    method: string;
    engine_name: string;
  }>;
}

export interface AbuseIPDBResponse {
  ipAddress: string;
  isPublic: boolean;
  ipVersion: number;
  isWhitelisted: boolean;
  abuseConfidenceScore: number;
  countryCode?: string;
  countryName?: string;
  usageType?: string;
  isp?: string;
  domain?: string;
  totalReports?: number;
  lastReportedAt?: string;
  reports?: Array<{
    reportedAt: string;
    comment: string;
    categories: number[];
    reporterId: number;
  }>;
}

export interface GeoIPResponse {
  status: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  latitude?: number;
  longitude?: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  asn?: string;
  query: string;
}
