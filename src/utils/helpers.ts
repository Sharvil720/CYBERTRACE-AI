import type { RiskLevel } from '@/types';

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'Overdue';
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `in ${Math.floor(diff / 60000)}m`;
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

export const riskColors: Record<RiskLevel, { bg: string; text: string; border: string; dot: string; glow: string }> = {
  critical: { bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-800/50', dot: 'bg-red-500', glow: 'shadow-red-500/20' },
  high: { bg: 'bg-orange-950/40', text: 'text-orange-400', border: 'border-orange-800/50', dot: 'bg-orange-500', glow: 'shadow-orange-500/20' },
  medium: { bg: 'bg-yellow-950/40', text: 'text-yellow-400', border: 'border-yellow-800/50', dot: 'bg-yellow-500', glow: 'shadow-yellow-500/20' },
  low: { bg: 'bg-green-950/40', text: 'text-green-400', border: 'border-green-800/50', dot: 'bg-green-500', glow: 'shadow-green-500/20' },
};

export function riskColor(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
  return map[level];
}

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}
