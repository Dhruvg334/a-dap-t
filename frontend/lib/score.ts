import type { Severity } from '@/types/scan';

export function severityLabel(value?: Severity): string {
  if (!value) return 'Info';
  const normalized = String(value).replace(/_/g, ' ').toLowerCase();
  return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
}

export function severityClass(value?: Severity): string {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('critical')) return 'danger';
  if (normalized.includes('high')) return 'danger';
  if (normalized.includes('medium')) return 'warning';
  if (normalized.includes('low')) return 'safe';
  return 'neutral';
}

export function riskClass(value?: string): string {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('critical')) return 'danger';
  if (normalized.includes('high') || normalized.includes('weak') || normalized.includes('missing')) return 'danger';
  if (normalized.includes('medium') || normalized.includes('partial') || normalized.includes('review')) return 'warning';
  if (normalized.includes('low') || normalized.includes('strong') || normalized.includes('protected') || normalized.includes('allow')) return 'safe';
  if (normalized.includes('not_applicable')) return 'neutral';
  return 'neutral';
}

export function gateClass(decision?: string): string {
  const normalized = String(decision || '').toUpperCase();
  if (normalized === 'BLOCK') return 'danger';
  if (normalized === 'REVIEW') return 'warning';
  if (normalized === 'ALLOW') return 'safe';
  return 'neutral';
}

export function categoryName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function displayNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function scoreTone(score?: number | null): string {
  const n = displayNumber(score, 0);
  if (n >= 80) return 'safe';
  if (n >= 60) return 'warning';
  return 'danger';
}
