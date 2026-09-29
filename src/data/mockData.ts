import type {
  Account,
  Alert,
  ATM,
  ATMCluster,
  Case,
  CashOutEvent,
  District,
  Officer,
  PatrolUnit,
  Transaction,
} from '@/types';

export const officers: Officer[] = [
  { id: 'o1', name: 'A. Sharma', badge: 'IPS-1042', role: 'investigator', rank: 'Inspector', unit: 'Cyber Crime Cell, Delhi' },
  { id: 'o2', name: 'R. Iyer', badge: 'IPS-2071', role: 'supervisor', rank: 'SP', unit: 'National Cyber Coordination Centre' },
  { id: 'o3', name: 'P. Reddy', badge: 'IPS-3309', role: 'analyst', rank: 'DSP', unit: 'Financial Intelligence Unit' },
  { id: 'o4', name: 'S. Khan', badge: 'IPS-4410', role: 'admin', rank: 'IG', unit: 'Indian Cyber Crime Coordination Centre' },
];

const banks = ['SBI', 'HDFC', 'ICICI', 'Axis', 'PNB', 'Canara', 'Kotak', 'Union Bank'];
const fraudTypes = [
  'UPI Fraud',
  'Investment Scam',
  'Job Racket',
  'Phishing',
  'Fake Loan App',
  'Romance Scam',
  'QR Code Fraud',
  'Impersonation Fraud',
  'Parcel Customs Scam',
  'Stock Trading Scam',
];

export const districts: District[] = [
  { id: 'd1', name: 'Central Delhi', state: 'Delhi', lat: 28.6448, lng: 77.2167, riskZone: 'high' },
  { id: 'd2', name: 'Mumbai City', state: 'Maharashtra', lat: 19.076, lng: 72.8777, riskZone: 'high' },
  { id: 'd3', name: 'Bengaluru Urban', state: 'Karnataka', lat: 12.9716, lng: 77.5946, riskZone: 'medium' },
  { id: 'd4', name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, riskZone: 'medium' },
  { id: 'd5', name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, riskZone: 'low' },
  { id: 'd6', name: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867, riskZone: 'high' },
  { id: 'd7', name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, riskZone: 'medium' },
  { id: 'd8', name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, riskZone: 'medium' },
  { id: 'd9', name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, riskZone: 'medium' },
  { id: 'd10', name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, riskZone: 'low' },
  { id: 'd11', name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, riskZone: 'low' },
  { id: 'd12', name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, riskZone: 'low' },
];

export const atmClusters: ATMCluster[] = [
  { id: 'c1', name: 'Connaught Place Cluster', centerLat: 28.6315, centerLng: 77.2167, atmCount: 7, district: 'Central Delhi', state: 'Delhi', riskLevel: 'high', historicalHitRate: 0.73 },
  { id: 'c2', name: 'Karol Bagh Cluster', centerLat: 28.6517, centerLng: 77.1909, atmCount: 5, district: 'Central Delhi', state: 'Delhi', riskLevel: 'high', historicalHitRate: 0.65 },
  { id: 'c3', name: 'Andheri East Cluster', centerLat: 19.1136, centerLng: 72.8697, atmCount: 6, district: 'Mumbai City', state: 'Maharashtra', riskLevel: 'high', historicalHitRate: 0.61 },
  { id: 'c4', name: 'Bandra West Cluster', centerLat: 19.0596, centerLng: 72.8295, atmCount: 4, district: 'Mumbai City', state: 'Maharashtra', riskLevel: 'medium', historicalHitRate: 0.42 },
  { id: 'c5', name: 'Indiranagar Cluster', centerLat: 12.9719, centerLng: 77.6412, atmCount: 5, district: 'Bengaluru Urban', state: 'Karnataka', riskLevel: 'medium', historicalHitRate: 0.38 },
  { id: 'c6', name: 'New Market Cluster', centerLat: 22.5675, centerLng: 88.352, atmCount: 4, district: 'Kolkata', state: 'West Bengal', riskLevel: 'medium', historicalHitRate: 0.34 },
  { id: 'c7', name: 'Abids Cluster', centerLat: 17.3878, centerLng: 78.4815, atmCount: 5, district: 'Hyderabad', state: 'Telangana', riskLevel: 'high', historicalHitRate: 0.55 },
  { id: 'c8', name: 'Pink City Cluster', centerLat: 26.9239, centerLng: 75.8267, atmCount: 3, district: 'Jaipur', state: 'Rajasthan', riskLevel: 'low', historicalHitRate: 0.22 },
  { id: 'c9', name: 'Gomti Nagar Cluster', centerLat: 26.8467, centerLng: 80.9985, atmCount: 3, district: 'Lucknow', state: 'Uttar Pradesh', riskLevel: 'medium', historicalHitRate: 0.29 },
  { id: 'c10', name: 'T Nagar Cluster', centerLat: 13.0418, centerLng: 80.2341, atmCount: 4, district: 'Chennai', state: 'Tamil Nadu', riskLevel: 'medium', historicalHitRate: 0.31 },
];

export const atms: ATM[] = [
  { id: 'a1', bank: 'SBI', address: 'Connaught Place, Block A', district: 'Central Delhi', state: 'Delhi', lat: 28.6328, lng: 77.2197, clusterId: 'c1', riskLevel: 'high' },
  { id: 'a2', bank: 'HDFC', address: 'Connaught Place, Block C', district: 'Central Delhi', state: 'Delhi', lat: 28.6302, lng: 77.2152, clusterId: 'c1', riskLevel: 'high' },
  { id: 'a3', bank: 'ICICI', address: 'Connaught Place, Block E', district: 'Central Delhi', state: 'Delhi', lat: 28.6338, lng: 77.2138, clusterId: 'c1', riskLevel: 'high' },
  { id: 'a4', bank: 'Axis', address: 'Karol Bagh, Ajmal Khan Rd', district: 'Central Delhi', state: 'Delhi', lat: 28.6522, lng: 77.1916, clusterId: 'c2', riskLevel: 'high' },
  { id: 'a5', bank: 'PNB', address: 'Karol Bagh, Arya Samaj Rd', district: 'Central Delhi', state: 'Delhi', lat: 28.6505, lng: 77.1898, clusterId: 'c2', riskLevel: 'high' },
  { id: 'a6', bank: 'Canara', address: 'Andheri East, MIDC', district: 'Mumbai City', state: 'Maharashtra', lat: 19.1145, lng: 72.8702, clusterId: 'c3', riskLevel: 'high' },
  { id: 'a7', bank: 'SBI', address: 'Andheri East, Marol', district: 'Mumbai City', state: 'Maharashtra', lat: 19.1122, lng: 72.8688, clusterId: 'c3', riskLevel: 'high' },
  { id: 'a8', bank: 'HDFC', address: 'Bandra West, Linking Rd', district: 'Mumbai City', state: 'Maharashtra', lat: 19.0601, lng: 72.8301, clusterId: 'c4', riskLevel: 'medium' },
  { id: 'a9', bank: 'ICICI', address: 'Indiranagar, 100 Ft Rd', district: 'Bengaluru Urban', state: 'Karnataka', lat: 12.9725, lng: 77.6418, clusterId: 'c5', riskLevel: 'medium' },
  { id: 'a10', bank: 'Kotak', address: 'Indiranagar, CMH Rd', district: 'Bengaluru Urban', state: 'Karnataka', lat: 12.9708, lng: 77.6398, clusterId: 'c5', riskLevel: 'medium' },
  { id: 'a11', bank: 'SBI', address: 'New Market, Bertram St', district: 'Kolkata', state: 'West Bengal', lat: 22.5679, lng: 88.3525, clusterId: 'c6', riskLevel: 'medium' },
  { id: 'a12', bank: 'Axis', address: 'Abids, Gunfoundry', district: 'Hyderabad', state: 'Telangana', lat: 17.3882, lng: 78.4822, clusterId: 'c7', riskLevel: 'high' },
  { id: 'a13', bank: 'HDFC', address: 'Abids, Nampally Rd', district: 'Hyderabad', state: 'Telangana', lat: 17.3868, lng: 78.4801, clusterId: 'c7', riskLevel: 'high' },
  { id: 'a14', bank: 'PNB', address: 'Pink City, MI Road', district: 'Jaipur', state: 'Rajasthan', lat: 26.9242, lng: 75.8271, clusterId: 'c8', riskLevel: 'low' },
  { id: 'a15', bank: 'SBI', address: 'Gomti Nagar, Patrakar Marg', district: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8472, lng: 80.9991, clusterId: 'c9', riskLevel: 'medium' },
  { id: 'a16', bank: 'Canara', address: 'T Nagar, Usman Rd', district: 'Chennai', state: 'Tamil Nadu', lat: 13.0422, lng: 80.2348, clusterId: 'c10', riskLevel: 'medium' },
];

export const accounts: Account[] = [
  { id: 'acc1', holderName: 'Rajesh Kumar', accountNumber: '3421XXXX8901', bank: 'SBI', ifsc: 'SBIN0001042', type: 'victim', branch: 'Connaught Place', district: 'Central Delhi', state: 'Delhi', lat: 28.6328, lng: 77.2197, kycVerified: true, linkedCases: ['CASE-001', 'CASE-003'] },
  { id: 'acc2', holderName: 'Faisal M.', accountNumber: '8812XXXX2200', bank: 'HDFC', ifsc: 'HDFC0001190', type: 'mule', branch: 'Karol Bagh', district: 'Central Delhi', state: 'Delhi', lat: 28.6522, lng: 77.1916, kycVerified: false, linkedCases: ['CASE-001'] },
  { id: 'acc3', holderName: 'Deepak S.', accountNumber: '7710XXXX3345', bank: 'ICICI', ifsc: 'ICIC0002200', type: 'mule', branch: 'Andheri East', district: 'Mumbai City', state: 'Maharashtra', lat: 19.1145, lng: 72.8702, kycVerified: false, linkedCases: ['CASE-001'] },
  { id: 'acc4', holderName: 'Sana A.', accountNumber: '5501XXXX6677', bank: 'Axis', ifsc: 'UTIB0003310', type: 'mule', branch: 'Abids', district: 'Hyderabad', state: 'Telangana', lat: 17.3882, lng: 78.4822, kycVerified: false, linkedCases: ['CASE-001'] },
  { id: 'acc5', holderName: 'Priya Nair', accountNumber: '2203XXXX8899', bank: 'Kotak', ifsc: 'KKBK0001120', type: 'victim', branch: 'Indiranagar', district: 'Bengaluru Urban', state: 'Karnataka', lat: 12.9725, lng: 77.6418, kycVerified: true, linkedCases: ['CASE-002'] },
  { id: 'acc6', holderName: 'Imran K.', accountNumber: '9912XXXX4455', bank: 'Canara', ifsc: 'CNRB0000098', type: 'mule', branch: 'T Nagar', district: 'Chennai', state: 'Tamil Nadu', lat: 13.0422, lng: 80.2348, kycVerified: false, linkedCases: ['CASE-002'] },
  { id: 'acc7', holderName: 'Ramesh T.', accountNumber: '6603XXXX1122', bank: 'PNB', ifsc: 'PUNB0000770', type: 'mule', branch: 'Bandra West', district: 'Mumbai City', state: 'Maharashtra', lat: 19.0601, lng: 72.8301, kycVerified: false, linkedCases: ['CASE-002'] },
  { id: 'acc8', holderName: 'Anita G.', accountNumber: '4410XXXX7733', bank: 'SBI', ifsc: 'SBIN0000670', type: 'victim', branch: 'New Market', district: 'Kolkata', state: 'West Bengal', lat: 22.5679, lng: 88.3525, kycVerified: true, linkedCases: ['CASE-003'] },
  { id: 'acc9', holderName: 'Vijay P.', accountNumber: '3301XXXX9988', bank: 'Axis', ifsc: 'UTIB0001100', type: 'mule', branch: 'Gomti Nagar', district: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8472, lng: 80.9991, kycVerified: false, linkedCases: ['CASE-003'] },
  { id: 'acc10', holderName: 'Meera J.', accountNumber: '1120XXXX5566', bank: 'HDFC', ifsc: 'HDFC0000890', type: 'victim', branch: 'Abids', district: 'Hyderabad', state: 'Telangana', lat: 17.3882, lng: 78.4822, kycVerified: true, linkedCases: ['CASE-004'] },
  { id: 'acc11', holderName: 'Kamal R.', accountNumber: '7740XXXX2211', bank: 'ICICI', ifsc: 'ICIC0004550', type: 'mule', branch: 'Pink City', district: 'Jaipur', state: 'Rajasthan', lat: 26.9242, lng: 75.8271, kycVerified: false, linkedCases: ['CASE-004'] },
  { id: 'acc12', holderName: 'Sunil D.', accountNumber: '9980XXXX3344', bank: 'Canara', ifsc: 'CNRB0002230', type: 'mule', branch: 'Andheri East', district: 'Mumbai City', state: 'Maharashtra', lat: 19.1145, lng: 72.8702, kycVerified: false, linkedCases: ['CASE-004', 'CASE-005'] },
  { id: 'acc13', holderName: 'Lakshmi V.', accountNumber: '6650XXXX8821', bank: 'SBI', ifsc: 'SBIN0003090', type: 'victim', branch: 'Patna', district: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, kycVerified: true, linkedCases: ['CASE-005'] },
  { id: 'acc14', holderName: 'Arjun M.', accountNumber: '8810XXXX9988', bank: 'Kotak', ifsc: 'KKBK0002200', type: 'mule', branch: 'Bandra West', district: 'Mumbai City', state: 'Maharashtra', lat: 19.0601, lng: 72.8301, kycVerified: false, linkedCases: ['CASE-005'] },
  { id: 'acc15', holderName: 'Neha S.', accountNumber: '4410XXXX1234', bank: 'PNB', ifsc: 'PUNB0000980', type: 'beneficiary', branch: 'Kochi', district: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, kycVerified: true, linkedCases: ['CASE-001'] },
];

function hoursAgo(hours: number): string {
  const d = new Date(Date.now() - hours * 60 * 60 * 1000);
  return d.toISOString();
}

function hoursFromNow(hours: number): string {
  const d = new Date(Date.now() + hours * 60 * 60 * 1000);
  return d.toISOString();
}

export const cases: Case[] = [
  {
    id: 'CASE-001',
    complaintId: 'NCRP-2026-018472',
    fraudType: 'UPI Fraud',
    amount: 450000,
    complaintTime: hoursAgo(6),
    originLocation: 'Connaught Place, Delhi',
    originState: 'Delhi',
    originLat: 28.6328,
    originLng: 77.2197,
    victimAccount: 'acc1',
    status: 'active',
    riskScore: 92,
    riskLevel: 'critical',
    transactionLayers: 4,
    description: 'Victim received UPI collect request impersonating a verified merchant. Rs.4,50,000 siphoned through 4 layers across Delhi-Mumbai-Hyderabad.',
    assignedOfficer: 'A. Sharma',
  },
  {
    id: 'CASE-002',
    complaintId: 'NCRP-2026-018473',
    fraudType: 'Investment Scam',
    amount: 1200000,
    complaintTime: hoursAgo(12),
    originLocation: 'Indiranagar, Bengaluru',
    originState: 'Karnataka',
    originLat: 12.9725,
    originLng: 77.6418,
    victimAccount: 'acc5',
    status: 'predicted',
    riskScore: 86,
    riskLevel: 'high',
    transactionLayers: 3,
    description: 'Victim invested in fake trading platform via Telegram. Rs.12,00,000 transferred through 3 layers to Chennai-Mumbai.',
    assignedOfficer: 'R. Iyer',
  },
  {
    id: 'CASE-003',
    complaintId: 'NCRP-2026-018474',
    fraudType: 'Phishing',
    amount: 85000,
    complaintTime: hoursAgo(20),
    originLocation: 'New Market, Kolkata',
    originState: 'West Bengal',
    originLat: 22.5679,
    originLng: 88.3525,
    victimAccount: 'acc8',
    status: 'active',
    riskScore: 68,
    riskLevel: 'medium',
    transactionLayers: 2,
    description: 'Phishing link captured banking credentials. Rs.85,000 transferred to mule in Lucknow.',
    assignedOfficer: 'P. Reddy',
  },
  {
    id: 'CASE-004',
    complaintId: 'NCRP-2026-018475',
    fraudType: 'Job Racket',
    amount: 230000,
    complaintTime: hoursAgo(30),
    originLocation: 'Abids, Hyderabad',
    originState: 'Telangana',
    originLat: 17.3882,
    originLng: 78.4822,
    victimAccount: 'acc10',
    status: 'predicted',
    riskScore: 74,
    riskLevel: 'high',
    transactionLayers: 3,
    description: 'Fake job offer asking registration fee. Rs.2,30,000 routed via Jaipur-Mumbai mules.',
    assignedOfficer: 'A. Sharma',
  },
  {
    id: 'CASE-005',
    complaintId: 'NCRP-2026-018476',
    fraudType: 'Romance Scam',
    amount: 675000,
    complaintTime: hoursAgo(48),
    originLocation: 'Patna, Bihar',
    originState: 'Bihar',
    originLat: 25.5941,
    originLng: 85.1376,
    victimAccount: 'acc13',
    status: 'intercepted',
    riskScore: 81,
    riskLevel: 'high',
    transactionLayers: 4,
    description: 'Romance scam on dating app. Rs.6,75,000 transferred through Mumbai mule chain. Intercepted at Bandra ATM.',
    assignedOfficer: 'R. Iyer',
  },
  {
    id: 'CASE-006',
    complaintId: 'NCRP-2026-018477',
    fraudType: 'Fake Loan App',
    amount: 150000,
    complaintTime: hoursAgo(72),
    originLocation: 'Gomti Nagar, Lucknow',
    originState: 'Uttar Pradesh',
    originLat: 26.8472,
    originLng: 80.9991,
    victimAccount: 'acc9',
    status: 'closed',
    riskScore: 45,
    riskLevel: 'low',
    transactionLayers: 1,
    description: 'Fake loan app extorted processing fees. Rs.1,50,000 recovered. Case closed.',
    assignedOfficer: 'P. Reddy',
  },
];

export const transactions: Transaction[] = [
  { id: 't1', caseId: 'CASE-001', fromAccount: 'acc1', toAccount: 'acc2', amount: 450000, timestamp: hoursAgo(5.5), layer: 1, method: 'UPI', reference: 'UPI-7821903' },
  { id: 't2', caseId: 'CASE-001', fromAccount: 'acc2', toAccount: 'acc3', amount: 350000, timestamp: hoursAgo(5), layer: 2, method: 'IMPS', reference: 'IMPS-553210' },
  { id: 't3', caseId: 'CASE-001', fromAccount: 'acc3', toAccount: 'acc4', amount: 300000, timestamp: hoursAgo(4.5), layer: 3, method: 'NEFT', reference: 'NEFT-991200' },
  { id: 't4', caseId: 'CASE-001', fromAccount: 'acc4', toAccount: 'acc15', amount: 280000, timestamp: hoursAgo(4), layer: 4, method: 'RTGS', reference: 'RTGS-440012' },
  { id: 't5', caseId: 'CASE-002', fromAccount: 'acc5', toAccount: 'acc6', amount: 1200000, timestamp: hoursAgo(11), layer: 1, method: 'NEFT', reference: 'NEFT-665120' },
  { id: 't6', caseId: 'CASE-002', fromAccount: 'acc6', toAccount: 'acc7', amount: 900000, timestamp: hoursAgo(10), layer: 2, method: 'IMPS', reference: 'IMPS-770311' },
  { id: 't7', caseId: 'CASE-002', fromAccount: 'acc7', toAccount: 'acc12', amount: 800000, timestamp: hoursAgo(9), layer: 3, method: 'UPI', reference: 'UPI-553298' },
  { id: 't8', caseId: 'CASE-003', fromAccount: 'acc8', toAccount: 'acc9', amount: 85000, timestamp: hoursAgo(19), layer: 1, method: 'UPI', reference: 'UPI-331090' },
  { id: 't9', caseId: 'CASE-003', fromAccount: 'acc9', toAccount: 'acc2', amount: 60000, timestamp: hoursAgo(18), layer: 2, method: 'IMPS', reference: 'IMPS-119087' },
  { id: 't10', caseId: 'CASE-004', fromAccount: 'acc10', toAccount: 'acc11', amount: 230000, timestamp: hoursAgo(29), layer: 1, method: 'RTGS', reference: 'RTGS-220410' },
  { id: 't11', caseId: 'CASE-004', fromAccount: 'acc11', toAccount: 'acc12', amount: 200000, timestamp: hoursAgo(28), layer: 2, method: 'NEFT', reference: 'NEFT-773291' },
  { id: 't12', caseId: 'CASE-004', fromAccount: 'acc12', toAccount: 'acc14', amount: 180000, timestamp: hoursAgo(27), layer: 3, method: 'IMPS', reference: 'IMPS-883021' },
  { id: 't13', caseId: 'CASE-005', fromAccount: 'acc13', toAccount: 'acc14', amount: 675000, timestamp: hoursAgo(47), layer: 1, method: 'UPI', reference: 'UPI-991028' },
  { id: 't14', caseId: 'CASE-005', fromAccount: 'acc14', toAccount: 'acc12', amount: 500000, timestamp: hoursAgo(46), layer: 2, method: 'IMPS', reference: 'IMPS-665041' },
  { id: 't15', caseId: 'CASE-005', fromAccount: 'acc12', toAccount: 'acc3', amount: 450000, timestamp: hoursAgo(45), layer: 3, method: 'NEFT', reference: 'NEFT-552018' },
  { id: 't16', caseId: 'CASE-005', fromAccount: 'acc3', toAccount: 'acc7', amount: 400000, timestamp: hoursAgo(44), layer: 4, method: 'UPI', reference: 'UPI-440776' },
  { id: 't17', caseId: 'CASE-006', fromAccount: 'acc9', toAccount: 'acc2', amount: 150000, timestamp: hoursAgo(71), layer: 1, method: 'UPI', reference: 'UPI-110093' },
];

export const cashOutEvents: CashOutEvent[] = [
  { id: 'co1', caseId: 'CASE-005', atmId: 'a8', amount: 200000, timestamp: hoursAgo(43), intercepted: true },
  { id: 'co2', caseId: 'CASE-006', atmId: 'a4', amount: 50000, timestamp: hoursAgo(70), intercepted: false },
];

export const alerts: Alert[] = [
  { id: 'al1', caseId: 'CASE-001', level: 'critical', title: 'Imminent Cash-Out Predicted — CP Delhi Cluster', predictedLocation: 'Connaught Place ATM Cluster, Delhi', timeWindow: hoursFromNow(2), riskScore: 92, timestamp: hoursAgo(1), acknowledged: false },
  { id: 'al2', caseId: 'CASE-002', level: 'high', title: 'Cash-Out Likely — Bandra West Cluster', predictedLocation: 'Bandra West ATM Cluster, Mumbai', timeWindow: hoursFromNow(5), riskScore: 86, timestamp: hoursAgo(2), acknowledged: false },
  { id: 'al3', caseId: 'CASE-004', level: 'high', title: 'Mule Activity Detected — Andheri East Cluster', predictedLocation: 'Andheri East ATM Cluster, Mumbai', timeWindow: hoursFromNow(8), riskScore: 74, timestamp: hoursAgo(3), acknowledged: true },
  { id: 'al4', caseId: 'CASE-003', level: 'medium', title: 'Possible Withdrawal — Gomti Nagar Cluster', predictedLocation: 'Gomti Nagar ATM Cluster, Lucknow', timeWindow: hoursFromNow(12), riskScore: 68, timestamp: hoursAgo(4), acknowledged: false },
  { id: 'al5', caseId: 'CASE-005', level: 'low', title: 'Case Intercepted — Bandra West', predictedLocation: 'Bandra West ATM Cluster, Mumbai', timeWindow: hoursAgo(43), riskScore: 81, timestamp: hoursAgo(43), acknowledged: true },
];

export const stateData = districts.reduce((acc, d) => {
  if (!acc[d.state]) acc[d.state] = { state: d.state, riskZone: d.riskZone, count: 0, amount: 0 };
  return acc;
}, {} as Record<string, { state: string; riskZone: string; count: number; amount: number }>);

export { banks, fraudTypes };

/** SIMULATED units. Positions are near real city centres but the roster is invented for the demo. */
export const patrolUnits: PatrolUnit[] = [
  { id: 'u1', callsign: 'DELHI-PCR-12', kind: 'PCR', station: 'Connaught Place PS', district: 'Central Delhi', state: 'Delhi', lat: 28.6315, lng: 77.2167, available: true },
  { id: 'u2', callsign: 'DELHI-QRT-3', kind: 'Cyber QRT', station: 'Karol Bagh PS', district: 'Central Delhi', state: 'Delhi', lat: 28.6517, lng: 77.1909, available: true },
  { id: 'u3', callsign: 'MUM-PCR-7', kind: 'PCR', station: 'Andheri PS', district: 'Mumbai City', state: 'Maharashtra', lat: 19.1197, lng: 72.8464, available: true },
  { id: 'u4', callsign: 'MUM-QRT-2', kind: 'Cyber QRT', station: 'Bandra PS', district: 'Mumbai City', state: 'Maharashtra', lat: 19.0544, lng: 72.84, available: true },
  { id: 'u5', callsign: 'HYD-PCR-5', kind: 'PCR', station: 'Abids PS', district: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4740, available: true },
  { id: 'u6', callsign: 'BLR-PCR-9', kind: 'PCR', station: 'Indiranagar PS', district: 'Bengaluru Urban', state: 'Karnataka', lat: 12.9784, lng: 77.6408, available: true },
  { id: 'u7', callsign: 'KOL-PCR-4', kind: 'PCR', station: 'New Market PS', district: 'Kolkata', state: 'West Bengal', lat: 22.5646, lng: 88.3510, available: true },
  { id: 'u8', callsign: 'CHN-PCR-6', kind: 'PCR', station: 'T Nagar PS', district: 'Chennai', state: 'Tamil Nadu', lat: 13.0418, lng: 80.2341, available: true },
  { id: 'u9', callsign: 'LKO-PCR-2', kind: 'PCR', station: 'Gomti Nagar PS', district: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8500, lng: 80.9990, available: true },
  { id: 'u10', callsign: 'JAI-PCR-1', kind: 'PCR', station: 'MI Road PS', district: 'Jaipur', state: 'Rajasthan', lat: 26.9160, lng: 75.8090, available: true },
];
