export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SupportedModel = 'llama-2-70b-4096';

export interface AIAnalysisResponse {
  riskLevel: RiskLevel;
  riskScore: number;
  findings: string[];
  recommendations: string[];
  threatTypes: string[];
  lastAnalyzed: string;
}
