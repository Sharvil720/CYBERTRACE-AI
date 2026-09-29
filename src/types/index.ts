export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type CaseStatus = 'active' | 'predicted' | 'intercepted' | 'closed';
export type AccountType = 'victim' | 'mule' | 'beneficiary';

export interface Account {
  id: string;
  holderName: string;
  accountNumber: string;
  bank: string;
  ifsc: string;
  type: AccountType;
  branch: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  kycVerified: boolean;
  linkedCases: string[];
}

export interface Transaction {
  id: string;
  caseId: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  timestamp: string;
  layer: number;
  method: 'UPI' | 'IMPS' | 'NEFT' | 'RTGS' | 'Cash' | 'Cheque';
  reference: string;
}

export interface CashOutEvent {
  id: string;
  caseId: string;
  atmId: string;
  amount: number;
  timestamp: string;
  intercepted: boolean;
}

export interface ATM {
  id: string;
  bank: string;
  address: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  clusterId: string;
  riskLevel: RiskLevel;
}

export interface ATMCluster {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  atmCount: number;
  district: string;
  state: string;
  riskLevel: RiskLevel;
  historicalHitRate: number;
}

export interface Case {
  id: string;
  complaintId: string;
  fraudType: string;
  amount: number;
  complaintTime: string;
  originLocation: string;
  originState: string;
  originLat: number;
  originLng: number;
  victimAccount: string;
  status: CaseStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  transactionLayers: number;
  description: string;
  assignedOfficer: string;
}

export interface Prediction {
  atmId: string;
  clusterId: string;
  label: string;
  probability: number;
  expectedTime: string;
  timeWindow: string;
  /**
   * Split-conformal membership. The set (over all ATMs) contains the true cash-out ATM with
   * probability >= targetCoverage IF real cases look like the synthetic calibration cases.
   * Calibrated on synthetic data only; not a statement about real NCRP cases.
   */
  conformal: {
    inSet: boolean;
    setSize: number;
    targetCoverage: number; // 0..1
    heldOutCoverage: number; // 0..1, observed on held-out synthetic cases
    basis: 'synthetic';
  };
  distanceKm: number;
  reasons: string[];
  /** Lognormal time-to-cash-out from generation time, in hours. */
  timeToCashOut: { p10Hours: number; medianHours: number; p90Hours: number };
  /** Hawkes intensity lambda_j(t) at generation time. */
  intensity: number;
  /** Epoch ms at which the prediction was generated (used to reproduce explanations). */
  generatedAt: number;
  bank: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
}

export interface Alert {
  id: string;
  caseId: string;
  level: RiskLevel;
  title: string;
  predictedLocation: string;
  timeWindow: string;
  riskScore: number;
  timestamp: string;
  acknowledged: boolean;
}

export interface District {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  riskZone: RiskLevel;
}

export interface Officer {
  id: string;
  name: string;
  badge: string;
  role: 'investigator' | 'supervisor' | 'admin' | 'analyst';
  rank: string;
  unit: string;
}

export interface XAIFactor {
  label: string;
  weight: number;
  description: string;
}

/** SIMULATED field unit used by the interception optimizer. Not real deployment data. */
export interface PatrolUnit {
  id: string;
  callsign: string;
  kind: 'PCR' | 'Cyber QRT' | 'Bank Liaison';
  station: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  available: boolean;
}
