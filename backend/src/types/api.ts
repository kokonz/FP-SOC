// backend/src/types/api.ts

// Response type for GeoIP API (ip-api.com)
export interface GeoIPResponse {
  status: string;
  message?: string; // Ada jika status 'fail'
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
}