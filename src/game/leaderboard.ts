import type { LeaderboardEntry } from './types';

const LEADERBOARD_STORAGE_KEY = 'invasores_leaderboard_v1';
const HIGH_SCORE_STORAGE_KEY = 'invasores_high_score_v1';
const LAST_ALIAS_STORAGE_KEY = 'invasores_last_alias_v1';
const MAX_ENTRIES = 10;

export function normalizeAlias(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase().slice(0, 5);
}

export function isValidAlias(raw: string): boolean {
  const cleaned = normalizeAlias(raw);
  return cleaned.length >= 3 && cleaned.length <= 5;
}

export function loadLastAlias(): string {
  try {
    const saved = localStorage.getItem(LAST_ALIAS_STORAGE_KEY);
    return saved ? normalizeAlias(saved) : '';
  } catch {
    return '';
  }
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is LeaderboardEntry =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as LeaderboardEntry).id === 'string' &&
          typeof (item as LeaderboardEntry).alias === 'string' &&
          typeof (item as LeaderboardEntry).score === 'number' &&
          typeof (item as LeaderboardEntry).createdAt === 'number'
      )
      .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function qualifiesForLeaderboard(
  score: number,
  entries: LeaderboardEntry[]
): boolean {
  if (entries.length < MAX_ENTRIES) return true;
  const lowest = entries[entries.length - 1];
  return score > lowest.score;
}

export function addLeaderboardEntry(
  aliasRaw: string,
  score: number,
  wave: number
): { entries: LeaderboardEntry[]; newEntry: LeaderboardEntry } {
  const alias = normalizeAlias(aliasRaw);
  const current = loadLeaderboard();
  const newEntry: LeaderboardEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    alias,
    score,
    wave,
    createdAt: Date.now(),
  };

  const next = [...current, newEntry]
    .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
    .slice(0, MAX_ENTRIES);

  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(LAST_ALIAS_STORAGE_KEY, alias);
    if (next.length > 0) {
      const existingHigh = parseInt(
        localStorage.getItem(HIGH_SCORE_STORAGE_KEY) || '0',
        10
      );
      const topScore = Math.max(
        Number.isFinite(existingHigh) ? existingHigh : 0,
        next[0].score
      );
      localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(topScore));
    }
  } catch {
    // Ignore storage quota/privacy mode errors
  }

  return { entries: next, newEntry };
}

export function formatScoreDate(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(timestamp));
  } catch {
    const d = new Date(timestamp);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
}
